/**
 * JudgeService Unit Tests
 * Comprehensive tests for judge operations
 */

import 'reflect-metadata';
import { JudgeService } from '../../../src/services/JudgeService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../src/services/BaseService';

describe('JudgeService', () => {
  let service: JudgeService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockUser = {
    id: 'user-1',
    name: 'Judge User',
    email: 'judge@test.com',
    judge: { id: 'judge-1', name: 'Test Judge' }
  };

  const mockAssignment = {
    id: 'assignment-1',
    judgeId: 'judge-1',
    categoryId: 'category-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    status: 'ACTIVE',
    assignedAt: new Date(),
    category: { id: 'category-1', name: 'Dance' },
    contest: { id: 'contest-1', name: 'Junior Contest' },
    event: { id: 'event-1', name: 'Annual Competition' },
    judge: {
      id: 'judge-1',
      users: [{ id: 'user-1', name: 'Judge User', preferredName: 'Judge', email: 'judge@test.com' }]
    }
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Dance',
    description: 'Dance category',
    scoreCap: 100,
    contest: {
      id: 'contest-1',
      name: 'Junior Contest',
      event: { id: 'event-1', name: 'Annual Competition' }
    }
  };

  const mockContestant = {
    id: 'contestant-1',
    name: 'Test Contestant',
    contestantNumber: 101,
    users: [{ id: 'user-2', name: 'Contestant User', preferredName: 'Test', email: 'contestant@test.com' }]
  };

  const mockCriterion = {
    id: 'criterion-1',
    categoryId: 'category-1',
    name: 'Technique',
    maxScore: 50
  };

  const mockScore = {
    id: 'score-1',
    judgeId: 'judge-1',
    categoryId: 'category-1',
    contestantId: 'contestant-1',
    criterionId: 'criterion-1',
    score: 45,
    comment: 'Good performance',
    createdAt: new Date()
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new JudgeService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(JudgeService);
    });
  });

  describe('getJudgeIdFromUser', () => {
    it('should return judge ID when user has linked judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getJudgeIdFromUser('user-1');

      expect(result).toBe('judge-1');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { judge: true }
      });
    });

    it('should return null when user has no linked judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      const result = await service.getJudgeIdFromUser('user-1');

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getJudgeIdFromUser('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return judge statistics', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(5)  // active
        .mockResolvedValueOnce(2); // completed
      mockPrisma.score.count.mockResolvedValue(50);

      const result = await service.getStats('user-1');

      expect(result).toEqual({
        totalAssignments: 10,
        pendingAssignments: 3,
        activeAssignments: 5,
        completedAssignments: 2,
        totalScores: 50
      });
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getStats('user-1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getAssignments', () => {
    it('should return judge-specific assignments for JUDGE role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findMany.mockResolvedValue([mockAssignment] as any);

      const result = await service.getAssignments('user-1', 'JUDGE');

      expect(result).toEqual([mockAssignment]);
      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { judgeId: 'judge-1' }
        })
      );
    });

    it('should return all assignments for ADMIN role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findMany.mockResolvedValue([mockAssignment] as any);

      const result = await service.getAssignments('user-1', 'ADMIN');

      expect(result).toEqual([mockAssignment]);
      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

    it('should return all assignments for ORGANIZER role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findMany.mockResolvedValue([mockAssignment] as any);

      const result = await service.getAssignments('user-1', 'ORGANIZER');

      expect(result).toEqual([mockAssignment]);
      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {}
        })
      );
    });

    it('should throw error when JUDGE user is not linked to judge record', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getAssignments('user-1', 'JUDGE')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('updateAssignmentStatus', () => {
    it('should update assignment status for ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.update.mockResolvedValue(mockAssignment as any);

      const result = await service.updateAssignmentStatus('assignment-1', 'COMPLETED', 'user-1', 'ADMIN');

      expect(result).toEqual(mockAssignment);
      expect(mockPrisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { status: 'COMPLETED' },
        include: expect.any(Object)
      });
    });

    it('should update assignment status for JUDGE who owns the assignment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findUnique.mockResolvedValue(mockAssignment as any);
      mockPrisma.assignment.update.mockResolvedValue(mockAssignment as any);

      const result = await service.updateAssignmentStatus('assignment-1', 'COMPLETED', 'user-1', 'JUDGE');

      expect(result).toEqual(mockAssignment);
      expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' }
      });
    });

    it('should throw error when JUDGE does not own the assignment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findUnique.mockResolvedValue({ ...mockAssignment, judgeId: 'other-judge' } as any);

      await expect(
        service.updateAssignmentStatus('assignment-1', 'COMPLETED', 'user-1', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when JUDGE user is not linked to judge record', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(
        service.updateAssignmentStatus('assignment-1', 'COMPLETED', 'user-1', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when assignment not found for JUDGE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAssignmentStatus('invalid-id', 'COMPLETED', 'user-1', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getScoringInterface', () => {
    it('should return scoring interface for assigned judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.criterion.findMany.mockResolvedValue([mockCriterion] as any);
      mockPrisma.categoryContestant.findMany.mockResolvedValue([{ contestant: mockContestant }] as any);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);

      const result = await service.getScoringInterface('category-1', 'user-1');

      expect(result.category).toBeDefined();
      expect(result.contest).toBeDefined();
      expect(result.criteria).toEqual([mockCriterion]);
      expect(result.contestants).toHaveLength(1);
      expect(result.scores).toEqual([mockScore]);
      expect(result.assignment).toBeDefined();
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getScoringInterface('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when judge is not assigned to category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.getScoringInterface('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when category not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getScoringInterface('invalid-id', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('submitScore', () => {
    const scoreData = {
      categoryId: 'category-1',
      contestantId: 'contestant-1',
      criterionId: 'criterion-1',
      score: 45,
      comment: 'Good performance'
    };

    it('should create new score when none exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.criterion.findUnique.mockResolvedValue(mockCriterion as any);
      mockPrisma.score.findFirst.mockResolvedValue(null);
      mockPrisma.score.create.mockResolvedValue(mockScore as any);

      const result = await service.submitScore(scoreData, 'user-1');

      expect(result).toEqual(mockScore);
      expect(mockPrisma.score.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            judgeId: 'judge-1',
            categoryId: 'category-1',
            contestantId: 'contestant-1',
            criterionId: 'criterion-1',
            score: 45,
            comment: 'Good performance'
          })
        })
      );
    });

    it('should update existing score', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.criterion.findUnique.mockResolvedValue(mockCriterion as any);
      mockPrisma.score.findFirst.mockResolvedValue(mockScore as any);
      mockPrisma.score.update.mockResolvedValue({ ...mockScore, score: 48 } as any);

      const result = await service.submitScore({ ...scoreData, score: 48 }, 'user-1');

      expect(result.score).toBe(48);
      expect(mockPrisma.score.update).toHaveBeenCalled();
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when judge is not assigned to category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when criterion not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.criterion.findUnique.mockResolvedValue(null);

      await expect(service.submitScore(scoreData, 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when score exceeds criterion max', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.criterion.findUnique.mockResolvedValue(mockCriterion as any);

      await expect(
        service.submitScore({ ...scoreData, score: 100 }, 'user-1')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when score is negative', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.criterion.findUnique.mockResolvedValue(mockCriterion as any);

      await expect(
        service.submitScore({ ...scoreData, score: -5 }, 'user-1')
      ).rejects.toThrow(ValidationError);
    });

    it('should allow submitting comment without score', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.score.findFirst.mockResolvedValue(null);
      mockPrisma.score.create.mockResolvedValue({ ...mockScore, score: null } as any);

      const result = await service.submitScore(
        { categoryId: 'category-1', contestantId: 'contestant-1', comment: 'Comment only' },
        'user-1'
      );

      expect(result.score).toBeNull();
      expect(mockPrisma.score.create).toHaveBeenCalled();
    });
  });

  describe('getCertificationWorkflow', () => {
    it('should return certification workflow for assigned judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      const result = await service.getCertificationWorkflow('category-1', 'user-1');

      expect(result.category).toEqual(mockCategory);
      expect(result.assignment).toEqual(mockAssignment);
      expect(result.certifications).toBeDefined();
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getCertificationWorkflow('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when judge is not assigned to category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.getCertificationWorkflow('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when category not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.getCertificationWorkflow('invalid-id', 'user-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getContestantBios', () => {
    it('should return contestant bios for assigned category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);
      mockPrisma.categoryContestant.findMany.mockResolvedValue([{ contestant: mockContestant }] as any);

      const result = await service.getContestantBios('category-1', 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockContestant);
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getContestantBios('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when judge is not assigned to category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.getContestantBios('category-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getContestantBio', () => {
    it('should return single contestant bio for assigned judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contestant.findUnique.mockResolvedValue(mockContestant as any);
      mockPrisma.categoryContestant.findFirst.mockResolvedValue({
        contestantId: 'contestant-1',
        categoryId: 'category-1',
        category: { id: 'category-1', name: 'Dance' }
      } as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(mockAssignment as any);

      const result = await service.getContestantBio('contestant-1', 'user-1');

      expect(result.id).toBe('contestant-1');
      expect(result.category).toBeDefined();
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getContestantBio('contestant-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });

    it('should throw error when contestant not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contestant.findUnique.mockResolvedValue(null);

      await expect(service.getContestantBio('invalid-id', 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when contestant has no category assignment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contestant.findUnique.mockResolvedValue(mockContestant as any);
      mockPrisma.categoryContestant.findFirst.mockResolvedValue(null);

      await expect(service.getContestantBio('contestant-1', 'user-1')).rejects.toThrow(NotFoundError);
    });

    it('should throw error when judge is not assigned to contestants category', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.contestant.findUnique.mockResolvedValue(mockContestant as any);
      mockPrisma.categoryContestant.findFirst.mockResolvedValue({
        contestantId: 'contestant-1',
        categoryId: 'category-1',
        category: { id: 'category-1', name: 'Dance' }
      } as any);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);

      await expect(service.getContestantBio('contestant-1', 'user-1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getJudgeHistory', () => {
    it('should return judge scoring history', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);
      mockPrisma.score.count.mockResolvedValue(1);

      const result = await service.getJudgeHistory('user-1', {});

      expect(result.scores).toEqual([mockScore]);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should apply pagination parameters', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);
      mockPrisma.score.count.mockResolvedValue(100);

      const result = await service.getJudgeHistory('user-1', { page: 2, limit: 25 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
      expect(result.pagination.pages).toBe(4);
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25
        })
      );
    });

    it('should filter by category ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);
      mockPrisma.score.count.mockResolvedValue(1);

      await service.getJudgeHistory('user-1', { categoryId: 'category-1' });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-1'
          })
        })
      );
    });

    it('should filter by event ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.score.findMany.mockResolvedValue([mockScore] as any);
      mockPrisma.score.count.mockResolvedValue(1);

      await service.getJudgeHistory('user-1', { eventId: 'event-1' });

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: {
              contest: {
                eventId: 'event-1'
              }
            }
          })
        })
      );
    });

    it('should throw error when user is not linked to judge', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, judge: null } as any);

      await expect(service.getJudgeHistory('user-1', {})).rejects.toThrow(ForbiddenError);
    });
  });
});
