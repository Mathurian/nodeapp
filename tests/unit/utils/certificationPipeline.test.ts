import { calculateCategoryScoreCoverage } from '../../../src/utils/certificationPipeline';

describe('calculateCategoryScoreCoverage', () => {
  it('marks overall and per-judge coverage incomplete when expected score entries are missing', () => {
    const result = calculateCategoryScoreCoverage({
      requiredJudgeIds: ['judge-1', 'judge-2'],
      contestantIds: ['contestant-1', 'contestant-2'],
      criterionIds: ['criterion-1', 'criterion-2'],
      scores: [
        {
          judgeId: 'judge-1',
          contestantId: 'contestant-1',
          criterionId: 'criterion-1',
          isCertified: true,
          isLocked: true,
        },
      ],
    });

    expect(result.total).toBe(8);
    expect(result.submitted).toBe(1);
    expect(result.certified).toBe(1);
    expect(result.locked).toBe(1);
    expect(result.isComplete).toBe(false);
    expect(result.perJudge.get('judge-1')).toEqual(
      expect.objectContaining({
        expected: 4,
        submitted: 1,
        scoreComplete: false,
      })
    );
    expect(result.perJudge.get('judge-2')).toEqual(
      expect.objectContaining({
        expected: 4,
        submitted: 0,
        scoreComplete: false,
      })
    );
  });

  it('marks coverage complete when the expected matrix is fully populated', () => {
    const result = calculateCategoryScoreCoverage({
      requiredJudgeIds: ['judge-1'],
      contestantIds: ['contestant-1', 'contestant-2'],
      criterionIds: ['criterion-1', 'criterion-2'],
      scores: [
        {
          judgeId: 'judge-1',
          contestantId: 'contestant-1',
          criterionId: 'criterion-1',
          isCertified: true,
          isLocked: true,
        },
        {
          judgeId: 'judge-1',
          contestantId: 'contestant-1',
          criterionId: 'criterion-2',
          isCertified: true,
          isLocked: true,
        },
        {
          judgeId: 'judge-1',
          contestantId: 'contestant-2',
          criterionId: 'criterion-1',
          isCertified: true,
          isLocked: true,
        },
        {
          judgeId: 'judge-1',
          contestantId: 'contestant-2',
          criterionId: 'criterion-2',
          isCertified: true,
          isLocked: true,
        },
      ],
    });

    expect(result.total).toBe(4);
    expect(result.submitted).toBe(4);
    expect(result.certified).toBe(4);
    expect(result.locked).toBe(4);
    expect(result.isComplete).toBe(true);
    expect(result.perJudge.get('judge-1')).toEqual(
      expect.objectContaining({
        expected: 4,
        submitted: 4,
        scoreComplete: true,
      })
    );
  });
});
