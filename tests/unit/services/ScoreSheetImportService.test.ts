import path from 'path';
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
    expect(result.payload.criteria[0].detectedScore).toBe(6);
    expect(result.payload.criteria[0].ambiguous).toBe(false);
    expect(result.payload.criteria[7].detectedScore).toBe(1);
    expect(result.payload.criteria[7].ambiguous).toBe(false);
  });

  it('materially improves extraction on the Education sample packet pages', async () => {
    const service = new ScoreSheetImportService({} as any);
    const pdfPath = path.resolve(process.cwd(), groundTruth.sourcePdf);
    const sampleFamily = groundTruth.intendedPhase1Families.find(
      (family) => family.templateKey === 'education_saturday_day_v1',
    );

    expect(sampleFamily).toBeDefined();

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
    const orderedCriteria = (service as any).orderCriteriaForTemplate(criteria, template);

    const perPageTotals: number[] = [];
    let exactRowMatches = 0;
    let totalRows = 0;

    for (const sample of sampleFamily!.samples) {
      const rendered = await (service as any).renderPdfPage(pdfPath, sample.page);
      const buffer = rendered.buffer;
      const normalized = await (service as any).normalizePage(buffer);
      const result = (service as any).extractScoresFromNormalizedImage(
        normalized,
        orderedCriteria,
        template,
      );

      perPageTotals.push(result.computedTotal);

      for (const criterion of result.payload.criteria) {
        const expectedScore = sample.criterionScores[criterion.criterionName as keyof typeof sample.criterionScores];
        if (criterion.detectedScore === expectedScore) {
          exactRowMatches += 1;
        }
        totalRows += 1;
      }
    }

    expect(perPageTotals[0]).toBeGreaterThanOrEqual(40);
    expect(perPageTotals[1]).toBeGreaterThanOrEqual(50);
    expect(exactRowMatches / totalRows).toBeGreaterThanOrEqual(0.5);
  });
});
