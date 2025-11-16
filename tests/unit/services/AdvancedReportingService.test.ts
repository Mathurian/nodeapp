/**
 * AdvancedReportingService Unit Tests
 * Comprehensive tests for advanced reporting functionality
 */

import 'reflect-metadata';
import { AdvancedReportingService } from '../../../src/services/AdvancedReportingService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('AdvancedReportingService', () => {
  let service: AdvancedReportingService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new AdvancedReportingService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AdvancedReportingService);
    });
  });

  describe('generateScoreReport', () => {
    const mockScores = [
      {
        id: 'score1',
        score: 95,
        judgeId: 'judge1',
        contestantId: 'contestant1',
        categoryId: 'category1',
        judge: { name: 'Judge One' },
        contestant: { name: 'Contestant One' },
        category: {
          name: 'Category One',
          contest: { name: 'Contest One' }
        }
      },
      {
        id: 'score2',
        score: 88,
        judgeId: 'judge2',
        contestantId: 'contestant2',
        categoryId: 'category1',
        judge: { name: 'Judge Two' },
        contestant: { name: 'Contestant Two' },
        category: {
          name: 'Category One',
          contest: { name: 'Contest One' }
        }
      }
    ];

    it('should generate score report by category', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.generateScoreReport(undefined, undefined, 'category1');

      expect(result).toEqual({
        scores: mockScores,
        total: 2
      });
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category1' },
        include: {
          judge: { select: { name: true } },
          contestant: { select: { name: true } },
          category: { select: { name: true, contest: { select: { name: true } } } }
        }
      });
    });

    it('should generate score report by contest', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.generateScoreReport(undefined, 'contest1', undefined);

      expect(result).toEqual({
        scores: mockScores,
        total: 2
      });
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith({
        where: { category: { contestId: 'contest1' } },
        include: {
          judge: { select: { name: true } },
          contestant: { select: { name: true } },
          category: { select: { name: true, contest: { select: { name: true } } } }
        }
      });
    });

    it('should generate score report by event', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.generateScoreReport('event1', undefined, undefined);

      expect(result).toEqual({
        scores: mockScores,
        total: 2
      });
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith({
        where: { category: { contest: { eventId: 'event1' } } },
        include: {
          judge: { select: { name: true } },
          contestant: { select: { name: true } },
          category: { select: { name: true, contest: { select: { name: true } } } }
        }
      });
    });

    it('should generate report with no filters', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.generateScoreReport();

      expect(result).toEqual({
        scores: mockScores,
        total: 2
      });
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          judge: { select: { name: true } },
          contestant: { select: { name: true } },
          category: { select: { name: true, contest: { select: { name: true } } } }
        }
      });
    });

    it('should return empty report when no scores found', async () => {
      mockPrisma.score.findMany.mockResolvedValue([]);

      const result = await service.generateScoreReport('event1');

      expect(result).toEqual({
        scores: [],
        total: 0
      });
    });

    it('should prioritize category over contest and event', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      await service.generateScoreReport('event1', 'contest1', 'category1');

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'category1' }
        })
      );
    });

    it('should prioritize contest over event when no category', async () => {
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      await service.generateScoreReport('event1', 'contest1', undefined);

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: { contestId: 'contest1' } }
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.score.findMany.mockRejectedValue(dbError);

      await expect(service.generateScoreReport('event1')).rejects.toThrow();
    });

    it('should include all score details in result', async () => {
      const detailedScores = [
        {
          id: 'score1',
          score: 95,
          judgeId: 'judge1',
          contestantId: 'contestant1',
          categoryId: 'category1',
          createdAt: new Date(),
          updatedAt: new Date(),
          judge: { name: 'Judge One' },
          contestant: { name: 'Contestant One' },
          category: {
            name: 'Category One',
            contest: { name: 'Contest One' }
          }
        }
      ];
      mockPrisma.score.findMany.mockResolvedValue(detailedScores as any);

      const result = await service.generateScoreReport('event1');

      expect(result.scores).toHaveLength(1);
      expect(result.scores[0]).toHaveProperty('judge');
      expect(result.scores[0]).toHaveProperty('contestant');
      expect(result.scores[0]).toHaveProperty('category');
    });
  });

  describe('generateSummaryReport', () => {
    const mockEvent = {
      id: 'event1',
      name: 'Annual Competition',
      contests: [
        {
          id: 'contest1',
          name: 'Contest 1',
          categories: [
            {
              id: 'category1',
              name: 'Category 1',
              scores: [{ id: 'score1' }, { id: 'score2' }],
              contestants: [{ id: 'contestant1' }],
              judges: [{ id: 'judge1' }]
            },
            {
              id: 'category2',
              name: 'Category 2',
              scores: [{ id: 'score3' }],
              contestants: [{ id: 'contestant2' }],
              judges: [{ id: 'judge2' }]
            }
          ]
        },
        {
          id: 'contest2',
          name: 'Contest 2',
          categories: [
            {
              id: 'category3',
              name: 'Category 3',
              scores: [{ id: 'score4' }, { id: 'score5' }],
              contestants: [{ id: 'contestant3' }],
              judges: [{ id: 'judge3' }]
            }
          ]
        }
      ]
    };

    it('should generate comprehensive summary report', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.generateSummaryReport('event1');

      expect(result).toEqual({
        event: 'Annual Competition',
        contests: 2,
        categories: 3,
        totalScores: 5
      });
    });

    it('should query event with full nested includes', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      await service.generateSummaryReport('event1');

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event1' },
        include: {
          contests: {
            include: {
              categories: {
                include: {
                  scores: true,
                  contestants: true,
                  judges: true
                }
              }
            }
          }
        }
      });
    });

    it('should throw NotFoundError when event does not exist', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.generateSummaryReport('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should handle event with no contests', async () => {
      const emptyEvent = {
        id: 'event1',
        name: 'Empty Event',
        contests: []
      };
      mockPrisma.event.findUnique.mockResolvedValue(emptyEvent as any);

      const result = await service.generateSummaryReport('event1');

      expect(result).toEqual({
        event: 'Empty Event',
        contests: 0,
        categories: 0,
        totalScores: 0
      });
    });

    it('should handle event with contests but no categories', async () => {
      const eventWithoutCategories = {
        id: 'event1',
        name: 'Event',
        contests: [
          { id: 'contest1', name: 'Contest 1', categories: [] }
        ]
      };
      mockPrisma.event.findUnique.mockResolvedValue(eventWithoutCategories as any);

      const result = await service.generateSummaryReport('event1');

      expect(result).toEqual({
        event: 'Event',
        contests: 1,
        categories: 0,
        totalScores: 0
      });
    });

    it('should handle categories with no scores', async () => {
      const eventWithNoScores = {
        id: 'event1',
        name: 'Event',
        contests: [
          {
            id: 'contest1',
            name: 'Contest 1',
            categories: [
              {
                id: 'category1',
                name: 'Category 1',
                scores: [],
                contestants: [],
                judges: []
              }
            ]
          }
        ]
      };
      mockPrisma.event.findUnique.mockResolvedValue(eventWithNoScores as any);

      const result = await service.generateSummaryReport('event1');

      expect(result).toEqual({
        event: 'Event',
        contests: 1,
        categories: 1,
        totalScores: 0
      });
    });

    it('should correctly count multiple contests and categories', async () => {
      const largeEvent = {
        id: 'event1',
        name: 'Large Event',
        contests: [
          {
            id: 'contest1',
            categories: [
              { scores: [1, 2, 3] },
              { scores: [4, 5] }
            ]
          },
          {
            id: 'contest2',
            categories: [
              { scores: [6] },
              { scores: [7, 8, 9] }
            ]
          },
          {
            id: 'contest3',
            categories: [
              { scores: [10, 11] }
            ]
          }
        ]
      };
      mockPrisma.event.findUnique.mockResolvedValue(largeEvent as any);

      const result = await service.generateSummaryReport('event1');

      expect(result.contests).toBe(3);
      expect(result.categories).toBe(5);
      expect(result.totalScores).toBe(11);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.event.findUnique.mockRejectedValue(dbError);

      await expect(service.generateSummaryReport('event1')).rejects.toThrow();
    });

    it('should handle null event gracefully', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.generateSummaryReport('event1')).rejects.toThrow('Event with ID event1 not found');
    });

    it('should correctly aggregate deeply nested data', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.generateSummaryReport('event1');

      // Verify the aggregation logic is working correctly
      const expectedCategories = mockEvent.contests.reduce((sum, c) => sum + c.categories.length, 0);
      const expectedScores = mockEvent.contests.reduce((sum, c) =>
        sum + c.categories.reduce((s, cat) => s + cat.scores.length, 0), 0
      );

      expect(result.categories).toBe(expectedCategories);
      expect(result.totalScores).toBe(expectedScores);
    });
  });

  describe('error handling', () => {
    it('should handle Prisma unique constraint violations', async () => {
      const uniqueError: any = new Error('Unique constraint failed');
      uniqueError.code = 'P2002';
      mockPrisma.score.findMany.mockRejectedValue(uniqueError);

      await expect(service.generateScoreReport('event1')).rejects.toThrow();
    });

    it('should handle Prisma foreign key violations', async () => {
      const fkError: any = new Error('Foreign key constraint failed');
      fkError.code = 'P2003';
      mockPrisma.event.findUnique.mockRejectedValue(fkError);

      await expect(service.generateSummaryReport('event1')).rejects.toThrow();
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      mockPrisma.score.findMany.mockRejectedValue(timeoutError);

      await expect(service.generateScoreReport()).rejects.toThrow('Connection timeout');
    });
  });

  describe('edge cases', () => {
    it('should handle very large score datasets', async () => {
      const largeScoreSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `score${i}`,
        score: Math.random() * 100,
        judgeId: `judge${i % 100}`,
        contestantId: `contestant${i % 500}`,
        categoryId: `category${i % 50}`,
        judge: { name: `Judge ${i % 100}` },
        contestant: { name: `Contestant ${i % 500}` },
        category: {
          name: `Category ${i % 50}`,
          contest: { name: 'Large Contest' }
        }
      }));

      mockPrisma.score.findMany.mockResolvedValue(largeScoreSet as any);

      const result = await service.generateScoreReport('event1');

      expect(result.total).toBe(10000);
      expect(result.scores).toHaveLength(10000);
    });

    it('should handle special characters in names', async () => {
      const specialCharScores = [{
        id: 'score1',
        score: 95,
        judge: { name: "O'Brien, Jr." },
        contestant: { name: 'José María García' },
        category: {
          name: 'Category & Sub-Category (Test)',
          contest: { name: 'Contest #1: "Special"' }
        }
      }];

      mockPrisma.score.findMany.mockResolvedValue(specialCharScores as any);

      const result = await service.generateScoreReport();

      expect(result.scores[0].judge.name).toBe("O'Brien, Jr.");
      expect(result.scores[0].contestant.name).toBe('José María García');
    });

    it('should handle undefined optional parameters', async () => {
      mockPrisma.score.findMany.mockResolvedValue([]);

      await expect(service.generateScoreReport(undefined, undefined, undefined)).resolves.toBeDefined();
    });
  });
});
