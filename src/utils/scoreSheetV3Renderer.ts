export const SCORE_SHEET_V3_TEMPLATE_KEY = 'education_omr_v3';
export const SCORE_SHEET_V3_MARKER = 'SCORESHEET-V3';

export type ScoreSheetV3Criterion = {
  id: string;
  name: string;
  maxScore: number;
};

export type ScoreSheetV3RenderInput = {
  templateKey: string;
  templateVersion: string;
  identityCode: string;
  eventName: string;
  contestName: string;
  categoryName: string;
  contestantName: string;
  contestantNumber?: number | null;
  judgeName: string;
  judgeNumber?: number | null;
  generatedAt: string;
  criteria: ScoreSheetV3Criterion[];
  scoreValues: readonly number[];
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPersonLabel = (name: string, number?: number | null): string => {
  if (typeof number === 'number') {
    return `#${number} ${name}`;
  }

  return name;
};

const VERSION_BITS = [1, 1, 0, 0, 0, 0, 1, 1] as const;
const COMMENT_LINE_COUNT = 5;

export const buildScoreSheetV3Html = (input: ScoreSheetV3RenderInput): string => {
  const scoreHeader = input.scoreValues
    .map((scoreValue) => `<div class="score-heading">${escapeHtml(scoreValue)}</div>`)
    .join('');
  const rows = input.criteria
    .map((criterion, rowIndex) => {
      const marks = input.scoreValues
        .map((scoreValue, scoreIndex) => (
          `<div class="mark-cell">`
          + `<span class="mark-target" data-row="${rowIndex}" data-score="${escapeHtml(scoreValue)}" data-score-index="${scoreIndex}"></span>`
          + `</div>`
        ))
        .join('');

      return `
        <div class="score-row" data-criterion-id="${escapeHtml(criterion.id)}" data-row-index="${rowIndex}">
          <div class="criterion-label">
            <span class="row-number">${rowIndex + 1}</span>
            <span>${escapeHtml(criterion.name)}</span>
          </div>
          <div class="mark-grid">${marks}</div>
        </div>
      `;
    })
    .join('');
  const versionStrip = VERSION_BITS
    .map((bit, index) => `<span class="version-bit ${bit ? 'filled' : ''}" data-bit-index="${index}"></span>`)
    .join('');
  const commentLines = Array.from({ length: COMMENT_LINE_COUNT }, () => '<span></span>').join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(input.categoryName)} ${SCORE_SHEET_V3_MARKER}</title>
  <style>
    @page {
      size: Letter portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 8.5in;
      min-height: 11in;
      margin: 0;
      overflow: hidden;
      background: #fff;
      color: #111;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sheet {
      position: relative;
      width: 8.5in;
      height: 11in;
      padding: 0.42in 0.5in 0.44in;
      background: #fff;
    }

    .anchor {
      position: absolute;
      width: 0.22in;
      height: 0.22in;
      border: 0.11in solid #000;
      background: transparent;
    }

    .anchor-tl { top: 0.3in; left: 0.3in; }
    .anchor-tr { top: 0.3in; right: 0.3in; }
    .anchor-bl { bottom: 0.3in; left: 0.3in; }
    .anchor-br { bottom: 0.3in; right: 0.3in; }

    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.18in;
      align-items: start;
      border-bottom: 2px solid #111;
      padding: 0.06in 0 0.12in;
      margin: 0 0.06in 0.14in;
    }

    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }

    .subtitle {
      margin: 0.04in 0 0;
      font-size: 11px;
      color: #333;
    }

    .machine-id {
      border: 1px solid #111;
      padding: 0.08in;
      min-width: 2.35in;
      font-size: 9px;
    }

    .machine-id strong {
      display: block;
      font-size: 11px;
      margin-bottom: 0.03in;
    }

    .version-strip {
      display: grid;
      grid-template-columns: repeat(8, 0.12in);
      gap: 0.035in;
      margin-top: 0.06in;
    }

    .version-bit {
      display: block;
      width: 0.12in;
      height: 0.12in;
      border: 1px solid #111;
      background: transparent;
    }

    .version-bit.filled {
      border: 0.06in solid #000;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.055in 0.16in;
      margin: 0 0.06in 0.14in;
      font-size: 10px;
    }

    .meta-item {
      border-bottom: 1px solid #999;
      padding-bottom: 0.025in;
      min-height: 0.2in;
    }

    .meta-item .label {
      font-weight: 700;
      margin-right: 0.04in;
    }

    .instruction {
      margin: 0 0.06in 0.12in;
      padding: 0.07in 0.1in;
      border: 1px solid #777;
      font-size: 10px;
      line-height: 1.25;
    }

    .score-table {
      margin: 0 0.06in;
      border: 1px solid #111;
    }

    .score-header,
    .score-row {
      display: grid;
      grid-template-columns: minmax(0, 2.65in) 1fr;
    }

    .score-header {
      border-bottom: 1px solid #111;
      background: #f4f4f4;
      font-size: 10px;
      font-weight: 700;
    }

    .criterion-heading {
      padding: 0.065in 0.1in;
      border-right: 1px solid #111;
    }

    .score-headings,
    .mark-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      align-items: center;
      text-align: center;
    }

    .score-heading {
      padding: 0.065in 0;
      border-right: 1px solid #ccc;
    }

    .score-heading:last-child,
    .mark-cell:last-child {
      border-right: 0;
    }

    .score-row {
      min-height: 0.38in;
      border-bottom: 1px solid #ccc;
      page-break-inside: avoid;
    }

    .score-row:last-child {
      border-bottom: 0;
    }

    .criterion-label {
      display: flex;
      align-items: center;
      gap: 0.07in;
      padding: 0.055in 0.1in;
      border-right: 1px solid #111;
      font-size: 10.5px;
      font-weight: 700;
    }

    .row-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0.2in;
      height: 0.2in;
      border: 1px solid #777;
      font-size: 9px;
      flex: 0 0 auto;
    }

    .mark-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0.38in;
      border-right: 1px solid #ddd;
    }

    .mark-target {
      display: inline-block;
      width: 0.18in;
      height: 0.18in;
      border: 2px solid #111;
      border-radius: 50%;
      background: #fff;
    }

    .commentary-block {
      margin: 0.14in 0.06in 0;
      border: 1px solid #111;
      height: 1.9in;
      padding: 0.08in 0.1in;
      page-break-inside: avoid;
    }

    .commentary-heading {
      display: flex;
      justify-content: space-between;
      gap: 0.1in;
      margin-bottom: 0.08in;
      font-size: 11px;
      font-weight: 700;
    }

    .commentary-note {
      font-size: 8px;
      font-weight: 400;
      color: #444;
    }

    .comment-lines {
      height: 1.48in;
      display: grid;
      grid-template-rows: repeat(5, 1fr);
    }

    .comment-lines span {
      display: block;
      border-bottom: 1px solid #999;
    }

    .footer {
      position: absolute;
      left: 0.56in;
      right: 0.56in;
      bottom: 0.42in;
      display: flex;
      justify-content: space-between;
      gap: 0.2in;
      font-size: 8px;
      color: #333;
      border-top: 1px solid #999;
      padding-top: 0.05in;
    }
  </style>
</head>
<body>
  <main
    class="sheet"
    data-sheet-version="v3"
    data-template-key="${escapeHtml(input.templateKey)}"
    data-template-version="${escapeHtml(input.templateVersion)}"
    data-identity-code="${escapeHtml(input.identityCode)}"
  >
    <div class="anchor anchor-tl" data-anchor="tl"></div>
    <div class="anchor anchor-tr" data-anchor="tr"></div>
    <div class="anchor anchor-bl" data-anchor="bl"></div>
    <div class="anchor anchor-br" data-anchor="br"></div>

    <section class="header">
      <div>
        <h1 class="title">${escapeHtml(input.categoryName)} Score Sheet</h1>
        <p class="subtitle">${SCORE_SHEET_V3_MARKER} - ${escapeHtml(input.templateKey)} - ${escapeHtml(input.templateVersion)}</p>
      </div>
      <div class="machine-id">
        <strong>${SCORE_SHEET_V3_MARKER}</strong>
        <div>Template: ${escapeHtml(input.templateKey)}</div>
        <div>Identity: ${escapeHtml(input.identityCode)}</div>
        <div class="version-strip" aria-hidden="true">${versionStrip}</div>
      </div>
    </section>

    <section class="meta-grid" aria-label="Scoresheet identity">
      <div class="meta-item"><span class="label">Event</span>${escapeHtml(input.eventName)}</div>
      <div class="meta-item"><span class="label">Contest</span>${escapeHtml(input.contestName)}</div>
      <div class="meta-item"><span class="label">Category</span>${escapeHtml(input.categoryName)}</div>
      <div class="meta-item"><span class="label">Generated</span>${escapeHtml(input.generatedAt)}</div>
      <div class="meta-item"><span class="label">Contestant</span>${escapeHtml(formatPersonLabel(input.contestantName, input.contestantNumber))}</div>
      <div class="meta-item"><span class="label">Judge</span>${escapeHtml(formatPersonLabel(input.judgeName, input.judgeNumber))}</div>
    </section>

    <section class="instruction">
      Fill exactly one bubble per criterion using a dark pen or marker. Comments may be written in the box below; commentary is ignored during score import.
    </section>

    <section class="score-table" aria-label="Criterion scores" data-score-region="primary">
      <div class="score-header">
        <div class="criterion-heading">Criterion</div>
        <div class="score-headings">${scoreHeader}</div>
      </div>
      ${rows}
    </section>

    <section
      class="commentary-block"
      aria-label="Judge commentary"
      data-ignore-region="commentary"
      data-region-purpose="judge-commentary"
    >
      <div class="commentary-heading">
        <span>Judge Commentary</span>
        <span class="commentary-note">Ignored during score import</span>
      </div>
      <div class="comment-lines" aria-hidden="true">${commentLines}</div>
    </section>

    <footer class="footer">
      <span>Import reads only the anchored score grid. Commentary is retained for review but excluded from scoring.</span>
      <span>${escapeHtml(input.identityCode)}</span>
    </footer>
  </main>
</body>
</html>
`;
};

export const buildScoreSheetV3SampleInput = (): ScoreSheetV3RenderInput => ({
  templateKey: SCORE_SHEET_V3_TEMPLATE_KEY,
  templateVersion: '3.0.0',
  identityCode: 'sample-event.sample-contest.education.c001.j001.p1',
  eventName: 'Sample Event',
  contestName: 'Sample Contest',
  categoryName: 'Education',
  contestantName: 'Sample Contestant',
  contestantNumber: 1,
  judgeName: 'Sample Judge',
  judgeNumber: 1,
  generatedAt: '2026-05-25T00:00:00.000Z',
  criteria: [
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
  ],
  scoreValues: [6, 5, 4, 3, 2, 1, 0],
});
