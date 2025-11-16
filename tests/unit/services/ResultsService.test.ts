/**
 * ResultsService Unit Tests
 */

import 'reflect-metadata';
import { ResultsService } from '../../../src/services/ResultsService';
import { PrismaClient, UserRole } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ResultsService', () => {
  let service: ResultsService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockScore = {
    id: 'score-1',
    score: 85,
    categoryId: 'category-1',
    contestantId: 'contestant-1',
    judgeId: 'judge-1',
    criterionId: null,
    isCertified: true,
    certifiedBy: 'admin-1',
    certifiedAt: new Date(),
    comment: 'Great',
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: 'category-1',
      name: 'Talent',
      description: 'Talent category',
      scoreCap: 100,
      totalsCertified: true,
      contestId: 'contest-1',
      contest: {
        id: 'contest-1',
        name: 'Contest 1',
        description: 'Test Contest',
        eventId: 'event-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        event: {
          id: 'event-1',
          name: 'Event 1',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    },
    contestant: {
      id: 'contestant-1',
      name: 'Contestant 1',
      email: 'contestant1@test.com',
      contestantNumber: '001'
    },
    judge: {
      id: 'judge-1',
      name: 'Judge 1',
      email: 'judge1@test.com'
    },
    criterion: null
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ResultsService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getAllResults', () => {
    it('should return all results for ADMIN with full access', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);
      (mockPrisma.score.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getAllResults({
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1',
        offset: 0,
        limit: 50
      });

      expect(mockPrisma.score.findMany).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter results for JUDGE role', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        judge: { id: 'judge-1' }
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);
      (mockPrisma.score.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getAllResults({
        userRole: 'JUDGE' as UserRole,
        userId: 'user-1',
        offset: 0,
        limit: 50
      });

      expect(result.results).toBeDefined();
    });

    it('should filter results for CONTESTANT role', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'contestant_can_view_overall_results',
        value: 'true'
      });
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([
        { id: 'category-1' }
      ]);
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);
      (mockPrisma.score.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getAllResults({
        userRole: 'CONTESTANT' as UserRole,
        userId: 'user-1',
        offset: 0,
        limit: 50
      });

      expect(result.results).toBeDefined();
    });

    it('should return empty results when CONTESTANT has no certified categories', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });
      (mockPrisma.systemSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'contestant_can_view_overall_results',
        value: 'true'
      });
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllResults({
        userRole: 'CONTESTANT' as UserRole,
        userId: 'user-1',
        offset: 0,
        limit: 50
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return empty results when JUDGE has no judge record', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        judge: null
      });

      const result = await service.getAllResults({
        userRole: 'JUDGE' as UserRole,
        userId: 'user-1',
        offset: 0,
        limit: 50
      });

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error for insufficient permissions', async () => {
      await expect(
        service.getAllResults({
          userRole: 'UNKNOWN_ROLE' as any,
          userId: 'user-1'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should apply pagination correctly', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);
      (mockPrisma.score.count as jest.Mock).mockResolvedValue(100);

      const result = await service.getAllResults({
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1',
        offset: 10,
        limit: 20
      });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 20
        })
      );
    });
  });

  describe('getCategories', () => {
    it('should return all categories with related data', async () => {
      const mockCategories = [
        {
          id: 'category-1',
          name: 'Talent',
          contest: {
            id: 'contest-1',
            name: 'Contest 1',
            event: {
              id: 'event-1',
              name: 'Event 1'
            }
          }
        }
      ];
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const result = await service.getCategories();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        include: {
          contest: {
            include: {
              event: true
            }
          }
        }
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getContestantResults', () => {
    it('should return results for specific contestant', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getContestantResults({
        contestantId: 'contestant-1',
        userRole: 'CONTESTANT' as UserRole,
        userId: 'user-1'
      });

      expect(result).toEqual([mockScore]);
    });

    it('should throw error when contestant tries to view other contestant results', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });

      await expect(
        service.getContestantResults({
          contestantId: 'contestant-2',
          userRole: 'CONTESTANT' as UserRole,
          userId: 'user-1'
        })
      ).rejects.toThrow('Access denied');
    });

    it('should allow ADMIN to view any contestant results', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getContestantResults({
        contestantId: 'contestant-1',
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1'
      });

      expect(result).toEqual([mockScore]);
    });

    it('should filter by judgeId for JUDGE role', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        judge: { id: 'judge-1' }
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getContestantResults({
        contestantId: 'contestant-1',
        userRole: 'JUDGE' as UserRole,
        userId: 'user-1'
      });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            judgeId: 'judge-1'
          })
        })
      );
    });
  });

  describe('getCategoryResults', () => {
    it('should return results for specific category with rankings', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
        id: 'category-1',
        name: 'Talent'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getCategoryResults({
        categoryId: 'category-1',
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1'
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCategoryResults({
          categoryId: 'nonexistent',
          userRole: 'ADMIN' as UserRole,
          userId: 'admin-1'
        })
      ).rejects.toThrow('Category not found');
    });

    it('should filter by contestant for CONTESTANT role', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'category-1' });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getCategoryResults({
        categoryId: 'category-1',
        userRole: 'CONTESTANT' as UserRole,
        userId: 'user-1'
      });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contestantId: 'contestant-1'
          })
        })
      );
    });

    it('should check assignment for JUDGE role', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'category-1' });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        judge: { id: 'judge-1' }
      });
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue({
        id: 'assignment-1',
        status: 'ACTIVE'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getCategoryResults({
        categoryId: 'category-1',
        userRole: 'JUDGE' as UserRole,
        userId: 'user-1'
      });

      expect(result).toBeDefined();
    });

    it('should throw error when JUDGE not assigned to category', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'category-1' });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        judge: { id: 'judge-1' }
      });
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.score.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getCategoryResults({
          categoryId: 'category-1',
          userRole: 'JUDGE' as UserRole,
          userId: 'user-1'
        })
      ).rejects.toThrow('Not assigned to this category');
    });
  });

  describe('getContestResults', () => {
    it('should return results for specific contest', async () => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue({
        id: 'contest-1',
        name: 'Contest 1'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getContestResults({
        contestId: 'contest-1',
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1'
      });

      expect(result).toEqual([mockScore]);
    });

    it('should throw error when contest not found', async () => {
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getContestResults({
          contestId: 'nonexistent',
          userRole: 'ADMIN' as UserRole,
          userId: 'admin-1'
        })
      ).rejects.toThrow('Contest not found');
    });
  });

  describe('getEventResults', () => {
    it('should return results for specific event', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({
        id: 'event-1',
        name: 'Event 1'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getEventResults({
        eventId: 'event-1',
        userRole: 'ADMIN' as UserRole,
        userId: 'admin-1'
      });

      expect(result).toEqual([mockScore]);
    });

    it('should throw error when event not found', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getEventResults({
          eventId: 'nonexistent',
          userRole: 'ADMIN' as UserRole,
          userId: 'admin-1'
        })
      ).rejects.toThrow('Event not found');
    });

    it('should filter by contestant for CONTESTANT role', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({ id: 'event-1' });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-1',
        contestantId: 'contestant-1'
      });
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getEventResults({
        eventId: 'event-1',
        userRole: 'CONTESTANT' as UserRole,
        userId: 'user-1'
      });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contestantId: 'contestant-1'
          })
        })
      );
    });
  });
});
