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
const FALSE_HIGH_CONFIDENCE_MARK_THRESHOLD = 0.75;
const EDUCATION_OMR_V3_TEMPLATE_KEY: ScoreSheetTemplateKey = 'education_omr_v3';
const EDUCATION_OMR_V3_VERSION_BITS = [1, 1, 0, 0, 0, 0, 1, 1] as const;
const MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO = 0.12;
const MACHINE_READABLE_VERSION_MIN_CONFIDENCE = 0.7;
const V3_PAGE_WIDTH_INCHES = 8.5;
const V3_PAGE_HEIGHT_INCHES = 11;
const V3_ANCHOR_OFFSET_INCHES = 0.3;
const V3_ANCHOR_SIZE_INCHES = 0.22;
const V3_DIRECT_MIN_MARK_SCORE = 0.42;
const V3_DIRECT_MULTI_MARK_SCORE = 0.42;
const V3_DIRECT_MULTI_MARK_RATIO = 0.72;
const V3_DIRECT_MIN_CONFIDENCE_GAP = 0.18;

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
const V3_SCAN_FALLBACK_THRESHOLD_STRATEGIES: ScoreSheetThresholdStrategy[] = [
  'otsu',
  'fixed_150',
  'fixed_170',
];

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

type MachineReadableAnchorQuality = {
  detected: boolean;
  minCornerDarkRatio: number;
  cornerDarkRatios: MachineReadableCornerDarkRatios;
  versionStripConfidence: number;
  versionBits: number[];
  fiducials?: MachineReadableFiducialMetadata;
};

type MachineReadableCornerDarkRatios = Record<V3FiducialCornerLabel, number>;

type MachineReadableFiducialPoint = {
  x: number;
  y: number;
  width: number;
  height: number;
  fillRatio: number;
};

type MachineReadableFiducialMetadata = {
  detected: boolean;
  confidence: number;
  perspectiveCorrected: boolean;
  failureReasons: string[];
  captureQualityRejection: V3CaptureQualityRejection | null;
  corners: {
    tl: MachineReadableFiducialPoint;
    tr: MachineReadableFiducialPoint;
    bl: MachineReadableFiducialPoint;
    br: MachineReadableFiducialPoint;
  } | null;
};

type V3FiducialCandidate = MachineReadableFiducialPoint & {
  area: number;
};

type V3FiducialCornerLabel = 'tl' | 'tr' | 'bl' | 'br';

type V3FiducialCornerSet = Record<V3FiducialCornerLabel, V3FiducialCandidate>;

type V3FiducialDetection = {
  detected: boolean;
  confidence: number;
  failureReasons: string[];
  corners: V3FiducialCornerSet | null;
  captureQualityRejection: V3CaptureQualityRejection | null;
};

type V3FiducialGeometryAssessment = {
  confidence: number;
  failureReasons: string[];
  score: number;
};

type MachineReadableVersionStrip = {
  bits: number[];
  confidence: number;
};

type V3FiducialValidationAttempt = {
  corners: V3FiducialCornerSet;
  geometry: V3FiducialGeometryAssessment;
  version: MachineReadableVersionStrip;
  minAnchorDarkRatio: number;
  score: number;
};

type V3CaptureQualityRejection = {
  code:
    | 'missing_fiducials'
    | 'low_light_unreadable'
    | 'page_geometry_unreadable'
    | 'canonical_anchor_unreadable'
    | 'version_strip_unreadable';
  reason: string;
};

type MachineReadableRejectedRow = {
  rowIndex: number;
  criterionId: string;
  criterionName: string;
  reason: 'missing_mark' | 'multi_mark' | 'low_confidence';
  topCellScore: number;
  secondCellScore: number;
  selectedColumnIndex: number | null;
  markedColumnIndexes: number[];
};

type MachineReadableMarkQuality = {
  acceptedRowCount: number;
  rejectedRowCount: number;
  missingMarkRowCount: number;
  multiMarkRowCount: number;
  lowConfidenceRowCount: number;
};

type MachineReadableIgnoredRegion = {
  name: string;
  purpose: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type MachineReadableExtractionMetadata = {
  sheetVersion: 'v3';
  templateVersion: string;
  anchorQuality: MachineReadableAnchorQuality;
  markQuality: MachineReadableMarkQuality;
  rejectedRows: MachineReadableRejectedRow[];
  ignoredRegions: MachineReadableIgnoredRegion[];
};

type ExtractionPayload = {
  templateKey: string;
  machineReadable?: MachineReadableExtractionMetadata | null;
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

export type ScoreSheetImportUatInput = {
  tenantId: string;
  eventId: string;
  contestId: string;
  categoryId: string;
  judgeId: string;
  contestantId: string;
  templateKey?: ScoreSheetTemplateKey | null;
  fileName: string;
  fileType: string;
  fileBuffer: Buffer;
  preprocessingMode?: ScoreSheetPreprocessingMode;
  thresholdStrategy?: ScoreSheetThresholdStrategy;
};

type ScoreSheetImportUatUploadInfo = {
  fileName: string;
  originalFileType: string;
  normalizedFileType: string;
  fileSize: number;
  converted: boolean;
  conversionStrategy: 'none' | 'heic_to_jpeg' | 'heif_to_jpeg';
};

type ScoreSheetImportUatContext = {
  tenantId: string;
  eventId: string;
  eventName: string;
  contestId: string;
  contestName: string;
  categoryId: string;
  categoryName: string;
  judgeId: string;
  judgeName: string;
  contestantId: string;
  contestantName: string;
  evaluationOnly: true;
  certifiedOrLocked: boolean;
  certificationState: {
    categoryTotalsCertified: boolean;
    categoryBoardApproved: boolean;
    contestLocked: boolean;
    eventLocked: boolean;
  };
};

type ScoreSheetImportUatRowComparison = {
  rowIndex: number;
  criterionId: string;
  criterionName: string;
  expectedScore: number | null;
  detectedScore: number | null;
  exactMatch: boolean | null;
  ambiguous: boolean;
  confidence: number;
  rejected: boolean;
  rejectionReason: MachineReadableRejectedRow['reason'] | null;
  falseHighConfidenceMark: boolean;
  cellInkScores: number[];
};

type ScoreSheetImportUatComparison = {
  groundTruthAvailable: boolean;
  exactRowCount: number;
  rowCount: number;
  exactRowMatchRate: number | null;
  expectedTotal: number | null;
  computedTotal: number;
  totalDelta: number | null;
  ambiguousRowCount: number;
  rejectedRowCount: number;
  falseHighConfidenceMarkCount: number;
};

type ScoreSheetImportUatRoutingRecommendation = {
  decision: CaptureQualityGate['decision'];
  retryable: boolean;
  recommendedAction: CaptureQualityGate['recommendedAction'];
  manualEntryOwner: CaptureQualityGate['manualEntryOwner'];
  attemptLimit: number;
  attemptLedgerApplied: false;
  evaluationOnly: true;
};

export type ScoreSheetImportUatResult = {
  templateKey: string;
  sheetVersion: 'v3' | null;
  templateVersion: string | null;
  upload: ScoreSheetImportUatUploadInfo;
  context: ScoreSheetImportUatContext;
  comparison: ScoreSheetImportUatComparison;
  routingRecommendation: ScoreSheetImportUatRoutingRecommendation;
  extraction: {
    preprocessingMode: ScoreSheetPreprocessingMode;
    thresholdStrategy: ScoreSheetThresholdStrategy;
    normalizedImage: ExtractionPayload['normalizedImage'];
    sheetBounds: ExtractionPayload['sheetBounds'];
    qualityGate: CaptureQualityGate;
    reviewBurdenMetrics: ReviewBurdenMetrics;
    anchorQuality: MachineReadableAnchorQuality | null;
    markQuality: MachineReadableMarkQuality | null;
    rejectedRows: MachineReadableRejectedRow[];
    ignoredRegions: MachineReadableIgnoredRegion[];
    mismatchWarnings: string[];
    overallConfidence: number;
  };
  rows: ScoreSheetImportUatRowComparison[];
};

type PreparedUatUpload = {
  buffer: Buffer;
  upload: ScoreSheetImportUatUploadInfo;
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

type V3ScoredExtractionCandidate = {
  kind: 'primary' | 'normalized_scan' | 'canonical_scan';
  normalizedImage: NormalizedImage;
  canonicalImage: NormalizedImage;
  fiducialDetection: V3FiducialDetection;
  perspectiveCorrected: boolean;
  gridGeometry: GridGeometry;
  criteria: CriterionExtraction[];
  rejectedRows: MachineReadableRejectedRow[];
  markQuality: MachineReadableMarkQuality;
  computedTotal: number;
  overallConfidence: number;
};

type V3ExtractionAnalysisDiagnostics = {
  selectedCandidateKind: V3ScoredExtractionCandidate['kind'];
  fallbackApplied: boolean;
  baselinePreprocessing: {
    preprocessingMode: ScoreSheetPreprocessingMode;
    thresholdStrategy: ScoreSheetThresholdStrategy;
  };
  baselineRejectedRowCount: number;
  normalizedImage: NormalizedImage;
  canonicalImage: NormalizedImage;
  fiducialDetection: V3FiducialDetection;
  perspectiveCorrected: boolean;
  gridGeometry: GridGeometry;
};

type ExtractionAnalysis = {
  payload: ExtractionPayload;
  computedTotal: number;
  overallConfidence: number;
  v3Diagnostics?: V3ExtractionAnalysisDiagnostics;
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

type ScoreSheetV3DiagnosticImage = {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  preprocessing: PreprocessingMetadata;
};

type ScoreSheetV3DiagnosticCell = {
  rowIndex: number;
  columnIndex: number;
  scoreValue: number;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  sample: {
    centerX: number;
    centerY: number;
    radius: number;
    searchRadius: number;
  };
  inkScore: number;
  selected: boolean;
  markedAsMultiMark: boolean;
};

type ScoreSheetV3DiagnosticRow = {
  rowIndex: number;
  criterionId: string;
  criterionName: string;
  detectedScore: number | null;
  detectedColumnLabel: string | null;
  confidence: number;
  ambiguous: boolean;
  rejectionReason: MachineReadableRejectedRow['reason'] | null;
  selectedColumnIndex: number | null;
  topCellScore: number;
  secondCellScore: number;
  cells: ScoreSheetV3DiagnosticCell[];
};

export type ScoreSheetV3DiagnosticReport = {
  templateKey: string;
  sheetVersion: 'v3';
  templateVersion: string;
  preprocessingMode: ScoreSheetPreprocessingMode;
  thresholdStrategy: ScoreSheetThresholdStrategy;
  normalizedImage: ScoreSheetV3DiagnosticImage;
  canonicalImage: ScoreSheetV3DiagnosticImage;
  sheetBounds: ExtractionPayload['sheetBounds'];
  perspectiveCorrected: boolean;
  failureClassification: 'none' | 'geometry' | 'mark_scoring' | 'quality_gate';
  geometryWarnings: string[];
  diagnosticNotes: string[];
  captureQualityRejection: V3CaptureQualityRejection | null;
  fiducials: MachineReadableFiducialMetadata;
  canonicalAnchors: {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  };
  gridGeometry: GridGeometry;
  anchorQuality: MachineReadableAnchorQuality;
  markQuality: MachineReadableMarkQuality;
  qualityGate: CaptureQualityGate;
  reviewBurdenMetrics: ReviewBurdenMetrics;
  rejectedRows: MachineReadableRejectedRow[];
  ignoredRegions: MachineReadableIgnoredRegion[];
  rows: ScoreSheetV3DiagnosticRow[];
  computedTotal: number;
  overallConfidence: number;
  mismatchWarnings: string[];
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
      const rendered = await this.renderFirstPage(absolutePath, scoreFile.fileType);
      pageCount = rendered.pageCount;
      const normalized = await this.normalizePage(rendered.buffer, {
        preprocessingMode: options?.preprocessingMode,
        thresholdStrategy: options?.thresholdStrategy,
      });
      const template = this.resolveTemplate(criteria, metadata, options, normalized);
      const orderedCriteria = this.orderCriteriaForTemplate(criteria, template);
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

  async evaluateScoresheetImportUat(input: ScoreSheetImportUatInput): Promise<ScoreSheetImportUatResult> {
    this.validateRequired(
      input as unknown as Record<string, unknown>,
      ['tenantId', 'eventId', 'contestId', 'categoryId', 'judgeId', 'contestantId', 'fileName', 'fileType'],
    );

    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      throw new ValidationError('Scoresheet UAT upload requires a non-empty image file');
    }

    const templateKey = input.templateKey || EDUCATION_OMR_V3_TEMPLATE_KEY;
    if (templateKey !== EDUCATION_OMR_V3_TEMPLATE_KEY) {
      throw new ValidationError('Parse-only scoresheet UAT currently supports only education_omr_v3');
    }

    const category = await this.prisma.category.findFirst({
      where: { id: input.categoryId, tenantId: input.tenantId },
      select: {
        id: true,
        name: true,
        contestId: true,
        totalsCertified: true,
        boardApproved: true,
        contest: {
          select: {
            id: true,
            name: true,
            eventId: true,
            isLocked: true,
            event: {
              select: {
                id: true,
                name: true,
                isLocked: true,
              },
            },
          },
        },
        criteria: {
          select: {
            id: true,
            name: true,
            maxScore: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category) {
      throw this.createNotFoundError('Category not found for scoresheet UAT');
    }
    if (category.contestId !== input.contestId || category.contest.id !== input.contestId) {
      throw new ValidationError('Scoresheet UAT contestId does not match the selected category');
    }
    if (category.contest.eventId !== input.eventId || category.contest.event.id !== input.eventId) {
      throw new ValidationError('Scoresheet UAT eventId does not match the selected category');
    }

    const criteria = Array.isArray(category.criteria) ? category.criteria : [];
    if (criteria.length === 0) {
      throw new ValidationError('Cannot evaluate scoresheet UAT for a category with no criteria');
    }

    const template = scoreSheetImportTemplateMap.get(EDUCATION_OMR_V3_TEMPLATE_KEY);
    if (!template || !template.supported || !template.machineReadable) {
      throw new ValidationError('education_omr_v3 is not available for scoresheet UAT');
    }
    if (!this.templateCanOrderCriteria(criteria, template)) {
      throw new ValidationError('education_omr_v3 does not match this category; unsupported categories are rejected for UAT');
    }

    const [judge, contestant, categoryJudge, judgeAssignment, categoryContestant, storedScores] = await Promise.all([
      this.prisma.judge.findFirst({
        where: { id: input.judgeId, tenantId: input.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.contestant.findFirst({
        where: { id: input.contestantId, tenantId: input.tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.categoryJudge.findFirst({
        where: { categoryId: input.categoryId, judgeId: input.judgeId, tenantId: input.tenantId },
        select: { judgeId: true },
      }),
      this.prisma.assignment.findFirst({
        where: {
          tenantId: input.tenantId,
          judgeId: input.judgeId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
          OR: [
            { categoryId: input.categoryId },
            { contestId: input.contestId, categoryId: null },
          ],
        },
        select: { id: true },
      }),
      this.prisma.categoryContestant.findFirst({
        where: { categoryId: input.categoryId, contestantId: input.contestantId, tenantId: input.tenantId },
        select: { contestantId: true },
      }),
      this.prisma.score.findMany({
        where: {
          tenantId: input.tenantId,
          categoryId: input.categoryId,
          judgeId: input.judgeId,
          contestantId: input.contestantId,
        },
        select: {
          criterionId: true,
          score: true,
        },
      }),
    ]);

    if (!judge) {
      throw this.createNotFoundError('Judge not found for scoresheet UAT');
    }
    if (!contestant) {
      throw this.createNotFoundError('Contestant not found for scoresheet UAT');
    }
    if (!categoryJudge && !judgeAssignment) {
      throw new ValidationError('Selected judge is not assigned to this scoresheet UAT category');
    }
    if (!categoryContestant) {
      throw new ValidationError('Selected contestant is not assigned to this scoresheet UAT category');
    }

    const preparedUpload = await this.prepareUatUpload(input);
    const normalized = await this.normalizePage(preparedUpload.buffer, {
      preprocessingMode: input.preprocessingMode,
      thresholdStrategy: input.thresholdStrategy,
    });
    const orderedCriteria = this.orderCriteriaForTemplate(criteria, template);
    const analysis = this.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
    const expectedScoresByCriterionId = new Map(
      storedScores
        .filter((score) => score.criterionId)
        .map((score) => [score.criterionId as string, score.score]),
    );
    const rejectedRowsByIndex = new Map(
      (analysis.payload.machineReadable?.rejectedRows || [])
        .map((row) => [row.rowIndex, row] as const),
    );

    let exactRowCount = 0;
    let comparableRowCount = 0;
    let expectedTotal = 0;
    let missingStoredScoreCount = 0;
    let falseHighConfidenceMarkCount = 0;
    const rows = analysis.payload.criteria.map((criterion): ScoreSheetImportUatRowComparison => {
      const expectedScore = expectedScoresByCriterionId.has(criterion.criterionId)
        ? expectedScoresByCriterionId.get(criterion.criterionId)!
        : null;
      const exactMatch = expectedScore === null ? null : criterion.detectedScore === expectedScore;
      const rejectedRow = rejectedRowsByIndex.get(criterion.rowIndex) || null;
      const falseHighConfidenceMark = exactMatch === false
        && criterion.detectedScore !== null
        && !criterion.ambiguous
        && criterion.confidence >= FALSE_HIGH_CONFIDENCE_MARK_THRESHOLD;

      if (expectedScore === null) {
        missingStoredScoreCount += 1;
      } else {
        comparableRowCount += 1;
        expectedTotal += expectedScore;
        if (exactMatch) {
          exactRowCount += 1;
        }
      }
      if (falseHighConfidenceMark) {
        falseHighConfidenceMarkCount += 1;
      }

      return {
        rowIndex: criterion.rowIndex,
        criterionId: criterion.criterionId,
        criterionName: criterion.criterionName,
        expectedScore,
        detectedScore: criterion.detectedScore,
        exactMatch,
        ambiguous: criterion.ambiguous,
        confidence: criterion.confidence,
        rejected: Boolean(rejectedRow),
        rejectionReason: rejectedRow?.reason || null,
        falseHighConfidenceMark,
        cellInkScores: [...criterion.cellInkScores],
      };
    });

    const groundTruthAvailable = missingStoredScoreCount === 0 && comparableRowCount === rows.length;
    const expectedTotalOrNull = groundTruthAvailable ? expectedTotal : null;
    const totalDelta = expectedTotalOrNull === null
      ? null
      : Math.abs(expectedTotalOrNull - analysis.computedTotal);
    const qualityGate = analysis.payload.qualityGate;

    return {
      templateKey: analysis.payload.templateKey,
      sheetVersion: analysis.payload.machineReadable?.sheetVersion || null,
      templateVersion: analysis.payload.machineReadable?.templateVersion || null,
      upload: preparedUpload.upload,
      context: {
        tenantId: input.tenantId,
        eventId: category.contest.event.id,
        eventName: category.contest.event.name,
        contestId: category.contest.id,
        contestName: category.contest.name,
        categoryId: category.id,
        categoryName: category.name,
        judgeId: judge.id,
        judgeName: judge.name,
        contestantId: contestant.id,
        contestantName: contestant.name,
        evaluationOnly: true,
        certifiedOrLocked: category.totalsCertified
          || category.boardApproved
          || category.contest.isLocked
          || category.contest.event.isLocked,
        certificationState: {
          categoryTotalsCertified: category.totalsCertified,
          categoryBoardApproved: category.boardApproved,
          contestLocked: category.contest.isLocked,
          eventLocked: category.contest.event.isLocked,
        },
      },
      comparison: {
        groundTruthAvailable,
        exactRowCount,
        rowCount: rows.length,
        exactRowMatchRate: comparableRowCount > 0 ? Number((exactRowCount / comparableRowCount).toFixed(4)) : null,
        expectedTotal: expectedTotalOrNull,
        computedTotal: analysis.computedTotal,
        totalDelta,
        ambiguousRowCount: rows.filter((row) => row.ambiguous).length,
        rejectedRowCount: analysis.payload.machineReadable?.markQuality?.rejectedRowCount || 0,
        falseHighConfidenceMarkCount,
      },
      routingRecommendation: {
        decision: qualityGate.decision,
        retryable: qualityGate.retryable,
        recommendedAction: qualityGate.recommendedAction,
        manualEntryOwner: qualityGate.manualEntryOwner,
        attemptLimit: qualityGate.attemptLimit,
        attemptLedgerApplied: false,
        evaluationOnly: true,
      },
      extraction: {
        preprocessingMode: analysis.payload.preprocessingMode,
        thresholdStrategy: analysis.payload.thresholdStrategy,
        normalizedImage: analysis.payload.normalizedImage,
        sheetBounds: analysis.payload.sheetBounds,
        qualityGate,
        reviewBurdenMetrics: analysis.payload.reviewBurdenMetrics,
        anchorQuality: analysis.payload.machineReadable?.anchorQuality || null,
        markQuality: analysis.payload.machineReadable?.markQuality || null,
        rejectedRows: analysis.payload.machineReadable?.rejectedRows || [],
        ignoredRegions: analysis.payload.machineReadable?.ignoredRegions || [],
        mismatchWarnings: analysis.payload.mismatchWarnings,
        overallConfidence: analysis.overallConfidence,
      },
      rows,
    };
  }

  async buildV3PhonePhotoDiagnosticReport(input: {
    fileBuffer: Buffer;
    criteria: Array<{ id: string; name: string; maxScore: number }>;
    template: ScoreSheetTemplateDefinition;
    preprocessingMode?: ScoreSheetPreprocessingMode;
    thresholdStrategy?: ScoreSheetThresholdStrategy;
  }): Promise<ScoreSheetV3DiagnosticReport> {
    if (!input.fileBuffer || input.fileBuffer.length === 0) {
      throw new ValidationError('V3 scoresheet diagnostics require a non-empty image file');
    }
    if (input.template.key !== EDUCATION_OMR_V3_TEMPLATE_KEY || !input.template.machineReadable) {
      throw new ValidationError('V3 scoresheet diagnostics currently support only education_omr_v3');
    }

    const normalized = await this.normalizePage(input.fileBuffer, {
      preprocessingMode: input.preprocessingMode,
      thresholdStrategy: input.thresholdStrategy,
    });
    const orderedCriteria = this.orderCriteriaForTemplate(input.criteria, input.template);

    return this.buildV3DiagnosticReport(normalized, orderedCriteria, input.template);
  }

  private resolveTemplate(
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    metadata: ScoreFileMetadata,
    options?: ProcessScoreFileOptions,
    normalizedImage?: NormalizedImage,
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

    const detectedMachineReadableTemplate = normalizedImage
      ? this.detectMachineReadableTemplate(criteria, normalizedImage)
      : null;
    if (detectedMachineReadableTemplate) {
      return detectedMachineReadableTemplate;
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

  private detectMachineReadableTemplate(
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    image: NormalizedImage,
  ): ScoreSheetTemplateDefinition | null {
    const template = scoreSheetImportTemplateMap.get(EDUCATION_OMR_V3_TEMPLATE_KEY);
    if (!template || !template.supported || !this.templateCanOrderCriteria(criteria, template)) {
      return null;
    }

    const anchorQuality = this.measureMachineReadableAnchorQuality(image);
    const fiducialDetection = this.detectV3Fiducials(image);
    if (
      fiducialDetection.detected
      || (
        anchorQuality.detected
        && anchorQuality.versionStripConfidence >= MACHINE_READABLE_VERSION_MIN_CONFIDENCE
      )
    ) {
      return template;
    }

    return null;
  }

  private measureMachineReadableAnchorQuality(
    image: RawImage,
    fiducialDetection?: V3FiducialDetection,
    perspectiveCorrected = false,
  ): MachineReadableAnchorQuality {
    const cornerDarkRatios = this.measureMachineReadableCornerDarkRatios(image);
    const minCornerDarkRatio = Math.min(
      cornerDarkRatios.tl,
      cornerDarkRatios.tr,
      cornerDarkRatios.bl,
      cornerDarkRatios.br,
    );
    const versionStrip = this.measureMachineReadableVersionStrip(image);

    return {
      detected: minCornerDarkRatio >= MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO,
      minCornerDarkRatio: Number(minCornerDarkRatio.toFixed(4)),
      cornerDarkRatios: {
        tl: Number(cornerDarkRatios.tl.toFixed(4)),
        tr: Number(cornerDarkRatios.tr.toFixed(4)),
        bl: Number(cornerDarkRatios.bl.toFixed(4)),
        br: Number(cornerDarkRatios.br.toFixed(4)),
      },
      versionStripConfidence: versionStrip.confidence,
      versionBits: versionStrip.bits,
      ...(fiducialDetection
        ? {
          fiducials: this.toMachineReadableFiducialMetadata(
            fiducialDetection,
            perspectiveCorrected,
          ),
        }
        : {}),
    };
  }

  private measureMachineReadableCornerDarkRatios(image: RawImage): MachineReadableCornerDarkRatios {
    return {
      tl: this.measureRatioRectDarkRatio(image, 0, 0, 0.06, 0.06),
      tr: this.measureRatioRectDarkRatio(image, 0.94, 0, 0.06, 0.06),
      bl: this.measureRatioRectDarkRatio(image, 0, 0.94, 0.06, 0.06),
      br: this.measureRatioRectDarkRatio(image, 0.94, 0.94, 0.06, 0.06),
    };
  }

  private measureMachineReadableVersionStrip(image: RawImage): MachineReadableVersionStrip {
    const bitWidth = 0.12 / V3_PAGE_WIDTH_INCHES;
    const bitHeight = 0.12 / V3_PAGE_HEIGHT_INCHES;
    const gap = 0.035 / V3_PAGE_WIDTH_INCHES;
    const startXOptions = [0.67, 0.675, 0.68, 0.685];
    const topOptions = [0.08, 0.085, 0.09];
    let bestVersionStrip: MachineReadableVersionStrip | null = null;

    startXOptions.forEach((startX) => {
      topOptions.forEach((top) => {
        const observedBits: number[] = [];
        let confidenceSum = 0;

        EDUCATION_OMR_V3_VERSION_BITS.forEach((expectedBit, bitIndex) => {
          const darkRatio = this.measureRatioRectDarkRatio(
            image,
            startX + (bitIndex * (bitWidth + gap)),
            top,
            bitWidth,
            bitHeight,
            0.25,
            85,
          );
          const observedBit = darkRatio >= 0.5 ? 1 : 0;
          observedBits.push(observedBit);
          confidenceSum += expectedBit === 1 ? darkRatio : (1 - darkRatio);
        });

        const candidate = {
          bits: observedBits,
          confidence: Number((confidenceSum / EDUCATION_OMR_V3_VERSION_BITS.length).toFixed(4)),
        };
        if (!bestVersionStrip || candidate.confidence > bestVersionStrip.confidence) {
          bestVersionStrip = candidate;
        }
      });
    });

    return bestVersionStrip ?? {
      bits: [],
      confidence: 0,
    };
  }

  private measureRatioRectDarkRatio(
    image: RawImage,
    leftRatio: number,
    topRatio: number,
    widthRatio: number,
    heightRatio: number,
    insetRatio: number = 0,
    threshold: number = 120,
  ): number {
    const left = Math.max(0, Math.round(image.width * leftRatio));
    const top = Math.max(0, Math.round(image.height * topRatio));
    const width = Math.max(1, Math.round(image.width * widthRatio));
    const height = Math.max(1, Math.round(image.height * heightRatio));
    const insetX = Math.max(0, Math.round(width * insetRatio));
    const insetY = Math.max(0, Math.round(height * insetRatio));
    const sampleLeft = Math.min(image.width - 1, left + insetX);
    const sampleTop = Math.min(image.height - 1, top + insetY);
    const sampleRight = Math.min(image.width - 1, left + width - insetX);
    const sampleBottom = Math.min(image.height - 1, top + height - insetY);
    let darkPixelCount = 0;
    let totalPixelCount = 0;

    for (let y = sampleTop; y <= sampleBottom; y += 1) {
      for (let x = sampleLeft; x <= sampleRight; x += 1) {
        if (this.isDarkPixel(image, x, y, threshold)) {
          darkPixelCount += 1;
        }
        totalPixelCount += 1;
      }
    }

    return totalPixelCount > 0 ? darkPixelCount / totalPixelCount : 0;
  }

  private toMachineReadableFiducialMetadata(
    detection: V3FiducialDetection,
    perspectiveCorrected: boolean,
  ): MachineReadableFiducialMetadata {
    return {
      detected: detection.detected,
      confidence: Number(detection.confidence.toFixed(4)),
      perspectiveCorrected,
      failureReasons: [...detection.failureReasons],
      captureQualityRejection: detection.captureQualityRejection
        ? { ...detection.captureQualityRejection }
        : null,
      corners: detection.corners
        ? {
          tl: this.toMachineReadableFiducialPoint(detection.corners.tl),
          tr: this.toMachineReadableFiducialPoint(detection.corners.tr),
          bl: this.toMachineReadableFiducialPoint(detection.corners.bl),
          br: this.toMachineReadableFiducialPoint(detection.corners.br),
        }
        : null,
    };
  }

  private toMachineReadableFiducialPoint(
    candidate: V3FiducialCandidate,
  ): MachineReadableFiducialPoint {
    return {
      x: Number(candidate.x.toFixed(2)),
      y: Number(candidate.y.toFixed(2)),
      width: candidate.width,
      height: candidate.height,
      fillRatio: Number(candidate.fillRatio.toFixed(4)),
    };
  }

  private detectV3Fiducials(image: RawImage): V3FiducialDetection {
    const earlyCaptureQualityRejection = this.buildV3CaptureQualityRejection(image, {});
    if (earlyCaptureQualityRejection?.code === 'low_light_unreadable') {
      return {
        detected: false,
        confidence: 0,
        failureReasons: [earlyCaptureQualityRejection.reason],
        corners: null,
        captureQualityRejection: earlyCaptureQualityRejection,
      };
    }

    const candidates = this.findV3FiducialCandidates(image);
    const failureReasons: string[] = [];
    const cornerCandidates: Record<V3FiducialCornerLabel, V3FiducialCandidate[]> = {
      tl: this.selectV3CornerCandidates(candidates, 'tl', image),
      tr: this.selectV3CornerCandidates(candidates, 'tr', image),
      bl: this.selectV3CornerCandidates(candidates, 'bl', image),
      br: this.selectV3CornerCandidates(candidates, 'br', image),
    };

    this.augmentV3ProjectedBottomCornerCandidates(cornerCandidates, image);

    const missingCornerLabels: V3FiducialCornerLabel[] = [];
    (Object.keys(cornerCandidates) as V3FiducialCornerLabel[]).forEach((label) => {
      if (cornerCandidates[label].length === 0) {
        missingCornerLabels.push(label);
        failureReasons.push(`Missing ${label} v3 fiducial candidate.`);
      }
    });

    if (failureReasons.length > 0) {
      const captureQualityRejection = this.buildV3CaptureQualityRejection(image, {
        missingCornerLabels,
      });
      return {
        detected: false,
        confidence: 0,
        failureReasons: captureQualityRejection
          ? [...failureReasons, captureQualityRejection.reason]
          : failureReasons,
        corners: null,
        captureQualityRejection,
      };
    }

    const geometryCandidates: Array<{
      corners: V3FiducialCornerSet;
      geometry: V3FiducialGeometryAssessment;
    }> = [];

    cornerCandidates.tl.forEach((tl) => {
      cornerCandidates.tr.forEach((tr) => {
        cornerCandidates.bl.forEach((bl) => {
          cornerCandidates.br.forEach((br) => {
            const uniqueCandidates = new Set([tl, tr, bl, br]);
            if (uniqueCandidates.size !== 4) {
              return;
            }

            const corners = { tl, tr, bl, br };
            const geometry = this.assessV3FiducialGeometry(corners, image);
            geometryCandidates.push({ corners, geometry });
          });
        });
      });
    });

    const rankedGeometry = geometryCandidates
      .sort((left, right) => right.geometry.score - left.geometry.score)
      .slice(0, 20);
    let bestAttempt: V3FiducialValidationAttempt | null = null;
    let bestAccepted: V3FiducialValidationAttempt | null = null;

    for (const { corners, geometry } of rankedGeometry) {
      const detection: V3FiducialDetection = {
        detected: true,
        confidence: geometry.confidence,
        failureReasons: [],
        corners,
        captureQualityRejection: null,
      };
      const warpedData = this.warpImageToV3Canonical(image, detection);
      const warpedImage = {
        data: warpedData,
        width: image.width,
        height: image.height,
        channels: image.channels,
      };
      const version = this.measureMachineReadableVersionStrip(warpedImage);
      const cornerDarkRatios = this.measureMachineReadableCornerDarkRatios(warpedImage);
      const minAnchorDarkRatio = Math.min(
        cornerDarkRatios.tl,
        cornerDarkRatios.tr,
        cornerDarkRatios.bl,
        cornerDarkRatios.br,
      );
      const versionMatches = version.bits.join('') === EDUCATION_OMR_V3_VERSION_BITS.join('');
      const validationScore = geometry.score
        + (version.confidence * 0.35)
        + (Math.min(1, minAnchorDarkRatio / MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO) * 0.2)
        + (versionMatches ? 0.35 : 0);
      const attempt = {
        corners,
        geometry,
        version,
        minAnchorDarkRatio,
        score: validationScore,
      };

      if (!bestAttempt || attempt.score > bestAttempt.score) {
        bestAttempt = attempt;
      }
      if (
        geometry.failureReasons.length === 0
        && versionMatches
        && version.confidence >= MACHINE_READABLE_VERSION_MIN_CONFIDENCE
        && minAnchorDarkRatio >= MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO
        && (!bestAccepted || attempt.score > bestAccepted.score)
      ) {
        bestAccepted = attempt;
        if (version.confidence >= 0.95) {
          break;
        }
      }
    }

    const selected = bestAccepted || bestAttempt;
    if (!selected) {
      const captureQualityRejection = this.buildV3CaptureQualityRejection(image, {
        failureReasons: ['Unable to assemble four v3 fiducials into a valid page quadrilateral.'],
      });
      return {
        detected: false,
        confidence: 0,
        failureReasons: [
          'Unable to assemble four v3 fiducials into a valid page quadrilateral.',
          ...(captureQualityRejection ? [captureQualityRejection.reason] : []),
        ],
        corners: null,
        captureQualityRejection,
      };
    }

    const versionMatches = selected.version.bits.join('') === EDUCATION_OMR_V3_VERSION_BITS.join('');
    const selectedFailureReasons = [...selected.geometry.failureReasons];
    if (!versionMatches) {
      selectedFailureReasons.push(
        `Detected v3 version bits ${selected.version.bits.join('')} do not match expected ${EDUCATION_OMR_V3_VERSION_BITS.join('')}.`,
      );
    }
    if (selected.version.confidence < MACHINE_READABLE_VERSION_MIN_CONFIDENCE) {
      selectedFailureReasons.push(
        `Detected v3 version strip confidence ${selected.version.confidence} is below ${MACHINE_READABLE_VERSION_MIN_CONFIDENCE}.`,
      );
    }
    if (selected.minAnchorDarkRatio < MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO) {
      selectedFailureReasons.push(
        `Detected canonical v3 anchor confidence ${Number(selected.minAnchorDarkRatio.toFixed(4))} is below ${MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO}.`,
      );
    }
    const captureQualityRejection = selectedFailureReasons.length > 0
      ? this.buildV3CaptureQualityRejection(image, {
        selected,
        failureReasons: selectedFailureReasons,
      })
      : null;
    if (captureQualityRejection && !selectedFailureReasons.includes(captureQualityRejection.reason)) {
      selectedFailureReasons.push(captureQualityRejection.reason);
    }

    return {
      detected: selectedFailureReasons.length === 0,
      confidence: Number(Math.min(1, selected.score).toFixed(4)),
      failureReasons: selectedFailureReasons,
      corners: selected.corners,
      captureQualityRejection,
    };
  }

  private buildV3CaptureQualityRejection(
    image: RawImage,
    input: {
      selected?: V3FiducialValidationAttempt | null;
      failureReasons?: string[];
      missingCornerLabels?: V3FiducialCornerLabel[];
    },
  ): V3CaptureQualityRejection | null {
    const qualitySignals = (image as Partial<NormalizedImage>).preprocessing?.qualitySignals
      ?? this.measureImageQuality(image, null, 0);
    const selected = input.selected ?? null;
    const failureReasons = input.failureReasons ?? selected?.geometry.failureReasons ?? [];

    if (
      qualitySignals.darkPixelRatio >= 0.95
      && qualitySignals.midtonePixelRatio <= 0.05
    ) {
      return {
        code: 'low_light_unreadable',
        reason: 'Capture quality rejection: low-light/unreadable image; the normalized page is dominated by dark pixels, so v3 anchors and version metadata cannot be trusted.',
      };
    }

    if (input.missingCornerLabels?.length) {
      return {
        code: 'missing_fiducials',
        reason: `Capture quality rejection: missing v3 page anchors (${input.missingCornerLabels.join(', ')}); keep all four black corner anchors visible and inside the photo.`,
      };
    }

    if (selected?.minAnchorDarkRatio !== undefined
      && selected.minAnchorDarkRatio < MACHINE_READABLE_ANCHOR_MIN_DARK_RATIO) {
      return {
        code: 'canonical_anchor_unreadable',
        reason: 'Capture quality rejection: v3 anchors were found, but shadow, cropping, or excessive off-axis angle made the canonical anchors unreadable after page normalization.',
      };
    }

    if (
      failureReasons.some((reason) =>
        reason.includes('too close')
        || reason.includes('too little')
        || reason.includes('not in page-corner order')
        || reason.includes('not solid enough'),
      )
    ) {
      return {
        code: 'page_geometry_unreadable',
        reason: 'Capture quality rejection: page geometry is too cropped, skewed, or off-axis for reliable v3 normalization.',
      };
    }

    if (selected) {
      const versionMatches = selected.version.bits.join('') === EDUCATION_OMR_V3_VERSION_BITS.join('');
      if (!versionMatches || selected.version.confidence < MACHINE_READABLE_VERSION_MIN_CONFIDENCE) {
        return {
          code: 'version_strip_unreadable',
          reason: 'Capture quality rejection: v3 anchors were found, but rotation, perspective, blur, or shadow prevented reliable version-strip validation.',
        };
      }
    }

    if (failureReasons.length > 0) {
      return {
        code: 'page_geometry_unreadable',
        reason: 'Capture quality rejection: v3 page normalization could not produce reliable geometry for this upload.',
      };
    }

    return null;
  }

  private assessV3FiducialGeometry(
    corners: V3FiducialCornerSet,
    image: RawImage,
  ): V3FiducialGeometryAssessment {
    const { tl, tr, bl, br } = corners;
    const failureReasons: string[] = [];
    if (!(tl.x < tr.x && bl.x < br.x && tl.y < bl.y && tr.y < br.y)) {
      failureReasons.push('Detected v3 fiducials are not in page-corner order.');
    }

    const topWidth = this.distanceBetweenPoints(tl, tr);
    const bottomWidth = this.distanceBetweenPoints(bl, br);
    const leftHeight = this.distanceBetweenPoints(tl, bl);
    const rightHeight = this.distanceBetweenPoints(tr, br);
    const polygonArea = Math.abs(
      (tl.x * tr.y) - (tl.y * tr.x)
      + (tr.x * br.y) - (tr.y * br.x)
      + (br.x * bl.y) - (br.y * bl.x)
      + (bl.x * tl.y) - (bl.y * tl.x)
    ) / 2;
    const imageArea = image.width * image.height;
    const areaRatio = imageArea > 0 ? polygonArea / imageArea : 0;
    const widthBalance = Math.min(topWidth, bottomWidth) / Math.max(topWidth, bottomWidth, 1);
    const heightBalance = Math.min(leftHeight, rightHeight) / Math.max(leftHeight, rightHeight, 1);
    const minFillRatio = Math.min(tl.fillRatio, tr.fillRatio, bl.fillRatio, br.fillRatio);
    const sizeScore = Math.min(1, topWidth / (image.width * 0.55), bottomWidth / (image.width * 0.5));
    const heightScore = Math.min(1, leftHeight / (image.height * 0.55), rightHeight / (image.height * 0.55));
    const areaScore = Math.min(1, areaRatio / 0.45);
    const expectedAspectRatio = V3_PAGE_WIDTH_INCHES / V3_PAGE_HEIGHT_INCHES;
    const observedAspectRatio = ((topWidth + bottomWidth) / 2) / Math.max(1, ((leftHeight + rightHeight) / 2));
    const aspectScore = Math.max(
      0,
      1 - (Math.abs(observedAspectRatio - expectedAspectRatio) / expectedAspectRatio),
    );
    const cornerFillScore = Math.min(1, minFillRatio / 0.7);
    const confidence = Math.max(
      0,
      Math.min(
        1,
        (
          widthBalance
          + heightBalance
          + sizeScore
          + heightScore
          + areaScore
          + aspectScore
          + cornerFillScore
        ) / 7,
      ),
    );
    const score = confidence
      + (Math.max(0, Math.min(1, areaRatio / 0.55)) * 0.2)
      + (minFillRatio * 0.15);

    if (topWidth < image.width * 0.45 || bottomWidth < image.width * 0.4) {
      failureReasons.push('Detected v3 fiducials are too close horizontally.');
    }
    if (leftHeight < image.height * 0.45 || rightHeight < image.height * 0.45) {
      failureReasons.push('Detected v3 fiducials are too close vertically.');
    }
    if (areaRatio < 0.25) {
      failureReasons.push('Detected v3 fiducials cover too little of the image.');
    }
    if (minFillRatio < 0.35) {
      failureReasons.push('Detected v3 fiducials are not solid enough.');
    }

    return {
      confidence: Number(confidence.toFixed(4)),
      failureReasons,
      score,
    };
  }

  private findV3FiducialCandidates(image: RawImage): V3FiducialCandidate[] {
    return this.mergeV3FiducialCandidates([
      ...this.findV3ConnectedFiducialCandidates(image, 70),
      ...this.findV3ConnectedFiducialCandidates(image, 120),
      ...this.findV3FiducialTemplateCandidates(image, 70),
      ...this.findV3FiducialTemplateCandidates(image, 110),
      ...this.findV3FiducialTemplateCandidates(image, 165),
    ]);
  }

  private findV3ConnectedFiducialCandidates(
    image: RawImage,
    darkPixelThreshold: number,
  ): V3FiducialCandidate[] {
    const visited = new Uint8Array(image.width * image.height);
    const candidates: V3FiducialCandidate[] = [];
    const maxArea = Math.max(600, image.width * image.height * 0.004);
    const minArea = Math.max(45, image.width * image.height * 0.000025);
    const maxDimension = Math.max(24, Math.round(Math.min(image.width, image.height) * 0.09));

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const startIndex = (y * image.width) + x;
        if (visited[startIndex] || !this.isDarkPixel(image, x, y, darkPixelThreshold)) {
          continue;
        }

        const stack: Array<{ x: number; y: number }> = [{ x, y }];
        visited[startIndex] = 1;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let area = 0;

        while (stack.length > 0) {
          const point = stack.pop()!;
          area += 1;
          if (point.x < minX) minX = point.x;
          if (point.x > maxX) maxX = point.x;
          if (point.y < minY) minY = point.y;
          if (point.y > maxY) maxY = point.y;

          const neighbors = [
            { x: point.x + 1, y: point.y },
            { x: point.x - 1, y: point.y },
            { x: point.x, y: point.y + 1 },
            { x: point.x, y: point.y - 1 },
          ];
          neighbors.forEach((neighbor) => {
            if (
              neighbor.x < 0
              || neighbor.x >= image.width
              || neighbor.y < 0
              || neighbor.y >= image.height
            ) {
              return;
            }

            const neighborIndex = (neighbor.y * image.width) + neighbor.x;
            if (
              !visited[neighborIndex]
              && this.isDarkPixel(image, neighbor.x, neighbor.y, darkPixelThreshold)
            ) {
              visited[neighborIndex] = 1;
              stack.push(neighbor);
            }
          });
        }

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const fillRatio = area / Math.max(1, width * height);
        const aspectRatio = width / Math.max(1, height);
        const touchesImageEdge =
          minX <= 1 || minY <= 1 || maxX >= image.width - 2 || maxY >= image.height - 2;

        if (
          touchesImageEdge
          || area < minArea
          || area > maxArea
          || width < 5
          || height < 5
          || width > maxDimension
          || height > maxDimension
          || fillRatio < 0.35
          || aspectRatio < 0.45
          || aspectRatio > 2.2
        ) {
          continue;
        }

        candidates.push({
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2,
          width,
          height,
          fillRatio,
          area,
        });
      }
    }

    return candidates;
  }

  private findV3FiducialTemplateCandidates(
    image: RawImage,
    darkPixelThreshold: number,
  ): V3FiducialCandidate[] {
    const integral = this.buildDarkPixelIntegral(image, darkPixelThreshold);
    const expectedWidth = image.width * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_WIDTH_INCHES);
    const expectedHeight = image.height * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_HEIGHT_INCHES);
    const baseSize = Math.max(10, Math.round((expectedWidth + expectedHeight) / 2));
    const sizes = Array.from(new Set([
      Math.round(baseSize * 0.55),
      Math.round(baseSize * 0.7),
      Math.round(baseSize * 0.85),
      baseSize,
      Math.round(baseSize * 1.15),
      Math.round(baseSize * 1.3),
    ])).filter((size) => size >= 8 && size <= Math.round(Math.min(image.width, image.height) * 0.08));
    const labels: V3FiducialCornerLabel[] = ['tl', 'tr', 'bl', 'br'];
    const pageAnchorTargets = this.estimateV3PageAnchorTargets(image);

    return labels.flatMap((label) => {
      const region = this.getV3FiducialTemplateSearchRegion(image, label);
      const target = pageAnchorTargets?.[label] ?? this.getV3CornerTarget(image, label);
      const maxTargetDistance = Math.hypot(image.width * 0.32, image.height * 0.32);
      const scoredCandidates: Array<{
        candidate: V3FiducialCandidate;
        distanceToTarget: number;
        score: number;
      }> = [];
      const step = 6;

      sizes.forEach((size) => {
        const halfSize = Math.round(size / 2);
        for (let y = region.top + halfSize; y <= region.bottom - halfSize; y += step) {
          for (let x = region.left + halfSize; x <= region.right - halfSize; x += step) {
            const left = x - halfSize;
            const top = y - halfSize;
            const innerDarkRatio = this.measureIntegralRectDarkRatio(
              integral,
              image.width,
              image.height,
              left,
              top,
              size,
              size,
            );
            if (innerDarkRatio < 0.24) {
              continue;
            }

            const outerSize = Math.round(size * 1.9);
            const outerLeft = x - Math.round(outerSize / 2);
            const outerTop = y - Math.round(outerSize / 2);
            const outerDarkRatio = this.measureIntegralRingDarkRatio(
              integral,
              image.width,
              image.height,
              outerLeft,
              outerTop,
              outerSize,
              outerSize,
              left,
              top,
              size,
              size,
            );
            const contrastScore = Math.max(0, innerDarkRatio - outerDarkRatio);
            const candidate: V3FiducialCandidate = {
              x,
              y,
              width: size,
              height: size,
              fillRatio: Number(innerDarkRatio.toFixed(4)),
              area: Math.round(innerDarkRatio * size * size),
            };
            const cornerScore = this.scoreV3CornerCandidate(candidate, label, image, target);
            const centerSideDarkRatio = this.measureV3FiducialCenterSideDarkRatio(
              integral,
              image.width,
              image.height,
              candidate,
              label,
            );
            const centerPaperScore = Math.max(0, 1 - centerSideDarkRatio);
            const distanceToTarget = this.distanceBetweenPoints(candidate, target);
            const expectedPositionScore = Math.max(
              0,
              1 - (distanceToTarget / Math.max(1, maxTargetDistance)),
            );
            const hasLocalContrast = contrastScore >= (darkPixelThreshold <= 80 ? 0.035 : 0.055);
            const isNearExpectedAnchor = expectedPositionScore >= 0.48 || cornerScore >= 0.82;
            const isTopAnchor = label === 'tl' || label === 'tr';
            if (
              (!hasLocalContrast && centerPaperScore < 0.2 && !isNearExpectedAnchor)
              || (centerSideDarkRatio > 0.94 && contrastScore < 0.01 && cornerScore < 0.82)
              || (innerDarkRatio < 0.48 && contrastScore < 0.1)
            ) {
              continue;
            }

            const templateScore = isTopAnchor
              ? (innerDarkRatio * 0.12)
                + (contrastScore * 0.2)
                + (cornerScore * 0.3)
                + (centerPaperScore * 0.3)
                + (expectedPositionScore * 0.08)
              : (innerDarkRatio * 0.18)
                + (contrastScore * 0.18)
                + (cornerScore * 0.42)
                + (centerPaperScore * 0.12)
                + (expectedPositionScore * 0.1);
            scoredCandidates.push({ candidate, distanceToTarget, score: templateScore });
          }
        }
      });

      const bestByScore = scoredCandidates
        .slice()
        .sort((left, right) => right.score - left.score)
        .slice(0, 8)
        .map(({ candidate }) => candidate);
      const bestByTarget = scoredCandidates
        .slice()
        .sort((left, right) =>
          left.distanceToTarget - right.distanceToTarget
          || right.score - left.score,
        )
        .slice(0, 6)
        .map(({ candidate }) => candidate);

      return this.dedupeV3CandidatesPreservingOrder([...bestByScore, ...bestByTarget]);
    });
  }

  private mergeV3FiducialCandidates(candidates: V3FiducialCandidate[]): V3FiducialCandidate[] {
    const ranked = candidates
      .slice()
      .sort((left, right) =>
        (right.fillRatio * right.area) - (left.fillRatio * left.area),
      );
    const merged: V3FiducialCandidate[] = [];

    ranked.forEach((candidate) => {
      const duplicate = merged.some((existing) =>
        Math.abs(existing.x - candidate.x) <= Math.max(existing.width, candidate.width) * 0.45
        && Math.abs(existing.y - candidate.y) <= Math.max(existing.height, candidate.height) * 0.45,
      );
      if (!duplicate) {
        merged.push(candidate);
      }
    });

    return merged;
  }

  private dedupeV3CandidatesPreservingOrder(
    candidates: V3FiducialCandidate[],
  ): V3FiducialCandidate[] {
    const deduped: V3FiducialCandidate[] = [];

    candidates.forEach((candidate) => {
      const duplicate = deduped.some((existing) =>
        Math.abs(existing.x - candidate.x) <= Math.max(existing.width, candidate.width) * 0.45
        && Math.abs(existing.y - candidate.y) <= Math.max(existing.height, candidate.height) * 0.45,
      );
      if (!duplicate) {
        deduped.push(candidate);
      }
    });

    return deduped;
  }

  private selectV3CornerCandidates(
    candidates: V3FiducialCandidate[],
    label: V3FiducialCornerLabel,
    image: RawImage,
  ): V3FiducialCandidate[] {
    const target = this.estimateV3PageAnchorTargets(image)?.[label]
      ?? this.getV3CornerTarget(image, label);
    const scoredCandidates = candidates
      .filter((candidate) => this.isV3CandidateInCornerRegion(candidate, label, image))
      .map((candidate) => ({
        candidate,
        distanceToTarget: this.distanceBetweenPoints(candidate, target),
        score: this.scoreV3CornerCandidate(candidate, label, image, target),
      }));
    const bestByScore = scoredCandidates
      .slice()
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map(({ candidate }) => candidate);
    const bestByTarget = scoredCandidates
      .slice()
      .sort((left, right) =>
        left.distanceToTarget - right.distanceToTarget
        || right.score - left.score,
      )
      .slice(0, 4)
      .map(({ candidate }) => candidate);

    return this.dedupeV3CandidatesPreservingOrder([...bestByScore, ...bestByTarget]).slice(0, 8);
  }

  private augmentV3ProjectedBottomCornerCandidates(
    cornerCandidates: Record<V3FiducialCornerLabel, V3FiducialCandidate[]>,
    image: RawImage,
  ): void {
    const pageAnchorTargets = this.estimateV3PageAnchorTargets(image);
    if (!pageAnchorTargets) {
      return;
    }

    const projections: Array<{
      bottomLabel: 'bl' | 'br';
      topLabel: 'tl' | 'tr';
    }> = [
      { bottomLabel: 'bl', topLabel: 'tl' },
      { bottomLabel: 'br', topLabel: 'tr' },
    ];

    projections.forEach(({ bottomLabel, topLabel }) => {
      const projectedCandidates = cornerCandidates[topLabel]
        .slice(0, 2)
        .flatMap((topCandidate) =>
          this.findV3LocalFiducialCandidatesNear(
            image,
            bottomLabel,
            {
              x: topCandidate.x,
              y: pageAnchorTargets[bottomLabel].y,
            },
          ),
        );

      cornerCandidates[bottomLabel] = this.dedupeV3CandidatesPreservingOrder([
        ...projectedCandidates,
        ...cornerCandidates[bottomLabel],
      ]).slice(0, 8);
    });
  }

  private findV3LocalFiducialCandidatesNear(
    image: RawImage,
    label: V3FiducialCornerLabel,
    target: { x: number; y: number },
  ): V3FiducialCandidate[] {
    const integral = this.buildDarkPixelIntegral(image, 70);
    const expectedWidth = image.width * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_WIDTH_INCHES);
    const expectedHeight = image.height * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_HEIGHT_INCHES);
    const baseSize = Math.max(10, Math.round((expectedWidth + expectedHeight) / 2));
    const sizes = Array.from(new Set([
      Math.round(baseSize * 0.7),
      Math.round(baseSize * 0.85),
      baseSize,
      Math.round(baseSize * 1.15),
      Math.round(baseSize * 1.3),
    ])).filter((size) => size >= 8 && size <= Math.round(Math.min(image.width, image.height) * 0.08));
    const radiusX = Math.max(80, Math.round(image.width * 0.13));
    const radiusY = Math.max(80, Math.round(image.height * 0.08));
    const scoredCandidates: Array<{
      candidate: V3FiducialCandidate;
      distanceToTarget: number;
      score: number;
    }> = [];

    sizes.forEach((size) => {
      const halfSize = Math.round(size / 2);
      const leftBound = Math.max(halfSize, Math.round(target.x - radiusX));
      const rightBound = Math.min(image.width - halfSize, Math.round(target.x + radiusX));
      const topBound = Math.max(halfSize, Math.round(target.y - radiusY));
      const bottomBound = Math.min(image.height - halfSize, Math.round(target.y + radiusY));

      for (let y = topBound; y <= bottomBound; y += 4) {
        for (let x = leftBound; x <= rightBound; x += 4) {
          const left = x - halfSize;
          const top = y - halfSize;
          const innerDarkRatio = this.measureIntegralRectDarkRatio(
            integral,
            image.width,
            image.height,
            left,
            top,
            size,
            size,
          );
          if (innerDarkRatio < 0.3) {
            continue;
          }

          const outerSize = Math.round(size * 1.9);
          const outerDarkRatio = this.measureIntegralRingDarkRatio(
            integral,
            image.width,
            image.height,
            x - Math.round(outerSize / 2),
            y - Math.round(outerSize / 2),
            outerSize,
            outerSize,
            left,
            top,
            size,
            size,
          );
          const contrastScore = Math.max(0, innerDarkRatio - outerDarkRatio);
          const candidate: V3FiducialCandidate = {
            x,
            y,
            width: size,
            height: size,
            fillRatio: Number(innerDarkRatio.toFixed(4)),
            area: Math.round(innerDarkRatio * size * size),
          };
          const distanceToTarget = this.distanceBetweenPoints(candidate, target);
          const distanceScore = Math.max(0, 1 - (distanceToTarget / Math.max(radiusX, radiusY, 1)));
          const shapeScore = this.scoreV3CornerCandidate(candidate, label, image, target);
          const score = (distanceScore * 0.55)
            + (shapeScore * 0.25)
            + (innerDarkRatio * 0.12)
            + (contrastScore * 0.08);

          scoredCandidates.push({ candidate, distanceToTarget, score });
        }
      }
    });

    const bestByScore = scoredCandidates
      .slice()
      .sort((left, right) => right.score - left.score)
      .slice(0, 5)
      .map(({ candidate }) => candidate);
    const bestByTarget = scoredCandidates
      .slice()
      .sort((left, right) =>
        left.distanceToTarget - right.distanceToTarget
        || right.score - left.score,
      )
      .slice(0, 3)
      .map(({ candidate }) => candidate);

    return this.dedupeV3CandidatesPreservingOrder([...bestByScore, ...bestByTarget]);
  }

  private isV3CandidateInCornerRegion(
    candidate: V3FiducialCandidate,
    label: V3FiducialCornerLabel,
    image: RawImage,
  ): boolean {
    const marginX = image.width * 0.005;
    const marginY = image.height * 0.005;
    if (
      candidate.x < marginX
      || candidate.x > image.width - marginX
      || candidate.y < marginY
      || candidate.y > image.height - marginY
    ) {
      return false;
    }

    const leftSide = candidate.x <= image.width * 0.42;
    const rightSide = candidate.x >= image.width * 0.58;
    const topSide = candidate.y <= image.height * 0.38;
    const bottomSide = candidate.y >= image.height * 0.62;

    if (label === 'tl') return leftSide && topSide;
    if (label === 'tr') return rightSide && topSide;
    if (label === 'bl') return leftSide && bottomSide;
    return rightSide && bottomSide;
  }

  private scoreV3CornerCandidate(
    candidate: V3FiducialCandidate,
    label: V3FiducialCornerLabel,
    image: RawImage,
    targetOverride?: { x: number; y: number },
  ): number {
    const expectedWidth = image.width * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_WIDTH_INCHES);
    const expectedHeight = image.height * (V3_ANCHOR_SIZE_INCHES / V3_PAGE_HEIGHT_INCHES);
    const expectedAspectRatio = expectedWidth / Math.max(1, expectedHeight);
    const aspectRatio = candidate.width / Math.max(1, candidate.height);
    const sizeScore = Math.max(
      0,
      Math.min(
        1,
        Math.min(candidate.width, expectedWidth) / Math.max(candidate.width, expectedWidth, 1),
        Math.min(candidate.height, expectedHeight) / Math.max(candidate.height, expectedHeight, 1),
      ),
    );
    const shapeScore = Math.max(
      0,
      1 - (Math.abs(aspectRatio - expectedAspectRatio) / Math.max(expectedAspectRatio, 0.0001)),
    );
    const target = targetOverride ?? this.getV3CornerTarget(image, label);
    const distance = this.distanceBetweenPoints(candidate, target);
    const maxDistance = Math.hypot(image.width * 0.42, image.height * 0.38);
    const cornerScore = Math.max(0, 1 - (distance / Math.max(1, maxDistance)));
    const fillScore = Math.min(1, candidate.fillRatio / 0.75);

    return (cornerScore * 0.55)
      + (fillScore * 0.2)
      + (sizeScore * 0.15)
      + (shapeScore * 0.1);
  }

  private estimateV3PageAnchorTargets(
    image: RawImage,
  ): Record<V3FiducialCornerLabel, { x: number; y: number }> | null {
    const rowStep = 4;
    const xStep = 3;
    const maxGap = Math.max(12, Math.round(image.width * 0.025));
    const luminanceThreshold = this.resolveV3PaperLuminanceThreshold(image);
    const samples: Array<{ y: number; left: number; right: number; width: number }> = [];

    for (let y = 0; y < image.height; y += rowStep) {
      let currentStart: number | null = null;
      let currentEnd = 0;
      let currentGap = 0;
      let bestStart = 0;
      let bestEnd = 0;
      let bestWidth = 0;

      for (let x = 0; x < image.width; x += xStep) {
        if (this.getPixelLuminance(image, x, y) >= luminanceThreshold) {
          if (currentStart === null) {
            currentStart = x;
          }
          currentEnd = x;
          currentGap = 0;
        } else if (currentStart !== null && currentGap < maxGap) {
          currentGap += xStep;
        } else if (currentStart !== null) {
          const runEnd = Math.max(currentStart, currentEnd - currentGap);
          const runWidth = runEnd - currentStart;
          if (runWidth > bestWidth) {
            bestStart = currentStart;
            bestEnd = runEnd;
            bestWidth = runWidth;
          }
          currentStart = null;
          currentGap = 0;
        }
      }

      if (currentStart !== null) {
        const runEnd = Math.max(currentStart, currentEnd - currentGap);
        const runWidth = runEnd - currentStart;
        if (runWidth > bestWidth) {
          bestStart = currentStart;
          bestEnd = runEnd;
          bestWidth = runWidth;
        }
      }

      if (bestWidth >= image.width * 0.42) {
        samples.push({ y, left: bestStart, right: bestEnd, width: bestWidth });
      }
    }

    if (samples.length < 10) {
      return null;
    }

    const sortedWidths = samples.map((sample) => sample.width).sort((left, right) => left - right);
    const medianWidth = sortedWidths[Math.floor(sortedWidths.length / 2)] ?? 0;
    const pageSamples = samples.filter((sample) => sample.width >= medianWidth * 0.72);
    if (pageSamples.length < 8) {
      return null;
    }

    const edgeSampleCount = Math.min(10, Math.max(4, Math.floor(pageSamples.length * 0.08)));
    const topSamples = pageSamples.slice(0, edgeSampleCount);
    const bottomSamples = pageSamples.slice(-edgeSampleCount);
    const topLeft = {
      x: this.medianNumber(topSamples.map((sample) => sample.left)),
      y: this.medianNumber(topSamples.map((sample) => sample.y)),
    };
    const topRight = {
      x: this.medianNumber(topSamples.map((sample) => sample.right)),
      y: this.medianNumber(topSamples.map((sample) => sample.y)),
    };
    const bottomLeft = {
      x: this.medianNumber(bottomSamples.map((sample) => sample.left)),
      y: this.medianNumber(bottomSamples.map((sample) => sample.y)),
    };
    const bottomRight = {
      x: this.medianNumber(bottomSamples.map((sample) => sample.right)),
      y: this.medianNumber(bottomSamples.map((sample) => sample.y)),
    };

    const anchorCenterInsetX = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_WIDTH_INCHES;
    const anchorCenterInsetY = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_HEIGHT_INCHES;

    return {
      tl: this.interpolateV3PagePoint(topLeft, topRight, bottomLeft, bottomRight, anchorCenterInsetX, anchorCenterInsetY),
      tr: this.interpolateV3PagePoint(topLeft, topRight, bottomLeft, bottomRight, 1 - anchorCenterInsetX, anchorCenterInsetY),
      bl: this.interpolateV3PagePoint(topLeft, topRight, bottomLeft, bottomRight, anchorCenterInsetX, 1 - anchorCenterInsetY),
      br: this.interpolateV3PagePoint(topLeft, topRight, bottomLeft, bottomRight, 1 - anchorCenterInsetX, 1 - anchorCenterInsetY),
    };
  }

  private resolveV3PaperLuminanceThreshold(image: RawImage): number {
    const sampleStep = Math.max(1, Math.floor(Math.sqrt((image.width * image.height) / 8000)));
    const luminanceSamples: number[] = [];

    for (let y = 0; y < image.height; y += sampleStep) {
      for (let x = 0; x < image.width; x += sampleStep) {
        luminanceSamples.push(this.getPixelLuminance(image, x, y));
      }
    }

    luminanceSamples.sort((left, right) => left - right);
    const percentile70 = luminanceSamples[Math.floor(luminanceSamples.length * 0.7)] ?? 120;
    return this.clampNumber(Math.round(percentile70 * 0.34), 35, 70);
  }

  private interpolateV3PagePoint(
    topLeft: { x: number; y: number },
    topRight: { x: number; y: number },
    bottomLeft: { x: number; y: number },
    bottomRight: { x: number; y: number },
    u: number,
    v: number,
  ): { x: number; y: number } {
    return {
      x: (topLeft.x * (1 - u) * (1 - v))
        + (topRight.x * u * (1 - v))
        + (bottomLeft.x * (1 - u) * v)
        + (bottomRight.x * u * v),
      y: (topLeft.y * (1 - u) * (1 - v))
        + (topRight.y * u * (1 - v))
        + (bottomLeft.y * (1 - u) * v)
        + (bottomRight.y * u * v),
    };
  }

  private medianNumber(values: number[]): number {
    if (values.length === 0) return 0;
    const sortedValues = values.slice().sort((left, right) => left - right);
    return sortedValues[Math.floor(sortedValues.length / 2)] ?? 0;
  }

  private getV3CornerTarget(image: RawImage, label: V3FiducialCornerLabel): { x: number; y: number } {
    const anchorCenterInsetX = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_WIDTH_INCHES;
    const anchorCenterInsetY = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_HEIGHT_INCHES;
    const x = label === 'tl' || label === 'bl'
      ? image.width * anchorCenterInsetX
      : image.width * (1 - anchorCenterInsetX);
    const y = label === 'tl' || label === 'tr'
      ? image.height * anchorCenterInsetY
      : image.height * (1 - anchorCenterInsetY);

    return { x, y };
  }

  private measureV3FiducialCenterSideDarkRatio(
    integral: Uint32Array,
    imageWidth: number,
    imageHeight: number,
    candidate: V3FiducialCandidate,
    label: V3FiducialCornerLabel,
  ): number {
    const size = Math.max(candidate.width, candidate.height);
    const halfWidth = candidate.width / 2;
    const halfHeight = candidate.height / 2;
    const horizontalDirection = label === 'tl' || label === 'bl' ? 1 : -1;
    const verticalDirection = label === 'tl' || label === 'tr' ? 1 : -1;
    const horizontalLeft = horizontalDirection > 0
      ? candidate.x + halfWidth
      : candidate.x - halfWidth - size;
    const verticalTop = verticalDirection > 0
      ? candidate.y + halfHeight
      : candidate.y - halfHeight - size;
    const horizontalDarkRatio = this.measureIntegralRectDarkRatio(
      integral,
      imageWidth,
      imageHeight,
      horizontalLeft,
      candidate.y - (size / 2),
      size,
      size,
    );
    const verticalDarkRatio = this.measureIntegralRectDarkRatio(
      integral,
      imageWidth,
      imageHeight,
      candidate.x - (size / 2),
      verticalTop,
      size,
      size,
    );

    return (horizontalDarkRatio + verticalDarkRatio) / 2;
  }

  private getV3FiducialTemplateSearchRegion(
    image: RawImage,
    label: V3FiducialCornerLabel,
  ): { left: number; top: number; right: number; bottom: number } {
    const horizontalLimit = Math.round(image.width * 0.32);
    const verticalLimit = Math.round(image.height * 0.32);

    return {
      left: label === 'tl' || label === 'bl' ? 0 : image.width - horizontalLimit,
      right: label === 'tl' || label === 'bl' ? horizontalLimit : image.width - 1,
      top: label === 'tl' || label === 'tr' ? 0 : image.height - verticalLimit,
      bottom: label === 'tl' || label === 'tr' ? verticalLimit : image.height - 1,
    };
  }

  private buildDarkPixelIntegral(image: RawImage, threshold: number): Uint32Array {
    const integralWidth = image.width + 1;
    const integral = new Uint32Array((image.width + 1) * (image.height + 1));

    for (let y = 0; y < image.height; y += 1) {
      let rowSum = 0;
      for (let x = 0; x < image.width; x += 1) {
        rowSum += this.isDarkPixel(image, x, y, threshold) ? 1 : 0;
        const integralIndex = ((y + 1) * integralWidth) + x + 1;
        integral[integralIndex] = (integral[integralIndex - integralWidth] ?? 0) + rowSum;
      }
    }

    return integral;
  }

  private measureIntegralRectDarkCount(
    integral: Uint32Array,
    imageWidth: number,
    imageHeight: number,
    left: number,
    top: number,
    width: number,
    height: number,
  ): number {
    const boundedLeft = this.clampNumber(Math.round(left), 0, imageWidth);
    const boundedTop = this.clampNumber(Math.round(top), 0, imageHeight);
    const boundedRight = this.clampNumber(Math.round(left + width), boundedLeft, imageWidth);
    const boundedBottom = this.clampNumber(Math.round(top + height), boundedTop, imageHeight);
    const integralWidth = imageWidth + 1;
    const topLeft = (boundedTop * integralWidth) + boundedLeft;
    const topRight = (boundedTop * integralWidth) + boundedRight;
    const bottomLeft = (boundedBottom * integralWidth) + boundedLeft;
    const bottomRight = (boundedBottom * integralWidth) + boundedRight;

    return (integral[bottomRight] ?? 0)
      - (integral[bottomLeft] ?? 0)
      - (integral[topRight] ?? 0)
      + (integral[topLeft] ?? 0);
  }

  private measureIntegralRectDarkRatio(
    integral: Uint32Array,
    imageWidth: number,
    imageHeight: number,
    left: number,
    top: number,
    width: number,
    height: number,
  ): number {
    const boundedLeft = this.clampNumber(Math.round(left), 0, imageWidth);
    const boundedTop = this.clampNumber(Math.round(top), 0, imageHeight);
    const boundedRight = this.clampNumber(Math.round(left + width), boundedLeft, imageWidth);
    const boundedBottom = this.clampNumber(Math.round(top + height), boundedTop, imageHeight);
    const area = Math.max(1, (boundedRight - boundedLeft) * (boundedBottom - boundedTop));

    return this.measureIntegralRectDarkCount(
      integral,
      imageWidth,
      imageHeight,
      boundedLeft,
      boundedTop,
      boundedRight - boundedLeft,
      boundedBottom - boundedTop,
    ) / area;
  }

  private measureIntegralRingDarkRatio(
    integral: Uint32Array,
    imageWidth: number,
    imageHeight: number,
    outerLeft: number,
    outerTop: number,
    outerWidth: number,
    outerHeight: number,
    innerLeft: number,
    innerTop: number,
    innerWidth: number,
    innerHeight: number,
  ): number {
    const outerCount = this.measureIntegralRectDarkCount(
      integral,
      imageWidth,
      imageHeight,
      outerLeft,
      outerTop,
      outerWidth,
      outerHeight,
    );
    const innerCount = this.measureIntegralRectDarkCount(
      integral,
      imageWidth,
      imageHeight,
      innerLeft,
      innerTop,
      innerWidth,
      innerHeight,
    );
    const boundedOuterLeft = this.clampNumber(Math.round(outerLeft), 0, imageWidth);
    const boundedOuterTop = this.clampNumber(Math.round(outerTop), 0, imageHeight);
    const boundedOuterRight = this.clampNumber(Math.round(outerLeft + outerWidth), boundedOuterLeft, imageWidth);
    const boundedOuterBottom = this.clampNumber(Math.round(outerTop + outerHeight), boundedOuterTop, imageHeight);
    const boundedInnerLeft = this.clampNumber(Math.round(innerLeft), 0, imageWidth);
    const boundedInnerTop = this.clampNumber(Math.round(innerTop), 0, imageHeight);
    const boundedInnerRight = this.clampNumber(Math.round(innerLeft + innerWidth), boundedInnerLeft, imageWidth);
    const boundedInnerBottom = this.clampNumber(Math.round(innerTop + innerHeight), boundedInnerTop, imageHeight);
    const outerArea = Math.max(1, (boundedOuterRight - boundedOuterLeft) * (boundedOuterBottom - boundedOuterTop));
    const innerArea = Math.max(0, (boundedInnerRight - boundedInnerLeft) * (boundedInnerBottom - boundedInnerTop));
    const ringArea = Math.max(1, outerArea - innerArea);

    return Math.max(0, outerCount - innerCount) / ringArea;
  }

  private distanceBetweenPoints(
    left: { x: number; y: number },
    right: { x: number; y: number },
  ): number {
    return Math.hypot(right.x - left.x, right.y - left.y);
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

  private async prepareUatUpload(input: ScoreSheetImportUatInput): Promise<PreparedUatUpload> {
    const fileType = this.normalizeMimeType(input.fileType);
    const extension = path.extname(input.fileName || '').toLowerCase();
    const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg'
      || extension === '.jpg' || extension === '.jpeg';
    const isPng = fileType === 'image/png' || extension === '.png';
    const isHeic = fileType === 'image/heic' || extension === '.heic';
    const isHeif = fileType === 'image/heif' || extension === '.heif';

    if (!isJpeg && !isPng && !isHeic && !isHeif) {
      throw new ValidationError('Unsupported scoresheet UAT upload format. Use JPEG, PNG, HEIC, or HEIF.');
    }

    if (isJpeg || isPng) {
      return {
        buffer: input.fileBuffer,
        upload: {
          fileName: input.fileName,
          originalFileType: input.fileType,
          normalizedFileType: fileType || input.fileType,
          fileSize: input.fileBuffer.length,
          converted: false,
          conversionStrategy: 'none',
        },
      };
    }

    try {
      const converted = await sharp(input.fileBuffer)
        .rotate()
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 95 })
        .toBuffer();

      return {
        buffer: converted,
        upload: {
          fileName: input.fileName,
          originalFileType: input.fileType,
          normalizedFileType: 'image/jpeg',
          fileSize: input.fileBuffer.length,
          converted: true,
          conversionStrategy: isHeic ? 'heic_to_jpeg' : 'heif_to_jpeg',
        },
      };
    } catch (error) {
      throw new ValidationError(
        `Unable to convert HEIC/HEIF scoresheet image for UAT. Convert it to JPEG or PNG and retry. ${this.formatErrorMessage(error)}`,
      );
    }
  }

  private normalizeMimeType(fileType: string): string {
    return String(fileType || '').split(';')[0]!.trim().toLowerCase();
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
  ): ExtractionAnalysis {
    const rowCount = criteria.length;
    if (rowCount <= 0) {
      throw new ValidationError('Scoresheet import requires at least one criterion');
    }

    if (template.machineReadable?.sheetVersion === 'v3') {
      return this.extractV3MachineReadableScores(image, criteria, template);
    }

    const gridGeometry = this.resolveGridGeometry(image, template, rowCount);
    const extractedCriteria: CriterionExtraction[] = [];
    const mismatchWarnings: string[] = [];
    let computedTotal = 0;
    let confidenceSum = 0;
    const machineReadableConfig = template.machineReadable;
    const rejectedRows: MachineReadableRejectedRow[] = [];
    let missingMarkRowCount = 0;
    let multiMarkRowCount = 0;
    let lowConfidenceRowCount = 0;
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
      const markedColumnIndexes = machineReadableConfig && topCell
        ? cellInkScores
          .map((scoreValue, columnIndex) => ({ scoreValue, columnIndex }))
          .filter(({ scoreValue }) =>
            scoreValue >= template.grid.minCellInkScore
            && scoreValue >= (topCell.scoreValue * 0.45)
          )
          .map(({ columnIndex }) => columnIndex)
        : [];
      let rejectionReason: MachineReadableRejectedRow['reason'] | null = null;

      if (!topCell || topCell.scoreValue < template.grid.minCellInkScore) {
        rejectionReason = 'missing_mark';
        missingMarkRowCount += 1;
      } else if (machineReadableConfig && markedColumnIndexes.length > 1) {
        rejectionReason = 'multi_mark';
        multiMarkRowCount += 1;
      } else if (confidence < template.grid.minConfidenceGap) {
        rejectionReason = 'low_confidence';
        lowConfidenceRowCount += 1;
      }

      const ambiguous = rejectionReason !== null;
      const resolvedScoreValue: number | null = topCell
        ? (template.scoreColumns[topCell.index] ?? null)
        : null;
      const detectedScore: number | null = ambiguous ? null : resolvedScoreValue;
      const detectedColumnLabel = ambiguous || !topCell ? null : String(template.scoreColumns[topCell.index]);

      if (machineReadableConfig && rejectionReason) {
        rejectedRows.push({
          rowIndex,
          criterionId: criterion.id,
          criterionName: criterion.name,
          reason: rejectionReason,
          topCellScore: Number((topCell?.scoreValue ?? 0).toFixed(6)),
          secondCellScore: Number(secondCell.scoreValue.toFixed(6)),
          selectedColumnIndex: topCell?.index ?? null,
          markedColumnIndexes,
        });
      }

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
    const machineReadableMetadata: MachineReadableExtractionMetadata | null = machineReadableConfig
      ? {
        sheetVersion: machineReadableConfig.sheetVersion,
        templateVersion: machineReadableConfig.templateVersion,
        anchorQuality: this.measureMachineReadableAnchorQuality(image),
        markQuality: {
          acceptedRowCount: rowCount - rejectedRows.length,
          rejectedRowCount: rejectedRows.length,
          missingMarkRowCount,
          multiMarkRowCount,
          lowConfidenceRowCount,
        },
        rejectedRows,
        ignoredRegions: machineReadableConfig.ignoredRegions.map((region) => ({ ...region })),
      }
      : null;

    return {
      payload: {
        templateKey: template.key,
        machineReadable: machineReadableMetadata,
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

  private extractV3MachineReadableScores(
    image: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
      preprocessing?: PreprocessingMetadata;
    },
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): ExtractionAnalysis {
    const machineReadableConfig = template.machineReadable!;
    const mismatchWarnings: string[] = [];
    const sourceImage = this.ensureNormalizedImageMetadata(image);
    const candidates = this.buildV3ExtractionCandidates(sourceImage, criteria, template);
    const baselineCandidate = candidates[0]!;
    const selectedCandidate = this.selectPreferredV3ExtractionCandidate(candidates);

    if (!selectedCandidate.fiducialDetection.detected) {
      mismatchWarnings.push(
        'Scoresheet import could not detect all four v3 anchor fiducials; score rows were treated as ambiguous.',
      );
    }
    selectedCandidate.criteria.forEach((criterion, rowIndex) => {
      const expectedCriterion = criteria[rowIndex]!;
      if (
        criterion.detectedScore !== null
        && criterion.detectedScore > Number(expectedCriterion.maxScore)
      ) {
        mismatchWarnings.push(
          `${expectedCriterion.name} extracted score ${criterion.detectedScore} exceeds criterion max ${expectedCriterion.maxScore}`,
        );
      }
    });

    const extractionImage = selectedCandidate.canonicalImage;
    const preprocessing = extractionImage.preprocessing;
    const reviewBurdenMetrics = this.buildReviewBurdenMetrics(selectedCandidate.criteria, mismatchWarnings);
    const qualityGate = this.assessCaptureQuality({
      gridAnchoring: selectedCandidate.gridGeometry.anchoring,
      overallConfidence: selectedCandidate.overallConfidence,
      qualitySignals: preprocessing.qualitySignals,
      reviewBurdenMetrics,
    });

    return {
      payload: {
        templateKey: template.key,
        machineReadable: {
          sheetVersion: machineReadableConfig.sheetVersion,
          templateVersion: machineReadableConfig.templateVersion,
          anchorQuality: this.measureMachineReadableAnchorQuality(
            extractionImage,
            selectedCandidate.fiducialDetection,
            selectedCandidate.perspectiveCorrected,
          ),
          markQuality: selectedCandidate.markQuality,
          rejectedRows: selectedCandidate.rejectedRows,
          ignoredRegions: machineReadableConfig.ignoredRegions.map((region) => ({ ...region })),
        },
        preprocessingMode: preprocessing.preprocessingMode,
        thresholdStrategy: preprocessing.thresholdStrategy,
        qualitySignals: preprocessing.qualitySignals,
        normalizedImage: {
          width: extractionImage.width,
          height: extractionImage.height,
        },
        sheetBounds: extractionImage.bounds,
        gridAnchoring: selectedCandidate.gridGeometry.anchoring,
        reviewBurdenMetrics,
        qualityGate,
        scoreValues: [...template.scoreColumns],
        criteria: selectedCandidate.criteria,
        mismatchWarnings,
      },
      computedTotal: selectedCandidate.computedTotal,
      overallConfidence: selectedCandidate.overallConfidence,
      v3Diagnostics: {
        selectedCandidateKind: selectedCandidate.kind,
        fallbackApplied: selectedCandidate !== baselineCandidate,
        baselinePreprocessing: {
          preprocessingMode: baselineCandidate.canonicalImage.preprocessing.preprocessingMode,
          thresholdStrategy: baselineCandidate.canonicalImage.preprocessing.thresholdStrategy,
        },
        baselineRejectedRowCount: baselineCandidate.rejectedRows.length,
        normalizedImage: selectedCandidate.normalizedImage,
        canonicalImage: selectedCandidate.canonicalImage,
        fiducialDetection: selectedCandidate.fiducialDetection,
        perspectiveCorrected: selectedCandidate.perspectiveCorrected,
        gridGeometry: selectedCandidate.gridGeometry,
      },
    };
  }

  private buildV3ExtractionCandidates(
    image: NormalizedImage,
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): V3ScoredExtractionCandidate[] {
    const baselineCandidate = this.scoreV3NormalizedImageCandidate(image, criteria, template, 'primary');
    const candidates: V3ScoredExtractionCandidate[] = [baselineCandidate];

    if (image.preprocessing.preprocessingMode === 'standard') {
      V3_SCAN_FALLBACK_THRESHOLD_STRATEGIES.forEach((thresholdStrategy) => {
        const scanNormalizedImage = this.applyScanNormalization(image, thresholdStrategy);
        candidates.push(
          this.scoreV3NormalizedImageCandidate(
            scanNormalizedImage,
            criteria,
            template,
            'normalized_scan',
          ),
        );
      });

      if (baselineCandidate.fiducialDetection.detected) {
        V3_SCAN_FALLBACK_THRESHOLD_STRATEGIES.forEach((thresholdStrategy) => {
          const canonicalScanImage = this.applyScanNormalization(
            baselineCandidate.canonicalImage,
            thresholdStrategy,
          );
          candidates.push(
            this.scoreV3CanonicalImageCandidate(
              baselineCandidate.normalizedImage,
              canonicalScanImage,
              baselineCandidate.fiducialDetection,
              criteria,
              template,
            ),
          );
        });
      }
    }

    return candidates;
  }

  private scoreV3NormalizedImageCandidate(
    image: NormalizedImage,
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
    kind: V3ScoredExtractionCandidate['kind'],
  ): V3ScoredExtractionCandidate {
    const prepared = this.prepareV3CanonicalImage(image);
    return this.scorePreparedV3Candidate(
      kind,
      image,
      prepared.image,
      prepared.fiducialDetection,
      prepared.perspectiveCorrected,
      criteria,
      template,
    );
  }

  private scoreV3CanonicalImageCandidate(
    normalizedImage: NormalizedImage,
    canonicalImage: NormalizedImage,
    fiducialDetection: V3FiducialDetection,
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): V3ScoredExtractionCandidate {
    return this.scorePreparedV3Candidate(
      'canonical_scan',
      normalizedImage,
      canonicalImage,
      fiducialDetection,
      true,
      criteria,
      template,
    );
  }

  private scorePreparedV3Candidate(
    kind: V3ScoredExtractionCandidate['kind'],
    normalizedImage: NormalizedImage,
    canonicalImage: NormalizedImage,
    fiducialDetection: V3FiducialDetection,
    perspectiveCorrected: boolean,
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): V3ScoredExtractionCandidate {
    const rowCount = criteria.length;
    const gridGeometry = this.resolveV3DirectGridGeometry(
      canonicalImage,
      template,
      rowCount,
      fiducialDetection.detected,
    );
    const extractedCriteria: CriterionExtraction[] = [];
    const rejectedRows: MachineReadableRejectedRow[] = [];
    let missingMarkRowCount = 0;
    let multiMarkRowCount = 0;
    let lowConfidenceRowCount = 0;
    let computedTotal = 0;
    let confidenceSum = 0;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const criterion = criteria[rowIndex]!;
      const cellInkScores = fiducialDetection.detected
        ? this.measureV3DirectScoreRowInk(canonicalImage, template, rowCount, rowIndex)
        : template.scoreColumns.map(() => 0);
      const ranked = this.rankInkScores(cellInkScores);
      const topCell = ranked[0];
      const secondCell = ranked[1] || { scoreValue: 0, index: topCell?.index ?? 0 };
      const confidence = topCell
        ? Math.max(0, Math.min(1, (topCell.scoreValue - secondCell.scoreValue) / Math.max(topCell.scoreValue, 0.0001)))
        : 0;
      const markedColumnIndexes = topCell
        ? cellInkScores
          .map((scoreValue, columnIndex) => ({ scoreValue, columnIndex }))
          .filter(({ scoreValue }) =>
            scoreValue >= V3_DIRECT_MULTI_MARK_SCORE
            && scoreValue >= (topCell.scoreValue * V3_DIRECT_MULTI_MARK_RATIO)
          )
          .map(({ columnIndex }) => columnIndex)
        : [];
      let rejectionReason: MachineReadableRejectedRow['reason'] | null = null;

      if (!topCell || topCell.scoreValue < V3_DIRECT_MIN_MARK_SCORE) {
        rejectionReason = 'missing_mark';
        missingMarkRowCount += 1;
      } else if (markedColumnIndexes.length > 1) {
        rejectionReason = 'multi_mark';
        multiMarkRowCount += 1;
      } else if (confidence < V3_DIRECT_MIN_CONFIDENCE_GAP) {
        rejectionReason = 'low_confidence';
        lowConfidenceRowCount += 1;
      }

      const ambiguous = rejectionReason !== null;
      const resolvedScoreValue: number | null = topCell
        ? (template.scoreColumns[topCell.index] ?? null)
        : null;
      const detectedScore: number | null = ambiguous ? null : resolvedScoreValue;
      const detectedColumnLabel = ambiguous || !topCell ? null : String(template.scoreColumns[topCell.index]);

      if (rejectionReason) {
        rejectedRows.push({
          rowIndex,
          criterionId: criterion.id,
          criterionName: criterion.name,
          reason: rejectionReason,
          topCellScore: Number((topCell?.scoreValue ?? 0).toFixed(6)),
          secondCellScore: Number(secondCell.scoreValue.toFixed(6)),
          selectedColumnIndex: topCell?.index ?? null,
          markedColumnIndexes,
        });
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

    return {
      kind,
      normalizedImage,
      canonicalImage,
      fiducialDetection,
      perspectiveCorrected,
      gridGeometry,
      criteria: extractedCriteria,
      rejectedRows,
      markQuality: {
        acceptedRowCount: rowCount - rejectedRows.length,
        rejectedRowCount: rejectedRows.length,
        missingMarkRowCount,
        multiMarkRowCount,
        lowConfidenceRowCount,
      },
      computedTotal,
      overallConfidence: rowCount > 0 ? Number((confidenceSum / rowCount).toFixed(4)) : 0,
    };
  }

  private selectPreferredV3ExtractionCandidate(
    candidates: V3ScoredExtractionCandidate[],
  ): V3ScoredExtractionCandidate {
    const baselineCandidate = candidates[0]!;
    const scoreSupport = this.buildV3CandidateScoreSupport(candidates);
    let selectedCandidate = baselineCandidate;

    candidates.slice(1).forEach((candidate) => {
      if (!this.isSafeV3CandidateUpgrade(candidate, baselineCandidate, scoreSupport)) {
        return;
      }

      if (this.isBetterV3ExtractionCandidate(candidate, selectedCandidate)) {
        selectedCandidate = candidate;
      }
    });

    return selectedCandidate;
  }

  private buildV3CandidateScoreSupport(
    candidates: V3ScoredExtractionCandidate[],
  ): Map<number, Map<number, number>> {
    const support = new Map<number, Map<number, number>>();

    candidates.forEach((candidate) => {
      candidate.criteria.forEach((criterion) => {
        if (criterion.detectedScore === null) {
          return;
        }

        const rowSupport = support.get(criterion.rowIndex) ?? new Map<number, number>();
        rowSupport.set(
          criterion.detectedScore,
          (rowSupport.get(criterion.detectedScore) ?? 0) + 1,
        );
        support.set(criterion.rowIndex, rowSupport);
      });
    });

    return support;
  }

  private isSafeV3CandidateUpgrade(
    candidate: V3ScoredExtractionCandidate,
    baselineCandidate: V3ScoredExtractionCandidate,
    scoreSupport: Map<number, Map<number, number>>,
  ): boolean {
    for (let rowIndex = 0; rowIndex < baselineCandidate.criteria.length; rowIndex += 1) {
      const baselineScore = baselineCandidate.criteria[rowIndex]?.detectedScore ?? null;
      const candidateScore = candidate.criteria[rowIndex]?.detectedScore ?? null;

      if (baselineScore !== null) {
        if (candidateScore !== baselineScore) {
          return false;
        }
        continue;
      }

      if (candidateScore === null) {
        continue;
      }

      const rowSupport = scoreSupport.get(rowIndex);
      const agreementCount = rowSupport?.get(candidateScore) ?? 0;
      if (agreementCount < 2) {
        return false;
      }
    }

    return true;
  }

  private isBetterV3ExtractionCandidate(
    candidate: V3ScoredExtractionCandidate,
    current: V3ScoredExtractionCandidate,
  ): boolean {
    if (candidate.rejectedRows.length !== current.rejectedRows.length) {
      return candidate.rejectedRows.length < current.rejectedRows.length;
    }

    if (candidate.markQuality.multiMarkRowCount !== current.markQuality.multiMarkRowCount) {
      return candidate.markQuality.multiMarkRowCount < current.markQuality.multiMarkRowCount;
    }

    if (candidate.markQuality.missingMarkRowCount !== current.markQuality.missingMarkRowCount) {
      return candidate.markQuality.missingMarkRowCount < current.markQuality.missingMarkRowCount;
    }

    return candidate.overallConfidence > current.overallConfidence;
  }

  private buildV3DiagnosticReport(
    image: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
      preprocessing?: PreprocessingMetadata;
    },
    criteria: Array<{ id: string; name: string; maxScore: number }>,
    template: ScoreSheetTemplateDefinition,
  ): ScoreSheetV3DiagnosticReport {
    const analysis = this.extractScoresFromNormalizedImage(image, criteria, template);
    const machineReadable = analysis.payload.machineReadable;

    if (!machineReadable || machineReadable.sheetVersion !== 'v3') {
      throw new ValidationError('V3 scoresheet diagnostics require a machine-readable v3 template');
    }

    const diagnostics = analysis.v3Diagnostics;
    if (!diagnostics) {
      throw new ValidationError('V3 scoresheet diagnostics require v3 extraction context');
    }

    const normalizedImage = diagnostics.normalizedImage;
    const extractionImage = diagnostics.canonicalImage;
    const gridGeometry = diagnostics.gridGeometry;
    const fiducials = machineReadable.anchorQuality.fiducials
      ?? this.toMachineReadableFiducialMetadata(
        diagnostics.fiducialDetection,
        diagnostics.perspectiveCorrected,
      );
    const geometryWarnings = this.buildV3GeometryWarnings(fiducials, machineReadable.anchorQuality);
    const rows = this.buildV3DiagnosticRows(
      extractionImage,
      template,
      analysis.payload.criteria,
      machineReadable.rejectedRows,
    );
    const failureClassification = this.resolveV3DiagnosticFailureClassification(
      diagnostics.fiducialDetection,
      gridGeometry,
      machineReadable.rejectedRows,
      analysis.payload.qualityGate,
    );

    return {
      templateKey: template.key,
      sheetVersion: machineReadable.sheetVersion,
      templateVersion: machineReadable.templateVersion,
      preprocessingMode: analysis.payload.preprocessingMode,
      thresholdStrategy: analysis.payload.thresholdStrategy,
      normalizedImage: this.toV3DiagnosticImage(normalizedImage),
      canonicalImage: this.toV3DiagnosticImage(extractionImage),
      sheetBounds: analysis.payload.sheetBounds,
      perspectiveCorrected: diagnostics.perspectiveCorrected,
      failureClassification,
      geometryWarnings,
      diagnosticNotes: this.buildV3DiagnosticNotes(
        failureClassification,
        diagnostics,
        geometryWarnings,
        machineReadable.rejectedRows,
        analysis.payload.qualityGate,
      ),
      captureQualityRejection: fiducials.captureQualityRejection,
      fiducials,
      canonicalAnchors: this.getV3CanonicalAnchorCenters(extractionImage.width, extractionImage.height),
      gridGeometry,
      anchorQuality: machineReadable.anchorQuality,
      markQuality: machineReadable.markQuality,
      qualityGate: analysis.payload.qualityGate,
      reviewBurdenMetrics: analysis.payload.reviewBurdenMetrics,
      rejectedRows: machineReadable.rejectedRows,
      ignoredRegions: machineReadable.ignoredRegions,
      rows,
      computedTotal: analysis.computedTotal,
      overallConfidence: analysis.overallConfidence,
      mismatchWarnings: analysis.payload.mismatchWarnings,
    };
  }

  private toV3DiagnosticImage(image: NormalizedImage): ScoreSheetV3DiagnosticImage {
    return {
      data: Buffer.from(image.data),
      width: image.width,
      height: image.height,
      channels: image.channels,
      bounds: { ...image.bounds },
      preprocessing: {
        preprocessingMode: image.preprocessing.preprocessingMode,
        thresholdStrategy: image.preprocessing.thresholdStrategy,
        qualitySignals: { ...image.preprocessing.qualitySignals },
      },
    };
  }

  private buildV3DiagnosticRows(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    criteria: CriterionExtraction[],
    rejectedRows: MachineReadableRejectedRow[],
  ): ScoreSheetV3DiagnosticRow[] {
    const rejectedRowsByIndex = new Map(rejectedRows.map((row) => [row.rowIndex, row] as const));
    const rowCount = criteria.length;

    return criteria.map((criterion) => {
      const ranked = this.rankInkScores(criterion.cellInkScores);
      const topCell = ranked[0] ?? null;
      const secondCell = ranked[1] ?? null;
      const rejectedRow = rejectedRowsByIndex.get(criterion.rowIndex) || null;
      const selectedColumnIndex = topCell && topCell.scoreValue > 0 ? topCell.index : null;
      const markedColumnIndexes = new Set(rejectedRow?.markedColumnIndexes ?? []);
      const cells = template.scoreColumns.map((scoreValue, columnIndex): ScoreSheetV3DiagnosticCell => ({
        rowIndex: criterion.rowIndex,
        columnIndex,
        scoreValue,
        bounds: this.getV3DirectScoreCellBounds(image, template, rowCount, criterion.rowIndex, columnIndex),
        sample: this.getV3DirectScoreSample(image, template, rowCount, criterion.rowIndex, columnIndex),
        inkScore: Number((criterion.cellInkScores[columnIndex] ?? 0).toFixed(6)),
        selected: selectedColumnIndex === columnIndex,
        markedAsMultiMark: markedColumnIndexes.has(columnIndex),
      }));

      return {
        rowIndex: criterion.rowIndex,
        criterionId: criterion.criterionId,
        criterionName: criterion.criterionName,
        detectedScore: criterion.detectedScore,
        detectedColumnLabel: criterion.detectedColumnLabel,
        confidence: criterion.confidence,
        ambiguous: criterion.ambiguous,
        rejectionReason: rejectedRow?.reason || null,
        selectedColumnIndex,
        topCellScore: Number((topCell?.scoreValue ?? 0).toFixed(6)),
        secondCellScore: Number((secondCell?.scoreValue ?? 0).toFixed(6)),
        cells,
      };
    });
  }

  private getV3DirectScoreCellBounds(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    rowCount: number,
    rowIndex: number,
    columnIndex: number,
  ): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const gridLeft = image.width * template.grid.left;
    const gridTop = image.height * template.grid.top;
    const rowHeight = (template.grid.bottom - template.grid.top) * image.height / rowCount;
    const columnWidth = (template.grid.right - template.grid.left) * image.width
      / template.scoreColumns.length;

    return {
      left: Number((gridLeft + (columnWidth * columnIndex)).toFixed(2)),
      top: Number((gridTop + (rowHeight * rowIndex)).toFixed(2)),
      width: Number(columnWidth.toFixed(2)),
      height: Number(rowHeight.toFixed(2)),
    };
  }

  private getV3DirectScoreSample(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    rowCount: number,
    rowIndex: number,
    columnIndex: number,
  ): {
    centerX: number;
    centerY: number;
    radius: number;
    searchRadius: number;
  } {
    const rowHeight = (template.grid.bottom - template.grid.top) * image.height / rowCount;
    const columnWidth = (template.grid.right - template.grid.left) * image.width
      / template.scoreColumns.length;
    const centerX = image.width * (
      template.grid.left
      + (((template.grid.right - template.grid.left) / template.scoreColumns.length) * (columnIndex + 0.5))
    );
    const centerY = image.height * (
      template.grid.top
      + (((template.grid.bottom - template.grid.top) / rowCount) * (rowIndex + 0.5))
    );

    return {
      centerX: Number(centerX.toFixed(2)),
      centerY: Number(centerY.toFixed(2)),
      radius: this.clampNumber(Math.round(Math.min(rowHeight, columnWidth) * 0.12), 5, 8),
      searchRadius: this.clampNumber(Math.round(Math.min(rowHeight, columnWidth) * 0.1), 3, 7),
    };
  }

  private resolveV3DiagnosticFailureClassification(
    fiducialDetection: V3FiducialDetection,
    gridGeometry: GridGeometry,
    rejectedRows: MachineReadableRejectedRow[],
    qualityGate: CaptureQualityGate,
  ): ScoreSheetV3DiagnosticReport['failureClassification'] {
    if (
      !fiducialDetection.detected
      || !gridGeometry.anchoring.horizontalAnchored
      || !gridGeometry.anchoring.verticalAnchored
    ) {
      return 'geometry';
    }

    if (rejectedRows.length > 0) {
      return 'mark_scoring';
    }

    if (qualityGate.decision === 'manual_entry_required') {
      return 'quality_gate';
    }

    return 'none';
  }

  private buildV3DiagnosticNotes(
    failureClassification: ScoreSheetV3DiagnosticReport['failureClassification'],
    diagnostics: V3ExtractionAnalysisDiagnostics,
    geometryWarnings: string[],
    rejectedRows: MachineReadableRejectedRow[],
    qualityGate: CaptureQualityGate,
  ): string[] {
    const notes: string[] = [];

    if (failureClassification === 'geometry') {
      notes.push('Geometry failure: v3 fiducials or canonical grid anchoring were not reliable.');
      notes.push(...diagnostics.fiducialDetection.failureReasons);
    } else if (failureClassification === 'mark_scoring') {
      notes.push(`Mark scoring failure: ${rejectedRows.length} row(s) were rejected after geometry was accepted.`);
    } else if (failureClassification === 'quality_gate') {
      notes.push('Quality gate failure: rows were extracted, but capture-quality thresholds still blocked review.');
    } else {
      notes.push('No diagnostic failure detected.');
    }

    if (diagnostics.fallbackApplied) {
      notes.push(
        `Selected ${diagnostics.selectedCandidateKind} scoring fallback ${diagnostics.canonicalImage.preprocessing.preprocessingMode}/${diagnostics.canonicalImage.preprocessing.thresholdStrategy} after the baseline ${diagnostics.baselinePreprocessing.preprocessingMode}/${diagnostics.baselinePreprocessing.thresholdStrategy} candidate rejected ${diagnostics.baselineRejectedRowCount} row(s).`,
      );
    }

    notes.push(...geometryWarnings);
    notes.push(...qualityGate.blockingReasons);
    return Array.from(new Set(notes));
  }

  private buildV3GeometryWarnings(
    fiducials: MachineReadableFiducialMetadata,
    anchorQuality: MachineReadableAnchorQuality,
  ): string[] {
    const warnings: string[] = [];

    if (!fiducials.detected) {
      warnings.push('V3 fiducials were not accepted by the detector.');
    }
    if (!fiducials.perspectiveCorrected) {
      warnings.push('The image was not perspective-corrected before scoring.');
    }
    if (anchorQuality.versionStripConfidence < MACHINE_READABLE_VERSION_MIN_CONFIDENCE) {
      warnings.push(
        `Canonical version strip confidence ${anchorQuality.versionStripConfidence} is below ${MACHINE_READABLE_VERSION_MIN_CONFIDENCE}; the accepted fiducial quadrilateral may be wrong.`,
      );
    }
    if (anchorQuality.versionBits.join('') !== EDUCATION_OMR_V3_VERSION_BITS.join('')) {
      warnings.push(
        `Canonical version bits ${anchorQuality.versionBits.join('')} do not match expected ${EDUCATION_OMR_V3_VERSION_BITS.join('')}.`,
      );
    }

    return warnings;
  }

  private prepareV3CanonicalImage(
    image: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
      preprocessing?: PreprocessingMetadata;
    },
  ): {
    image: NormalizedImage;
    fiducialDetection: V3FiducialDetection;
    perspectiveCorrected: boolean;
  } {
    const sourceImage = this.ensureNormalizedImageMetadata(image);
    const fiducialDetection = this.detectV3Fiducials(sourceImage);

    if (!fiducialDetection.detected || !fiducialDetection.corners) {
      return {
        image: sourceImage,
        fiducialDetection,
        perspectiveCorrected: false,
      };
    }

    const warpedData = this.warpImageToV3Canonical(sourceImage, fiducialDetection);
    const warpedImage: NormalizedImage = {
      data: warpedData,
      width: sourceImage.width,
      height: sourceImage.height,
      channels: sourceImage.channels,
      bounds: sourceImage.bounds,
      preprocessing: {
        preprocessingMode: sourceImage.preprocessing.preprocessingMode,
        thresholdStrategy: sourceImage.preprocessing.thresholdStrategy,
        qualitySignals: this.measureImageQuality(
          {
            data: warpedData,
            width: sourceImage.width,
            height: sourceImage.height,
            channels: sourceImage.channels,
          },
          sourceImage.preprocessing.qualitySignals.thresholdValue,
          0,
        ),
      },
    };

    return {
      image: warpedImage,
      fiducialDetection,
      perspectiveCorrected: true,
    };
  }

  private ensureNormalizedImageMetadata(
    image: RawImage & {
      bounds: { left: number; top: number; width: number; height: number };
      preprocessing?: PreprocessingMetadata;
    },
  ): NormalizedImage {
    if (image.preprocessing) {
      return {
        data: image.data,
        width: image.width,
        height: image.height,
        channels: image.channels,
        bounds: image.bounds,
        preprocessing: image.preprocessing,
      };
    }

    return {
      data: image.data,
      width: image.width,
      height: image.height,
      channels: image.channels,
      bounds: image.bounds,
      preprocessing: {
        preprocessingMode: DEFAULT_PREPROCESSING_MODE,
        thresholdStrategy: 'none',
        qualitySignals: this.measureImageQuality(image, null, 0),
      },
    };
  }

  private resolveV3DirectGridGeometry(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    rowCount: number,
    anchored: boolean,
  ): GridGeometry {
    return {
      horizontalBoundaries: this.buildFallbackBoundaries(
        image.height,
        template.grid.top,
        template.grid.bottom,
        rowCount,
      ),
      verticalBoundaries: this.buildFallbackBoundaries(
        image.width,
        template.grid.left,
        template.grid.right,
        template.scoreColumns.length,
      ),
      anchoring: {
        horizontalAnchored: anchored,
        verticalAnchored: anchored,
        horizontalLineCount: anchored ? rowCount + 1 : 0,
        verticalLineCount: anchored ? template.scoreColumns.length + 1 : 0,
        usedFallback: !anchored,
      },
    };
  }

  private measureV3DirectScoreRowInk(
    image: RawImage,
    template: ScoreSheetTemplateDefinition,
    rowCount: number,
    rowIndex: number,
  ): number[] {
    const rowHeight = (template.grid.bottom - template.grid.top) * image.height / rowCount;
    const columnWidth = (template.grid.right - template.grid.left) * image.width
      / template.scoreColumns.length;
    const sampleRadius = this.clampNumber(
      Math.round(Math.min(rowHeight, columnWidth) * 0.12),
      5,
      8,
    );
    const searchRadius = this.clampNumber(
      Math.round(Math.min(rowHeight, columnWidth) * 0.1),
      3,
      7,
    );
    const searchStep = Math.max(1, Math.floor(searchRadius / 2));
    const rowCenterY = image.height * (
      template.grid.top
      + (((template.grid.bottom - template.grid.top) / rowCount) * (rowIndex + 0.5))
    );

    return template.scoreColumns.map((_scoreValue, columnIndex) => {
      const columnCenterX = image.width * (
        template.grid.left
        + (((template.grid.right - template.grid.left) / template.scoreColumns.length) * (columnIndex + 0.5))
      );
      let bestScore = 0;

      for (let dy = -searchRadius; dy <= searchRadius; dy += searchStep) {
        for (let dx = -searchRadius; dx <= searchRadius; dx += searchStep) {
          bestScore = Math.max(
            bestScore,
            this.measureV3BubbleCoreInk(
              image,
              Math.round(columnCenterX + dx),
              Math.round(rowCenterY + dy),
              sampleRadius,
            ),
          );
        }
      }

      return bestScore;
    });
  }

  private measureV3BubbleCoreInk(
    image: RawImage,
    centerX: number,
    centerY: number,
    radius: number,
  ): number {
    let darkPixelCount = 0;
    let totalPixelCount = 0;
    let darkStrengthSum = 0;

    for (let y = centerY - radius; y <= centerY + radius; y += 1) {
      for (let x = centerX - radius; x <= centerX + radius; x += 1) {
        if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
          continue;
        }

        const normalizedX = (x - centerX) / radius;
        const normalizedY = (y - centerY) / radius;
        if ((normalizedX * normalizedX) + (normalizedY * normalizedY) > 1) {
          continue;
        }

        const offset = ((y * image.width) + x) * image.channels;
        const r = image.data[offset] ?? 255;
        const g = image.data[offset + 1] ?? r;
        const b = image.data[offset + 2] ?? r;
        const luminance = (r + g + b) / 3;
        if (luminance < 145) {
          darkPixelCount += 1;
        }
        darkStrengthSum += Math.max(0, (165 - luminance) / 165);
        totalPixelCount += 1;
      }
    }

    if (totalPixelCount <= 0) return 0;

    const darkRatio = darkPixelCount / totalPixelCount;
    const darkStrengthRatio = darkStrengthSum / totalPixelCount;
    return (darkRatio * 0.65) + (darkStrengthRatio * 0.35);
  }

  private warpImageToV3Canonical(
    image: RawImage,
    detection: V3FiducialDetection,
  ): Buffer {
    if (!detection.corners) {
      return Buffer.from(image.data);
    }

    const destinationAnchors = this.getV3CanonicalAnchorCenters(image.width, image.height);
    const coefficients = this.buildPerspectiveCoefficients(
      [
        destinationAnchors.tl,
        destinationAnchors.tr,
        destinationAnchors.bl,
        destinationAnchors.br,
      ],
      [
        detection.corners.tl,
        detection.corners.tr,
        detection.corners.bl,
        detection.corners.br,
      ],
    );
    const [
      coefficientA = 0,
      coefficientB = 0,
      coefficientC = 0,
      coefficientD = 0,
      coefficientE = 0,
      coefficientF = 0,
      coefficientG = 0,
      coefficientH = 0,
    ] = coefficients;
    const output = Buffer.alloc(image.width * image.height * image.channels, 255);

    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const denominator = (coefficientG * x) + (coefficientH * y) + 1;
        if (Math.abs(denominator) < 0.000001) {
          continue;
        }

        const sourceX = ((coefficientA * x) + (coefficientB * y) + coefficientC) / denominator;
        const sourceY = ((coefficientD * x) + (coefficientE * y) + coefficientF) / denominator;
        const nearestX = Math.round(sourceX);
        const nearestY = Math.round(sourceY);
        if (nearestX < 0 || nearestX >= image.width || nearestY < 0 || nearestY >= image.height) {
          continue;
        }

        const sourceOffset = ((nearestY * image.width) + nearestX) * image.channels;
        const outputOffset = ((y * image.width) + x) * image.channels;
        for (let channelIndex = 0; channelIndex < image.channels; channelIndex += 1) {
          output[outputOffset + channelIndex] = image.data[sourceOffset + channelIndex] ?? 255;
        }
      }
    }

    return output;
  }

  private getV3CanonicalAnchorCenters(width: number, height: number): {
    tl: { x: number; y: number };
    tr: { x: number; y: number };
    bl: { x: number; y: number };
    br: { x: number; y: number };
  } {
    const anchorCenterInsetX = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_WIDTH_INCHES;
    const anchorCenterInsetY = (V3_ANCHOR_OFFSET_INCHES + (V3_ANCHOR_SIZE_INCHES / 2))
      / V3_PAGE_HEIGHT_INCHES;

    return {
      tl: { x: width * anchorCenterInsetX, y: height * anchorCenterInsetY },
      tr: { x: width * (1 - anchorCenterInsetX), y: height * anchorCenterInsetY },
      bl: { x: width * anchorCenterInsetX, y: height * (1 - anchorCenterInsetY) },
      br: { x: width * (1 - anchorCenterInsetX), y: height * (1 - anchorCenterInsetY) },
    };
  }

  private buildPerspectiveCoefficients(
    destinationPoints: Array<{ x: number; y: number }>,
    sourcePoints: Array<{ x: number; y: number }>,
  ): number[] {
    const matrix: number[][] = [];
    const values: number[] = [];

    destinationPoints.forEach((destination, index) => {
      const source = sourcePoints[index]!;
      matrix.push([
        destination.x,
        destination.y,
        1,
        0,
        0,
        0,
        -source.x * destination.x,
        -source.x * destination.y,
      ]);
      values.push(source.x);
      matrix.push([
        0,
        0,
        0,
        destination.x,
        destination.y,
        1,
        -source.y * destination.x,
        -source.y * destination.y,
      ]);
      values.push(source.y);
    });

    return this.solveLinearSystem(matrix, values);
  }

  private solveLinearSystem(matrix: number[][], values: number[]): number[] {
    const size = values.length;
    const augmented = matrix.map((row, index) => [...row, values[index] ?? 0]);

    for (let column = 0; column < size; column += 1) {
      let pivotRow = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row]![column] ?? 0) > Math.abs(augmented[pivotRow]![column] ?? 0)) {
          pivotRow = row;
        }
      }

      [augmented[column], augmented[pivotRow]] = [augmented[pivotRow]!, augmented[column]!];
      const pivot = augmented[column]![column] ?? 0;
      if (Math.abs(pivot) < 0.000000001) {
        throw new ValidationError('Unable to solve v3 scoresheet perspective transform');
      }

      for (let valueIndex = column; valueIndex <= size; valueIndex += 1) {
        augmented[column]![valueIndex] = (augmented[column]![valueIndex] ?? 0) / pivot;
      }

      for (let row = 0; row < size; row += 1) {
        if (row === column) continue;
        const factor = augmented[row]![column] ?? 0;
        for (let valueIndex = column; valueIndex <= size; valueIndex += 1) {
          augmented[row]![valueIndex] = (augmented[row]![valueIndex] ?? 0)
            - (factor * (augmented[column]![valueIndex] ?? 0));
        }
      }
    }

    return augmented.map((row) => row[size] ?? 0);
  }

  private clampNumber(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
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

  private isDarkPixel(image: RawImage, x: number, y: number, threshold: number): boolean {
    return this.getPixelLuminance(image, x, y) < threshold;
  }

  private getPixelLuminance(image: RawImage, x: number, y: number): number {
    const offset = ((y * image.width) + x) * image.channels;
    const r = image.data[offset] ?? 255;
    const g = image.data[offset + 1] ?? r;
    const b = image.data[offset + 2] ?? r;
    return (r + g + b) / 3;
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
