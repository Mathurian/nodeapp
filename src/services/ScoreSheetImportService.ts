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
const DEFAULT_PREPROCESSING_MODE = 'standard';
const DEFAULT_SCAN_THRESHOLD_STRATEGY = 'otsu';
const SCORE_SHEET_IMPORT_ATTEMPT_LIMIT = 2;
const LOW_CONFIDENCE_ROW_THRESHOLD = 0.45;

type CaptureQualityThresholds = {
  maxAmbiguousRowsForReview: number;
  maxEstimatedCorrectionRowsForReview: number;
  minOverallConfidenceForReview: number;
  minContrastRange: number;
  minDarkPixelRatio: number;
  maxDarkPixelRatio: number;
  maxDespeckledPixelRatio: number;
};

const QUALITY_GATE_THRESHOLDS: CaptureQualityThresholds = {
  maxAmbiguousRowsForReview: 1,
  maxEstimatedCorrectionRowsForReview: 3,
  minOverallConfidenceForReview: 0.18,
  minContrastRange: 18,
  minDarkPixelRatio: 0.002,
  maxDarkPixelRatio: 0.35,
  maxDespeckledPixelRatio: 0.02,
};

type ScoreSheetPreprocessingMode = 'standard' | 'scan_bw';
type ScoreSheetThresholdStrategy = 'none' | 'otsu' | 'fixed_150' | 'fixed_170' | 'fixed_190';

type PreprocessingQualitySignals = {
  darkPixelRatio: number;
  midtonePixelRatio: number;
  contrastRange: number;
  thresholdValue: number | null;
  despeckledPixelRatio: number;
};

type PreprocessingMetadata = {
  preprocessingMode: ScoreSheetPreprocessingMode;
  thresholdStrategy: ScoreSheetThresholdStrategy;
  qualitySignals: PreprocessingQualitySignals;
};

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

type ReviewBurdenMetrics = {
  rowCount: number;
  detectedScoreRowCount: number;
  ambiguousRowCount: number;
  lowConfidenceRowCount: number;
  missingScoreRowCount: number;
  mismatchWarningCount: number;
  rowsRequiringReviewCount: number;
  estimatedManualCorrectionRows: number;
  estimatedManualCorrectionRatio: number;
};

type CaptureQualityGate = {
  decision: 'accepted_for_review' | 'manual_entry_required';
  reasons: string[];
  blockingReasons: string[];
  retryable: boolean;
  attemptLimit: number;
  recommendedAction: 'review_extracted_scores' | 'retry_upload_or_manual_entry';
  manualEntryOwner: 'attempting_user';
  thresholds: CaptureQualityThresholds;
};

type ExtractionPayload = {
  templateKey: string;
  preprocessingMode: ScoreSheetPreprocessingMode;
  thresholdStrategy: ScoreSheetThresholdStrategy;
  qualitySignals: PreprocessingQualitySignals;
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
  gridAnchoring: GridAnchoringMetadata;
  reviewBurdenMetrics: ReviewBurdenMetrics;
  qualityGate: CaptureQualityGate;
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
  preprocessingMode?: ScoreSheetPreprocessingMode;
  thresholdStrategy?: ScoreSheetThresholdStrategy;
};

type RawImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
};

type NormalizedImage = RawImage & {
  bounds: { left: number; top: number; width: number; height: number };
  preprocessing: PreprocessingMetadata;
};

type GridGeometry = {
  horizontalBoundaries: number[];
  verticalBoundaries: number[];
  anchoring: GridAnchoringMetadata;
};

type GridAnchoringMetadata = {
  horizontalAnchored: boolean;
  verticalAnchored: boolean;
  horizontalLineCount: number;
  verticalLineCount: number;
  usedFallback: boolean;
};

type LineSequenceDetection = {
  boundaries: number[];
  candidateCount: number;
  score: number;
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
      const normalized = await this.normalizePage(rendered.buffer, {
        preprocessingMode: options?.preprocessingMode,
        thresholdStrategy: options?.thresholdStrategy,
      });
      const analysis = this.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);

      extraction = analysis.payload;
      computedTotal = analysis.computedTotal;
      overallConfidence = analysis.overallConfidence;
      if (extraction.qualityGate.decision === 'manual_entry_required') {
        draftStatus = 'rejected';
        processingError = this.formatQualityGateRejection(extraction.qualityGate);
      }
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
        'Scoresheet import is not calibrated for this category yet. Enter the scores manually as the attempting user.',
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

  private async normalizePage(
    buffer: Buffer,
    options?: {
      preprocessingMode?: ScoreSheetPreprocessingMode;
      thresholdStrategy?: ScoreSheetThresholdStrategy;
    },
  ): Promise<NormalizedImage> {
    const preprocessingMode = options?.preprocessingMode ?? DEFAULT_PREPROCESSING_MODE;
    const thresholdStrategy = this.resolveThresholdStrategy(preprocessingMode, options?.thresholdStrategy);
    const preprocessed = await sharp(buffer)
      .rotate()
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
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
      .toColourspace('srgb')
      .extract(bounds)
      .resize(NORMALIZED_WIDTH, NORMALIZED_HEIGHT, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const normalizedImage: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
    } = {
      data: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      channels: normalized.info.channels,
      bounds,
    };

    if (preprocessingMode === 'scan_bw') {
      return this.applyScanNormalization(normalizedImage, thresholdStrategy);
    }

    return {
      ...normalizedImage,
      preprocessing: {
        preprocessingMode: DEFAULT_PREPROCESSING_MODE,
        thresholdStrategy: 'none',
        qualitySignals: this.measureImageQuality(normalizedImage, null, 0),
      },
    };
  }

  private resolveThresholdStrategy(
    preprocessingMode: ScoreSheetPreprocessingMode,
    thresholdStrategy?: ScoreSheetThresholdStrategy,
  ): ScoreSheetThresholdStrategy {
    if (preprocessingMode === 'standard') {
      return 'none';
    }

    if (!thresholdStrategy || thresholdStrategy === 'none') {
      return DEFAULT_SCAN_THRESHOLD_STRATEGY;
    }

    return thresholdStrategy;
  }

  private applyScanNormalization(
    image: RawImage & { bounds: { left: number; top: number; width: number; height: number } },
    thresholdStrategy: ScoreSheetThresholdStrategy,
  ): NormalizedImage {
    const effectiveThresholdStrategy = thresholdStrategy === 'none'
      ? DEFAULT_SCAN_THRESHOLD_STRATEGY
      : thresholdStrategy;
    const pixelCount = image.width * image.height;
    const grayscale = Buffer.alloc(pixelCount);
    const histogram = Array.from({ length: 256 }, () => 0);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const offset = pixelIndex * image.channels;
      const r = image.data[offset] ?? 255;
      const g = image.data[offset + 1] ?? r;
      const b = image.data[offset + 2] ?? r;
      const luminance = Math.round((r * 0.299) + (g * 0.587) + (b * 0.114));
      const boundedLuminance = Math.max(0, Math.min(255, luminance));
      grayscale[pixelIndex] = boundedLuminance;
      histogram[boundedLuminance] = (histogram[boundedLuminance] ?? 0) + 1;
    }

    const lowPercentile = this.findHistogramPercentile(histogram, pixelCount, 0.02);
    const highPercentile = this.findHistogramPercentile(histogram, pixelCount, 0.98);
    const contrastLow = Math.min(lowPercentile, Math.max(0, highPercentile - 8));
    const contrastHigh = Math.max(highPercentile, contrastLow + 8);
    const contrastRange = contrastHigh - contrastLow;
    const stretched = Buffer.alloc(pixelCount);
    const stretchedHistogram = Array.from({ length: 256 }, () => 0);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const value = grayscale[pixelIndex] ?? 255;
      const stretchedValue = Math.round(
        Math.max(0, Math.min(255, ((value - contrastLow) / contrastRange) * 255)),
      );
      stretched[pixelIndex] = stretchedValue;
      stretchedHistogram[stretchedValue] = (stretchedHistogram[stretchedValue] ?? 0) + 1;
    }

    const thresholdValue = this.resolveThresholdValue(effectiveThresholdStrategy, stretchedHistogram, pixelCount);
    const thresholded = Buffer.alloc(pixelCount);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      thresholded[pixelIndex] = (stretched[pixelIndex] ?? 255) <= thresholdValue ? 0 : 255;
    }

    const { data: despeckled, removedPixelCount } = this.removeIsolatedDarkPixels(
      thresholded,
      image.width,
      image.height,
    );
    const output = Buffer.alloc(pixelCount * image.channels);

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const value = despeckled[pixelIndex] ?? 255;
      const offset = pixelIndex * image.channels;
      for (let channelIndex = 0; channelIndex < image.channels; channelIndex += 1) {
        output[offset + channelIndex] = value;
      }
    }

    return {
      data: output,
      width: image.width,
      height: image.height,
      channels: image.channels,
      bounds: image.bounds,
      preprocessing: {
        preprocessingMode: 'scan_bw',
        thresholdStrategy: effectiveThresholdStrategy,
        qualitySignals: this.measureImageQuality(
          {
            data: output,
            width: image.width,
            height: image.height,
            channels: image.channels,
          },
          thresholdValue,
          removedPixelCount,
        ),
      },
    };
  }

  private findHistogramPercentile(histogram: number[], pixelCount: number, percentile: number): number {
    if (pixelCount <= 0) return 0;

    const target = Math.max(1, Math.ceil(pixelCount * percentile));
    let cumulative = 0;

    for (let value = 0; value < histogram.length; value += 1) {
      cumulative += histogram[value] ?? 0;
      if (cumulative >= target) {
        return value;
      }
    }

    return 255;
  }

  private resolveThresholdValue(
    thresholdStrategy: ScoreSheetThresholdStrategy,
    histogram: number[],
    pixelCount: number,
  ): number {
    if (thresholdStrategy === 'fixed_150') return 150;
    if (thresholdStrategy === 'fixed_170') return 170;
    if (thresholdStrategy === 'fixed_190') return 190;

    return this.computeOtsuThreshold(histogram, pixelCount);
  }

  private computeOtsuThreshold(histogram: number[], pixelCount: number): number {
    if (pixelCount <= 0) return 170;

    let totalWeightedValue = 0;
    for (let value = 0; value < histogram.length; value += 1) {
      totalWeightedValue += value * (histogram[value] ?? 0);
    }

    let backgroundWeight = 0;
    let backgroundWeightedValue = 0;
    let bestThreshold = 170;
    let bestVariance = -1;

    for (let threshold = 0; threshold < histogram.length; threshold += 1) {
      const count = histogram[threshold] ?? 0;
      backgroundWeight += count;
      if (backgroundWeight === 0) continue;

      const foregroundWeight = pixelCount - backgroundWeight;
      if (foregroundWeight === 0) break;

      backgroundWeightedValue += threshold * count;
      const backgroundMean = backgroundWeightedValue / backgroundWeight;
      const foregroundMean = (totalWeightedValue - backgroundWeightedValue) / foregroundWeight;
      const variance = backgroundWeight * foregroundWeight * ((backgroundMean - foregroundMean) ** 2);

      if (variance > bestVariance) {
        bestVariance = variance;
        bestThreshold = threshold;
      }
    }

    return bestThreshold;
  }

  private removeIsolatedDarkPixels(data: Buffer, width: number, height: number): {
    data: Buffer;
    removedPixelCount: number;
  } {
    const output = Buffer.from(data);
    let removedPixelCount = 0;

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width) + x;
        if ((data[index] ?? 255) > 0) continue;

        let darkNeighborCount = 0;
        for (let neighborY = y - 1; neighborY <= y + 1; neighborY += 1) {
          for (let neighborX = x - 1; neighborX <= x + 1; neighborX += 1) {
            if (neighborX === x && neighborY === y) continue;
            const neighborIndex = (neighborY * width) + neighborX;
            if ((data[neighborIndex] ?? 255) === 0) {
              darkNeighborCount += 1;
            }
          }
        }

        if (darkNeighborCount <= 1) {
          output[index] = 255;
          removedPixelCount += 1;
        }
      }
    }

    return { data: output, removedPixelCount };
  }

  private measureImageQuality(
    image: RawImage,
    thresholdValue: number | null,
    removedPixelCount: number,
  ): PreprocessingQualitySignals {
    const pixelCount = image.width * image.height;
    if (pixelCount <= 0) {
      return {
        darkPixelRatio: 0,
        midtonePixelRatio: 0,
        contrastRange: 0,
        thresholdValue,
        despeckledPixelRatio: 0,
      };
    }

    const histogram = Array.from({ length: 256 }, () => 0);
    let darkPixelCount = 0;
    let midtonePixelCount = 0;

    for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
      const offset = pixelIndex * image.channels;
      const r = image.data[offset] ?? 255;
      const g = image.data[offset + 1] ?? r;
      const b = image.data[offset + 2] ?? r;
      const luminance = Math.round((r * 0.299) + (g * 0.587) + (b * 0.114));
      const boundedLuminance = Math.max(0, Math.min(255, luminance));
      histogram[boundedLuminance] = (histogram[boundedLuminance] ?? 0) + 1;

      if (boundedLuminance < 150) {
        darkPixelCount += 1;
      }
      if (boundedLuminance >= 80 && boundedLuminance <= 220) {
        midtonePixelCount += 1;
      }
    }

    const lowPercentile = this.findHistogramPercentile(histogram, pixelCount, 0.02);
    const highPercentile = this.findHistogramPercentile(histogram, pixelCount, 0.98);

    return {
      darkPixelRatio: Number((darkPixelCount / pixelCount).toFixed(6)),
      midtonePixelRatio: Number((midtonePixelCount / pixelCount).toFixed(6)),
      contrastRange: Math.max(0, highPercentile - lowPercentile),
      thresholdValue,
      despeckledPixelRatio: Number((removedPixelCount / pixelCount).toFixed(6)),
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
    image: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
      preprocessing?: PreprocessingMetadata;
    },
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
    const gridAnchorReliable =
      gridGeometry.anchoring.horizontalAnchored && gridGeometry.anchoring.verticalAnchored;

    if (!gridAnchorReliable) {
      mismatchWarnings.push(
        'Scoresheet import could not anchor both printed grid axes; score rows were treated as ambiguous.',
      );
    }

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const criterion = criteria[rowIndex]!;
      const rowInkScores = this.measureScoreRowInk(
        image,
        gridGeometry,
        template,
        rowIndex,
      );
      const windowInkScores = this.measureScoreRowWindowInk(
        image,
        gridGeometry,
        template,
        rowIndex,
      );
      const rowColorSignal = this.measureScoreRowColorSignal(image, gridGeometry, template, rowIndex);
      const cellInkScores = this.selectCellInkScores(rowInkScores, windowInkScores, rowColorSignal);

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
    const preprocessing = image.preprocessing ?? {
      preprocessingMode: DEFAULT_PREPROCESSING_MODE,
      thresholdStrategy: 'none' as const,
      qualitySignals: this.measureImageQuality(image, null, 0),
    };
    const reviewBurdenMetrics = this.buildReviewBurdenMetrics(extractedCriteria, mismatchWarnings);
    const qualityGate = this.assessCaptureQuality({
      gridAnchoring: gridGeometry.anchoring,
      overallConfidence,
      qualitySignals: preprocessing.qualitySignals,
      reviewBurdenMetrics,
    });

    return {
      payload: {
        templateKey: template.key,
        preprocessingMode: preprocessing.preprocessingMode,
        thresholdStrategy: preprocessing.thresholdStrategy,
        qualitySignals: preprocessing.qualitySignals,
        normalizedImage: {
          width: image.width,
          height: image.height,
        },
        sheetBounds: image.bounds,
        gridAnchoring: gridGeometry.anchoring,
        reviewBurdenMetrics,
        qualityGate,
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

    const horizontalAnchored = Boolean(detectedHorizontal);
    const verticalAnchored = Boolean(detectedVertical);

    return {
      horizontalBoundaries: detectedHorizontal?.boundaries ?? fallbackHorizontal,
      verticalBoundaries: detectedVertical?.boundaries ?? fallbackVertical,
      anchoring: {
        horizontalAnchored,
        verticalAnchored,
        horizontalLineCount: detectedHorizontal?.candidateCount ?? 0,
        verticalLineCount: detectedVertical?.candidateCount ?? 0,
        usedFallback: !horizontalAnchored || !verticalAnchored,
      },
    };
  }

  private buildReviewBurdenMetrics(
    criteria: CriterionExtraction[],
    mismatchWarnings: string[],
  ): ReviewBurdenMetrics {
    const rowCount = criteria.length;
    const manualCorrectionCandidates = new Set<number>();
    let detectedScoreRowCount = 0;
    let ambiguousRowCount = 0;
    let lowConfidenceRowCount = 0;
    let missingScoreRowCount = 0;

    criteria.forEach((criterion) => {
      if (criterion.detectedScore !== null) {
        detectedScoreRowCount += 1;
      } else {
        missingScoreRowCount += 1;
        manualCorrectionCandidates.add(criterion.rowIndex);
      }

      if (criterion.ambiguous) {
        ambiguousRowCount += 1;
        manualCorrectionCandidates.add(criterion.rowIndex);
      }

      if (criterion.confidence < LOW_CONFIDENCE_ROW_THRESHOLD) {
        lowConfidenceRowCount += 1;
        manualCorrectionCandidates.add(criterion.rowIndex);
      }
    });

    const estimatedManualCorrectionRows = Math.min(
      rowCount,
      manualCorrectionCandidates.size + mismatchWarnings.length,
    );

    return {
      rowCount,
      detectedScoreRowCount,
      ambiguousRowCount,
      lowConfidenceRowCount,
      missingScoreRowCount,
      mismatchWarningCount: mismatchWarnings.length,
      rowsRequiringReviewCount: rowCount,
      estimatedManualCorrectionRows,
      estimatedManualCorrectionRatio: rowCount > 0
        ? Number((estimatedManualCorrectionRows / rowCount).toFixed(4))
        : 0,
    };
  }

  private assessCaptureQuality(input: {
    gridAnchoring: GridAnchoringMetadata;
    overallConfidence: number;
    qualitySignals: PreprocessingQualitySignals;
    reviewBurdenMetrics: ReviewBurdenMetrics;
  }): CaptureQualityGate {
    const blockingReasons: string[] = [];
    const reasons: string[] = [];

    const addBlockingReason = (reason: string): void => {
      blockingReasons.push(reason);
      reasons.push(reason);
    };

    if (!input.gridAnchoring.horizontalAnchored || !input.gridAnchoring.verticalAnchored) {
      addBlockingReason('The printed score grid could not be anchored on both axes.');
    }

    if (input.reviewBurdenMetrics.ambiguousRowCount > QUALITY_GATE_THRESHOLDS.maxAmbiguousRowsForReview) {
      addBlockingReason(
        `The draft has ${input.reviewBurdenMetrics.ambiguousRowCount} ambiguous rows; the review limit is ${QUALITY_GATE_THRESHOLDS.maxAmbiguousRowsForReview}.`,
      );
    }

    if (
      input.reviewBurdenMetrics.estimatedManualCorrectionRows
        > QUALITY_GATE_THRESHOLDS.maxEstimatedCorrectionRowsForReview
    ) {
      addBlockingReason(
        `The draft is estimated to need ${input.reviewBurdenMetrics.estimatedManualCorrectionRows} row corrections; the review limit is ${QUALITY_GATE_THRESHOLDS.maxEstimatedCorrectionRowsForReview}.`,
      );
    }

    if (input.overallConfidence < QUALITY_GATE_THRESHOLDS.minOverallConfidenceForReview) {
      addBlockingReason(
        `Overall extraction confidence ${Math.round(input.overallConfidence * 100)}% is below the review limit.`,
      );
    }

    if (input.qualitySignals.contrastRange < QUALITY_GATE_THRESHOLDS.minContrastRange) {
      addBlockingReason('The upload contrast is too low for reliable score extraction.');
    }

    if (input.qualitySignals.darkPixelRatio < QUALITY_GATE_THRESHOLDS.minDarkPixelRatio) {
      addBlockingReason('The upload has too little dark ink to identify a complete scoresheet.');
    }

    if (input.qualitySignals.darkPixelRatio > QUALITY_GATE_THRESHOLDS.maxDarkPixelRatio) {
      addBlockingReason('The upload is too dark or shadowed for reliable score extraction.');
    }

    if (input.qualitySignals.despeckledPixelRatio > QUALITY_GATE_THRESHOLDS.maxDespeckledPixelRatio) {
      addBlockingReason('The upload has too much speckle noise for reliable score extraction.');
    }

    if (reasons.length === 0) {
      reasons.push('The upload passed capture-quality gates and still requires row-by-row review.');
    }

    const accepted = blockingReasons.length === 0;

    return {
      decision: accepted ? 'accepted_for_review' : 'manual_entry_required',
      reasons,
      blockingReasons,
      retryable: !accepted,
      attemptLimit: SCORE_SHEET_IMPORT_ATTEMPT_LIMIT,
      recommendedAction: accepted ? 'review_extracted_scores' : 'retry_upload_or_manual_entry',
      manualEntryOwner: 'attempting_user',
      thresholds: QUALITY_GATE_THRESHOLDS,
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
  ): LineSequenceDetection | null {
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

    const candidateCount = centers.length;

    if (candidateCount < expectedCount) {
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

    return bestSequence
      ? {
        boundaries: bestSequence,
        candidateCount,
        score: bestScore,
      }
      : null;
  }

  private measureScoreRowWindowInk(
    image: RawImage,
    gridGeometry: GridGeometry,
    template: ScoreSheetTemplateDefinition,
    rowIndex: number,
  ): number[] {
    return template.scoreColumns.map((_, columnIndex) => {
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

      return this.measureCellInk(image, left, top, width, height);
    });
  }

  private selectCellInkScores(
    rowInkScores: number[],
    windowInkScores: number[],
    rowColorSignal: number,
  ): number[] {
    const rowRanked = this.rankInkScores(rowInkScores);
    const windowRanked = this.rankInkScores(windowInkScores);
    const rowTop = rowRanked[0]?.scoreValue ?? 0;
    const rowSecond = rowRanked[1]?.scoreValue ?? 0;
    const windowTop = windowRanked[0]?.scoreValue ?? 0;
    const windowSecond = windowRanked[1]?.scoreValue ?? 0;
    const rowConfidence = rowTop > 0 ? (rowTop - rowSecond) / rowTop : 0;
    const windowConfidence = windowTop > 0 ? (windowTop - windowSecond) / windowTop : 0;
    const focusedWindowMark =
      windowConfidence >= 0.9 && windowTop >= Math.max(0.0015, rowTop * 1.2);
    const rowIsNoisy = rowTop > 0 && rowConfidence < 0.2;
    const coloredPenWindow = rowColorSignal >= 0.00005 && windowConfidence >= 0.35;

    if (focusedWindowMark || coloredPenWindow || (windowConfidence >= 0.65 && rowIsNoisy)) {
      return windowInkScores;
    }

    return rowInkScores;
  }

  private rankInkScores(scores: number[]): Array<{ scoreValue: number; index: number }> {
    return scores
      .map((scoreValue, index) => ({ scoreValue, index }))
      .sort((a, b) => b.scoreValue - a.scoreValue);
  }

  private measureScoreRowColorSignal(
    image: RawImage,
    gridGeometry: GridGeometry,
    template: ScoreSheetTemplateDefinition,
    rowIndex: number,
  ): number {
    const rowTopBoundary = gridGeometry.horizontalBoundaries[rowIndex] ?? 0;
    const rowBottomBoundary = gridGeometry.horizontalBoundaries[rowIndex + 1] ?? image.height;
    const rowHeight = Math.max(1, rowBottomBoundary - rowTopBoundary);
    const rowTop = Math.max(
      0,
      Math.round(rowTopBoundary + (rowHeight * template.grid.cellVerticalPadding)),
    );
    const rowBottom = Math.min(
      image.height - 1,
      Math.round(rowBottomBoundary - (rowHeight * template.grid.cellVerticalPadding)),
    );
    const leftBoundary = gridGeometry.verticalBoundaries[0] ?? 0;
    const rightBoundary = gridGeometry.verticalBoundaries[template.scoreColumns.length] ?? image.width;
    const width = Math.max(1, rightBoundary - leftBoundary);
    const lineGuard = Math.max(2, Math.round(rowHeight * 0.08));
    let colorSignal = 0;
    let area = 0;

    for (let y = rowTop; y <= rowBottom; y += 1) {
      const rowEdgeDistance = Math.min(y - rowTopBoundary, rowBottomBoundary - y);
      if (rowEdgeDistance <= lineGuard) continue;

      for (let x = leftBoundary; x <= rightBoundary; x += 1) {
        const onVerticalGridLine = gridGeometry.verticalBoundaries.some((boundary) =>
          Math.abs(x - boundary) <= lineGuard,
        );
        if (onVerticalGridLine) continue;

        const offset = ((y * image.width) + x) * image.channels;
        const r = image.data[offset] ?? 255;
        const g = image.data[offset + 1] ?? r;
        const b = image.data[offset + 2] ?? r;
        const chroma = Math.max(r, g, b) - Math.min(r, g, b);
        const purpleSignal = chroma >= 8
          ? Math.max(0, (((r + b) / 2) - g - 2) / 255)
          : 0;

        if (purpleSignal > 0.01) {
          colorSignal += purpleSignal;
        }
        area += 1;
      }
    }

    return area > 0 ? colorSignal / Math.max(area, width) : 0;
  }

  private measureScoreRowInk(
    image: RawImage,
    gridGeometry: GridGeometry,
    template: ScoreSheetTemplateDefinition,
    rowIndex: number,
  ): number[] {
    const rowTopBoundary = gridGeometry.horizontalBoundaries[rowIndex] ?? 0;
    const rowBottomBoundary = gridGeometry.horizontalBoundaries[rowIndex + 1] ?? image.height;
    const rowHeight = Math.max(1, rowBottomBoundary - rowTopBoundary);
    const rowTop = Math.max(
      0,
      Math.round(rowTopBoundary + (rowHeight * template.grid.cellVerticalPadding)),
    );
    const rowBottom = Math.min(
      image.height - 1,
      Math.round(rowBottomBoundary - (rowHeight * template.grid.cellVerticalPadding)),
    );
    const scores = template.scoreColumns.map(() => 0);
    const activePixelCounts = template.scoreColumns.map(() => 0);
    const columnAreas = template.scoreColumns.map((_, columnIndex) => {
      const columnLeftBoundary = gridGeometry.verticalBoundaries[columnIndex] ?? 0;
      const columnRightBoundary = gridGeometry.verticalBoundaries[columnIndex + 1] ?? image.width;
      const columnWidth = Math.max(1, columnRightBoundary - columnLeftBoundary);
      const columnLeft = Math.max(
        0,
        Math.round(columnLeftBoundary + (columnWidth * template.grid.cellHorizontalPadding)),
      );
      const columnRight = Math.min(
        image.width - 1,
        Math.round(columnRightBoundary - (columnWidth * template.grid.cellHorizontalPadding)),
      );
      const width = Math.max(1, columnRight - columnLeft + 1);
      const height = Math.max(1, rowBottom - rowTop + 1);

      return {
        columnLeft,
        columnRight,
        columnWidth,
        area: width * height,
      };
    });

    const lineGuard = Math.max(2, Math.round(rowHeight * 0.08));

    for (let y = rowTop; y <= rowBottom; y += 1) {
      const rowEdgeDistance = Math.min(y - rowTopBoundary, rowBottomBoundary - y);
      if (rowEdgeDistance <= lineGuard) continue;

      for (let columnIndex = 0; columnIndex < template.scoreColumns.length; columnIndex += 1) {
        const column = columnAreas[columnIndex]!;
        const columnLeftBoundary = gridGeometry.verticalBoundaries[columnIndex] ?? 0;
        const columnRightBoundary = gridGeometry.verticalBoundaries[columnIndex + 1] ?? image.width;

        for (let x = column.columnLeft; x <= column.columnRight; x += 1) {
          const columnEdgeDistance = Math.min(x - columnLeftBoundary, columnRightBoundary - x);
          if (columnEdgeDistance <= lineGuard) continue;

          const offset = ((y * image.width) + x) * image.channels;
          const r = image.data[offset] ?? 255;
          const g = image.data[offset + 1] ?? r;
          const b = image.data[offset + 2] ?? r;
          const luminance = (r + g + b) / 3;
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          const purpleSignal = chroma >= 8
            ? Math.max(0, (((r + b) / 2) - g - 2) / 255)
            : 0;
          const darkSignal = luminance < 145 ? ((145 - luminance) / 145) : 0;
          const neutralDarkWeight = chroma < 12 ? 0.42 : 0.2;
          const markSignal = (purpleSignal * 2.3) + (darkSignal * neutralDarkWeight);

          if (markSignal > 0.025) {
            scores[columnIndex] = (scores[columnIndex] ?? 0) + markSignal;
            activePixelCounts[columnIndex] = (activePixelCounts[columnIndex] ?? 0) + 1;
          }
        }
      }
    }

    return scores.map((score, index) => {
      const area = columnAreas[index]?.area ?? 1;
      const activePixelRatio = (activePixelCounts[index] ?? 0) / area;
      return (score / area) + (activePixelRatio * 0.28);
    });
  }

  private measureCellInk(
    image: RawImage,
    left: number,
    top: number,
    width: number,
    height: number,
  ): number {
    const boundedLeft = Math.max(0, Math.min(image.width - 1, left));
    const boundedTop = Math.max(0, Math.min(image.height - 1, top));
    const boundedWidth = Math.max(1, Math.min(width, image.width - boundedLeft));
    const boundedHeight = Math.max(1, Math.min(height, image.height - boundedTop));
    let darkSum = 0;
    let activePixelCount = 0;

    for (let y = boundedTop; y < boundedTop + boundedHeight; y += 1) {
      for (let x = boundedLeft; x < boundedLeft + boundedWidth; x += 1) {
        const offset = ((y * image.width) + x) * image.channels;
        const r = image.data[offset] ?? 255;
        const g = image.data[offset + 1] ?? r;
        const b = image.data[offset + 2] ?? r;
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

  private formatQualityGateRejection(qualityGate: CaptureQualityGate): string {
    const reasons = qualityGate.blockingReasons.length > 0
      ? qualityGate.blockingReasons
      : qualityGate.reasons;

    return [
      'Scoresheet upload did not pass import quality gates.',
      ...reasons,
      `Retry with a clearer scan up to ${qualityGate.attemptLimit} attempts, then enter scores manually as the attempting user.`,
    ].join(' ');
  }
}
