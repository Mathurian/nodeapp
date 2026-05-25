import { ScoreSheetImportService } from '../../../src/services/ScoreSheetImportService';
import groundTruth from '../../examples/scoresheet-import/route66-phase1-ground-truth.json';

const WIDTH = 1000;
const HEIGHT = 1400;
const CHANNELS = 3;
const SCORE_GRID_LEFT = 0.326;
const SCORE_GRID_RIGHT = 0.986;
const SCORE_GRID_TOP = 0.318;
const SCORE_GRID_BOTTOM = 0.804;
const CELL_HORIZONTAL_PADDING = 0.18;
const CELL_VERTICAL_PADDING = 0.16;
const SCORE_COLUMNS = [6, 5, 4, 3, 2, 1, 0] as const;

const createBlankImage = (): Buffer => Buffer.alloc(WIDTH * HEIGHT * CHANNELS, 255);

const paintPurpleCell = (buffer: Buffer, rowIndex: number, rowCount: number, columnIndex: number): void => {
  const rowHeight = (SCORE_GRID_BOTTOM - SCORE_GRID_TOP) / rowCount;
  const columnWidth = (SCORE_GRID_RIGHT - SCORE_GRID_LEFT) / SCORE_COLUMNS.length;
  const left = Math.round(
    WIDTH * (SCORE_GRID_LEFT + (columnIndex * columnWidth) + (columnWidth * CELL_HORIZONTAL_PADDING)),
  );
  const top = Math.round(
    HEIGHT * (SCORE_GRID_TOP + (rowIndex * rowHeight) + (rowHeight * CELL_VERTICAL_PADDING)),
  );
  const paintWidth = Math.max(6, Math.round(WIDTH * (columnWidth * (1 - (CELL_HORIZONTAL_PADDING * 2)))));
  const paintHeight = Math.max(6, Math.round(HEIGHT * (rowHeight * (1 - (CELL_VERTICAL_PADDING * 2)))));

  for (let y = top; y < top + paintHeight; y += 1) {
    for (let x = left; x < left + paintWidth; x += 1) {
      const offset = ((y * WIDTH) + x) * CHANNELS;
      buffer[offset] = 128;
      buffer[offset + 1] = 64;
      buffer[offset + 2] = 160;
    }
  }
};

const paintScoreGrid = (buffer: Buffer, rowCount: number): void => {
  const gridLeft = Math.round(WIDTH * SCORE_GRID_LEFT);
  const gridRight = Math.round(WIDTH * SCORE_GRID_RIGHT);
  const gridTop = Math.round(HEIGHT * SCORE_GRID_TOP);
  const gridBottom = Math.round(HEIGHT * SCORE_GRID_BOTTOM);
  const rowHeight = (gridBottom - gridTop) / rowCount;
  const columnWidth = (gridRight - gridLeft) / SCORE_COLUMNS.length;

  for (let rowIndex = 0; rowIndex <= rowCount; rowIndex += 1) {
    const y = Math.round(gridTop + (rowHeight * rowIndex));
    for (let lineOffset = -1; lineOffset <= 1; lineOffset += 1) {
      for (let x = gridLeft; x <= gridRight; x += 1) {
        const offset = (((y + lineOffset) * WIDTH) + x) * CHANNELS;
        buffer[offset] = 0;
        buffer[offset + 1] = 0;
        buffer[offset + 2] = 0;
      }
    }
  }

  for (let columnIndex = 0; columnIndex <= SCORE_COLUMNS.length; columnIndex += 1) {
    const x = Math.round(gridLeft + (columnWidth * columnIndex));
    for (let lineOffset = -1; lineOffset <= 1; lineOffset += 1) {
      for (let y = gridTop; y <= gridBottom; y += 1) {
        const offset = ((y * WIDTH) + x + lineOffset) * CHANNELS;
        buffer[offset] = 0;
        buffer[offset + 1] = 0;
        buffer[offset + 2] = 0;
      }
    }
  }
};

const buildCriteria = () => Array.from({ length: 10 }, (_value, index) => ({
  id: `criterion-${index + 1}`,
  name: `Criterion ${index + 1}`,
  maxScore: 6,
}));

const buildTemplate = (criteria: ReturnType<typeof buildCriteria>) => ({
  key: 'test-template',
  displayName: 'Test Template',
  supported: true,
  scoreColumns: SCORE_COLUMNS,
  criteria: criteria.map((criterion) => ({
    label: criterion.name,
    aliases: [criterion.name.toLowerCase()],
  })),
  grid: {
    left: SCORE_GRID_LEFT,
    right: SCORE_GRID_RIGHT,
    top: SCORE_GRID_TOP,
    bottom: SCORE_GRID_BOTTOM,
    cellHorizontalPadding: CELL_HORIZONTAL_PADDING,
    cellVerticalPadding: CELL_VERTICAL_PADDING,
    minCellInkScore: 0.0024,
    minConfidenceGap: 0.09,
  },
});

describe('ScoreSheetImportService', () => {
  it('reorders criteria into the Education template row order before extraction', () => {
    const service = new ScoreSheetImportService({} as any);
    const educationTemplate = (service as any).resolveTemplate(
      [
        { id: 'a', name: 'Appropriate Attire', maxScore: 6 },
        { id: 'b', name: 'Knowledge', maxScore: 6 },
        { id: 'c', name: 'Time Management', maxScore: 6 },
        { id: 'd', name: 'Technique', maxScore: 6 },
        { id: 'e', name: 'Audience Engagement', maxScore: 6 },
        { id: 'f', name: 'Preparation', maxScore: 6 },
        { id: 'g', name: 'Safety', maxScore: 6 },
        { id: 'h', name: 'Volume', maxScore: 6 },
        { id: 'i', name: 'Attitude', maxScore: 6 },
        { id: 'j', name: 'Personality Projection', maxScore: 6 },
      ],
      { intent: 'SCORESHEET_IMPORT' },
      undefined,
    );

    const orderedCriteria = (service as any).orderCriteriaForTemplate(
      [
        { id: 'a', name: 'Appropriate Attire', maxScore: 6 },
        { id: 'b', name: 'Knowledge', maxScore: 6 },
        { id: 'c', name: 'Time Management', maxScore: 6 },
        { id: 'd', name: 'Technique', maxScore: 6 },
        { id: 'e', name: 'Audience Engagement', maxScore: 6 },
        { id: 'f', name: 'Preparation', maxScore: 6 },
        { id: 'g', name: 'Safety', maxScore: 6 },
        { id: 'h', name: 'Volume', maxScore: 6 },
        { id: 'i', name: 'Attitude', maxScore: 6 },
        { id: 'j', name: 'Personality Projection', maxScore: 6 },
      ],
      educationTemplate,
    );

    expect(orderedCriteria.map((criterion: any) => criterion.name)).toEqual([
      'Knowledge',
      'Technique',
      'Safety',
      'Attitude',
      'Personality Projection',
      'Volume',
      'Audience Engagement',
      'Appropriate Attire',
      'Preparation',
      'Time Management',
    ]);
  });

  it('detects purple-marked score cells from a normalized image', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildCriteria();
    const template = buildTemplate(criteria);

    const image = createBlankImage();
    paintPurpleCell(image, 0, criteria.length, 0);
    paintPurpleCell(image, 7, criteria.length, 5);

    const result = (service as any).extractScoresFromNormalizedImage(
      {
        data: image,
        width: WIDTH,
        height: HEIGHT,
        channels: CHANNELS,
        bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      },
      criteria,
      template,
    );

    expect(result.computedTotal).toBe(7);
    expect(result.payload.preprocessingMode).toBe('standard');
    expect(result.payload.thresholdStrategy).toBe('none');
    expect(result.payload.qualitySignals.thresholdValue).toBeNull();
    expect(result.payload.criteria[0].detectedScore).toBe(6);
    expect(result.payload.criteria[0].ambiguous).toBe(false);
    expect(result.payload.criteria[7].detectedScore).toBe(1);
    expect(result.payload.criteria[7].ambiguous).toBe(false);
  });

  it('can scan-normalize a marked image before extraction', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildCriteria();
    const template = buildTemplate(criteria);

    const image = createBlankImage();
    paintPurpleCell(image, 0, criteria.length, 0);
    paintPurpleCell(image, 7, criteria.length, 5);

    const scanNormalized = (service as any).applyScanNormalization(
      {
        data: image,
        width: WIDTH,
        height: HEIGHT,
        channels: CHANNELS,
        bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      },
      'fixed_150',
    );

    let nonBinaryPixelCount = 0;
    for (const value of scanNormalized.data.values()) {
      if (value !== 0 && value !== 255) {
        nonBinaryPixelCount += 1;
      }
    }
    expect(nonBinaryPixelCount).toBe(0);

    const result = (service as any).extractScoresFromNormalizedImage(scanNormalized, criteria, template);

    expect(result.computedTotal).toBe(7);
    expect(result.payload.preprocessingMode).toBe('scan_bw');
    expect(result.payload.thresholdStrategy).toBe('fixed_150');
    expect(result.payload.qualitySignals.thresholdValue).toBe(150);
    expect(result.payload.qualitySignals.darkPixelRatio).toBeGreaterThan(0);
    expect(result.payload.criteria[0].detectedScore).toBe(6);
    expect(result.payload.criteria[7].detectedScore).toBe(1);
  });

  it('accepts a fully marked anchored grid for review and reports low review burden', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildCriteria();
    const template = buildTemplate(criteria);
    const image = createBlankImage();
    paintScoreGrid(image, criteria.length);
    criteria.forEach((_criterion, rowIndex) => {
      paintPurpleCell(image, rowIndex, criteria.length, rowIndex % SCORE_COLUMNS.length);
    });

    const result = (service as any).extractScoresFromNormalizedImage(
      {
        data: image,
        width: WIDTH,
        height: HEIGHT,
        channels: CHANNELS,
        bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      },
      criteria,
      template,
    );

    expect(result.payload.gridAnchoring.usedFallback).toBe(false);
    expect(result.payload.reviewBurdenMetrics.ambiguousRowCount).toBe(0);
    expect(result.payload.reviewBurdenMetrics.estimatedManualCorrectionRows).toBe(0);
    expect(result.payload.qualityGate.decision).toBe('accepted_for_review');
  });

  it('rejects a weak upload when quality gates indicate manual entry is required', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildCriteria();
    const template = buildTemplate(criteria);

    const result = (service as any).extractScoresFromNormalizedImage(
      {
        data: createBlankImage(),
        width: WIDTH,
        height: HEIGHT,
        channels: CHANNELS,
        bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      },
      criteria,
      template,
    );

    expect(result.payload.qualityGate.decision).toBe('manual_entry_required');
    expect(result.payload.qualityGate.manualEntryOwner).toBe('attempting_user');
    expect(result.payload.reviewBurdenMetrics.ambiguousRowCount).toBe(criteria.length);
    expect(result.payload.qualityGate.blockingReasons.length).toBeGreaterThan(0);
  });

  it('persists rejected draft status when a processed upload fails quality gates', async () => {
    const scoreFile = {
      id: 'score-file-1',
      categoryId: 'category-1',
      judgeId: 'judge-1',
      contestantId: 'contestant-1',
      filePath: 'uploads/scoresheet.png',
      fileType: 'image/png',
      notes: JSON.stringify({ intent: 'SCORESHEET_IMPORT' }),
      tenantId: 'tenant-1',
      category: {
        id: 'category-1',
        criteria: buildCriteria(),
      },
    };
    const mockPrisma = {
      scoreFile: {
        findFirst: jest.fn().mockResolvedValue(scoreFile),
      },
      scoreSheetImportDraft: {
        upsert: jest.fn().mockImplementation(async ({ create }) => ({
          id: 'draft-1',
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    };
    const service = new ScoreSheetImportService(mockPrisma as any);
    const criteria = buildCriteria();
    const template = buildTemplate(criteria);
    const rejectedPayload = {
      templateKey: 'test-template',
      preprocessingMode: 'standard',
      thresholdStrategy: 'none',
      qualitySignals: {
        darkPixelRatio: 0,
        midtonePixelRatio: 0,
        contrastRange: 0,
        thresholdValue: null,
        despeckledPixelRatio: 0,
      },
      normalizedImage: { width: WIDTH, height: HEIGHT },
      sheetBounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      gridAnchoring: {
        horizontalAnchored: false,
        verticalAnchored: false,
        horizontalLineCount: 0,
        verticalLineCount: 0,
        usedFallback: true,
      },
      reviewBurdenMetrics: {
        rowCount: 10,
        detectedScoreRowCount: 0,
        ambiguousRowCount: 10,
        lowConfidenceRowCount: 10,
        missingScoreRowCount: 10,
        mismatchWarningCount: 1,
        rowsRequiringReviewCount: 10,
        estimatedManualCorrectionRows: 10,
        estimatedManualCorrectionRatio: 1,
      },
      qualityGate: {
        decision: 'manual_entry_required',
        reasons: ['The printed score grid could not be anchored on both axes.'],
        blockingReasons: ['The printed score grid could not be anchored on both axes.'],
        retryable: true,
        attemptLimit: 2,
        recommendedAction: 'retry_upload_or_manual_entry',
        manualEntryOwner: 'attempting_user',
        thresholds: {
          maxAmbiguousRowsForReview: 1,
          maxEstimatedCorrectionRowsForReview: 3,
          minOverallConfidenceForReview: 0.18,
          minContrastRange: 18,
          minDarkPixelRatio: 0.002,
          maxDarkPixelRatio: 0.35,
          maxDespeckledPixelRatio: 0.02,
        },
      },
      scoreValues: [...SCORE_COLUMNS],
      criteria: [],
      mismatchWarnings: ['Scoresheet import could not anchor both printed grid axes.'],
    };

    jest.spyOn(service as any, 'resolveTemplate').mockReturnValue(template);
    jest.spyOn(service as any, 'orderCriteriaForTemplate').mockReturnValue(criteria);
    jest.spyOn(service as any, 'renderFirstPage').mockResolvedValue({
      buffer: Buffer.from('image'),
      pageCount: 1,
    });
    jest.spyOn(service as any, 'normalizePage').mockResolvedValue({
      data: createBlankImage(),
      width: WIDTH,
      height: HEIGHT,
      channels: CHANNELS,
      bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
    });
    jest.spyOn(service as any, 'extractScoresFromNormalizedImage').mockReturnValue({
      payload: rejectedPayload,
      computedTotal: 0,
      overallConfidence: 0,
    });

    const draft = await service.processScoreFile('score-file-1', 'tenant-1');

    expect(draft.status).toBe('rejected');
    expect(draft.processingError).toContain('quality gates');
    expect(draft.processingError).toContain('attempting user');
    expect(mockPrisma.scoreSheetImportDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: 'rejected',
          processingError: expect.stringContaining('quality gates'),
        }),
      }),
    );
  });

  it('resolves the Education template from category criteria', () => {
    const service = new ScoreSheetImportService({} as any);
    const sampleFamily = groundTruth.intendedPhase1Families.find(
      (family) => family.templateKey === 'education_saturday_day_v1',
    );

    const criteria = sampleFamily!.criterionOrder
      .slice()
      .sort((left, right) => left.localeCompare(right))
      .map((name, index) => ({
        id: `criterion-${index + 1}`,
        name,
        maxScore: 6,
      }));

    const template = (service as any).resolveTemplate(
      criteria,
      { intent: 'SCORESHEET_IMPORT' },
      undefined,
    );

    expect(template.key).toBe('education_saturday_day_v1');
  });
});
