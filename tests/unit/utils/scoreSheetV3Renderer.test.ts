import {
  buildScoreSheetV3Html,
  buildScoreSheetV3SampleInput,
  SCORE_SHEET_V3_MARKER,
  SCORE_SHEET_V3_TEMPLATE_KEY,
} from '../../../src/utils/scoreSheetV3Renderer';

describe('scoreSheetV3Renderer', () => {
  it('renders portrait letter machine-readable contract markers', () => {
    const html = buildScoreSheetV3Html(buildScoreSheetV3SampleInput());

    expect(html).toContain(SCORE_SHEET_V3_MARKER);
    expect(html).toContain(SCORE_SHEET_V3_TEMPLATE_KEY);
    expect(html).toContain('data-sheet-version="v3"');
    expect(html).toContain('size: Letter portrait');
    expect(html).toContain('width: 8.5in');
    expect(html).toContain('height: 11in');
    expect((html.match(/data-anchor="/g) || []).length).toBe(4);
    expect((html.match(/class="version-bit/g) || []).length).toBe(8);
    expect((html.match(/class="mark-target"/g) || []).length).toBe(70);
    expect(html).toContain('border: 0.11in solid #000');
    expect(html).toContain('border: 0.06in solid #000');
    expect(html).not.toContain('background-image');
  });

  it('keeps the Education row order and score values stable', () => {
    const html = buildScoreSheetV3Html(buildScoreSheetV3SampleInput());
    const rowNames = [
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
    ];

    let previousIndex = -1;
    rowNames.forEach((rowName) => {
      const nextIndex = html.indexOf(rowName);
      expect(nextIndex).toBeGreaterThan(previousIndex);
      previousIndex = nextIndex;
    });

    [6, 5, 4, 3, 2, 1, 0].forEach((scoreValue) => {
      expect(html).toContain(`data-score="${scoreValue}"`);
    });
  });

  it('marks commentary as an ignored non-scoring region after the score grid', () => {
    const html = buildScoreSheetV3Html(buildScoreSheetV3SampleInput());
    const scoreRegionIndex = html.indexOf('data-score-region="primary"');
    const ignoreRegionIndex = html.indexOf('data-ignore-region="commentary"');

    expect(scoreRegionIndex).toBeGreaterThan(0);
    expect(ignoreRegionIndex).toBeGreaterThan(scoreRegionIndex);
    expect(html).toContain('Judge Commentary');
    expect(html).toContain('Ignored during score import');
    expect((html.match(/data-ignore-region="commentary"/g) || []).length).toBe(1);
    expect((html.match(/<span><\/span>/g) || []).length).toBe(5);
  });

  it('escapes user-visible identity fields', () => {
    const input = buildScoreSheetV3SampleInput();
    const html = buildScoreSheetV3Html({
      ...input,
      contestantName: '<script>alert("x")</script>',
      judgeName: 'Judge & Co',
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Judge &amp; Co');
  });
});
