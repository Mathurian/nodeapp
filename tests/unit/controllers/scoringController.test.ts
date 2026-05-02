/**
 * Scoring Controller Tests
 * Comprehensive test coverage for ScoringController endpoints
 * Tests core scoring, certification workflows, and deduction management
 */

import { Request, Response, NextFunction } from 'express';
import { ScoringController } from '../../../src/controllers/scoringController';
import { ScoringService } from '../../../src/services/ScoringService';
import { sendSuccess, sendCreated, sendNoContent, sendError, sendNotFound, sendBadRequest, sendUnauthorized, sendForbidden, errorResponse } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { createRequestLogger } from '../../../src/utils/logger';

// Mock the container - MUST be before importing the controller
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

// Mock dependencies
jest.mock('../../../src/services/ScoringService');
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/utils/certificationPipeline', () => ({
  applyCertificationStage: jest.fn().mockResolvedValue(undefined),
  refreshJudgeStage: jest.fn().mockResolvedValue(undefined),
  refreshRoleStages: jest.fn().mockResolvedValue({
    judgeCertified: true,
    tallyCertified: false,
    auditorCertified: false,
    boardApproved: false,
  }),
  upsertCategoryRoleCertification: jest.fn().mockResolvedValue({ id: 'cert-1', role: 'AUDITOR' }),
}));
jest.mock('../../../src/utils/requestValidation', () => ({
  requireAuthAndTenant: jest.fn(),
  requireAuthenticatedUser: jest.fn(),
  requireTenantContext: jest.fn(),
}));
jest.mock('../../../src/utils/pagination', () => ({
  parsePaginationQuery: jest.fn().mockReturnValue({ page: 1, limit: 50 }),
  getPaginationParams: jest.fn().mockReturnValue({ skip: 0, take: 50 }),
  createPaginatedResponse: jest.fn().mockImplementation((data, total, options) => ({
    data,
    pagination: { total, page: 1, limit: 50, totalPages: Math.ceil(total / 50) }
  })),
}));
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  createRequestLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { requireAuthAndTenant } from '../../../src/utils/requestValidation';
import { createPaginatedResponse } from '../../../src/utils/pagination';

describe('ScoringController', () => {
  let controller: ScoringController;
  let mockScoringService: jest.Mocked<ScoringService>;
  let mockContestantFilterService: any;
  let mockPrisma: any;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockScore = {
    id: 'score-1',
    categoryId: 'cat-1',
    contestantId: 'contestant-1',
    judgeId: 'judge-1',
    criteriaId: 'crit-1',
    score: 85,
    comments: 'Great performance',
    isCertified: false,
    createdAt: new Date(),
  };

  const mockScores = [mockScore, { ...mockScore, id: 'score-2', score: 90 }];

  beforeEach(() => {
    jest.clearAllMocks();

    mockScoringService = {
      getScoresByCategory: jest.fn(),
      submitScore: jest.fn(),
      updateScore: jest.fn(),
      deleteScore: jest.fn(),
      certifyScore: jest.fn(),
      certifyScores: jest.fn(),
      unsignScore: jest.fn(),
      getScoresByJudge: jest.fn(),
      getScoresByContestant: jest.fn(),
      getScoresByContest: jest.fn(),
      getContestStats: jest.fn(),
    } as any;

    mockContestantFilterService = {
      filterScoresByCategory: jest.fn(),
      areScoresVisible: jest.fn(),
      getScoreReleaseStatus: jest.fn(),
      filterScoresForContestant: jest.fn(),
    };

    mockPrisma = {
      category: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      contestant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      contest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      criterion: {
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      categoryCertification: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      deductionRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      deductionApproval: {
        create: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      overallDeduction: {
        upsert: jest.fn(),
      },
      judgeCertification: {
        upsert: jest.fn(),
      },
      score: {
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
      },
      $executeRawUnsafe: jest.fn(),
      $transaction: jest.fn(),
    };
    mockPrisma.$transaction.mockImplementation(async (callback: any) => callback(mockPrisma));

    const mockAuditLogService = {
      logFromRequest: jest.fn().mockResolvedValue(undefined),
      logEntityChange: jest.fn().mockResolvedValue(undefined),
    };

    (container.resolve as jest.Mock) = jest.fn((token: any) => {
      if (token === ScoringService || token === 'ScoringService') return mockScoringService;
      if (token === 'PrismaClient') return mockPrisma;
      if (token === 'ContestantScoreFilterService' || (token && token.name === 'ContestantScoreFilterService')) return mockContestantFilterService;
      if (token === 'AuditLogService' || (token && token.name === 'AuditLogService')) return mockAuditLogService;
      return mockScoringService;
    });

    controller = new ScoringController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
      method: 'POST',
      originalUrl: '/api/scoring/test',
      path: '/api/scoring/test',
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    (sendSuccess as jest.Mock).mockImplementation((res, data, msg, code) => res.status(code || 200).json({ success: true, data }));
    (sendCreated as jest.Mock).mockImplementation((res, data) => res.status(201).json({ success: true, data }));
    (sendNoContent as jest.Mock).mockImplementation((res) => res.status(204).send());
    (sendError as jest.Mock).mockImplementation((res, message, status) => res.status(status || 500).json({ success: false, error: message }));
    (sendNotFound as jest.Mock).mockImplementation((res, message) => res.status(404).json({ success: false, error: message }));
    (sendBadRequest as jest.Mock).mockImplementation((res, message) => res.status(400).json({ success: false, error: message }));
    (sendUnauthorized as jest.Mock).mockImplementation((res, message) => res.status(401).json({ success: false, error: message }));
    (sendForbidden as jest.Mock).mockImplementation((res, message) => res.status(403).json({ success: false, error: message }));
    (errorResponse as jest.Mock).mockImplementation((res, message, _code, status) => {
      if (status === 400) return (sendBadRequest as jest.Mock)(res, message);
      if (status === 404) return (sendNotFound as jest.Mock)(res, message);
      return (sendError as jest.Mock)(res, message, status);
    });
    const certificationPipeline = require('../../../src/utils/certificationPipeline');
    certificationPipeline.refreshRoleStages.mockResolvedValue({
      judgeCertified: true,
      tallyCertified: false,
      auditorCertified: false,
      boardApproved: false,
    });
    certificationPipeline.upsertCategoryRoleCertification.mockResolvedValue({ id: 'cert-1', role: 'TALLY_MASTER' });
    certificationPipeline.applyCertificationStage.mockResolvedValue(undefined);
    certificationPipeline.refreshJudgeStage.mockResolvedValue(undefined);

    // By default, requireAuthAndTenant passes
    (requireAuthAndTenant as unknown as jest.Mock).mockReturnValue(true);
  });

  describe('getScores', () => {
    it('should return scores for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockScoringService.getScoresByCategory.mockResolvedValue(mockScores as any);

      await controller.getScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getScoresByCategory).toHaveBeenCalledWith('cat-1', 'tenant-1', undefined, undefined);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockScores);
    });

    it('should return scores for specific contestant', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.query = { contestantId: 'contestant-1' };
      mockScoringService.getScoresByCategory.mockResolvedValue([mockScore] as any);

      await controller.getScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getScoresByCategory).toHaveBeenCalledWith('cat-1', 'tenant-1', 'contestant-1', undefined);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'cat-1' };
      mockScoringService.getScoresByCategory.mockRejectedValue(error);

      await controller.getScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('submitScore', () => {
    it('should submit score with valid data', async () => {
      mockReq.params = { categoryId: 'cat-1', contestantId: 'contestant-1' };
      mockReq.body = { criteriaId: 'crit-1', score: 85, comments: 'Good' };
      mockReq.user = { id: 'judge-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      mockScoringService.submitScore.mockResolvedValue(mockScore as any);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.submitScore).toHaveBeenCalledWith(
        {
          categoryId: 'cat-1',
          contestantId: 'contestant-1',
          criteriaId: 'crit-1',
          score: 85,
          comments: 'Good',
        },
        'judge-1',
        'tenant-1',
        expect.any(Number)
      );
      expect(sendCreated).toHaveBeenCalledWith(mockRes, mockScore);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1', contestantId: 'contestant-1' };
      mockReq.body = { criteriaId: 'crit-1', score: 85 };
      mockReq.user = undefined;
      // requireAuthAndTenant returns false when no user
      (requireAuthAndTenant as unknown as jest.Mock).mockReturnValue(false);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      // requireAuthAndTenant handles the response internally
      expect(mockScoringService.submitScore).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Validation error');
      mockReq.params = { categoryId: 'cat-1', contestantId: 'contestant-1' };
      mockReq.body = { criteriaId: 'crit-1', score: 85 };
      mockReq.user = { id: 'judge-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      mockScoringService.submitScore.mockRejectedValue(error);

      await controller.submitScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateScore', () => {
    it('should update score with valid data', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.body = { score: 90, comments: 'Excellent' };
      mockReq.user = { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' } as any;
      const updatedScore = { ...mockScore, score: 90, comments: 'Excellent' };

      mockPrisma.score.findFirst.mockResolvedValue(mockScore);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.score.findUnique.mockResolvedValue(updatedScore);

      await controller.updateScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'score-1',
            tenantId: 'tenant-1',
            isLocked: false,
            isCertified: false,
          }),
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, updatedScore);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { scoreId: 'score-1' };
      mockReq.body = { score: 90 };
      mockPrisma.score.findFirst.mockRejectedValue(error);

      await controller.updateScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteScore', () => {
    it('should delete score and return 204', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' } as any;
      // Controller first finds the score via prisma.score.findFirst
      mockPrisma.score.findFirst.mockResolvedValue(mockScore);
      // Then does atomic deleteMany
      mockPrisma.score.deleteMany.mockResolvedValue({ count: 1 });

      await controller.deleteScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'score-1', tenantId: 'tenant-1' }
        })
      );
      expect(mockPrisma.score.deleteMany).toHaveBeenCalled();
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Score is certified');
      mockReq.params = { scoreId: 'score-1' };
      mockPrisma.score.findFirst.mockRejectedValue(error);

      await controller.deleteScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyScore', () => {
    it('should certify score when authenticated', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      const certified = { ...mockScore, isCertified: true };
      mockScoringService.certifyScore.mockResolvedValue(certified as any);

      await controller.certifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.certifyScore).toHaveBeenCalledWith('score-1', 'user-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, certified);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = undefined;

      await controller.certifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      mockScoringService.certifyScore.mockRejectedValue(error);

      await controller.certifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyScores', () => {
    it('should certify all scores for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'John Doe' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      mockReq.body = { typedSignature: 'Tally Master' };
      const result = { certified: true, certifiedCount: 10, categoryId: 'cat-1' };
      mockScoringService.certifyScores.mockResolvedValue(result as any);

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.certifyScores).toHaveBeenCalledWith(
        'cat-1',
        'user-1',
        'tenant-1',
        { userRole: 'TALLY_MASTER', judgeId: null }
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, result);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Category not found');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      mockReq.body = { typedSignature: 'Tally Master' };
      mockScoringService.certifyScores.mockRejectedValue(error);

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('unsignScore', () => {
    it('should unsign score successfully', async () => {
      mockReq.params = { scoreId: 'score-1' };
      const unsigned = { ...mockScore, isCertified: false };
      mockScoringService.unsignScore.mockResolvedValue(unsigned as any);

      await controller.unsignScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.unsignScore).toHaveBeenCalledWith('score-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, unsigned);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Score not found');
      mockReq.params = { scoreId: 'score-1' };
      mockScoringService.unsignScore.mockRejectedValue(error);

      await controller.unsignScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getScoresByJudge', () => {
    it('should return scores by judge', async () => {
      mockReq.params = { judgeId: 'judge-1' };
      mockScoringService.getScoresByJudge.mockResolvedValue(mockScores as any);

      await controller.getScoresByJudge(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getScoresByJudge).toHaveBeenCalledWith('judge-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockScores);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Judge not found');
      mockReq.params = { judgeId: 'judge-1' };
      mockScoringService.getScoresByJudge.mockRejectedValue(error);

      await controller.getScoresByJudge(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getScoresByContestant', () => {
    it('should return scores by contestant', async () => {
      mockReq.params = { contestantId: 'contestant-1' };
      mockScoringService.getScoresByContestant.mockResolvedValue(mockScores as any);

      await controller.getScoresByContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getScoresByContestant).toHaveBeenCalledWith('contestant-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockScores);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contestant not found');
      mockReq.params = { contestantId: 'contestant-1' };
      mockScoringService.getScoresByContestant.mockRejectedValue(error);

      await controller.getScoresByContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getScoresByContest', () => {
    it('should return scores by contest', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockScoringService.getScoresByContest.mockResolvedValue(mockScores as any);

      await controller.getScoresByContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getScoresByContest).toHaveBeenCalledWith('contest-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockScores);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { contestId: 'contest-1' };
      mockScoringService.getScoresByContest.mockRejectedValue(error);

      await controller.getScoresByContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestStats', () => {
    it('should return contest statistics', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const stats = { totalScores: 100, averageScore: 85.5, completionRate: 0.95 };
      mockScoringService.getContestStats.mockResolvedValue(stats as any);

      await controller.getContestStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockScoringService.getContestStats).toHaveBeenCalledWith('contest-1', 'tenant-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, stats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { contestId: 'contest-1' };
      mockScoringService.getContestStats.mockRejectedValue(error);

      await controller.getContestStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategories', () => {
    it('should return categories for contest', async () => {
      mockReq.query = { contestId: 'contest-1' };
      const categories = [
        { id: 'cat-1', name: 'Singing', contest: { id: 'contest-1', name: 'Talent' } },
      ];
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue(categories);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            contestId: 'contest-1',
            deletedAt: null,
          }),
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, categories);
    });

    it('should return all categories when no filter provided', async () => {
      mockReq.query = {};
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([]);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            deletedAt: null,
          }),
        })
      );
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.query = { contestId: 'contest-1' };
      (mockPrisma.category.findMany as jest.Mock).mockRejectedValue(error);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyTotals', () => {
    it('should certify category totals as Tally Master', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'John Doe', comments: 'Verified' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      const category = { id: 'cat-1', name: 'Singing' };
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(category);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 404 when category not found', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'John Doe' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Category not found');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'John Doe' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('finalCertification', () => {
    it('should certify as Auditor when Tally Master has certified', async () => {
      const { refreshRoleStages } = require('../../../src/utils/certificationPipeline');
      refreshRoleStages.mockResolvedValueOnce({
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: false,
        boardApproved: false,
      });
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'Jane Doe' };
      mockReq.user = { id: 'user-2', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      const category = { id: 'cat-1', name: 'Singing' };
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(category);

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 400 when Tally Master has not certified', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'Jane Doe' };
      mockReq.user = { id: 'user-2', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      const category = { id: 'cat-1', name: 'Singing' };
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(category);
      (mockPrisma.categoryCertification.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(sendBadRequest).toHaveBeenCalledWith(mockRes, 'Tally Master must certify totals first');
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { signatureName: 'Jane Doe' };
      mockReq.user = { id: 'user-2', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('requestDeduction', () => {
    it('should create deduction request with valid data', async () => {
      mockReq.body = {
        contestantId: 'contestant-1',
        categoryId: 'cat-1',
        amount: 5,
        reason: 'Violation of rules',
      };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      const category = { id: 'cat-1', name: 'Singing' };
      const contestant = { id: 'contestant-1', name: 'John' };
      const deduction = {
        id: 'ded-1',
        contestantId: 'contestant-1',
        categoryId: 'cat-1',
        amount: 5,
        status: 'PENDING',
      };
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(category);
      (mockPrisma.contestant.findFirst as jest.Mock).mockResolvedValue(contestant);
      (mockPrisma.deductionRequest.create as jest.Mock).mockResolvedValue(deduction);

      await controller.requestDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contestantId: 'contestant-1',
            categoryId: 'cat-1',
            amount: 5,
            reason: 'Violation of rules',
            status: 'PENDING',
          }),
        })
      );
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.body = { contestantId: 'c1', categoryId: 'cat1', amount: 5, reason: 'test' };
      mockReq.user = undefined;

      await controller.requestDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { contestantId: 'c1', categoryId: 'cat1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;

      await controller.requestDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'contestantId, amount, and reason are required'
      );
    });

    it('should return 404 when category not found', async () => {
      mockReq.body = {
        contestantId: 'contestant-1',
        categoryId: 'cat-1',
        amount: 5,
        reason: 'test',
      };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.contestant.findFirst as jest.Mock).mockResolvedValue({ id: 'contestant-1' });

      await controller.requestDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Category not found');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.body = {
        contestantId: 'contestant-1',
        categoryId: 'cat-1',
        amount: 5,
        reason: 'test',
      };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      (mockPrisma.contestant.findFirst as jest.Mock).mockResolvedValue({ id: 'contestant-1' });
      (mockPrisma.category.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.requestDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('approveDeduction', () => {
    it('should approve deduction request', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.body = { isHeadJudge: true };
      mockReq.user = { id: 'user-1', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      const deduction = {
        id: 'ded-1',
        status: 'PENDING',
        tenantId: 'tenant-1',
        requestedById: 'initiator',
        categoryId: 'cat-1',
        contestantId: 'contestant-1',
        amount: 5,
        reason: 'Violation',
      };
      const updated = { ...deduction, status: 'APPROVED' };
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(deduction);
      (mockPrisma.deductionApproval.upsert as jest.Mock).mockResolvedValue({});
      (mockPrisma.deductionApproval.findMany as jest.Mock).mockResolvedValue([
        { approvedById: 'initiator' },
        { approvedById: 'user-1' },
        { approvedById: 'user-2' },
      ]);
      (mockPrisma.deductionRequest.update as jest.Mock).mockResolvedValue(updated);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionApproval.upsert).toHaveBeenCalled();
      expect(mockPrisma.deductionRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ded-1' },
          data: { status: 'APPROVED' },
        })
      );
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = undefined;

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 404 when deduction not found', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(null);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Deduction request not found');
    });

    it('should return 400 when deduction is already processed', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      const deduction = { id: 'ded-1', status: 'APPROVED', tenantId: 'tenant-1' };
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(deduction);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendBadRequest).toHaveBeenCalledWith(mockRes, 'Deduction request already approved');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'AUDITOR', tenantId: 'tenant-1' } as any;
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('rejectDeduction', () => {
    it('should reject deduction request', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      const deduction = { id: 'ded-1', status: 'PENDING', tenantId: 'tenant-1' };
      const updated = { ...deduction, status: 'REJECTED' };
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(deduction);
      (mockPrisma.deductionRequest.update as jest.Mock).mockResolvedValue(updated);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'REJECTED' },
        })
      );
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = undefined;

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 404 when deduction not found', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(null);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Deduction request not found');
    });

    it('should return 400 when deduction is already processed', async () => {
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      const deduction = { id: 'ded-1', status: 'REJECTED', tenantId: 'tenant-1' };
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockResolvedValue(deduction);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(sendBadRequest).toHaveBeenCalledWith(mockRes, 'Deduction request already rejected');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { deductionId: 'ded-1' };
      mockReq.user = { id: 'user-1', role: 'JUDGE', tenantId: 'tenant-1' } as any;
      (mockPrisma.deductionRequest.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDeductions', () => {
    it('should return all deductions', async () => {
      mockReq.query = {};
      const deductions = [{ id: 'ded-1', status: 'PENDING' }];
      (mockPrisma.deductionRequest.findMany as jest.Mock).mockResolvedValue(deductions);
      (mockPrisma.deductionRequest.count as jest.Mock).mockResolvedValue(1);

      await controller.getDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionRequest.findMany).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'APPROVED' };
      (mockPrisma.deductionRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.deductionRequest.count as jest.Mock).mockResolvedValue(0);

      await controller.getDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'APPROVED', tenantId: 'tenant-1' }),
        })
      );
    });

    it('should filter by categoryId and contestantId', async () => {
      mockReq.query = { categoryId: 'cat-1', contestantId: 'contestant-1' };
      (mockPrisma.deductionRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.deductionRequest.count as jest.Mock).mockResolvedValue(0);

      await controller.getDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.deductionRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            contestantId: 'contestant-1',
            tenantId: 'tenant-1',
          }),
        })
      );
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.query = {};
      (mockPrisma.deductionRequest.findMany as jest.Mock).mockRejectedValue(error);
      (mockPrisma.deductionRequest.count as jest.Mock).mockRejectedValue(error);

      await controller.getDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('certifyJudgeContestScores', () => {
    it('should certify all judge scores for contest', async () => {
      mockReq.body = { judgeId: 'judge-1', contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'judge-1' });
      (mockPrisma.contest.findFirst as jest.Mock).mockResolvedValue({ id: 'contest-1' });
      (mockPrisma.category.findMany as jest.Mock).mockResolvedValue([{ id: 'cat-1' }]);
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 10 });

      await controller.certifyJudgeContestScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            judgeId: 'judge-1',
            categoryId: { in: ['cat-1'] },
          }),
          data: expect.objectContaining({ isCertified: true }),
        })
      );
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.body = { judgeId: 'judge-1', contestId: 'contest-1' };
      mockReq.user = undefined;

      await controller.certifyJudgeContestScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { judgeId: 'judge-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;

      await controller.certifyJudgeContestScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendBadRequest).toHaveBeenCalledWith(mockRes, 'judgeId and contestId are required');
    });

    it('should return 404 when judge not found', async () => {
      mockReq.body = { judgeId: 'judge-1', contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      (mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.contest.findFirst as jest.Mock).mockResolvedValue({ id: 'contest-1' });

      await controller.certifyJudgeContestScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Judge not found');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.body = { judgeId: 'judge-1', contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER', tenantId: 'tenant-1' } as any;
      (mockPrisma.user.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.certifyJudgeContestScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('uncertifyCategory', () => {
    it('should uncertify category and all scores', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 'cat-1' });
      (mockPrisma.categoryCertification.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockPrisma.score.updateMany as jest.Mock).mockResolvedValue({ count: 15 });

      await controller.uncertifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1' },
      });
      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-1', isCertified: true },
          data: { isCertified: false, certifiedAt: null, certifiedBy: null },
        })
      );
      expect(sendSuccess).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.uncertifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'User not authenticated', 401);
    });

    it('should return 404 when category not found', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockResolvedValue(null);

      await controller.uncertifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Category not found');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' } as any;
      (mockPrisma.category.findFirst as jest.Mock).mockRejectedValue(error);

      await controller.uncertifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
