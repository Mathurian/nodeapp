/**
 * JudgeController Unit Tests
 * Comprehensive test coverage for JudgeController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { JudgeController } from '../../../src/controllers/judgeController';
import { JudgeService } from '../../../src/services/JudgeService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/JudgeService');

describe('JudgeController', () => {
  let controller: JudgeController;
  let mockJudgeService: jest.Mocked<JudgeService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    });

    // Create mock service
    mockJudgeService = {
      getStats: jest.fn(),
      getAssignments: jest.fn(),
      updateAssignmentStatus: jest.fn(),
      getScoringInterface: jest.fn(),
      submitScore: jest.fn(),
      getCertificationWorkflow: jest.fn(),
      getContestantBios: jest.fn(),
      getContestantBio: jest.fn(),
      getJudgeHistory: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockJudgeService);

    controller = new JudgeController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'judge-1', role: 'JUDGE' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getStats', () => {
    it('should return judge dashboard statistics', async () => {
      const mockStats = {
        totalAssignments: 15,
        completedAssignments: 10,
        pendingAssignments: 5,
        totalScoresSubmitted: 120,
        certifiedCategories: 8,
      };

      mockJudgeService.getStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getStats).toHaveBeenCalledWith('judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockJudgeService.getStats.mockRejectedValue(error);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAssignments', () => {
    it('should return judge assignments', async () => {
      const mockAssignments = [
        {
          id: 'assign-1',
          judgeId: 'judge-1',
          categoryId: 'cat-1',
          category: { name: 'Vocal Performance', event: { name: 'Music Contest' } },
          status: 'PENDING',
        },
        {
          id: 'assign-2',
          judgeId: 'judge-1',
          categoryId: 'cat-2',
          category: { name: 'Dance', event: { name: 'Talent Show' } },
          status: 'COMPLETED',
        },
      ];

      mockJudgeService.getAssignments.mockResolvedValue(mockAssignments as any);

      await controller.getAssignments(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getAssignments).toHaveBeenCalledWith('judge-1', 'JUDGE');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockAssignments);
    });

    it('should pass correct role to service', async () => {
      mockReq.user = { id: 'judge-2', role: 'HEAD_JUDGE' };
      mockJudgeService.getAssignments.mockResolvedValue([]);

      await controller.getAssignments(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getAssignments).toHaveBeenCalledWith('judge-2', 'HEAD_JUDGE');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockJudgeService.getAssignments.mockRejectedValue(error);

      await controller.getAssignments(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateAssignmentStatus', () => {
    it('should update assignment status successfully', async () => {
      const mockAssignment = {
        id: 'assign-1',
        status: 'IN_PROGRESS',
        updatedAt: new Date(),
      };

      mockReq.params = { id: 'assign-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      mockJudgeService.updateAssignmentStatus.mockResolvedValue(mockAssignment as any);

      await controller.updateAssignmentStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.updateAssignmentStatus).toHaveBeenCalledWith(
        'assign-1',
        'IN_PROGRESS',
        'judge-1',
        'JUDGE'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockAssignment,
        'Assignment status updated'
      );
    });

    it('should return 400 when assignment ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = { status: 'IN_PROGRESS' };

      await controller.updateAssignmentStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Assignment ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.params = { id: 'assign-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      mockJudgeService.updateAssignmentStatus.mockRejectedValue(error);

      await controller.updateAssignmentStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getScoringInterface', () => {
    it('should return scoring interface data', async () => {
      const mockScoringData = {
        category: { id: 'cat-1', name: 'Vocal Performance' },
        contestants: [
          { id: 'cont-1', name: 'John Doe', order: 1 },
          { id: 'cont-2', name: 'Jane Smith', order: 2 },
        ],
        criteria: [
          { id: 'crit-1', name: 'Vocal Quality', weight: 40 },
          { id: 'crit-2', name: 'Stage Presence', weight: 30 },
        ],
        existingScores: [],
      };

      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getScoringInterface.mockResolvedValue(mockScoringData as any);

      await controller.getScoringInterface(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getScoringInterface).toHaveBeenCalledWith('cat-1', 'judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockScoringData);
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getScoringInterface(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getScoringInterface.mockRejectedValue(error);

      await controller.getScoringInterface(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('submitScore', () => {
    it('should submit score successfully', async () => {
      const scoreData = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        criterionId: 'crit-1',
        score: 95,
        comment: 'Excellent performance',
      };

      const mockScoreRecord = {
        id: 'score-1',
        ...scoreData,
        judgeId: 'judge-1',
        createdAt: new Date(),
      };

      mockReq.body = scoreData;
      mockJudgeService.submitScore.mockResolvedValue(mockScoreRecord as any);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.submitScore).toHaveBeenCalledWith(scoreData, 'judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockScoreRecord,
        'Score submitted successfully'
      );
    });

    it('should submit score without comment', async () => {
      const scoreData = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        criterionId: 'crit-1',
        score: 88,
      };

      mockReq.body = scoreData;
      mockJudgeService.submitScore.mockResolvedValue({ id: 'score-2' } as any);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.submitScore).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 88,
          comment: undefined,
        }),
        'judge-1'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Submission failed');
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        criterionId: 'crit-1',
        score: 95,
      };
      mockJudgeService.submitScore.mockRejectedValue(error);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCertificationWorkflow', () => {
    it('should return certification workflow data', async () => {
      const mockCertificationData = {
        category: { id: 'cat-1', name: 'Vocal Performance' },
        contestants: [
          { id: 'cont-1', name: 'John Doe', totalScore: 285, certified: false },
          { id: 'cont-2', name: 'Jane Smith', totalScore: 290, certified: true },
        ],
        judgeSignature: null,
        allScoresSubmitted: true,
        canCertify: true,
      };

      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getCertificationWorkflow.mockResolvedValue(mockCertificationData as any);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getCertificationWorkflow).toHaveBeenCalledWith('cat-1', 'judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCertificationData);
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getCertificationWorkflow.mockRejectedValue(error);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestantBios', () => {
    it('should return contestant bios for category', async () => {
      const mockContestants = [
        {
          id: 'cont-1',
          name: 'John Doe',
          age: 25,
          hometown: 'New York',
          bio: 'Aspiring vocalist',
          photo: '/photos/cont-1.jpg',
        },
        {
          id: 'cont-2',
          name: 'Jane Smith',
          age: 23,
          hometown: 'Los Angeles',
          bio: 'Professional singer',
          photo: '/photos/cont-2.jpg',
        },
      ];

      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getContestantBios.mockResolvedValue(mockContestants as any);

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getContestantBios).toHaveBeenCalledWith('cat-1', 'judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockContestants);
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockReq.params = { categoryId: 'cat-1' };
      mockJudgeService.getContestantBios.mockRejectedValue(error);

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestantBio', () => {
    it('should return single contestant bio', async () => {
      const mockContestant = {
        id: 'cont-1',
        name: 'John Doe',
        age: 25,
        hometown: 'New York',
        bio: 'Aspiring vocalist with 10 years of experience',
        photo: '/photos/cont-1.jpg',
        previousAwards: ['Best Newcomer 2023', 'Regional Champion 2024'],
      };

      mockReq.params = { contestantId: 'cont-1' };
      mockJudgeService.getContestantBio.mockResolvedValue(mockContestant as any);

      await controller.getContestantBio(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getContestantBio).toHaveBeenCalledWith('cont-1', 'judge-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockContestant);
    });

    it('should return 400 when contestant ID is missing', async () => {
      mockReq.params = {};

      await controller.getContestantBio(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contestant ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockReq.params = { contestantId: 'cont-1' };
      mockJudgeService.getContestantBio.mockRejectedValue(error);

      await controller.getContestantBio(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getJudgeHistory', () => {
    it('should return judge scoring history with filters', async () => {
      const mockHistory = {
        scores: [
          {
            id: 'score-1',
            categoryId: 'cat-1',
            contestantId: 'cont-1',
            score: 95,
            createdAt: new Date(),
          },
          {
            id: 'score-2',
            categoryId: 'cat-1',
            contestantId: 'cont-2',
            score: 88,
            createdAt: new Date(),
          },
        ],
        total: 125,
        page: 1,
        limit: 50,
      };

      mockReq.query = {
        page: '1',
        limit: '50',
        categoryId: 'cat-1',
      };

      mockJudgeService.getJudgeHistory.mockResolvedValue(mockHistory as any);

      await controller.getJudgeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getJudgeHistory).toHaveBeenCalledWith('judge-1', {
        page: '1',
        limit: '50',
        categoryId: 'cat-1',
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockHistory);
    });

    it('should handle query without filters', async () => {
      mockReq.query = {};
      mockJudgeService.getJudgeHistory.mockResolvedValue({ scores: [], total: 0 } as any);

      await controller.getJudgeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockJudgeService.getJudgeHistory).toHaveBeenCalledWith('judge-1', {});
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockReq.query = {};
      mockJudgeService.getJudgeHistory.mockRejectedValue(error);

      await controller.getJudgeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
