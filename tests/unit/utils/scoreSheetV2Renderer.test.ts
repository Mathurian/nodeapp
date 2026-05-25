import {
  buildScoreSheetV2Html,
  buildScoreSheetV2SampleInput,
  SCORE_SHEET_V2_MARKER,
  SCORE_SHEET_V2_TEMPLATE_KEY,
} from '../../../src/utils/scoreSheetV2Renderer';

describe('scoreSheetV2Renderer', () => {
  it('renders the machine-readable v2 scoresheet contract markers', () => {
    const html = buildScoreSheetV2Html(buildScoreSheetV2SampleInput());

    expect(html).toContain(SCORE_SHEET_V2_MARKER);
    expect(html).toContain(SCORE_SHEET_V2_TEMPLATE_KEY);
    expect(html).toContain('data-sheet-version="v2"');
    expect((html.match(/data-anchor="/g) || []).length).toBe(4);
    expect((html.match(/class="version-bit/g) || []).length).toBe(8);
    expect((html.match(/class="mark-target"/g) || []).length).toBe(70);
  });

  it('keeps the Education row order and score values stable', () => {
    const html = buildScoreSheetV2Html(buildScoreSheetV2SampleInput());
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

  it('escapes user-visible identity fields', () => {
    const input = buildScoreSheetV2SampleInput();
    const html = buildScoreSheetV2Html({
      ...input,
      contestantName: '<script>alert("x")</script>',
      judgeName: 'Judge & Co',
    });

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Judge &amp; Co');
  });
});
