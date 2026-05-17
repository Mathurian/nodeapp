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
import {
  resolveTemplateByCriteria,
  scoreSheetImportTemplateMap,
  ScoreSheetTemplateDefinition,
  ScoreSheetTemplateKey,
  getTemplateCriterionMatchAlias,
} from '../config/scoreSheetImportTemplates';

const execFileAsync = promisify(execFile);

const NORMALIZED_WIDTH = 1000;
const NORMALIZED_HEIGHT = 1400;

type ScoreFileMetadata = {
  contextType?: 'CRITERION_COMMENT' | 'CONTESTANT' | 'CATEGORY' | 'SCORESHEET_IMPORT';
  criterionId?: string | null;
  noteText?: string | null;
  intent?: 'COMMENTARY_ATTACHMENT' | 'SCORESHEET_IMPORT';
  templateKey?: ScoreSheetTemplateKey | null;
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

type ProcessScoreFileOptions = {
  templateKey?: ScoreSheetTemplateKey | null;
};

type RawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

type GridGeometry = {
  horizontalBoundaries: number[];
  verticalBoundaries: number[];
};

@injectable()
export class ScoreSheetImportService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async processScoreFile(
    scoreFileId: string,
    tenantId: string,
    options?: ProcessScoreFileOptions,
  ): Promise<ScoreSheetImportDraftInfo> {
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
      const template = this.resolveTemplate(criteria, metadata, options);
      const orderedCriteria = this.orderCriteriaForTemplate(criteria, template);
      const rendered = await this.renderFirstPage(absolutePath, scoreFile.fileType);
      pageCount = rendered.pageCount;
      const normalized = await this.normalizePage(rendered.buffer);
      const analysis = this.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);

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

  private resolveTemplate(
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    metadata: ScoreFileMetadata,
    options?: ProcessScoreFileOptions,
  ): ScoreSheetTemplateDefinition {
    const explicitTemplateKey = options?.templateKey || metadata.templateKey || null;

    if (explicitTemplateKey) {
      const explicitTemplate = scoreSheetImportTemplateMap.get(explicitTemplateKey);
      if (!explicitTemplate || !explicitTemplate.supported) {
        throw new ValidationError(`Scoresheet import template ${explicitTemplateKey} is not supported`);
      }

      if (!this.templateCanOrderCriteria(criteria, explicitTemplate)) {
        throw new ValidationError(
          `Scoresheet import template ${explicitTemplate.displayName} does not match this category's criteria`,
        );
      }

      return explicitTemplate;
    }

    const inferredTemplate = resolveTemplateByCriteria(criteria.map((criterion) => criterion.name));
    if (!inferredTemplate) {
      throw new ValidationError(
        'Scoresheet import is not calibrated for this category yet. Use delegated entry or a manually reviewed import instead.',
      );
    }

    return inferredTemplate;
  }

  private templateCanOrderCriteria(
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): boolean {
    try {
      this.orderCriteriaForTemplate(criteria, template);
      return true;
    } catch {
      return false;
    }
  }

  private orderCriteriaForTemplate(
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): Array<{ id: string; name: string; maxScore: number }> {
    const unmatchedCriteria = [...criteria];

    return template.criteria.map((templateCriterion) => {
      const criterionIndex = unmatchedCriteria.findIndex(
        (criterion) => getTemplateCriterionMatchAlias(templateCriterion, criterion.name) !== null,
      );

      if (criterionIndex < 0) {
        throw new ValidationError(
          `Scoresheet import template ${template.displayName} is missing a match for criterion ${templateCriterion.label}`,
        );
      }

      const [matchedCriterion] = unmatchedCriteria.splice(criterionIndex, 1);
      if (!matchedCriterion) {
        throw new ValidationError(
          `Scoresheet import template ${template.displayName} could not order category criteria`,
        );
      }

      return matchedCriterion;
    });
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
      return this.renderPdfPage(filePath, 1);
    }

    const buffer = await fs.readFile(filePath);
    return { buffer, pageCount: 1 };
  }

  private async renderPdfPage(filePath: string, pageNumber: number): Promise<RenderedPage> {
    try {
      const buffer = await sharp(filePath, { density: 200, page: Math.max(0, pageNumber - 1) })
        .flatten({ background: '#ffffff' })
        .png()
        .toBuffer();

      return { buffer, pageCount: 1 };
    } catch {
      return this.renderPdfWithPdftoppm(filePath, pageNumber);
    }
  }

  private async renderPdfWithPdftoppm(filePath: string, pageNumber: number): Promise<RenderedPage> {
    const tempPrefix = path.join(
      os.tmpdir(),
      `scoresheet-import-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
    );
    const outputPath = `${tempPrefix}.png`;

    try {
      await execFileAsync('pdftoppm', [
        '-f',
        String(pageNumber),
        '-l',
        String(pageNumber),
        '-singlefile',
        '-png',
        filePath,
        tempPrefix,
      ]);
      const buffer = await sharp(outputPath)
        .png()
        .toBuffer();
      return { buffer, pageCount: 1 };
    } catch (error) {
      throw new ValidationError(
        `Unable to render PDF for scoresheet import: ${this.formatErrorMessage(error)}`,
      );
    } finally {
      try {
        await fs.unlink(outputPath);
      } catch {
        // ignore temp-file cleanup failures
      }
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
    template: ScoreSheetTemplateDefinition,
  ): {
    payload: ExtractionPayload;
    computedTotal: number;
    overallConfidence: number;
  } {
    const rowCount = criteria.length;
    if (rowCount <= 0) {
      throw new ValidationError('Scoresheet import requires at least one criterion');
    }

    const gridGeometry = this.resolveGridGeometry(image, template, rowCount);
    const extractedCriteria: CriterionExtraction[] = [];
    const mismatchWarnings: string[] = [];
    let computedTotal = 0;
    let confidenceSum = 0;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const criterion = criteria[rowIndex]!;
      const cellInkScores = template.scoreColumns.map((_, columnIndex) => {
        const columnLeftBoundary = gridGeometry.verticalBoundaries[columnIndex] ?? 0;
        const columnRightBoundary = gridGeometry.verticalBoundaries[columnIndex + 1] ?? image.width;
        const rowTopBoundary = gridGeometry.horizontalBoundaries[rowIndex] ?? 0;
        const rowBottomBoundary = gridGeometry.horizontalBoundaries[rowIndex + 1] ?? image.height;
        const columnWidth = Math.max(1, columnRightBoundary - columnLeftBoundary);
        const rowHeight = Math.max(1, rowBottomBoundary - rowTopBoundary);
        const left = Math.round(
          columnLeftBoundary + (columnWidth * template.grid.cellHorizontalPadding),
        );
        const top = Math.round(
          rowTopBoundary + (rowHeight * template.grid.cellVerticalPadding),
        );
        const width = Math.max(
          4,
          Math.round(columnWidth * (1 - (template.grid.cellHorizontalPadding * 2))),
        );
        const height = Math.max(
          4,
          Math.round(rowHeight * (1 - (template.grid.cellVerticalPadding * 2))),
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
      const ambiguous = !topCell
        || topCell.scoreValue < template.grid.minCellInkScore
        || confidence < template.grid.minConfidenceGap;
      const resolvedScoreValue: number | null = topCell
        ? (template.scoreColumns[topCell.index] ?? null)
        : null;
      const detectedScore: number | null = ambiguous ? null : resolvedScoreValue;
      const detectedColumnLabel = ambiguous || !topCell ? null : String(template.scoreColumns[topCell.index]);

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
        templateKey: template.key,
        normalizedImage: {
          width: image.width,
          height: image.height,
        },
        sheetBounds: image.bounds,
        scoreValues: [...template.scoreColumns],
        criteria: extractedCriteria,
        mismatchWarnings,
      },
      computedTotal,
      overallConfidence,
    };
  }

  private resolveGridGeometry(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    rowCount: number,
  ): GridGeometry {
    const fallbackHorizontal = this.buildFallbackBoundaries(
      image.height,
      template.grid.top,
      template.grid.bottom,
      rowCount,
    );
    const fallbackVertical = this.buildFallbackBoundaries(
      image.width,
      template.grid.left,
      template.grid.right,
      template.scoreColumns.length,
    );

    const detectedHorizontal = this.detectUniformLineSequence(
      image.data,
      image.width,
      image.channels,
      'horizontal',
      Math.round(image.width * 0.08),
      Math.round(image.width * 0.98),
      Math.max(0, (fallbackHorizontal[0] ?? 0) - 24),
      Math.min(image.height - 1, (fallbackHorizontal[fallbackHorizontal.length - 1] ?? image.height) + 24),
      rowCount + 1,
      fallbackHorizontal[0] ?? 0,
      fallbackHorizontal[fallbackHorizontal.length - 1] ?? image.height,
    );

    const detectedVertical = this.detectUniformLineSequence(
      image.data,
      image.width,
      image.channels,
      'vertical',
      Math.max(0, (fallbackHorizontal[0] ?? 0) + 8),
      Math.min(image.height - 1, (fallbackHorizontal[fallbackHorizontal.length - 1] ?? image.height) - 8),
      Math.max(0, (fallbackVertical[0] ?? 0) - 24),
      Math.min(image.width - 1, (fallbackVertical[fallbackVertical.length - 1] ?? image.width) + 24),
      template.scoreColumns.length + 1,
      fallbackVertical[0] ?? 0,
      fallbackVertical[fallbackVertical.length - 1] ?? image.width,
    );

    return {
      horizontalBoundaries: detectedHorizontal ?? fallbackHorizontal,
      verticalBoundaries: detectedVertical ?? fallbackVertical,
    };
  }

  private buildFallbackBoundaries(
    imageDimension: number,
    startRatio: number,
    endRatio: number,
    segmentCount: number,
  ): number[] {
    const start = Math.round(imageDimension * startRatio);
    const end = Math.round(imageDimension * endRatio);
    const segmentSize = (end - start) / segmentCount;

    return Array.from({ length: segmentCount + 1 }, (_value, index) =>
      Math.round(start + (segmentSize * index)),
    );
  }

  private detectUniformLineSequence(
    data: Buffer,
    imageWidth: number,
    channels: number,
    axis: 'horizontal' | 'vertical',
    orthogonalStart: number,
    orthogonalEnd: number,
    scanStart: number,
    scanEnd: number,
    expectedCount: number,
    expectedStart: number,
    expectedEnd: number,
  ): number[] | null {
    const lineScores: number[] = [];

    for (let position = scanStart; position <= scanEnd; position += 1) {
      let darkPixelCount = 0;
      let totalPixelCount = 0;

      if (axis === 'horizontal') {
        for (let x = orthogonalStart; x <= orthogonalEnd; x += 1) {
          const offset = ((position * imageWidth) + x) * channels;
          const r = data[offset] ?? 255;
          const g = data[offset + 1] ?? r;
          const b = data[offset + 2] ?? r;
          const luminance = (r + g + b) / 3;
          if (luminance < 110) {
            darkPixelCount += 1;
          }
          totalPixelCount += 1;
        }
      } else {
        for (let y = orthogonalStart; y <= orthogonalEnd; y += 1) {
          const offset = ((y * imageWidth) + position) * channels;
          const r = data[offset] ?? 255;
          const g = data[offset + 1] ?? r;
          const b = data[offset + 2] ?? r;
          const luminance = (r + g + b) / 3;
          if (luminance < 110) {
            darkPixelCount += 1;
          }
          totalPixelCount += 1;
        }
      }

      lineScores.push(totalPixelCount > 0 ? darkPixelCount / totalPixelCount : 0);
    }

    const threshold = axis === 'horizontal' ? 0.32 : 0.24;
    const centers: number[] = [];
    let bandStart: number | null = null;

    for (let index = 0; index < lineScores.length; index += 1) {
      const score = lineScores[index] ?? 0;
      if (score >= threshold) {
        if (bandStart === null) {
          bandStart = index;
        }
      } else if (bandStart !== null) {
        centers.push(scanStart + Math.round((bandStart + index - 1) / 2));
        bandStart = null;
      }
    }

    if (bandStart !== null) {
      centers.push(scanStart + Math.round((bandStart + lineScores.length - 1) / 2));
    }

    if (centers.length < expectedCount) {
      return null;
    }

    let bestSequence: number[] | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let startIndex = 0; startIndex <= centers.length - expectedCount; startIndex += 1) {
      const sequence = centers.slice(startIndex, startIndex + expectedCount);
      const gaps = sequence.slice(1).map((value, index) => value - sequence[index]!);
      const averageGap = gaps.reduce((sum, value) => sum + value, 0) / Math.max(gaps.length, 1);
      const varianceScore = gaps.reduce((sum, value) => sum + Math.abs(value - averageGap), 0);
      const anchorPenalty = Math.abs((sequence[0] ?? expectedStart) - expectedStart)
        + Math.abs((sequence[sequence.length - 1] ?? expectedEnd) - expectedEnd);
      const totalScore = varianceScore + (anchorPenalty * 2.5);

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestSequence = sequence;
      }
    }

    return bestSequence;
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
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const purpleSignal = Math.max(0, (((r + b) / 2) - g - 2) / 255);
        const darkSignal = luminance < 150 ? ((150 - luminance) / 150) : 0;
        const neutralDarkWeight = chroma < 14 ? 0.025 : 0.085;
        const edgeDistanceX = Math.min(x - boundedLeft, (boundedLeft + boundedWidth - 1) - x);
        const edgeDistanceY = Math.min(y - boundedTop, (boundedTop + boundedHeight - 1) - y);
        const edgeDistance = Math.min(edgeDistanceX, edgeDistanceY);
        const edgeWeight = edgeDistance <= 2 ? 0.25 : edgeDistance <= 4 ? 0.55 : 1;
        const combinedSignal = ((purpleSignal * 1.8) + (darkSignal * neutralDarkWeight)) * edgeWeight;

        if (combinedSignal > 0.006) {
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
