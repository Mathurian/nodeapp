/**
 * ReportGenerationService Unit Tests
 * Comprehensive tests for report data generation and winner calculations
 */

import 'reflect-metadata';
import { ReportGenerationService, ContestantScore, ReportData } from '../../../src/services/ReportGenerationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockContestant = {
    id: 'contestant-1',
    name: 'John Doe',
    number: 1,
  };

  const mockJudge = {
    id: 'judge-1',
    name: 'Judge Smith',
  };

  const mockCriterion = {
    id: 'criterion-1',
    name: 'Performance',
    maxScore: 100,
    categoryId: 'category-1',
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Dance',
    scoreCap: 300,
  };

  const mockScore = {
    id: 'score-1',
    contestantId: 'contestant-1',
    judgeId: 'judge-1',
    categoryId: 'category-1',
    criterionId: 'criterion-1',
    score: 85,
    contestant: mockContestant,
    judge: mockJudge,
    criterion: mockCriterion,
    category: mockCategory,
  };

  const mockContest = {
    id: 'contest-1',
    name: 'Regional Competition',
    description: 'Annual regional dance competition',
    categories: [mockCategory],
  };

  const mockEvent = {
    id: 'event-1',
    name: 'Annual Gala',
    description: 'Annual dance gala event',
    archived: false,
    contests: [mockContest],
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ReportGenerationService(mockPrisma as any);
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
        { ...mockScore, id: 'score-2', contestantId: 'contestant-2', score: 95, contestant: { id: 'contestant-2', name: 'Jane Doe' } },
        { ...mockScore, id: 'score-3', contestantId: 'contestant-3', score: 75, contestant: { id: 'contestant-3', name: 'Bob Smith' } },
      ] as any);

      const winners = await service.calculateContestWinners(contestWithMultiple);

      expect(winners).toHaveLength(3);
      expect(winners[0].totalScore).toBeGreaterThanOrEqual(winners[1].totalScore);
      expect(winners[1].totalScore).toBeGreaterThanOrEqual(winners[2].totalScore);
    });

    it('should calculate total possible score from criteria', async () => {
      const contestWithCriteria = {
        ...mockContest,
        categories: [{ ...mockCategory, id: 'category-1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 50 },
        { ...mockCriterion, id: 'criterion-2', categoryId: 'category-1', maxScore: 50 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', categoryId: 'category-1', judgeId: 'judge-1', score: 45 },
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
        categories: [{ ...mockCategory, id: 'category-1' }],
      };

      mockPrisma.criterion.findMany.mockResolvedValue([
        { ...mockCriterion, categoryId: 'category-1', maxScore: 100 },
      ]);

      mockPrisma.score.findMany.mockResolvedValue([
        { ...mockScore, contestantId: 'contestant-1', categoryId: 'category-1', judgeId: 'judge-1', score: 85 },
        { ...mockScore, id: 'score-2', contestantId: 'contestant-1', categoryId: 'category-1', judgeId: 'judge-2', score: 90 },
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
        }),
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

      expect(report.event.contests[0]).toHaveProperty('winners');
      expect(Array.isArray(report.event.contests[0].winners)).toBe(true);
    });

    it('should handle events with no contests', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const report = await service.generateEventReportData('event-1');

      expect(report.event.contests).toEqual([]);
    });

    it('should include generation timestamp', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const beforeTime = new Date().toISOString();
      const report = await service.generateEventReportData('event-1');
      const afterTime = new Date().toISOString();

      expect(report.metadata.generatedAt).toBeDefined();
      expect(new Date(report.metadata.generatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(report.metadata.generatedAt).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });

    it('should include optional userId in metadata', async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        contests: [],
      } as any);

      const report = await service.generateEventReportData('event-1', 'user-123');

      expect(report.metadata.generatedBy).toBe('user-123');
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

      expect(report.contest.event).toMatchObject({
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

      expect(report.statistics.averageScore).toBe(80); // (80+90+70)/3
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

      expect(report.statistics.categoriesJudged).toBe(2);
    });

    it('should handle judge with no scores', async () => {
      mockPrisma.judge.findUnique.mockResolvedValue({
        ...mockJudge,
        scores: [],
      } as any);

      const report = await service.generateJudgePerformanceData('judge-1');

      expect(report.statistics.totalScoresGiven).toBe(0);
      expect(report.statistics.averageScore).toBe(0);
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

      expect(report.statistics.categoryBreakdown).toBeDefined();
      expect(typeof report.statistics.categoryBreakdown).toBe('object');
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

      expect(report.statistics.totalEvents).toBe(10);
      expect(report.statistics.activeEvents).toBe(7);
      expect(report.statistics.archivedEvents).toBe(3);
    });

    it('should calculate average scores per event', async () => {
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.score.count.mockResolvedValue(500);

      const report = await service.generateSystemAnalyticsData();

      expect(report.statistics.averageScoresPerEvent).toBe(50);
    });

    it('should calculate average contests per event', async () => {
      mockPrisma.event.count.mockResolvedValue(10);
      mockPrisma.contest.count.mockResolvedValue(30);

      const report = await service.generateSystemAnalyticsData();

      expect(report.statistics.averageContestsPerEvent).toBe(3);
    });

    it('should handle zero events gracefully', async () => {
      mockPrisma.event.count.mockResolvedValue(0);
      mockPrisma.contest.count.mockResolvedValue(0);
      mockPrisma.score.count.mockResolvedValue(0);

      const report = await service.generateSystemAnalyticsData();

      expect(report.statistics.averageScoresPerEvent).toBe(0);
      expect(report.statistics.averageContestsPerEvent).toBe(0);
    });

    it('should round averages to 2 decimal places', async () => {
      mockPrisma.event.count.mockResolvedValue(3);
      mockPrisma.contest.count.mockResolvedValue(10);
      mockPrisma.score.count.mockResolvedValue(100);

      const report = await service.generateSystemAnalyticsData();

      expect(report.statistics.averageContestsPerEvent).toBe(3.33);
      expect(report.statistics.averageScoresPerEvent).toBe(33.33);
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
