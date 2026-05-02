/**
 * ScoringService Unit Tests
 */

import 'reflect-metadata';
import { ScoringService, SubmitScoreDTO, UpdateScoreDTO } from '../../../src/services/ScoringService';
import { ScoreRepository } from '../../../src/repositories/ScoreRepository';
import { PrismaClient, ScoringType } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../../src/services/BaseService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { CacheService } from '../../../src/services/CacheService';

describe('ScoringService', () => {
  let service: ScoringService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockScoreRepository: jest.Mocked<ScoreRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  const tenantId = 'tenant-1';

  const mockCategory = {
    id: 'category-1',
    name: 'Talent',
    contestId: 'contest-1',
    contest: {
      id: 'contest-1',
      eventId: 'event-1',
      scoringType: null,
      event: {
        id: 'event-1',
        name: 'Test Event',
        scoringType: null,
        tenantId: tenantId
      }
    }
  };

  const mockJudgeUser = {
    id: 'user-1',
    role: 'JUDGE',
    judge: { id: 'judge-1', name: 'Judge Test' }
  };

  const mockScore = {
    id: 'score-1',
    categoryId: 'category-1',
    contestantId: 'contestant-1',
    judgeId: 'judge-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    score: 85,
    certifiedAt: null,
    certifiedBy: null,
    tenantId: tenantId,
    contestant: { id: 'contestant-1', name: 'Contestant 1', contestantNumber: 1 },
    judge: { id: 'judge-1', name: 'Judge Test' },
    category: { id: 'category-1', name: 'Talent', scoreCap: 100 }
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    mockScoreRepository = {
      findById: jest.fn(),
      findByCategory: jest.fn(),
      findByJudge: jest.fn(),
      findByContestant: jest.fn(),
      findByContest: jest.fn(),
      delete: jest.fn(),
      getAverageScoreForContestantInCategory: jest.fn(),
      getContestScoreStats: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidatePattern: jest.fn(),
      clear: jest.fn(),
    } as any;

    service = new ScoringService(mockScoreRepository, mockPrisma as any, mockCacheService as any);
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) =>
      callback({
        $executeRawUnsafe: jest.fn().mockResolvedValue(0),
        score: {
          create: mockPrisma.score.create,
        },
      })
    );
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getScoresByCategory', () => {
    it('should return scores for a category', async () => {
      mockScoreRepository.findByCategory.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByCategory('category-1', tenantId);

      expect(mockScoreRepository.findByCategory).toHaveBeenCalledWith('category-1', tenantId);
      expect(result).toEqual([mockScore]);
    });

    it('should return scores for specific contestant in category', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getScoresByCategory('category-1', tenantId, 'contestant-1');

      expect(mockPrisma.score.findMany).toHaveBeenCalled();
      expect(result).toEqual([mockScore]);
    });

    it('should handle errors', async () => {
      mockScoreRepository.findByCategory.mockRejectedValue(new Error('Database error'));

      await expect(service.getScoresByCategory('category-1', tenantId)).rejects.toThrow();
    });
  });

  describe('submitScore', () => {
    const scoreData: SubmitScoreDTO = {
      categoryId: 'category-1',
      contestantId: 'contestant-1',
      score: 85,
      comments: 'Great performance'
    };

    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockJudgeUser);
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue({ id: 'assignment-1', status: 'ACTIVE' });
      (mockPrisma.score.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.score.create as jest.Mock).mockResolvedValue(mockScore);
    });

    it('should submit a score successfully', async () => {
      const result = await service.submitScore(scoreData, 'user-1', tenantId);

      expect(mockPrisma.category.findUnique).toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).toHaveBeenCalled();
      expect(mockPrisma.score.create).toHaveBeenCalled();
      expect(result).toEqual(mockScore);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.submitScore(scoreData, 'user-1', tenantId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when user is not a judge', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', judge: null });

      await expect(service.submitScore(scoreData, 'user-1', tenantId)).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError when judge not assigned to category', async () => {
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockJudgeUser, role: 'JUDGE' });

      await expect(service.submitScore(scoreData, 'user-1', tenantId)).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to submit without assignment', async () => {
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockJudgeUser, role: 'ADMIN' });

      const result = await service.submitScore(scoreData, 'user-1', tenantId);

      expect(result).toEqual(mockScore);
    });

    it('should throw ConflictError when score already exists', async () => {
      const error = new Error('Unique constraint violation');
      (error as any).code = 'P2002';
      (mockPrisma.score.create as jest.Mock).mockRejectedValue(error);

      await expect(service.submitScore(scoreData, 'user-1', tenantId)).rejects.toThrow(ConflictError);
    });
  });

  describe('updateScore', () => {
    const updateData: UpdateScoreDTO = { score: 90, comments: 'Updated' };

    it('should update a score successfully', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue({ ...mockScore, score: 90 });

      const result = await service.updateScore('score-1', updateData, tenantId);

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockPrisma.score.update).toHaveBeenCalled();
      expect(result.score).toBe(90);
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.updateScore('nonexistent', updateData, tenantId)).rejects.toThrow(NotFoundError);
    });

    it('should handle partial updates', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(mockScore);

      const result = await service.updateScore('score-1', { score: 95 }, tenantId);

      expect(result).toBeDefined();
    });
  });

  describe('deleteScore', () => {
    it('should delete a score successfully', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      mockScoreRepository.delete.mockResolvedValue(undefined);

      await service.deleteScore('score-1', tenantId);

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockScoreRepository.delete).toHaveBeenCalledWith('score-1');
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.deleteScore('nonexistent', tenantId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('certifyScore', () => {
    it('should certify a score successfully', async () => {
      const certifiedScore = { ...mockScore, certifiedAt: new Date(), certifiedBy: 'admin-1' };
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(certifiedScore);

      const result = await service.certifyScore('score-1', 'admin-1', tenantId);

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockPrisma.score.update).toHaveBeenCalled();
      expect(result.certifiedBy).toBe('admin-1');
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.certifyScore('nonexistent', 'admin-1', tenantId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('certifyScores', () => {
    it('should certify all uncertified scores for a category', async () => {
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.certifyScores('category-1', 'admin-1', tenantId);

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          tenantId: tenantId,
          certifiedAt: null
        },
        data: expect.objectContaining({
          certifiedAt: expect.any(Date),
          certifiedBy: 'admin-1'
        })
      });
      expect(result.certified).toBe(true);
      expect(result.certifiedCount).toBe(5);
    });

    it('should return false with zero count when no uncertified scores exist', async () => {
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.certifyScores('category-1', 'admin-1', tenantId);

      expect(result.certified).toBe(false);
      expect(result.certifiedCount).toBe(0);
    });
  });

  describe('unsignScore', () => {
    it('should unsign a score successfully', async () => {
      const unsignedScore = { ...mockScore, certifiedAt: null, certifiedBy: null };
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(unsignedScore);

      const result = await service.unsignScore('score-1', tenantId);

      expect(mockPrisma.score.update).toHaveBeenCalled();
      expect(result.certifiedAt).toBeNull();
      expect(result.certifiedBy).toBeNull();
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.unsignScore('nonexistent', tenantId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getScoresByJudge', () => {
    it('should return scores for a judge', async () => {
      mockScoreRepository.findByJudge.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByJudge('judge-1', tenantId);

      expect(mockScoreRepository.findByJudge).toHaveBeenCalledWith('judge-1', tenantId);
      expect(result).toEqual([mockScore]);
    });
  });

  describe('getScoresByContestant', () => {
    it('should return scores for a contestant', async () => {
      mockScoreRepository.findByContestant.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByContestant('contestant-1', tenantId);

      expect(mockScoreRepository.findByContestant).toHaveBeenCalledWith('contestant-1', tenantId);
      expect(result).toEqual([mockScore]);
    });
  });

  describe('getScoresByContest', () => {
    it('should return scores for a contest', async () => {
      mockScoreRepository.findByContest.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByContest('contest-1', tenantId);

      expect(mockScoreRepository.findByContest).toHaveBeenCalledWith('contest-1', tenantId);
      expect(result).toEqual([mockScore]);
    });
  });

  describe('getContestStats', () => {
    it('should return contest score statistics', async () => {
      const stats = {
        totalScores: 100,
        averageScore: 82.5,
        highestScore: 98,
        lowestScore: 65
      };
      mockScoreRepository.getContestScoreStats.mockResolvedValue(stats);

      const result = await service.getContestStats('contest-1', tenantId);

      expect(mockScoreRepository.getContestScoreStats).toHaveBeenCalledWith('contest-1', tenantId);
      expect(result).toEqual(stats);
    });
  });

  // ============================================================
  // OLYMPIC SCORING TESTS
  // ============================================================

  describe('Olympic Scoring', () => {
    describe('calculateAverageScore with STRAIGHT scoring', () => {
      beforeEach(() => {
        // Mock category hierarchy for STRAIGHT scoring (all null, falls back to tenant)
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: ScoringType.STRAIGHT
        });
      });

      it('should calculate straight average with 3 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // (8.5 + 9.0 + 7.5) / 3 = 8.333...
        expect(result).toBeCloseTo(8.333, 2);
      });

      it('should calculate straight average with 5 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 },
          { score: 8.8 },
          { score: 9.2 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // (8.5 + 9.0 + 7.5 + 8.8 + 9.2) / 5 = 8.6
        expect(result).toBe(8.6);
      });

      it('should return 0 when no scores exist', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        expect(result).toBe(0);
      });

      it('should handle single score', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([{ score: 9.5 }]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        expect(result).toBe(9.5);
      });
    });

    describe('calculateAverageScore with OLYMPIC scoring', () => {
      beforeEach(() => {
        // Mock category hierarchy for OLYMPIC scoring at contest level
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
          ...mockCategory,
          contest: {
            ...mockCategory.contest,
            scoringType: ScoringType.OLYMPIC
          }
        });
      });

      it('should calculate Olympic average with exactly 3 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Drop 7.5 (low) and 9.0 (high), average remaining: 8.5 / 1 = 8.5
        expect(result).toBe(8.5);
      });

      it('should calculate Olympic average with 5 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 },
          { score: 8.8 },
          { score: 9.2 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Sorted: [7.5, 8.5, 8.8, 9.0, 9.2]
        // Drop 7.5 (low) and 9.2 (high)
        // Average remaining: (8.5 + 8.8 + 9.0) / 3 = 8.766...
        expect(result).toBeCloseTo(8.767, 2);
      });

      it('should calculate Olympic average with 7 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 9.0 },
          { score: 8.5 },
          { score: 9.5 },
          { score: 8.0 },
          { score: 9.2 },
          { score: 8.8 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Sorted: [7.5, 8.0, 8.5, 8.8, 9.0, 9.2, 9.5]
        // Drop 7.5 (low) and 9.5 (high)
        // Average remaining: (8.0 + 8.5 + 8.8 + 9.0 + 9.2) / 5 = 8.7
        expect(result).toBe(8.7);
      });

      it('should throw ValidationError with fewer than 3 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 }
        ]);

        await expect(
          service.calculateAverageScore('contestant-1', 'category-1', tenantId)
        ).rejects.toThrow(ValidationError);

        await expect(
          service.calculateAverageScore('contestant-1', 'category-1', tenantId)
        ).rejects.toThrow('Olympic scoring requires at least 3 judges');
      });

      it('should throw ValidationError with only 1 score', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([{ score: 9.0 }]);

        await expect(
          service.calculateAverageScore('contestant-1', 'category-1', tenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should return 0 when no scores exist (before validation)', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        expect(result).toBe(0);
      });
    });

    describe('calculateAverageScoreWithMetadata', () => {
      it('should return metadata for STRAIGHT scoring', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: ScoringType.STRAIGHT
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScoreWithMetadata('contestant-1', 'category-1', tenantId);

        expect(result.scoringType).toBe(ScoringType.STRAIGHT);
        expect(result.average).toBeCloseTo(8.333, 2);
        expect(result.allScores).toEqual([8.5, 9.0, 7.5]);
        expect(result.droppedHigh).toBeUndefined();
        expect(result.droppedLow).toBeUndefined();
      });

      it('should return metadata for OLYMPIC scoring with dropped scores', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
          ...mockCategory,
          contest: {
            ...mockCategory.contest,
            scoringType: ScoringType.OLYMPIC
          }
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 },
          { score: 8.8 },
          { score: 9.2 }
        ]);

        const result = await service.calculateAverageScoreWithMetadata('contestant-1', 'category-1', tenantId);

        expect(result.scoringType).toBe(ScoringType.OLYMPIC);
        expect(result.average).toBeCloseTo(8.767, 2);
        expect(result.allScores).toEqual([8.5, 9.0, 7.5, 8.8, 9.2]);
        expect(result.droppedHigh).toBe(9.2);
        expect(result.droppedLow).toBe(7.5);
      });

      it('should return empty result when no scores exist', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: ScoringType.STRAIGHT
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([]);

        const result = await service.calculateAverageScoreWithMetadata('contestant-1', 'category-1', tenantId);

        expect(result.average).toBe(0);
        expect(result.allScores).toEqual([]);
        expect(result.scoringType).toBe(ScoringType.STRAIGHT);
      });
    });

    describe('Scoring type hierarchy (Contest > Event > Tenant)', () => {
      it('should use Contest scoringType when set', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
          ...mockCategory,
          contest: {
            ...mockCategory.contest,
            scoringType: ScoringType.OLYMPIC,
            event: {
              ...mockCategory.contest.event,
              scoringType: ScoringType.STRAIGHT // Should be ignored
            }
          }
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Should use Olympic scoring (contest level)
        expect(result).toBe(8.5); // Olympic: drops 7.5 and 9.0, averages 8.5
      });

      it('should use Event scoringType when Contest is null', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
          ...mockCategory,
          contest: {
            ...mockCategory.contest,
            scoringType: null,
            event: {
              ...mockCategory.contest.event,
              scoringType: ScoringType.OLYMPIC
            }
          }
        });

        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: ScoringType.STRAIGHT // Should be ignored
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Should use Olympic scoring (event level)
        expect(result).toBe(8.5);
      });

      it('should use Tenant scoringType when Contest and Event are null', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory); // Both null
        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: ScoringType.OLYMPIC
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Should use Olympic scoring (tenant level)
        expect(result).toBe(8.5);
      });

      it('should default to STRAIGHT when all levels are null', async () => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
        (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({
          id: tenantId,
          scoringType: null
        });

        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Should use STRAIGHT (default)
        expect(result).toBeCloseTo(8.333, 2);
      });
    });

    describe('Edge cases for Olympic scoring', () => {
      beforeEach(() => {
        (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue({
          ...mockCategory,
          contest: {
            ...mockCategory.contest,
            scoringType: ScoringType.OLYMPIC
          }
        });
      });

      it('should handle all identical scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 9.0 },
          { score: 9.0 },
          { score: 9.0 },
          { score: 9.0 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Drops two 9.0s, averages remaining two 9.0s = 9.0
        expect(result).toBe(9.0);
      });

      it('should handle perfect scores (10.0)', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 10.0 },
          { score: 10.0 },
          { score: 9.8 },
          { score: 10.0 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Drops 9.8 (low) and 10.0 (high), averages [10.0, 10.0] = 10.0
        expect(result).toBe(10.0);
      });

      it('should handle very low scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 1.0 },
          { score: 2.0 },
          { score: 1.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // Drops 1.0 (low) and 2.0 (high), average [1.5] = 1.5
        expect(result).toBe(1.5);
      });

      it('should filter out null scores before Olympic calculation', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: null },  // Should be filtered
          { score: 9.0 },
          { score: 7.5 }
        ]);

        const result = await service.calculateAverageScore('contestant-1', 'category-1', tenantId);

        // After filtering nulls: [8.5, 9.0, 7.5]
        // Drops 7.5 and 9.0, average [8.5] = 8.5
        expect(result).toBe(8.5);
      });

      it('should throw error if null filtering leaves fewer than 3 scores', async () => {
        (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([
          { score: 8.5 },
          { score: null },
          { score: null },
          { score: 9.0 }
        ]);

        await expect(
          service.calculateAverageScore('contestant-1', 'category-1', tenantId)
        ).rejects.toThrow('Olympic scoring requires at least 3 judges');
      });
    });
  });
});
