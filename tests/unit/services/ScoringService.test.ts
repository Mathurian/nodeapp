/**
 * ScoringService Unit Tests
 */

import 'reflect-metadata';
import { ScoringService, SubmitScoreDTO, UpdateScoreDTO } from '../../../src/services/ScoringService';
import { ScoreRepository } from '../../../src/repositories/ScoreRepository';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../../src/services/BaseService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ScoringService', () => {
  let service: ScoringService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockScoreRepository: jest.Mocked<ScoreRepository>;

  const mockCategory = {
    id: 'category-1',
    name: 'Talent',
    contestId: 'contest-1',
    contest: {
      id: 'contest-1',
      eventId: 'event-1',
      event: { id: 'event-1', name: 'Test Event' }
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
    contestant: { id: 'contestant-1', name: 'Contestant 1' },
    judge: { id: 'judge-1', name: 'Judge Test' },
    category: mockCategory
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

    service = new ScoringService(mockScoreRepository, mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getScoresByCategory', () => {
    it('should return scores for a category', async () => {
      mockScoreRepository.findByCategory.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByCategory('category-1');

      expect(mockScoreRepository.findByCategory).toHaveBeenCalledWith('category-1');
      expect(result).toEqual([mockScore]);
    });

    it('should return scores for specific contestant in category', async () => {
      (mockPrisma.score.findMany as jest.Mock).mockResolvedValue([mockScore]);

      const result = await service.getScoresByCategory('category-1', 'contestant-1');

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category-1', contestantId: 'contestant-1' },
        include: {
          contestant: true,
          judge: true,
          category: true
        },
        orderBy: { createdAt: 'desc' }
      });
      expect(result).toEqual([mockScore]);
    });

    it('should handle errors', async () => {
      mockScoreRepository.findByCategory.mockRejectedValue(new Error('Database error'));

      await expect(service.getScoresByCategory('category-1')).rejects.toThrow();
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
      const result = await service.submitScore(scoreData, 'user-1');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: {
          contest: {
            include: {
              event: true
            }
          }
        }
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { judge: true }
      });
      expect(mockPrisma.score.create).toHaveBeenCalled();
      expect(result).toEqual(mockScore);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when user is not a judge', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1', judge: null });

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ForbiddenError when judge not assigned to category', async () => {
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockJudgeUser, role: 'JUDGE' });

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to submit without assignment', async () => {
      (mockPrisma.assignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...mockJudgeUser, role: 'ADMIN' });

      const result = await service.submitScore(scoreData, 'user-1');

      expect(result).toEqual(mockScore);
    });

    it('should throw ConflictError when score already exists', async () => {
      (mockPrisma.score.findFirst as jest.Mock).mockResolvedValue(mockScore);

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(ConflictError);
    });
  });

  describe('updateScore', () => {
    const updateData: UpdateScoreDTO = { score: 90, comments: 'Updated' };

    it('should update a score successfully', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue({ ...mockScore, score: 90 });

      const result = await service.updateScore('score-1', updateData);

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockPrisma.score.update).toHaveBeenCalled();
      expect(result.score).toBe(90);
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.updateScore('nonexistent', updateData)).rejects.toThrow(NotFoundError);
    });

    it('should handle partial updates', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(mockScore);

      const result = await service.updateScore('score-1', { score: 95 });

      expect(result).toBeDefined();
    });
  });

  describe('deleteScore', () => {
    it('should delete a score successfully', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      mockScoreRepository.delete.mockResolvedValue(undefined);

      await service.deleteScore('score-1');

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockScoreRepository.delete).toHaveBeenCalledWith('score-1');
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.deleteScore('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('certifyScore', () => {
    it('should certify a score successfully', async () => {
      const certifiedScore = { ...mockScore, certifiedAt: new Date(), certifiedBy: 'admin-1' };
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(certifiedScore);

      const result = await service.certifyScore('score-1', 'admin-1');

      expect(mockScoreRepository.findById).toHaveBeenCalledWith('score-1');
      expect(mockPrisma.score.update).toHaveBeenCalledWith({
        where: { id: 'score-1' },
        data: expect.objectContaining({
          certifiedAt: expect.any(Date),
          certifiedBy: 'admin-1'
        }),
        include: expect.any(Object)
      });
      expect(result.certifiedBy).toBe('admin-1');
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.certifyScore('nonexistent', 'admin-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('certifyScores', () => {
    it('should certify all uncertified scores for a category', async () => {
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.certifyScores('category-1', 'admin-1');

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'category-1',
          certifiedAt: null
        },
        data: expect.objectContaining({
          certifiedAt: expect.any(Date),
          certifiedBy: 'admin-1'
        })
      });
      expect(result.certified).toBe(5);
    });

    it('should return zero when no uncertified scores exist', async () => {
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.certifyScores('category-1', 'admin-1');

      expect(result.certified).toBe(0);
    });
  });

  describe('unsignScore', () => {
    it('should unsign a score successfully', async () => {
      const unsignedScore = { ...mockScore, certifiedAt: null, certifiedBy: null };
      mockScoreRepository.findById.mockResolvedValue(mockScore as any);
      (mockPrisma.score.update as jest.Mock).mockResolvedValue(unsignedScore);

      const result = await service.unsignScore('score-1');

      expect(mockPrisma.score.update).toHaveBeenCalledWith({
        where: { id: 'score-1' },
        data: { certifiedAt: null, certifiedBy: null },
        include: expect.any(Object)
      });
      expect(result.certifiedAt).toBeNull();
      expect(result.certifiedBy).toBeNull();
    });

    it('should throw NotFoundError when score does not exist', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(service.unsignScore('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getScoresByJudge', () => {
    it('should return scores for a judge', async () => {
      mockScoreRepository.findByJudge.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByJudge('judge-1');

      expect(mockScoreRepository.findByJudge).toHaveBeenCalledWith('judge-1');
      expect(result).toEqual([mockScore]);
    });
  });

  describe('getScoresByContestant', () => {
    it('should return scores for a contestant', async () => {
      mockScoreRepository.findByContestant.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByContestant('contestant-1');

      expect(mockScoreRepository.findByContestant).toHaveBeenCalledWith('contestant-1');
      expect(result).toEqual([mockScore]);
    });
  });

  describe('getScoresByContest', () => {
    it('should return scores for a contest', async () => {
      mockScoreRepository.findByContest.mockResolvedValue([mockScore] as any);

      const result = await service.getScoresByContest('contest-1');

      expect(mockScoreRepository.findByContest).toHaveBeenCalledWith('contest-1');
      expect(result).toEqual([mockScore]);
    });
  });

  describe('calculateAverageScore', () => {
    it('should calculate average score for contestant in category', async () => {
      mockScoreRepository.getAverageScoreForContestantInCategory.mockResolvedValue(87.5);

      const result = await service.calculateAverageScore('contestant-1', 'category-1');

      expect(mockScoreRepository.getAverageScoreForContestantInCategory).toHaveBeenCalledWith(
        'contestant-1',
        'category-1'
      );
      expect(result).toBe(87.5);
    });

    it('should return zero when no scores exist', async () => {
      mockScoreRepository.getAverageScoreForContestantInCategory.mockResolvedValue(0);

      const result = await service.calculateAverageScore('contestant-1', 'category-1');

      expect(result).toBe(0);
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

      const result = await service.getContestStats('contest-1');

      expect(mockScoreRepository.getContestScoreStats).toHaveBeenCalledWith('contest-1');
      expect(result).toEqual(stats);
    });
  });
});
