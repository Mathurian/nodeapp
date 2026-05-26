import { ScoreSheetImportService } from '../../../src/services/ScoreSheetImportService';
import { scoreSheetImportTemplateMap } from '../../../src/config/scoreSheetImportTemplates';
import groundTruth from '../../examples/scoresheet-import/route66-phase1-ground-truth.json';
import sharp from 'sharp';

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
const V3_SCORE_GRID_LEFT = 0.367;
const V3_SCORE_GRID_RIGHT = 0.95;
const V3_SCORE_GRID_TOP = 0.266;
const V3_SCORE_GRID_BOTTOM = 0.634;
const V3_VERSION_BITS = [1, 1, 0, 0, 0, 0, 1, 1] as const;
const V3_ANCHOR_LEFT = 0.3 / 8.5;
const V3_ANCHOR_TOP = 0.3 / 11;
const V3_ANCHOR_WIDTH = 0.22 / 8.5;
const V3_ANCHOR_HEIGHT = 0.22 / 11;
const V3_ANCHOR_RIGHT = (8.5 - 0.3 - 0.22) / 8.5;
const V3_ANCHOR_BOTTOM = (11 - 0.3 - 0.22) / 11;

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

const paintRatioRect = (
  buffer: Buffer,
  leftRatio: number,
  topRatio: number,
  widthRatio: number,
  heightRatio: number,
  color: [number, number, number] = [0, 0, 0],
): void => {
  const left = Math.max(0, Math.round(WIDTH * leftRatio));
  const top = Math.max(0, Math.round(HEIGHT * topRatio));
  const right = Math.min(WIDTH - 1, Math.round(WIDTH * (leftRatio + widthRatio)));
  const bottom = Math.min(HEIGHT - 1, Math.round(HEIGHT * (topRatio + heightRatio)));

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const offset = ((y * WIDTH) + x) * CHANNELS;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
    }
  }
};

const paintV3MachineReadableMetadata = (buffer: Buffer): void => {
  paintRatioRect(buffer, V3_ANCHOR_LEFT, V3_ANCHOR_TOP, V3_ANCHOR_WIDTH, V3_ANCHOR_HEIGHT);
  paintRatioRect(buffer, V3_ANCHOR_RIGHT, V3_ANCHOR_TOP, V3_ANCHOR_WIDTH, V3_ANCHOR_HEIGHT);
  paintRatioRect(buffer, V3_ANCHOR_LEFT, V3_ANCHOR_BOTTOM, V3_ANCHOR_WIDTH, V3_ANCHOR_HEIGHT);
  paintRatioRect(buffer, V3_ANCHOR_RIGHT, V3_ANCHOR_BOTTOM, V3_ANCHOR_WIDTH, V3_ANCHOR_HEIGHT);

  const bitWidth = 0.016;
  const bitHeight = 0.013;
  const gap = 0.005;
  V3_VERSION_BITS.forEach((bit, bitIndex) => {
    if (bit === 1) {
      paintRatioRect(buffer, 0.62 + (bitIndex * (bitWidth + gap)), 0.074, bitWidth, bitHeight);
    }
  });
};

const paintGrid = (
  buffer: Buffer,
  rowCount: number,
  leftRatio: number,
  rightRatio: number,
  topRatio: number,
  bottomRatio: number,
): void => {
  const gridLeft = Math.round(WIDTH * leftRatio);
  const gridRight = Math.round(WIDTH * rightRatio);
  const gridTop = Math.round(HEIGHT * topRatio);
  const gridBottom = Math.round(HEIGHT * bottomRatio);
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

const paintV3Cell = (buffer: Buffer, rowIndex: number, rowCount: number, columnIndex: number): void => {
  const rowHeight = (V3_SCORE_GRID_BOTTOM - V3_SCORE_GRID_TOP) / rowCount;
  const columnWidth = (V3_SCORE_GRID_RIGHT - V3_SCORE_GRID_LEFT) / SCORE_COLUMNS.length;
  const centerX = WIDTH * (V3_SCORE_GRID_LEFT + (columnIndex * columnWidth) + (columnWidth / 2));
  const centerY = HEIGHT * (V3_SCORE_GRID_TOP + (rowIndex * rowHeight) + (rowHeight / 2));
  const radiusX = Math.max(5, Math.round(WIDTH * columnWidth * 0.16));
  const radiusY = Math.max(5, Math.round(HEIGHT * rowHeight * 0.18));

  for (let y = Math.round(centerY - radiusY); y <= Math.round(centerY + radiusY); y += 1) {
    for (let x = Math.round(centerX - radiusX); x <= Math.round(centerX + radiusX); x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      if ((normalizedX * normalizedX) + (normalizedY * normalizedY) <= 1) {
        const offset = ((y * WIDTH) + x) * CHANNELS;
        buffer[offset] = 20;
        buffer[offset + 1] = 20;
        buffer[offset + 2] = 20;
      }
    }
  }
};

const paintV3CommentaryScribble = (buffer: Buffer): void => {
  for (let lineIndex = 0; lineIndex < 5; lineIndex += 1) {
    const y = Math.round(HEIGHT * (0.69 + (lineIndex * 0.035)));
    for (let x = Math.round(WIDTH * 0.08); x < Math.round(WIDTH * 0.9); x += 8) {
      const offset = ((y + (x % 17)) * WIDTH + x) * CHANNELS;
      buffer[offset] = 10;
      buffer[offset + 1] = 10;
      buffer[offset + 2] = 10;
    }
  }
};

const buildEducationCriteria = () => [
  { id: 'criterion-knowledge', name: 'Knowledge', maxScore: 6 },
  { id: 'criterion-technique', name: 'Technique', maxScore: 6 },
  { id: 'criterion-safety', name: 'Safety', maxScore: 6 },
  { id: 'criterion-attitude', name: 'Attitude', maxScore: 6 },
  { id: 'criterion-personality-projection', name: 'Personality Projection', maxScore: 6 },
  { id: 'criterion-volume', name: 'Volume', maxScore: 6 },
  { id: 'criterion-audience-engagement', name: 'Audience Engagement', maxScore: 6 },
  { id: 'criterion-appropriate-attire', name: 'Appropriate Attire', maxScore: 6 },
  { id: 'criterion-preparation', name: 'Preparation', maxScore: 6 },
  { id: 'criterion-time-management', name: 'Time Management', maxScore: 6 },
];

const buildEncodedV3Scoresheet = async (scores: readonly number[]): Promise<Buffer> => {
  const image = createBlankImage();
  const criteria = buildEducationCriteria();
  paintV3MachineReadableMetadata(image);
  paintGrid(image, criteria.length, V3_SCORE_GRID_LEFT, V3_SCORE_GRID_RIGHT, V3_SCORE_GRID_TOP, V3_SCORE_GRID_BOTTOM);
  scores.forEach((score, rowIndex) => {
    const columnIndex = SCORE_COLUMNS.indexOf(score as typeof SCORE_COLUMNS[number]);
    if (columnIndex >= 0) {
      paintV3Cell(image, rowIndex, criteria.length, columnIndex);
    }
  });

  return sharp(image, {
    raw: {
      width: WIDTH,
      height: HEIGHT,
      channels: CHANNELS,
    },
  }).png().toBuffer();
};

const buildUatPrismaMock = (
  criteria = buildEducationCriteria(),
  scores: readonly number[] = [6, 5, 4, 3, 2, 1, 0, 6, 5, 4],
) => ({
  category: {
    findFirst: jest.fn().mockResolvedValue({
      id: 'category-1',
      name: 'Education',
      contestId: 'contest-1',
      totalsCertified: true,
      boardApproved: true,
      contest: {
        id: 'contest-1',
        name: 'Pet',
        eventId: 'event-1',
        isLocked: false,
        event: {
          id: 'event-1',
          name: 'Route 66',
          isLocked: false,
        },
      },
      criteria,
    }),
  },
  judge: {
    findFirst: jest.fn().mockResolvedValue({ id: 'judge-1', name: 'Daddie Danger' }),
  },
  contestant: {
    findFirst: jest.fn().mockResolvedValue({ id: 'contestant-1', name: 'Retro' }),
  },
  categoryJudge: {
    findFirst: jest.fn().mockResolvedValue({ judgeId: 'judge-1' }),
  },
  categoryContestant: {
    findFirst: jest.fn().mockResolvedValue({ contestantId: 'contestant-1' }),
  },
  score: {
    findMany: jest.fn().mockResolvedValue(
      criteria.map((criterion, rowIndex) => ({
        criterionId: criterion.id,
        score: scores[rowIndex] ?? null,
      })),
    ),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  scoreFile: {
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  scoreSheetImportDraft: {
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  certification: {
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
});

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

  it('detects the v3 machine-readable template from anchors and version metadata', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildEducationCriteria();
    const image = createBlankImage();
    paintV3MachineReadableMetadata(image);

    const template = (service as any).resolveTemplate(
      criteria,
      { intent: 'SCORESHEET_IMPORT' },
      undefined,
      {
        data: image,
        width: WIDTH,
        height: HEIGHT,
        channels: CHANNELS,
        bounds: { left: 0, top: 0, width: WIDTH, height: HEIGHT },
      },
    );

    expect(template.key).toBe('education_omr_v3');
  });

  it('extracts v3 score marks while ignoring commentary below the grid', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildEducationCriteria();
    const template = scoreSheetImportTemplateMap.get('education_omr_v3')!;
    const image = createBlankImage();
    paintV3MachineReadableMetadata(image);
    paintGrid(image, criteria.length, V3_SCORE_GRID_LEFT, V3_SCORE_GRID_RIGHT, V3_SCORE_GRID_TOP, V3_SCORE_GRID_BOTTOM);
    criteria.forEach((_criterion, rowIndex) => {
      paintV3Cell(image, rowIndex, criteria.length, rowIndex % SCORE_COLUMNS.length);
    });
    paintV3CommentaryScribble(image);

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

    expect(result.payload.templateKey).toBe('education_omr_v3');
    expect(result.payload.machineReadable.sheetVersion).toBe('v3');
    expect(result.payload.machineReadable.templateVersion).toBe('3.0.0');
    expect(result.payload.machineReadable.ignoredRegions[0]).toEqual(expect.objectContaining({
      name: 'commentary',
      purpose: 'judge-commentary',
    }));
    expect(result.payload.machineReadable.markQuality.rejectedRowCount).toBe(0);
    expect(result.payload.criteria[0].detectedScore).toBe(6);
    expect(result.payload.criteria[1].detectedScore).toBe(5);
    expect(result.payload.criteria[6].detectedScore).toBe(0);
    expect(result.payload.criteria.every((criterion: any) => criterion.ambiguous === false)).toBe(true);
  });

  it('rejects v3 rows with multiple marked score cells', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = buildEducationCriteria();
    const template = scoreSheetImportTemplateMap.get('education_omr_v3')!;
    const image = createBlankImage();
    paintV3MachineReadableMetadata(image);
    paintGrid(image, criteria.length, V3_SCORE_GRID_LEFT, V3_SCORE_GRID_RIGHT, V3_SCORE_GRID_TOP, V3_SCORE_GRID_BOTTOM);
    criteria.forEach((_criterion, rowIndex) => {
      paintV3Cell(image, rowIndex, criteria.length, rowIndex % SCORE_COLUMNS.length);
    });
    paintV3Cell(image, 0, criteria.length, 1);

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

    expect(result.payload.criteria[0].detectedScore).toBeNull();
    expect(result.payload.criteria[0].ambiguous).toBe(true);
    expect(result.payload.machineReadable.markQuality.rejectedRowCount).toBe(1);
    expect(result.payload.machineReadable.markQuality.multiMarkRowCount).toBe(1);
    expect(result.payload.machineReadable.rejectedRows[0]).toEqual(expect.objectContaining({
      rowIndex: 0,
      reason: 'multi_mark',
      markedColumnIndexes: [0, 1],
    }));
  });

  it('evaluates a v3 phone upload in parse-only UAT mode without mutating score records', async () => {
    const expectedScores = [6, 5, 4, 3, 2, 1, 0, 6, 5, 4] as const;
    const criteria = buildEducationCriteria();
    const mockPrisma = buildUatPrismaMock(criteria, expectedScores);
    const service = new ScoreSheetImportService(mockPrisma as any);
    const fileBuffer = await buildEncodedV3Scoresheet(expectedScores);

    const result = await service.evaluateScoresheetImportUat({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      judgeId: 'judge-1',
      contestantId: 'contestant-1',
      templateKey: 'education_omr_v3',
      fileName: 'uat-v3.png',
      fileType: 'image/png',
      fileBuffer,
    });

    expect(result.templateKey).toBe('education_omr_v3');
    expect(result.context.evaluationOnly).toBe(true);
    expect(result.context.certifiedOrLocked).toBe(true);
    expect(result.comparison.groundTruthAvailable).toBe(true);
    expect(result.comparison.exactRowCount).toBe(criteria.length);
    expect(result.comparison.exactRowMatchRate).toBe(1);
    expect(result.comparison.expectedTotal).toBe(36);
    expect(result.comparison.computedTotal).toBe(36);
    expect(result.comparison.totalDelta).toBe(0);
    expect(result.comparison.rejectedRowCount).toBe(0);
    expect(result.comparison.falseHighConfidenceMarkCount).toBe(0);
    expect(result.extraction.anchorQuality?.fiducials?.detected).toBe(true);
    expect(result.routingRecommendation.attemptLedgerApplied).toBe(false);
    expect(result.rows.every((row) => row.exactMatch === true)).toBe(true);
    expect(mockPrisma.score.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        categoryId: 'category-1',
        judgeId: 'judge-1',
        contestantId: 'contestant-1',
      }),
    }));
    expect(mockPrisma.score.create).not.toHaveBeenCalled();
    expect(mockPrisma.score.update).not.toHaveBeenCalled();
    expect(mockPrisma.score.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.scoreFile.create).not.toHaveBeenCalled();
    expect(mockPrisma.scoreFile.update).not.toHaveBeenCalled();
    expect(mockPrisma.scoreFile.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.scoreSheetImportDraft.create).not.toHaveBeenCalled();
    expect(mockPrisma.scoreSheetImportDraft.update).not.toHaveBeenCalled();
    expect(mockPrisma.scoreSheetImportDraft.upsert).not.toHaveBeenCalled();
  });

  it('rejects unsupported templates before reading scoresheet UAT context', async () => {
    const mockPrisma = buildUatPrismaMock();
    const service = new ScoreSheetImportService(mockPrisma as any);

    await expect(service.evaluateScoresheetImportUat({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      judgeId: 'judge-1',
      contestantId: 'contestant-1',
      templateKey: 'education_saturday_day_v1',
      fileName: 'uat-v1.png',
      fileType: 'image/png',
      fileBuffer: Buffer.from('not decoded because template is rejected first'),
    })).rejects.toThrow('only education_omr_v3');

    expect(mockPrisma.category.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.score.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.scoreSheetImportDraft.upsert).not.toHaveBeenCalled();
  });

  it('returns a clear parse-only UAT conversion error for invalid HEIC uploads', async () => {
    const mockPrisma = buildUatPrismaMock();
    const service = new ScoreSheetImportService(mockPrisma as any);

    await expect(service.evaluateScoresheetImportUat({
      tenantId: 'tenant-1',
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      judgeId: 'judge-1',
      contestantId: 'contestant-1',
      templateKey: 'education_omr_v3',
      fileName: 'bad-upload.heic',
      fileType: 'image/heic',
      fileBuffer: Buffer.from('not a heic image'),
    })).rejects.toThrow('Unable to convert HEIC/HEIF scoresheet image for UAT');

    expect(mockPrisma.scoreSheetImportDraft.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.score.create).not.toHaveBeenCalled();
    expect(mockPrisma.score.update).not.toHaveBeenCalled();
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
