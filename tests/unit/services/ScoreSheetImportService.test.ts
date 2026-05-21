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
    const criteria = Array.from({ length: 10 }, (_value, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      maxScore: 6,
    }));
    const template = {
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
    };

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
    const criteria = Array.from({ length: 10 }, (_value, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      maxScore: 6,
    }));
    const template = {
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
    };

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
