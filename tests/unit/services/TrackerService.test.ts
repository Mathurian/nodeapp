/**
 * TrackerService Unit Tests
 * Comprehensive test coverage for scoring progress tracking and certification workflow monitoring
 */

import 'reflect-metadata';
import { TrackerService } from '../../../src/services/TrackerService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('TrackerService', () => {
  let service: TrackerService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new TrackerService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TrackerService);
    });

    it('should extend BaseService', () => {
      expect(service).toHaveProperty('notFoundError');
      expect(service).toHaveProperty('validationError');
    });
  });

  describe('getScoringProgressByContest', () => {
    const contestId = 'contest-123';
    const mockContest = {
      id: contestId,
      name: 'Talent Competition',
      event: {
        id: 'event-1',
        name: 'Annual Pageant 2024'
      },
      categories: [
        {
          id: 'cat-1',
          name: 'Vocal Performance',
          contestants: [
            { contestantId: 'contestant-1' },
            { contestantId: 'contestant-2' },
            { contestantId: 'contestant-3' }
          ],
          scores: [
            { id: 'score-1', judgeId: 'judge-1' },
            { id: 'score-2', judgeId: 'judge-1' },
            { id: 'score-3', judgeId: 'judge-2' },
            { id: 'score-4', judgeId: 'judge-2' },
            { id: 'score-5', judgeId: 'judge-2' }
          ],
          judges: [
            { judgeId: 'judge-1' },
            { judgeId: 'judge-2' }
          ]
        }
      ]
    };

    describe('success cases', () => {
      it('should return scoring progress for contest with categories', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.judge.findUnique
          .mockResolvedValueOnce({ id: 'judge-1', name: 'Judge Smith' } as any)
          .mockResolvedValueOnce({ id: 'judge-2', name: 'Judge Jones' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result).toMatchObject({
          contestId,
          contestName: 'Talent Competition',
          eventName: 'Annual Pageant 2024'
        });
        expect(result.categories).toHaveLength(1);
        expect(result.categories[0]).toMatchObject({
          categoryId: 'cat-1',
          categoryName: 'Vocal Performance',
          totalContestants: 3,
          totalJudges: 2,
          totalScores: 5,
          expectedScores: 6
        });
        expect(result.categories[0].completionPercentage).toBe(83);
        expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
          where: { id: contestId },
          select: expect.any(Object)
        });
      });

      it('should calculate judge completion statistics correctly', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.judge.findUnique
          .mockResolvedValueOnce({ id: 'judge-1', name: 'Judge Smith' } as any)
          .mockResolvedValueOnce({ id: 'judge-2', name: 'Judge Jones' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0].judges).toHaveLength(2);

        const judge1Stats = result.categories[0].judges.find(j => j.judgeId === 'judge-1');
        expect(judge1Stats).toMatchObject({
          judgeId: 'judge-1',
          judgeName: 'Judge Smith',
          completed: 2,
          total: 3,
          completionPercentage: 67
        });

        const judge2Stats = result.categories[0].judges.find(j => j.judgeId === 'judge-2');
        expect(judge2Stats).toMatchObject({
          judgeId: 'judge-2',
          judgeName: 'Judge Jones',
          completed: 3,
          total: 3,
          completionPercentage: 100
        });
      });

      it('should handle contest with multiple categories', async () => {
        const multiCategoryContest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Category 1',
              contestants: [{ contestantId: 'c1' }, { contestantId: 'c2' }],
              scores: [
                { id: 's1', judgeId: 'j1' },
                { id: 's2', judgeId: 'j1' }
              ],
              judges: [{ judgeId: 'j1' }]
            },
            {
              id: 'cat-2',
              name: 'Category 2',
              contestants: [{ contestantId: 'c3' }],
              scores: [{ id: 's3', judgeId: 'j2' }],
              judges: [{ judgeId: 'j2' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(multiCategoryContest as any);
        mockPrisma.judge.findUnique
          .mockResolvedValueOnce({ id: 'j1', name: 'Judge 1' } as any)
          .mockResolvedValueOnce({ id: 'j2', name: 'Judge 2' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories).toHaveLength(2);
        expect(result.categories[0].completionPercentage).toBe(100);
        expect(result.categories[1].completionPercentage).toBe(100);
        expect(result.overallCompletion).toBe(100);
      });

      it('should calculate overall completion as average of categories', async () => {
        const contest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Cat 1',
              contestants: [{ contestantId: 'c1' }, { contestantId: 'c2' }],
              scores: [{ id: 's1', judgeId: 'j1' }],
              judges: [{ judgeId: 'j1' }]
            },
            {
              id: 'cat-2',
              name: 'Cat 2',
              contestants: [{ contestantId: 'c3' }, { contestantId: 'c4' }],
              scores: [
                { id: 's2', judgeId: 'j2' },
                { id: 's3', judgeId: 'j2' }
              ],
              judges: [{ judgeId: 'j2' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
        mockPrisma.judge.findUnique
          .mockResolvedValueOnce({ id: 'j1', name: 'Judge 1' } as any)
          .mockResolvedValueOnce({ id: 'j2', name: 'Judge 2' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0].completionPercentage).toBe(50);
        expect(result.categories[1].completionPercentage).toBe(100);
        expect(result.overallCompletion).toBe(75);
      });

      it('should handle contest with no categories', async () => {
        const emptyContest = {
          ...mockContest,
          categories: []
        };

        mockPrisma.contest.findUnique.mockResolvedValue(emptyContest as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories).toHaveLength(0);
        expect(result.overallCompletion).toBe(0);
      });

      it('should handle category with no contestants', async () => {
        const noContestantsContest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Empty Category',
              contestants: [],
              scores: [],
              judges: [{ judgeId: 'judge-1' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(noContestantsContest as any);
        mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-1', name: 'Judge' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0]).toMatchObject({
          totalContestants: 0,
          totalScores: 0,
          expectedScores: 0,
          completionPercentage: 0
        });
      });

      it('should handle category with no scores', async () => {
        const noScoresContest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Unscored Category',
              contestants: [{ contestantId: 'c1' }, { contestantId: 'c2' }],
              scores: [],
              judges: [{ judgeId: 'judge-1' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(noScoresContest as any);
        mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-1', name: 'Judge' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0]).toMatchObject({
          totalContestants: 2,
          totalScores: 0,
          expectedScores: 0,
          completionPercentage: 0
        });
      });

      it('should handle judge with unknown name', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.judge.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 'judge-2', name: 'Judge Jones' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        const unknownJudge = result.categories[0].judges.find(j => j.judgeId === 'judge-1');
        expect(unknownJudge?.judgeName).toBe('Unknown');
      });

      it('should deduplicate judges correctly', async () => {
        const duplicateJudgesContest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Category',
              contestants: [{ contestantId: 'c1' }],
              scores: [
                { id: 's1', judgeId: 'judge-1' },
                { id: 's2', judgeId: 'judge-1' },
                { id: 's3', judgeId: 'judge-1' }
              ],
              judges: [{ judgeId: 'judge-1' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(duplicateJudgesContest as any);
        mockPrisma.judge.findUnique.mockResolvedValue({ id: 'judge-1', name: 'Judge' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0].totalJudges).toBe(1);
        expect(result.categories[0].judges).toHaveLength(1);
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundError when contest does not exist', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        await expect(service.getScoringProgressByContest(contestId))
          .rejects
          .toThrow(NotFoundError);

        expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
          where: { id: contestId },
          select: expect.any(Object)
        });
      });

      it('should handle database errors gracefully', async () => {
        mockPrisma.contest.findUnique.mockRejectedValue(new Error('Database connection failed'));

        await expect(service.getScoringProgressByContest(contestId))
          .rejects
          .toThrow('Database connection failed');
      });

      it('should handle judge lookup errors', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.judge.findUnique.mockRejectedValue(new Error('Judge lookup failed'));

        await expect(service.getScoringProgressByContest(contestId))
          .rejects
          .toThrow('Judge lookup failed');
      });
    });

    describe('edge cases', () => {
      it('should handle very large numbers of categories', async () => {
        const largeContest = {
          ...mockContest,
          categories: Array.from({ length: 100 }, (_, i) => ({
            id: `cat-${i}`,
            name: `Category ${i}`,
            contestants: [{ contestantId: `c-${i}` }],
            scores: [{ id: `s-${i}`, judgeId: `j-${i}` }],
            judges: [{ judgeId: `j-${i}` }]
          }))
        };

        mockPrisma.contest.findUnique.mockResolvedValue(largeContest as any);
        mockPrisma.judge.findUnique.mockImplementation((args: any) =>
          Promise.resolve({ id: args.where.id, name: `Judge ${args.where.id}` } as any)
        );

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories).toHaveLength(100);
        expect(result.overallCompletion).toBe(100);
      });

      it('should round completion percentages correctly', async () => {
        const contest = {
          ...mockContest,
          categories: [
            {
              id: 'cat-1',
              name: 'Category',
              contestants: [{ contestantId: 'c1' }, { contestantId: 'c2' }, { contestantId: 'c3' }],
              scores: [{ id: 's1', judgeId: 'j1' }],
              judges: [{ judgeId: 'j1' }]
            }
          ]
        };

        mockPrisma.contest.findUnique.mockResolvedValue(contest as any);
        mockPrisma.judge.findUnique.mockResolvedValue({ id: 'j1', name: 'Judge' } as any);

        const result = await service.getScoringProgressByContest(contestId);

        expect(result.categories[0].completionPercentage).toBe(33);
        expect(result.categories[0].judges[0].completionPercentage).toBe(33);
      });
    });
  });

  describe('getScoringProgressByCategory', () => {
    const categoryId = 'category-123';
    const mockCategory = {
      id: categoryId,
      name: 'Interview',
      contestants: [
        {
          contestantId: 'contestant-1',
          contestant: { name: 'Alice Johnson' }
        },
        {
          contestantId: 'contestant-2',
          contestant: { name: 'Bob Smith' }
        },
        {
          contestantId: 'contestant-3',
          contestant: { name: 'Carol White' }
        }
      ],
      scores: [
        { id: 'score-1', judgeId: 'judge-1', contestantId: 'contestant-1' },
        { id: 'score-2', judgeId: 'judge-1', contestantId: 'contestant-2' },
        { id: 'score-3', judgeId: 'judge-2', contestantId: 'contestant-1' }
      ],
      judges: [
        { judgeId: 'judge-1', judge: { name: 'Judge Brown' } },
        { judgeId: 'judge-2', judge: { name: 'Judge Davis' } }
      ],
      contest: {
        id: 'contest-1',
        name: 'Preliminary Round',
        event: {
          id: 'event-1',
          name: 'State Championship 2024'
        }
      }
    };

    describe('success cases', () => {
      it('should return scoring progress for category', async () => {
        mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          categoryId,
          categoryName: 'Interview',
          contestName: 'Preliminary Round',
          eventName: 'State Championship 2024',
          totalContestants: 3,
          totalJudges: 2,
          totalScores: 3,
          expectedScores: 6,
          completionPercentage: 50
        });

        expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
          where: { id: categoryId },
          include: expect.objectContaining({
            contestants: expect.any(Object),
            scores: expect.any(Object),
            judges: expect.any(Object),
            contest: expect.any(Object)
          })
        });
      });

      it('should calculate completion percentage correctly for fully scored category', async () => {
        const fullyScoredCategory = {
          ...mockCategory,
          scores: [
            { id: 'score-1', judgeId: 'judge-1', contestantId: 'contestant-1' },
            { id: 'score-2', judgeId: 'judge-1', contestantId: 'contestant-2' },
            { id: 'score-3', judgeId: 'judge-1', contestantId: 'contestant-3' },
            { id: 'score-4', judgeId: 'judge-2', contestantId: 'contestant-1' },
            { id: 'score-5', judgeId: 'judge-2', contestantId: 'contestant-2' },
            { id: 'score-6', judgeId: 'judge-2', contestantId: 'contestant-3' }
          ]
        };

        mockPrisma.category.findUnique.mockResolvedValue(fullyScoredCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result.completionPercentage).toBe(100);
      });

      it('should handle category with no scores', async () => {
        const noScoresCategory = {
          ...mockCategory,
          scores: []
        };

        mockPrisma.category.findUnique.mockResolvedValue(noScoresCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          totalScores: 0,
          expectedScores: 6,
          completionPercentage: 0
        });
      });

      it('should handle category with no contestants', async () => {
        const noContestantsCategory = {
          ...mockCategory,
          contestants: [],
          scores: []
        };

        mockPrisma.category.findUnique.mockResolvedValue(noContestantsCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          totalContestants: 0,
          totalJudges: 2,
          totalScores: 0,
          expectedScores: 0,
          completionPercentage: 0
        });
      });

      it('should handle category with no judges', async () => {
        const noJudgesCategory = {
          ...mockCategory,
          judges: [],
          scores: []
        };

        mockPrisma.category.findUnique.mockResolvedValue(noJudgesCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          totalContestants: 3,
          totalJudges: 0,
          totalScores: 0,
          expectedScores: 0,
          completionPercentage: 0
        });
      });

      it('should handle category with single contestant', async () => {
        const singleContestantCategory = {
          ...mockCategory,
          contestants: [
            { contestantId: 'contestant-1', contestant: { name: 'Alice' } }
          ],
          scores: [
            { id: 'score-1', judgeId: 'judge-1', contestantId: 'contestant-1' }
          ]
        };

        mockPrisma.category.findUnique.mockResolvedValue(singleContestantCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          totalContestants: 1,
          totalJudges: 2,
          totalScores: 1,
          expectedScores: 2,
          completionPercentage: 50
        });
      });

      it('should handle category with single judge', async () => {
        const singleJudgeCategory = {
          ...mockCategory,
          judges: [
            { judgeId: 'judge-1', judge: { name: 'Judge' } }
          ],
          scores: [
            { id: 'score-1', judgeId: 'judge-1', contestantId: 'contestant-1' },
            { id: 'score-2', judgeId: 'judge-1', contestantId: 'contestant-2' },
            { id: 'score-3', judgeId: 'judge-1', contestantId: 'contestant-3' }
          ]
        };

        mockPrisma.category.findUnique.mockResolvedValue(singleJudgeCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result).toMatchObject({
          totalContestants: 3,
          totalJudges: 1,
          totalScores: 3,
          expectedScores: 3,
          completionPercentage: 100
        });
      });

      it('should calculate percentage correctly for partial scoring', async () => {
        const partialCategory = {
          ...mockCategory,
          contestants: [
            { contestantId: 'c1', contestant: { name: 'C1' } },
            { contestantId: 'c2', contestant: { name: 'C2' } },
            { contestantId: 'c3', contestant: { name: 'C3' } },
            { contestantId: 'c4', contestant: { name: 'C4' } }
          ],
          judges: [
            { judgeId: 'j1', judge: { name: 'J1' } },
            { judgeId: 'j2', judge: { name: 'J2' } }
          ],
          scores: [
            { id: 's1', judgeId: 'j1', contestantId: 'c1' },
            { id: 's2', judgeId: 'j1', contestantId: 'c2' },
            { id: 's3', judgeId: 'j2', contestantId: 'c1' }
          ]
        };

        mockPrisma.category.findUnique.mockResolvedValue(partialCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result.expectedScores).toBe(8);
        expect(result.totalScores).toBe(3);
        expect(result.completionPercentage).toBe(38);
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundError when category does not exist', async () => {
        mockPrisma.category.findUnique.mockResolvedValue(null);

        await expect(service.getScoringProgressByCategory(categoryId))
          .rejects
          .toThrow(NotFoundError);

        expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
          where: { id: categoryId },
          include: expect.any(Object)
        });
      });

      it('should handle database errors gracefully', async () => {
        mockPrisma.category.findUnique.mockRejectedValue(
          new Error('Database connection lost')
        );

        await expect(service.getScoringProgressByCategory(categoryId))
          .rejects
          .toThrow('Database connection lost');
      });

      it('should handle malformed category data', async () => {
        const malformedCategory = {
          ...mockCategory,
          contest: null
        };

        mockPrisma.category.findUnique.mockResolvedValue(malformedCategory as any);

        await expect(service.getScoringProgressByCategory(categoryId))
          .rejects
          .toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle very large number of contestants and judges', async () => {
        const largeCategory = {
          ...mockCategory,
          contestants: Array.from({ length: 100 }, (_, i) => ({
            contestantId: `c-${i}`,
            contestant: { name: `Contestant ${i}` }
          })),
          judges: Array.from({ length: 10 }, (_, i) => ({
            judgeId: `j-${i}`,
            judge: { name: `Judge ${i}` }
          })),
          scores: Array.from({ length: 500 }, (_, i) => ({
            id: `s-${i}`,
            judgeId: `j-${Math.floor(i / 50)}`,
            contestantId: `c-${i % 100}`
          }))
        };

        mockPrisma.category.findUnique.mockResolvedValue(largeCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result.totalContestants).toBe(100);
        expect(result.totalJudges).toBe(10);
        expect(result.expectedScores).toBe(1000);
        expect(result.totalScores).toBe(500);
        expect(result.completionPercentage).toBe(50);
      });

      it('should round percentages correctly for non-even divisions', async () => {
        const category = {
          ...mockCategory,
          contestants: Array.from({ length: 7 }, (_, i) => ({
            contestantId: `c-${i}`,
            contestant: { name: `C${i}` }
          })),
          judges: [
            { judgeId: 'j1', judge: { name: 'J1' } },
            { judgeId: 'j2', judge: { name: 'J2' } },
            { judgeId: 'j3', judge: { name: 'J3' } }
          ],
          scores: Array.from({ length: 4 }, (_, i) => ({
            id: `s-${i}`,
            judgeId: 'j1',
            contestantId: `c-${i}`
          }))
        };

        mockPrisma.category.findUnique.mockResolvedValue(category as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result.expectedScores).toBe(21);
        expect(result.totalScores).toBe(4);
        expect(result.completionPercentage).toBe(19);
      });

      it('should handle zero expected scores correctly', async () => {
        const emptyCategory = {
          ...mockCategory,
          contestants: [],
          judges: [],
          scores: []
        };

        mockPrisma.category.findUnique.mockResolvedValue(emptyCategory as any);

        const result = await service.getScoringProgressByCategory(categoryId);

        expect(result.expectedScores).toBe(0);
        expect(result.completionPercentage).toBe(0);
      });
    });
  });
});
