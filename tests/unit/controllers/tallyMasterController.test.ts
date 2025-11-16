/**
 * TallyMasterController Unit Tests
 * Comprehensive test coverage for TallyMasterController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { TallyMasterController } from '../../../src/controllers/tallyMasterController';
import { TallyMasterService } from '../../../src/services/TallyMasterService';
import { createRequestLogger } from '../../../src/utils/logger';
import { container } from 'tsyringe';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/TallyMasterService');

describe('TallyMasterController', () => {
  let controller: TallyMasterController;
  let mockTallyMasterService: jest.Mocked<TallyMasterService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockLog: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    (createRequestLogger as jest.Mock).mockReturnValue(mockLog);

    // Create mock service
    mockTallyMasterService = {
      getStats: jest.fn(),
      getCertifications: jest.fn(),
      getCertificationQueue: jest.fn(),
      getPendingCertifications: jest.fn(),
      certifyTotals: jest.fn(),
      getScoreReview: jest.fn(),
      getBiasCheckingTools: jest.fn(),
      getTallyMasterHistory: jest.fn(),
      getScoreRemovalRequests: jest.fn(),
      getCategoryJudges: jest.fn(),
      getContestScoreReview: jest.fn(),
      getContestCertifications: jest.fn(),
    } as any;

    // Mock prisma
    mockPrisma = mockDeep<PrismaClient>();

    // Mock container
    (container.resolve as jest.Mock) = jest.fn((service) => {
      if (service === 'PrismaClient') return mockPrisma;
      return mockTallyMasterService;
    });

    controller = new TallyMasterController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'TALLY_MASTER' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getStats', () => {
    it('should return tally master dashboard statistics', async () => {
      const mockStats = {
        totalCertifications: 25,
        pendingCertifications: 5,
        completedToday: 10,
        categoriesInQueue: 8,
        activeCategoriesCount: 15,
      };

      mockTallyMasterService.getStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getStats).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockTallyMasterService.getStats.mockRejectedValue(error);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get tally master stats error', error);
    });
  });

  describe('getCertifications', () => {
    it('should return paginated certifications with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'cert-1', categoryId: 'cat-1', status: 'CERTIFIED' },
          { id: 'cert-2', categoryId: 'cat-2', status: 'CERTIFIED' },
        ],
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      };

      mockTallyMasterService.getCertifications.mockResolvedValue(mockResult as any);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getCertifications).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return paginated certifications with custom pagination', async () => {
      mockReq.query = { page: '3', limit: '50' };
      const mockResult = {
        data: [],
        page: 3,
        limit: 50,
        total: 100,
        hasMore: true,
      };

      mockTallyMasterService.getCertifications.mockResolvedValue(mockResult as any);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getCertifications).toHaveBeenCalledWith(3, 50);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockTallyMasterService.getCertifications.mockRejectedValue(error);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certifications error', error);
    });
  });

  describe('getCertificationQueue', () => {
    it('should return certification queue with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'cat-1', name: 'Vocal Performance', status: 'PENDING' },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockTallyMasterService.getCertificationQueue.mockResolvedValue(mockResult as any);

      await controller.getCertificationQueue(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getCertificationQueue).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle invalid pagination parameters', async () => {
      mockReq.query = { page: 'invalid', limit: 'bad' };
      const mockResult = {
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
      };

      mockTallyMasterService.getCertificationQueue.mockResolvedValue(mockResult as any);

      await controller.getCertificationQueue(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getCertificationQueue).toHaveBeenCalledWith(1, 20);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockTallyMasterService.getCertificationQueue.mockRejectedValue(error);

      await controller.getCertificationQueue(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certification queue error', error);
    });
  });

  describe('getPendingCertifications', () => {
    it('should return pending certifications', async () => {
      const mockResult = {
        data: [
          { id: 'cat-1', name: 'Dance', status: 'JUDGE_CERTIFIED' },
          { id: 'cat-2', name: 'Vocal', status: 'JUDGE_CERTIFIED' },
        ],
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      };

      mockTallyMasterService.getPendingCertifications.mockResolvedValue(mockResult as any);

      await controller.getPendingCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getPendingCertifications).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle custom pagination', async () => {
      mockReq.query = { page: '2', limit: '10' };
      const mockResult = {
        data: [],
        page: 2,
        limit: 10,
        total: 5,
        hasMore: false,
      };

      mockTallyMasterService.getPendingCertifications.mockResolvedValue(mockResult as any);

      await controller.getPendingCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getPendingCertifications).toHaveBeenCalledWith(2, 10);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockTallyMasterService.getPendingCertifications.mockRejectedValue(error);

      await controller.getPendingCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyTotals', () => {
    it('should certify totals successfully', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      const mockResult = {
        success: true,
        message: 'Category totals certified',
        certification: { id: 'cert-1', status: 'TALLY_CERTIFIED' },
      };

      mockTallyMasterService.certifyTotals.mockResolvedValue(mockResult as any);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.certifyTotals).toHaveBeenCalledWith(
        'cat-1',
        'user-1',
        'TALLY_MASTER'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockTallyMasterService.certifyTotals).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = { role: 'TALLY_MASTER' } as any;

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 when userRole is missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1' } as any;

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      const error = new Error('Certification failed');
      mockTallyMasterService.certifyTotals.mockRejectedValue(error);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Certify totals error', error);
    });
  });

  describe('getScoreReview', () => {
    it('should return score review for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockReview = {
        category: { id: 'cat-1', name: 'Vocal Performance' },
        contest: { id: 'contest-1', name: 'Spring Competition' },
        totalScores: [
          { contestantId: 'cont-1', totalScore: 95, rank: 1 },
        ],
      };

      mockTallyMasterService.getScoreReview.mockResolvedValue(mockReview as any);

      await controller.getScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getScoreReview).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockReview);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
      expect(mockTallyMasterService.getScoreReview).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Category not found');
      mockTallyMasterService.getScoreReview.mockRejectedValue(error);

      await controller.getScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get score review error', error);
    });
  });

  describe('getCertificationWorkflow', () => {
    it('should return certification workflow data', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockReview = {
        category: { id: 'cat-1', name: 'Vocal', scoreCap: 100 },
        contest: { id: 'contest-1', name: 'Spring' },
        totalScores: [{ contestantId: 'cont-1', totalScore: 95 }],
      };

      mockTallyMasterService.getScoreReview.mockResolvedValue(mockReview as any);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getScoreReview).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        category: mockReview.category,
        contest: mockReview.contest,
        certificationStatus: {
          totalsCertified: true,
          currentStep: 1,
          totalSteps: 2,
          canProceed: true,
          nextStep: 'CERTIFY_TOTALS',
        },
        totalScores: mockReview.totalScores,
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should handle category with no score cap', async () => {
      mockReq.params = { categoryId: 'cat-2' };
      const mockReview = {
        category: { id: 'cat-2', name: 'Dance', scoreCap: 0 },
        contest: { id: 'contest-1', name: 'Spring' },
        totalScores: [],
      };

      mockTallyMasterService.getScoreReview.mockResolvedValue(mockReview as any);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          certificationStatus: expect.objectContaining({
            totalsCertified: false,
          }),
        })
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Workflow error');
      mockTallyMasterService.getScoreReview.mockRejectedValue(error);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certification workflow error:', error);
    });
  });

  describe('getBiasCheckingTools', () => {
    it('should return bias checking tools', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockTools = {
        judgeScores: [
          { judgeId: 'judge-1', averageScore: 85, standardDeviation: 5.2 },
        ],
        biasIndicators: [
          { type: 'HIGH_SCORES', severity: 'WARNING' },
        ],
      };

      mockTallyMasterService.getBiasCheckingTools.mockResolvedValue(mockTools as any);

      await controller.getBiasCheckingTools(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getBiasCheckingTools).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockTools);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getBiasCheckingTools(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Analysis failed');
      mockTallyMasterService.getBiasCheckingTools.mockRejectedValue(error);

      await controller.getBiasCheckingTools(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get bias checking tools error', error);
    });
  });

  describe('getTallyMasterHistory', () => {
    it('should return paginated history with default pagination', async () => {
      const mockHistory = {
        data: [
          { id: 'hist-1', action: 'CERTIFIED_CATEGORY', timestamp: new Date() },
        ],
        page: 1,
        limit: 10,
        total: 1,
        hasMore: false,
      };

      mockTallyMasterService.getTallyMasterHistory.mockResolvedValue(mockHistory as any);

      await controller.getTallyMasterHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getTallyMasterHistory).toHaveBeenCalledWith(1, 10);
      expect(mockRes.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should handle custom pagination', async () => {
      mockReq.query = { page: '5', limit: '25' };
      const mockHistory = {
        data: [],
        page: 5,
        limit: 25,
        total: 100,
        hasMore: true,
      };

      mockTallyMasterService.getTallyMasterHistory.mockResolvedValue(mockHistory as any);

      await controller.getTallyMasterHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getTallyMasterHistory).toHaveBeenCalledWith(5, 25);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('History error');
      mockTallyMasterService.getTallyMasterHistory.mockRejectedValue(error);

      await controller.getTallyMasterHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('requestScoreRemoval', () => {
    it('should create score removal request for single category', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        judgeId: 'judge-1',
        reason: 'Scoring irregularity detected',
      };

      const mockRequest = {
        id: 'req-1',
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        judgeId: 'judge-1',
        reason: 'Scoring irregularity detected',
        status: 'PENDING',
      };

      mockPrisma.judgeScoreRemovalRequest.create.mockResolvedValue(mockRequest as any);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judgeScoreRemovalRequest.create).toHaveBeenCalledWith({
        data: {
          categoryId: 'cat-1',
          contestantId: 'cont-1',
          judgeId: 'judge-1',
          reason: 'Scoring irregularity detected',
          status: 'PENDING',
        },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Score removal request created successfully',
        request: mockRequest,
      });
    });

    it('should create multiple requests for contest-level removal', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        judgeId: 'judge-1',
        contestantId: 'cont-1',
        reason: 'Judge conflict of interest',
      };

      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1' },
        { id: 'cat-2' },
      ] as any);

      const mockRequests = [
        { id: 'req-1', categoryId: 'cat-1' },
        { id: 'req-2', categoryId: 'cat-2' },
      ];

      mockPrisma.judgeScoreRemovalRequest.create
        .mockResolvedValueOnce(mockRequests[0] as any)
        .mockResolvedValueOnce(mockRequests[1] as any);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { contestId: 'contest-1' },
        select: { id: true },
      });
      expect(mockPrisma.judgeScoreRemovalRequest.create).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created 2 score removal request(s)',
        requests: mockRequests,
      });
    });

    it('should create requests for all contestants in contest when contestantId not provided', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        judgeId: 'judge-1',
        reason: 'Full contest removal',
      };

      mockPrisma.category.findMany.mockResolvedValue([
        { id: 'cat-1' },
      ] as any);

      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        { contestantId: 'cont-1' },
        { contestantId: 'cont-2' },
      ] as any);

      mockPrisma.judgeScoreRemovalRequest.create
        .mockResolvedValueOnce({ id: 'req-1' } as any)
        .mockResolvedValueOnce({ id: 'req-2' } as any);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.categoryContestant.findMany).toHaveBeenCalledWith({
        where: { categoryId: { in: ['cat-1'] } },
        select: { contestantId: true },
        distinct: ['contestantId'],
      });
      expect(mockPrisma.judgeScoreRemovalRequest.create).toHaveBeenCalledTimes(2);
    });

    it('should return 400 when judgeId is missing', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Judge ID is required' });
    });

    it('should return 400 when neither categoryId nor contestId provided', async () => {
      mockReq.body = {
        judgeId: 'judge-1',
        contestantId: 'cont-1',
      };

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Either categoryId or contestId is required',
      });
    });

    it('should return 404 when no categories found for contest', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        judgeId: 'judge-1',
      };

      mockPrisma.category.findMany.mockResolvedValue([]);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No categories found for this contest',
      });
    });

    it('should return 400 when contestantId missing for category-level request', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        judgeId: 'judge-1',
      };

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Contestant ID is required for category-level requests',
      });
    });

    it('should use default reason when not provided', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        judgeId: 'judge-1',
      };

      mockPrisma.judgeScoreRemovalRequest.create.mockResolvedValue({ id: 'req-1' } as any);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judgeScoreRemovalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Score removal requested',
          }),
        })
      );
    });

    it('should call next with error when prisma throws', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
        judgeId: 'judge-1',
      };

      const error = new Error('Database error');
      mockPrisma.judgeScoreRemovalRequest.create.mockRejectedValue(error);

      await controller.requestScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Request score removal error', error);
    });
  });

  describe('getScoreRemovalRequests', () => {
    it('should return paginated score removal requests without filters', async () => {
      const mockResult = {
        data: [
          { id: 'req-1', status: 'PENDING', judgeId: 'judge-1' },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockTallyMasterService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getScoreRemovalRequests).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'APPROVED' };
      const mockResult = {
        data: [{ id: 'req-1', status: 'APPROVED' }],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockTallyMasterService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getScoreRemovalRequests).toHaveBeenCalledWith(
        1,
        20,
        'APPROVED',
        undefined,
        undefined
      );
    });

    it('should filter by categoryId and contestId', async () => {
      mockReq.query = { categoryId: 'cat-1', contestId: 'contest-1' };
      const mockResult = {
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
      };

      mockTallyMasterService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getScoreRemovalRequests).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        'cat-1',
        'contest-1'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query failed');
      mockTallyMasterService.getScoreRemovalRequests.mockRejectedValue(error);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('approveScoreRemoval', () => {
    it('should return 501 not implemented', async () => {
      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Score removal approval to be implemented in ScoreRemovalService',
      });
    });
  });

  describe('rejectScoreRemoval', () => {
    it('should return 501 not implemented', async () => {
      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Score removal rejection to be implemented in ScoreRemovalService',
      });
    });
  });

  describe('getContestantScores', () => {
    it('should return 501 not implemented', async () => {
      await controller.getContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Get contestant scores to be implemented',
      });
    });
  });

  describe('getJudgeScores', () => {
    it('should return 501 not implemented', async () => {
      await controller.getJudgeScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Get judge scores to be implemented',
      });
    });
  });

  describe('getCategoryJudges', () => {
    it('should return judges for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockJudges = [
        { id: 'judge-1', name: 'Dr. Smith', expertise: 'Vocal' },
        { id: 'judge-2', name: 'Prof. Lee', expertise: 'Dance' },
      ];

      mockTallyMasterService.getCategoryJudges.mockResolvedValue(mockJudges as any);

      await controller.getCategoryJudges(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getCategoryJudges).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockJudges);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getCategoryJudges(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Query failed');
      mockTallyMasterService.getCategoryJudges.mockRejectedValue(error);

      await controller.getCategoryJudges(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeJudgeContestantScores', () => {
    it('should return 501 not implemented', async () => {
      await controller.removeJudgeContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Remove judge contestant scores to be implemented',
      });
    });
  });

  describe('getContestScoreReview', () => {
    it('should return contest score review', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const mockReview = {
        contest: { id: 'contest-1', name: 'Spring Competition' },
        categories: [
          { id: 'cat-1', name: 'Vocal', totalContestants: 10 },
          { id: 'cat-2', name: 'Dance', totalContestants: 8 },
        ],
        overallStats: {
          totalCategories: 2,
          totalContestants: 18,
          averageScore: 87.5,
        },
      };

      mockTallyMasterService.getContestScoreReview.mockResolvedValue(mockReview as any);

      await controller.getContestScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getContestScoreReview).toHaveBeenCalledWith('contest-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockReview);
    });

    it('should return 400 when contestId is missing', async () => {
      mockReq.params = {};

      await controller.getContestScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contest ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Contest not found');
      mockTallyMasterService.getContestScoreReview.mockRejectedValue(error);

      await controller.getContestScoreReview(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestCertifications', () => {
    it('should return contest certifications', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const mockCertifications = {
        contest: { id: 'contest-1', name: 'Spring Competition' },
        categoryCertifications: [
          { categoryId: 'cat-1', status: 'TALLY_CERTIFIED' },
          { categoryId: 'cat-2', status: 'JUDGE_CERTIFIED' },
        ],
        overallStatus: 'PARTIAL',
      };

      mockTallyMasterService.getContestCertifications.mockResolvedValue(mockCertifications as any);

      await controller.getContestCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTallyMasterService.getContestCertifications).toHaveBeenCalledWith('contest-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockCertifications);
    });

    it('should return 400 when contestId is missing', async () => {
      mockReq.params = {};

      await controller.getContestCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contest ID is required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Database error');
      mockTallyMasterService.getContestCertifications.mockRejectedValue(error);

      await controller.getContestCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get contest certifications error', error);
    });
  });
});
