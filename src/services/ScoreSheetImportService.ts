import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { Prisma, PrismaClient, ScoreSheetImportDraft } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { BaseService, ValidationError } from './BaseService';

const execFileAsync = promisify(execFile);

const NORMALIZED_WIDTH = 1000;
const NORMALIZED_HEIGHT = 1400;
const SCORE_COLUMNS = [6, 5, 4, 3, 2, 1, 0] as const;
const SCORE_GRID_LEFT = 0.326;
const SCORE_GRID_RIGHT = 0.986;
const SCORE_GRID_TOP = 0.318;
const SCORE_GRID_BOTTOM = 0.804;
const CELL_HORIZONTAL_PADDING = 0.18;
const CELL_VERTICAL_PADDING = 0.16;
const MIN_CELL_INK_SCORE = 0.0035;
const MIN_CONFIDENCE_GAP = 0.15;

type ScoreFileMetadata = {
  contextType?: 'CRITERION_COMMENT' | 'CONTESTANT' | 'CATEGORY' | 'SCORESHEET_IMPORT';
  criterionId?: string | null;
  noteText?: string | null;
  intent?: 'COMMENTARY_ATTACHMENT' | 'SCORESHEET_IMPORT';
};

type CriterionExtraction = {
  rowIndex: number;
  criterionId: string;
  criterionName: string;
  detectedScore: number | null;
  detectedColumnLabel: string | null;
  confidence: number;
  ambiguous: boolean;
  cellInkScores: number[];
};

type ExtractionPayload = {
  templateKey: string;
  normalizedImage: {
    width: number;
    height: number;
  };
  sheetBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  scoreValues: number[];
  criteria: CriterionExtraction[];
  mismatchWarnings: string[];
};

export type ScoreSheetImportDraftInfo = {
  id: string;
  scoreFileId: string;
  categoryId: string;
  judgeId: string;
  contestantId: string | null;
  tenantId: string;
  status: string;
  templateKey: string | null;
  processingError: string | null;
  detectedPaperTotal: number | null;
  computedTotal: number | null;
  overallConfidence: number | null;
  pageCount: number | null;
  extraction: ExtractionPayload | null;
  createdAt: Date;
  updatedAt: Date;
};

type RenderedPage = {
  buffer: Buffer;
  pageCount: number;
};

type RawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

@injectable()
export class ScoreSheetImportService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async processScoreFile(scoreFileId: string, tenantId: string): Promise<ScoreSheetImportDraftInfo> {
    const scoreFile = await this.prisma.scoreFile.findFirst({
      where: { id: scoreFileId, tenantId },
      select: {
        id: true,
        categoryId: true,
        judgeId: true,
        contestantId: true,
        filePath: true,
        fileType: true,
        notes: true,
        tenantId: true,
        category: {
          select: {
            id: true,
            criteria: {
              select: {
                id: true,
                name: true,
                maxScore: true,
              },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
    });

    if (!scoreFile) {
      throw this.createNotFoundError('Score file not found');
    }

    const metadata = this.parseScoreFileMetadata(scoreFile.notes);
    if (metadata.intent !== 'SCORESHEET_IMPORT') {
      throw new ValidationError('Score file is not marked as a scoresheet import source');
    }
    if (!scoreFile.contestantId) {
      throw new ValidationError('Scoresheet import requires a contestant-scoped score file');
    }

    const criteria = Array.isArray(scoreFile.category.criteria) ? scoreFile.category.criteria : [];
    if (criteria.length === 0) {
      throw new ValidationError('Cannot import scores for a category with no criteria');
    }

    const absolutePath = scoreFile.filePath.startsWith('/')
      ? scoreFile.filePath
      : path.join(process.cwd(), scoreFile.filePath);

    let draftStatus = 'processed';
    let processingError: string | null = null;
    let extraction: ExtractionPayload | null = null;
    let computedTotal: number | null = null;
    let overallConfidence: number | null = null;
    let pageCount: number | null = null;

    try {
      const rendered = await this.renderFirstPage(absolutePath, scoreFile.fileType);
      pageCount = rendered.pageCount;
      const normalized = await this.normalizePage(rendered.buffer);
      const analysis = this.extractScoresFromNormalizedImage(normalized, criteria);

      extraction = analysis.payload;
      computedTotal = analysis.computedTotal;
      overallConfidence = analysis.overallConfidence;
    } catch (error) {
      draftStatus = 'failed';
      processingError = this.formatErrorMessage(error);
    }

    const draft = await this.prisma.scoreSheetImportDraft.upsert({
      where: { scoreFileId },
      update: {
        categoryId: scoreFile.categoryId,
        judgeId: scoreFile.judgeId,
        contestantId: scoreFile.contestantId,
        tenantId,
        status: draftStatus,
        templateKey: extraction?.templateKey || null,
        processingError,
        detectedPaperTotal: null,
        computedTotal,
        overallConfidence,
        pageCount,
        extraction: extraction ? (extraction as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      create: {
        scoreFileId,
        categoryId: scoreFile.categoryId,
        judgeId: scoreFile.judgeId,
        contestantId: scoreFile.contestantId,
        tenantId,
        status: draftStatus,
        templateKey: extraction?.templateKey || null,
        processingError,
        detectedPaperTotal: null,
        computedTotal,
        overallConfidence,
        pageCount,
        extraction: extraction ? (extraction as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return this.normalizeDraft(draft);
  }

  async getDraftByScoreFileId(scoreFileId: string, tenantId: string): Promise<ScoreSheetImportDraftInfo | null> {
    const draft = await this.prisma.scoreSheetImportDraft.findFirst({
      where: { scoreFileId, tenantId },
    });

    return draft ? this.normalizeDraft(draft) : null;
  }

  private normalizeDraft(draft: ScoreSheetImportDraft): ScoreSheetImportDraftInfo {
    return {
      id: draft.id,
      scoreFileId: draft.scoreFileId,
      categoryId: draft.categoryId,
      judgeId: draft.judgeId,
      contestantId: draft.contestantId,
      tenantId: draft.tenantId,
      status: draft.status,
      templateKey: draft.templateKey,
      processingError: draft.processingError,
      detectedPaperTotal: draft.detectedPaperTotal,
      computedTotal: draft.computedTotal,
      overallConfidence: draft.overallConfidence,
      pageCount: draft.pageCount,
      extraction: (draft.extraction as ExtractionPayload | null) ?? null,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  private parseScoreFileMetadata(notes?: string | null): ScoreFileMetadata {
    if (!notes) return {};

    try {
      const parsed = JSON.parse(notes);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async renderFirstPage(filePath: string, fileType: string): Promise<RenderedPage> {
    if (fileType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      try {
        const buffer = await sharp(filePath, { density: 200, page: 0 })
          .flatten({ background: '#ffffff' })
          .png()
          .toBuffer();

        return { buffer, pageCount: 1 };
      } catch {
        return this.renderPdfWithPdftoppm(filePath);
      }
    }

    const buffer = await fs.readFile(filePath);
    return { buffer, pageCount: 1 };
  }

  private async renderPdfWithPdftoppm(filePath: string): Promise<RenderedPage> {
    const tempPrefix = path.join(
      os.tmpdir(),
      `scoresheet-import-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
    );
    const outputPath = `${tempPrefix}.png`;

    try {
      await execFileAsync('pdftoppm', ['-f', '1', '-l', '1', '-singlefile', '-png', filePath, tempPrefix]);
      const buffer = await fs.readFile(outputPath);
      return { buffer, pageCount: 1 };
    } catch (error) {
      throw new ValidationError(
        `Unable to render PDF for scoresheet import: ${this.formatErrorMessage(error)}`,
      );
    } finally {
      await fs.unlink(outputPath).catch(() => undefined);
    }
  }

  private async normalizePage(buffer: Buffer): Promise<RawImage & {
    bounds: { left: number; top: number; width: number; height: number };
  }> {
    const preprocessed = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const bounds = this.findDocumentBounds(
      preprocessed.data,
      preprocessed.info.width,
      preprocessed.info.height,
      preprocessed.info.channels,
    );

    const normalized = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .extract(bounds)
      .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      channels: normalized.info.channels,
      bounds,
    };
  }

  private findDocumentBounds(data: Buffer, width: number, height: number, channels: number): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let found = false;
    const threshold = 245;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = ((y * width) + x) * channels;
        const r = data[offset] ?? 255;
        const g = data[offset + 1] ?? r;
        const b = data[offset + 2] ?? r;
        const value = (r + g + b) / 3;
        if (value < threshold) {
          found = true;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      return { left: 0, top: 0, width, height };
    }

    const paddingX = Math.max(8, Math.round((maxX - minX) * 0.01));
    const paddingY = Math.max(8, Math.round((maxY - minY) * 0.01));

    const left = Math.max(0, minX - paddingX);
    const top = Math.max(0, minY - paddingY);
    const extractedWidth = Math.min(width - left, (maxX - minX) + (paddingX * 2));
    const extractedHeight = Math.min(height - top, (maxY - minY) + (paddingY * 2));

    return {
      left,
      top,
      width: Math.max(1, extractedWidth),
      height: Math.max(1, extractedHeight),
    };
  }

  private extractScoresFromNormalizedImage(
    image: RawImage & { bounds: { left: number; top: number; width: number; height: number } },
    criteria: Array<{ id: string; name: string; maxScore: number }>,
  ): {
    payload: ExtractionPayload;
    computedTotal: number;
    overallConfidence: number;
  } {
    const rowCount = criteria.length;
    if (rowCount <= 0) {
      throw new ValidationError('Scoresheet import requires at least one criterion');
    }

    const rowHeight = (SCORE_GRID_BOTTOM - SCORE_GRID_TOP) / rowCount;
    const columnWidth = (SCORE_GRID_RIGHT - SCORE_GRID_LEFT) / SCORE_COLUMNS.length;
    const extractedCriteria: CriterionExtraction[] = [];
    const mismatchWarnings: string[] = [];
    let computedTotal = 0;
    let confidenceSum = 0;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const criterion = criteria[rowIndex]!;
      const cellInkScores = SCORE_COLUMNS.map((_, columnIndex) => {
        const left = Math.round(
          image.width * (SCORE_GRID_LEFT + (columnIndex * columnWidth) + (columnWidth * CELL_HORIZONTAL_PADDING)),
        );
        const top = Math.round(
          image.height * (SCORE_GRID_TOP + (rowIndex * rowHeight) + (rowHeight * CELL_VERTICAL_PADDING)),
        );
        const width = Math.max(
          4,
          Math.round(image.width * (columnWidth * (1 - (CELL_HORIZONTAL_PADDING * 2)))),
        );
        const height = Math.max(
          4,
          Math.round(image.height * (rowHeight * (1 - (CELL_VERTICAL_PADDING * 2)))),
        );

        return this.measureCellInk(image.data, image.width, image.height, image.channels, left, top, width, height);
      });

      const ranked = cellInkScores
        .map((scoreValue, index) => ({ scoreValue, index }))
        .sort((a, b) => b.scoreValue - a.scoreValue);
      const topCell = ranked[0];
      const secondCell = ranked[1] || { scoreValue: 0, index: topCell?.index ?? 0 };
      const confidence = topCell
        ? Math.max(0, Math.min(1, (topCell.scoreValue - secondCell.scoreValue) / Math.max(topCell.scoreValue, 0.0001)))
        : 0;
      const ambiguous = !topCell || topCell.scoreValue < MIN_CELL_INK_SCORE || confidence < MIN_CONFIDENCE_GAP;
      const resolvedScoreValue: number | null = topCell
        ? (SCORE_COLUMNS[topCell.index] ?? null)
        : null;
      const detectedScore: number | null = ambiguous ? null : resolvedScoreValue;
      const detectedColumnLabel = ambiguous || !topCell ? null : String(SCORE_COLUMNS[topCell.index]);

      if (detectedScore !== null && detectedScore > Number(criterion.maxScore)) {
        mismatchWarnings.push(
          `${criterion.name} extracted score ${detectedScore} exceeds criterion max ${criterion.maxScore}`,
        );
      }

      if (detectedScore !== null) {
        computedTotal += detectedScore;
      }
      confidenceSum += confidence;

      extractedCriteria.push({
        rowIndex,
        criterionId: criterion.id,
        criterionName: criterion.name,
        detectedScore,
        detectedColumnLabel,
        confidence,
        ambiguous,
        cellInkScores: cellInkScores.map((value) => Number(value.toFixed(6))),
      });
    }

    const overallConfidence = rowCount > 0 ? Number((confidenceSum / rowCount).toFixed(4)) : 0;

    return {
      payload: {
        templateKey: 'generic-score-grid-v1',
        normalizedImage: {
          width: image.width,
          height: image.height,
        },
        sheetBounds: image.bounds,
        scoreValues: [...SCORE_COLUMNS],
        criteria: extractedCriteria,
        mismatchWarnings,
      },
      computedTotal,
      overallConfidence,
    };
  }

  private measureCellInk(
    data: Buffer,
    imageWidth: number,
    imageHeight: number,
    channels: number,
    left: number,
    top: number,
    width: number,
    height: number,
  ): number {
    const boundedLeft = Math.max(0, Math.min(imageWidth - 1, left));
    const boundedTop = Math.max(0, Math.min(imageHeight - 1, top));
    const boundedWidth = Math.max(1, Math.min(width, imageWidth - boundedLeft));
    const boundedHeight = Math.max(1, Math.min(height, imageHeight - boundedTop));
    let darkSum = 0;
    let activePixelCount = 0;

    for (let y = boundedTop; y < boundedTop + boundedHeight; y += 1) {
      for (let x = boundedLeft; x < boundedLeft + boundedWidth; x += 1) {
        const offset = ((y * imageWidth) + x) * channels;
        const r = data[offset] ?? 255;
        const g = data[offset + 1] ?? r;
        const b = data[offset + 2] ?? r;
        const luminance = (r + g + b) / 3;
        const purpleSignal = Math.max(0, (((r + b) / 2) - g - 8) / 255);
        const darkSignal = luminance < 160 ? ((160 - luminance) / 160) * 0.12 : 0;
        const combinedSignal = purpleSignal + darkSignal;

        if (combinedSignal > 0.02) {
          darkSum += combinedSignal;
          activePixelCount += 1;
        }
      }
    }

    const area = boundedWidth * boundedHeight;
    if (area <= 0) return 0;

    return (darkSum / area) + (activePixelCount / area) * 0.25;
  }

  private formatErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return 'Unknown scoresheet import error';
  }
}
