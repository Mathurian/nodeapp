/**
 * ReportGenerationService Unit Tests
 * Comprehensive tests for report data generation and winner calculations
 */

import 'reflect-metadata';
import {
  ReportGenerationService,
  type JudgeStatistics,
  type ReportData,
  type SystemStatistics,
} from '../../../src/services/ReportGenerationService';
import { CommentaryMode, CommentaryScope, PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  const TEST_TENANT_ID = 'tenant-1';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  type ContestantFixture = {
    id: string;
    name: string;
    contestantNumber: number | null;
  };

  type JudgeFixture = {
    id: string;
    name: string;
    judgeNumber: number | null;
  };

  type CriterionFixture = {
    id: string;
    name: string;
    maxScore: number;
    categoryId: string;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
  };

  type ReportScoreFixture = {
    id: string;
    contestantId: string;
    judgeId: string;
    categoryId: string;
    criterionId: string;
    score: number | null;
    isCertified: boolean;
    certifiedAt: Date | null;
    certifiedBy: string | null;
    contestant: ContestantFixture;
    judge: JudgeFixture;
    criterion: CriterionFixture;
    category: { id: string; name: string } | null;
    scoreComments: Array<{
      comment: string;
      createdAt: Date;
      updatedAt: Date;
      isPrivate: boolean;
    }>;
  };

  const buildContestant = (
    overrides: Partial<ContestantFixture> = {}
  ): ContestantFixture => ({
    id: 'contestant-1',
    name: 'John Doe',
    contestantNumber: 1,
    ...overrides,
  });

  const buildJudge = (overrides: Partial<JudgeFixture> = {}): JudgeFixture => ({
    id: 'judge-1',
    name: 'Judge Smith',
    judgeNumber: 1,
    ...overrides,
  });

  const buildCriterion = (overrides: Partial<CriterionFixture> = {}): CriterionFixture => ({
    id: 'criterion-1',
    name: 'Performance',
    maxScore: 100,
    categoryId: 'category-1',
    tenantId: TEST_TENANT_ID,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  });

  const buildCategory = (
    overrides: Partial<{
      id: string;
      name: string;
      scoreCap: number | null;
      commentaryMode: CommentaryMode;
      commentaryScope: CommentaryScope;
      totalsCertified: boolean;
      tenantId: string;
      criteria: CriterionFixture[];
      scores: ReportScoreFixture[];
    }> = {}
  ) => {
    const categoryId = overrides.id ?? 'category-1';
    return {
      id: categoryId,
      name: 'Dance',
      scoreCap: 300,
      commentaryMode: CommentaryMode.PER_CRITERION,
      commentaryScope: CommentaryScope.CATEGORY,
      totalsCertified: true,
      tenantId: TEST_TENANT_ID,
      criteria: [buildCriterion({ categoryId })],
      scores: [],
      ...overrides,
    };
  };

  const buildScore = (
    overrides: Partial<{
      id: string;
      contestantId: string;
      judgeId: string;
      categoryId: string;
      criterionId: string;
      score: number | null;
      isCertified: boolean;
      certifiedAt: Date | null;
      certifiedBy: string | null;
      contestant: ReturnType<typeof buildContestant>;
      judge: ReturnType<typeof buildJudge>;
      criterion: ReturnType<typeof buildCriterion>;
      category: ReportScoreFixture['category'];
      scoreComments: ReportScoreFixture['scoreComments'];
    }> = {}
  ): ReportScoreFixture => {
    const contestantId = overrides.contestantId ?? 'contestant-1';
    const judgeId = overrides.judgeId ?? 'judge-1';
    const categoryId = overrides.categoryId ?? 'category-1';
    const criterionId = overrides.criterionId ?? 'criterion-1';

    return {
      id: 'score-1',
      contestantId,
      judgeId,
      categoryId,
      criterionId,
      score: 85,
      isCertified: true,
      certifiedAt: BASE_TIME,
      certifiedBy: 'user-1',
      contestant: buildContestant({ id: contestantId }),
      judge: buildJudge({ id: judgeId }),
      criterion: buildCriterion({ id: criterionId, categoryId }),
      category: { id: categoryId, name: categoryId === 'category-2' ? 'Vocal' : 'Dance' },
      scoreComments: [],
      ...overrides,
    };
  };

  const buildContest = (
    overrides: Partial<{
      id: string;
      name: string;
      description: string;
      eventId: string;
      tenantId: string;
      event: {
        id: string;
        name: string;
        startDate: Date;
        endDate: Date | null;
      };
      categories: ReturnType<typeof buildCategory>[];
    }> = {}
  ) => ({
    id: 'contest-1',
    name: 'Regional Competition',
    description: 'Annual regional dance competition',
    eventId: 'event-1',
    tenantId: TEST_TENANT_ID,
    event: {
      id: 'event-1',
      name: 'Annual Gala',
      startDate: BASE_TIME,
      endDate: null,
    },
    categories: [buildCategory()],
    ...overrides,
  });

  const buildEvent = (
    overrides: Partial<{
      id: string;
      name: string;
      description: string;
      archived: boolean;
      startDate: Date;
      endDate: Date | null;
      contests: ReturnType<typeof buildContest>[];
    }> = {}
  ) => ({
    id: 'event-1',
    name: 'Annual Gala',
    description: 'Annual dance gala event',
    archived: false,
    startDate: BASE_TIME,
    endDate: null,
    contests: [buildContest()],
    ...overrides,
  });

  const requireEvent = (report: ReportData) => {
    expect(report.event).toBeDefined();
    return report.event!;
  };

  const requireContest = (report: ReportData) => {
    expect(report.contest).toBeDefined();
    return report.contest!;
  };

  const requireMetadata = (report: ReportData) => {
    expect(report.metadata).toBeDefined();
    return report.metadata!;
  };

  const requireJudgeStatistics = (report: ReportData): JudgeStatistics => {
    expect(report.statistics).toBeDefined();
    const statistics = report.statistics as JudgeStatistics;
    expect(statistics).toHaveProperty('totalScoresGiven');
    expect(statistics).toHaveProperty('averageScore');
    expect(statistics).toHaveProperty('categoriesJudged');
    expect(statistics).toHaveProperty('categoryBreakdown');
    return statistics;
  };

  const requireSystemStatistics = (report: ReportData): SystemStatistics => {
    expect(report.statistics).toBeDefined();
    const statistics = report.statistics as SystemStatistics;
    expect(statistics).toHaveProperty('totalEvents');
    expect(statistics).toHaveProperty('activeEvents');
    expect(statistics).toHaveProperty('archivedEvents');
    return statistics;
  };

  const mockContestant = buildContestant();
  const mockJudge = buildJudge();
  const mockCriterion = buildCriterion();
  const mockCategory = buildCategory();
  const mockScore = buildScore();
  const mockContest = buildContest();
  const mockEvent = buildEvent();

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ReportGenerationService(mockPrisma as any);
    mockPrisma.judgeComment.findMany.mockResolvedValue([]);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('calculateContestWinners', () => {
    it('should calculate winners from contest scores', async () => {
      const contestWithScores = {
        ...mockContest,
        categories: [{
          ...mockCategory,
          id: 'category-1',
        }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        {
          ...mockScore,
          contestantId: 'contestant-1',
          categoryId: 'category-1',
          judgeId: 'judge-1',
          score: 85,
        },
        {
          ...mockScore,
          id: 'score-2',
          contestantId: 'contestant-1',
          categoryId: 'category-1',
          judgeId: 'judge-2',
          score: 90,
        },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithScores);

      expect(winners).toHaveLength(1);
      expect(winners[0]).toMatchObject({
        contestant: expect.objectContaining({ id: 'contestant-1' }),
        totalScore: 175,
        categoriesParticipated: 1,
      });
    });

    it('should sort winners by total score descending', async () => {
      const contestWithMultiple = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'category-1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', score: 85 },
        {
          ...mockScore,
          id: 'score-2',
          contestantId: 'contestant-2',
          score: 95,
          contestant: buildContestant({ id: 'contestant-2', name: 'Jane Doe', contestantNumber: 2 }),
        },
        {
          ...mockScore,
          id: 'score-3',
          contestantId: 'contestant-3',
          score: 75,
          contestant: buildContestant({ id: 'contestant-3', name: 'Bob Smith', contestantNumber: 3 }),
        },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithMultiple);

      expect(winners).toHaveLength(3);
      expect(winners[0].totalScore).toBeGreaterThanOrEqual(winners[1].totalScore);
      expect(winners[1].totalScore).toBeGreaterThanOrEqual(winners[2].totalScore);
    });

    it('should calculate total possible score from criteria', async () => {
      const contestWithCriteria = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'cat1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'cat1', maxScore: 50 },
        { ...mockCriterion, id: 'criterion-2', categoryId: 'cat1', maxScore: 50 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant1', categoryId: 'cat1', judgeId: 'judge1', score: 45 },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithCriteria);

      expect(winners[0].totalPossibleScore).toBe(100); // 50 + 50 per judge
    });

    it('should handle multiple categories per contestant', async () => {
      const contestWithMultipleCategories = {
        ...mockContest,
        categories: [
          { ...mockCategory, id: 'category-1' },
          { ...mockCategory, id: 'category-2', name: 'Vocal' },
        ],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
        { ...mockCriterion, id: 'criterion-2', categoryId: 'category-2', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', categoryId: 'category-1', score: 85 },
        { ...mockScore, id: 'score-2', contestantId: 'contestant-1', categoryId: 'category-2', score: 90 },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithMultipleCategories);

      expect(winners[0].categoriesParticipated).toBe(2);
      expect(winners[0].totalScore).toBe(175);
    });

    it('should handle null scores gracefully', async () => {
      const contestWithNulls = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'category-1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', score: 85 },
        { ...mockScore, id: 'score-2', contestantId: 'contestant-1', score: null },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithNulls);

      expect(winners[0].totalScore).toBe(85); // Only counts non-null scores
    });

    it('should return null totalPossibleScore when no criteria defined', async () => {
      const contestNoCriteria = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'category-1', scoreCap: null }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([]);
      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', score: 85 },
      ] as any);

      const winners = await service.calculateContestWinners(contestNoCriteria);

      expect(winners[0].totalPossibleScore).toBeNull();
    });

    it('should handle empty scores array', async () => {
      const contestNoScores = {
        ...mockContest,
        categories: [mockCategory],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const winners = await service.calculateContestWinners(contestNoScores);

      expect(winners).toEqual([]);
    });

    it('should aggregate scores per judge-category pair', async () => {
      const contestWithPairs = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'cat1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'cat1', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant1', categoryId: 'cat1', judgeId: 'judge1', score: 85 },
        { ...mockScore, id: 'score2', contestantId: 'contestant1', categoryId: 'cat1', judgeId: 'judge2', score: 90 },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithPairs);

      expect(winners[0].totalPossibleScore).toBe(200); // 100 per judge (2 judges)
    });
  });

  describe('calculateCategoryTotalPossible', () => {
    it('should calculate total from criteria', async () => {
      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, maxScore: 50 },
        { ...mockCriterion, id: 'criterion-2', maxScore: 50 },
      ]);

      const total = await service.calculateCategoryTotalPossible(mockCategory);

      expect(total).toBe(100);
    });

    it('should return scoreCap if no criteria', async () => {
      mockPrisma.criterion.findMany.mockResolvedValue([]);

      const categoryWithCap = { ...mockCategory, scoreCap: 300 };
      const total = await service.calculateCategoryTotalPossible(categoryWithCap);

      expect(total).toBe(300);
    });

    it('should return null if no criteria and no scoreCap', async () => {
      mockPrisma.criterion.findMany.mockResolvedValue([]);

      const categoryNoCap = { ...mockCategory, scoreCap: null };
      const total = await service.calculateCategoryTotalPossible(categoryNoCap);

      expect(total).toBeNull();
    });

    it('should handle criteria with zero maxScore', async () => {
      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, maxScore: 0 },
      ]);

      const total = await service.calculateCategoryTotalPossible(mockCategory);

      expect(total).toBe(0);
    });
  });

  describe('generateEventReportData', () => {
    it('should generate comprehensive event report', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [{
          ...mockContest,
          categories: [{
            ...mockCategory,
            scores: [mockScore],
          }],
        }],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const report = await service.generateEventReportData('event-1', 'user-1');

      expect(report).toMatchObject({
        event: expect.objectContaining({
          id: 'event-1',
          name: 'Annual Gala',
          contests: expect.arrayContaining([
            expect.objectContaining({
              winners: expect.any(Array),
            }),
          ]),
        }),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          generatedBy: 'user-1',
          reportType: 'event_comprehensive',
          scope: expect.objectContaining({
            eventId: 'event-1',
            eventName: 'Annual Gala',
            filterMode: 'all_contests_in_event',
          }),
        }),
      });
    });

    it('should limit event reports to selected contests when contest scope is provided', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [
          {
            ...buildContest({
              id: 'contest-1',
              name: 'Contest 1',
              categories: [{ ...mockCategory, scores: [mockScore] }],
            }),
          },
        ],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const report = await service.generateEventReportData('event-1', 'user-1', {
        contestIds: ['contest-1'],
      });
      const event = requireEvent(report);
      const metadata = requireMetadata(report);

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          select: expect.objectContaining({
            contests: expect.objectContaining({
              where: {
                id: {
                  in: ['contest-1'],
                },
              },
            }),
          }),
        }),
      );
      expect(event.contests).toHaveLength(1);
      expect(event.contests[0]?.id).toBe('contest-1');
      expect(metadata.scope).toMatchObject({
        eventId: 'event-1',
        contestIds: ['contest-1'],
        contestNames: ['Contest 1'],
        filterMode: 'selected_contests',
      });
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.generateEventReportData('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should include winners for each contest', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [{
          ...mockContest,
          categories: [{ ...mockCategory, scores: [mockScore] }],
        }],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const report = await service.generateEventReportData('event-1');
      const event = requireEvent(report);

      expect(event.contests[0]).toHaveProperty('winners');
      expect(Array.isArray(event.contests[0]?.winners)).toBe(true);
    });

    it('should handle events with no contests', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const report = await service.generateEventReportData('event-1');
      const event = requireEvent(report);

      expect(event.contests).toEqual([]);
    });

    it('should include generation timestamp', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const beforeTime = new Date().toISOString();
      const report = await service.generateEventReportData('event-1');
      const afterTime = new Date().toISOString();
      const metadata = requireMetadata(report);

      expect(metadata.generatedAt).toBeDefined();
      expect(new Date(metadata.generatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(metadata.generatedAt).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });

    it('should include optional userId in metadata', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const report = await service.generateEventReportData('event-1', 'user-123');
      const metadata = requireMetadata(report);

      expect(metadata.generatedBy).toBe('user-123');
    });
  });

  describe('generateContestResultsData', () => {
    it('should generate contest results report', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue({
        ...mockContest,
        event: mockEvent,
        categories: [{
          ...mockCategory,
          scores: [mockScore],
        }],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const report = await service.generateContestResultsData('contest-1', 'user-1');

      expect(report).toMatchObject({
        contest: expect.objectContaining({
          id: 'contest-1',
          name: 'Regional Competition',
          winners: expect.any(Array),
        }),
        winners: expect.any(Array),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          generatedBy: 'user-1',
          reportType: 'contest_results',
          scope: expect.objectContaining({
            eventId: 'event-1',
            contestIds: ['contest-1'],
            contestNames: ['Regional Competition'],
            filterMode: 'single_contest',
          }),
        }),
      });
    });

    it('should throw NotFoundError if contest does not exist', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(
        service.generateContestResultsData('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should include event information', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue({
        ...mockContest,
        event: mockEvent,
        categories: [],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([]);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const report = await service.generateContestResultsData('contest-1');
      const contest = requireContest(report);

      expect(contest.event).toMatchObject({
        id: 'event-1',
        name: 'Annual Gala',
      });
    });

    it('should calculate and include winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue({
        ...mockContest,
        event: mockEvent,
        categories: [{ ...mockCategory, scores: [mockScore] }],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion]);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const report = await service.generateContestResultsData('contest-1');

      expect(report.winners).toBeDefined();
      expect(Array.isArray(report.winners)).toBe(true);
    });

    it('should handle contests with no categories', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue({
        ...mockContest,
        event: mockEvent,
        categories: [],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([]);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const report = await service.generateContestResultsData('contest-1');

      expect(report.winners).toEqual([]);
    });

    it('should build certified-only contestant and judge drilldown with scoped commentary', async () => {
      const certifiedScore = buildScore({
        id: 'score-certified',
        contestantId: 'contestant-1',
        judgeId: 'judge-1',
        categoryId: 'category-1',
        criterionId: 'criterion-1',
        score: 92,
        scoreComments: [
          {
            comment: 'Strong stage presence',
            createdAt: BASE_TIME,
            updatedAt: new Date(BASE_TIME.getTime() + 60_000),
            isPrivate: false,
          },
        ],
      });
      const uncertifiedScore = buildScore({
        id: 'score-uncertified',
        contestantId: 'contestant-2',
        judgeId: 'judge-2',
        categoryId: 'category-2',
        criterionId: 'criterion-2',
        score: 77,
        isCertified: false,
        category: { id: 'category-2', name: 'Vocal' },
        contestant: buildContestant({ id: 'contestant-2', name: 'Jane Doe', contestantNumber: 2 }),
        judge: buildJudge({ id: 'judge-2', name: 'Judge Two', judgeNumber: 2 }),
        criterion: buildCriterion({ id: 'criterion-2', categoryId: 'category-2', name: 'Technique' }),
      });

      mockPrisma.contest.findUnique.mockResolvedValue({
        ...mockContest,
        event: mockEvent,
        categories: [
          buildCategory({
            id: 'category-1',
            name: 'Dance',
            commentaryMode: CommentaryMode.HYBRID,
            commentaryScope: CommentaryScope.CONTEST,
            totalsCertified: true,
            criteria: [buildCriterion({ id: 'criterion-1', categoryId: 'category-1', name: 'Performance' })],
            scores: [certifiedScore],
          }),
          buildCategory({
            id: 'category-2',
            name: 'Vocal',
            totalsCertified: false,
            criteria: [buildCriterion({ id: 'criterion-2', categoryId: 'category-2', name: 'Technique' })],
            scores: [uncertifiedScore],
          }),
        ],
      } as any);

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
        { ...mockCriterion, id: 'criterion-2', categoryId: 'category-2', maxScore: 100 },
      ]);
      mockPrisma.score.findMany.mockResolvedValue([certifiedScore] as any);
      mockPrisma.judgeComment.findMany.mockResolvedValue([
        {
          scope: CommentaryScope.CONTEST,
          scopeKey: 'contest-1',
          contestantId: 'contestant-1',
          judgeId: 'judge-1',
          comment: 'Excellent energy throughout.',
          createdAt: new Date(BASE_TIME.getTime() + 120_000),
        },
      ] as any);

      const report = await service.generateContestResultsData('contest-1', 'user-1');

      expect(report.drilldown).toMatchObject({
        certifiedOnly: true,
        contests: [
          {
            contestId: 'contest-1',
            contestants: [
              {
                contestantId: 'contestant-1',
                judges: [
                  {
                    judgeId: 'judge-1',
                    categories: [
                      {
                        categoryId: 'category-1',
                        commentary: 'Excellent energy throughout.',
                        criteria: [
                          expect.objectContaining({
                            scoreId: 'score-certified',
                            commentary: 'Strong stage presence',
                          }),
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(report.drilldown?.contests[0]?.contestants).toHaveLength(1);
      expect(report.drilldown?.contests[0]?.contestants[0]?.judges[0]?.categories).toHaveLength(1);
      expect(report.winners).toHaveLength(1);
      expect(report.winners?.[0]?.contestant.id).toBe('contestant-1');
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isCertified: true,
            category: {
              totalsCertified: true,
            },
          }),
        }),
      );
    });
  });

  describe('generateJudgePerformanceData', () => {
    it('should generate judge performance report', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [mockScore, { ...mockScore, id: 'score-2', score: 90 }],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1', 'user-1');

      expect(report).toMatchObject({
        scores: expect.any(Array),
        statistics: expect.objectContaining({
          totalScoresGiven: 2,
          averageScore: expect.any(Number),
          categoriesJudged: expect.any(Number),
          categoryBreakdown: expect.any(Object),
        }),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          generatedBy: 'user-1',
          reportType: 'judge_performance',
        }),
      });
    });

    it('should throw NotFoundError if judge does not exist', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue(null);

      await expect(
        service.generateJudgePerformanceData('non-existent')
      ).rejects.toThrow(NotFoundError);
    });

    it('should calculate average score correctly', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [
          { ...mockScore, score: 80 },
          { ...mockScore, id: 'score-2', score: 90 },
          { ...mockScore, id: 'score-3', score: 70 },
        ],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1');
      const statistics = requireJudgeStatistics(report);

      expect(statistics.averageScore).toBe(80); // (80+90+70)/3
    });

    it('should count unique categories judged', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [
          { ...mockScore, categoryId: 'category-1' },
          { ...mockScore, id: 'score-2', categoryId: 'category-1' },
          { ...mockScore, id: 'score-3', categoryId: 'category-2' },
        ],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1');
      const statistics = requireJudgeStatistics(report);

      expect(statistics.categoriesJudged).toBe(2);
    });

    it('should handle judge with no scores', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1');
      const statistics = requireJudgeStatistics(report);

      expect(statistics.totalScoresGiven).toBe(0);
      expect(statistics.averageScore).toBe(0);
    });

    it('should include category breakdown', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [
          { ...mockScore, categoryId: 'category-1', score: 85 },
          { ...mockScore, id: 'score-2', categoryId: 'category-1', score: 90 },
        ],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1');
      const statistics = requireJudgeStatistics(report);

      expect(statistics.categoryBreakdown).toBeDefined();
      expect(typeof statistics.categoryBreakdown).toBe('object');
    });
  });

  describe('generateSystemAnalyticsData', () => {
    beforeEach(() => {
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.contest.count.mockResolvedValue(25);
      mockPrisma.category.count.mockResolvedValue(50);
      mockPrisma.score.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValue(100);
    });

    it('should generate system analytics report', async () => {
      const report = await service.generateSystemAnalyticsData('user-1');

      expect(report).toMatchObject({
        statistics: expect.objectContaining({
          totalEvents: 10,
          totalContests: 25,
          totalCategories: 50,
          totalScores: 1000,
          totalUsers: 100,
        }),
        metadata: expect.objectContaining({
          generatedAt: expect.any(String),
          generatedBy: 'user-1',
          reportType: 'system_analytics',
        }),
      });
    });

    it('should calculate active and archived events', async () => {
      mockPrisma.event.count
        .mockResolvedValueOnce(10) // totalEvents
        .mockResolvedValueOnce(7); // activeEvents

      const report = await service.generateSystemAnalyticsData();
      const statistics = requireSystemStatistics(report);

      expect(statistics.totalEvents).toBe(10);
      expect(statistics.activeEvents).toBe(7);
      expect(statistics.archivedEvents).toBe(3);
    });

    it('should calculate average scores per event', async () => {
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.score.count.mockResolvedValue(500);

      const report = await service.generateSystemAnalyticsData();
      const statistics = requireSystemStatistics(report);

      expect(statistics.averageScoresPerEvent).toBe(50);
    });

    it('should calculate average contests per event', async () => {
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.contest.count.mockResolvedValue(30);

      const report = await service.generateSystemAnalyticsData();
      const statistics = requireSystemStatistics(report);

      expect(statistics.averageContestsPerEvent).toBe(3);
    });

    it('should handle zero events gracefully', async () => {
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.contest.count.mockResolvedValue(0);
      mockPrisma.score.count.mockResolvedValue(0);

      const report = await service.generateSystemAnalyticsData();
      const statistics = requireSystemStatistics(report);

      expect(statistics.averageScoresPerEvent).toBe(0);
      expect(statistics.averageContestsPerEvent).toBe(0);
    });

    it('should round averages to 2 decimal places', async () => {
      mockPrisma.event.count.mockResolvedValue(3);
      mockPrisma.contest.count.mockResolvedValue(10);
      mockPrisma.score.count.mockResolvedValue(100);

      const report = await service.generateSystemAnalyticsData();
      const statistics = requireSystemStatistics(report);

      expect(statistics.averageContestsPerEvent).toBe(3.33);
      expect(statistics.averageScoresPerEvent).toBe(33.33);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('should calculate breakdown by category', () => {
      const scores = [
        { ...mockScore, categoryId: 'category-1', score: 85, category: { name: 'Dance' } },
        { ...mockScore, id: 'score-2', categoryId: 'category-1', score: 90, category: { name: 'Dance' } },
        { ...mockScore, id: 'score-3', categoryId: 'category-2', score: 75, category: { name: 'Vocal' } },
      ];

      const breakdown = (service as any).calculateCategoryBreakdown(scores);

      expect(breakdown['category-1']).toMatchObject({
        categoryName: 'Dance',
        count: 2,
        totalScore: 175,
        averageScore: 87.5,
      });

      expect(breakdown['category-2']).toMatchObject({
        categoryName: 'Vocal',
        count: 1,
        totalScore: 75,
        averageScore: 75,
      });
    });

    it('should handle missing category names', () => {
      const scores = [
        { ...mockScore, categoryId: 'category-1', score: 85, category: null },
      ];

      const breakdown = (service as any).calculateCategoryBreakdown(scores);

      expect(breakdown['category-1'].categoryName).toBe('Unknown');
    });

    it('should handle null scores in calculation', () => {
      const scores = [
        { ...mockScore, categoryId: 'category-1', score: 85, category: { name: 'Dance' } },
        { ...mockScore, id: 'score-2', categoryId: 'category-1', score: null, category: { name: 'Dance' } },
      ];

      const breakdown = (service as any).calculateCategoryBreakdown(scores);

      expect(breakdown['category-1'].totalScore).toBe(85);
      expect(breakdown['category-1'].count).toBe(2);
    });

    it('should round averages to 2 decimal places', () => {
      const scores = [
        { ...mockScore, categoryId: 'category-1', score: 85, category: { name: 'Dance' } },
        { ...mockScore, id: 'score-2', categoryId: 'category-1', score: 86, category: { name: 'Dance' } },
        { ...mockScore, id: 'score-3', categoryId: 'category-1', score: 87, category: { name: 'Dance' } },
      ];

      const breakdown = (service as any).calculateCategoryBreakdown(scores);

      expect(breakdown['category-1'].averageScore).toBe(86);
    });

    it('should handle empty scores array', () => {
      const breakdown = (service as any).calculateCategoryBreakdown([]);

      expect(breakdown).toEqual({});
    });
  });
});
