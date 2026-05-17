import { ScoreSheetImportService } from '../../../src/services/ScoreSheetImportService';

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
  it('detects purple-marked score cells from a normalized image', () => {
    const service = new ScoreSheetImportService({} as any);
    const criteria = Array.from({ length: 10 }, (_value, index) => ({
      id: `criterion-${index + 1}`,
      name: `Criterion ${index + 1}`,
      maxScore: 6,
    }));

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
    );

    expect(result.computedTotal).toBe(7);
    expect(result.payload.criteria[0].detectedScore).toBe(6);
    expect(result.payload.criteria[0].ambiguous).toBe(false);
    expect(result.payload.criteria[7].detectedScore).toBe(1);
    expect(result.payload.criteria[7].ambiguous).toBe(false);
  });
});
