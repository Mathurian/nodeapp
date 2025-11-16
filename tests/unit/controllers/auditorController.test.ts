/**
 * AuditorController Unit Tests
 * Comprehensive test coverage for AuditorController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { AuditorController } from '../../../src/controllers/auditorController';
import { AuditorService } from '../../../src/services/AuditorService';
import { createRequestLogger } from '../../../src/utils/logger';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/AuditorService');

describe('AuditorController', () => {
  let controller: AuditorController;
  let mockAuditorService: jest.Mocked<AuditorService>;
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
    mockAuditorService = {
      getStats: jest.fn(),
      getPendingAudits: jest.fn(),
      getCompletedAudits: jest.fn(),
      finalCertification: jest.fn(),
      rejectAudit: jest.fn(),
      getScoreVerification: jest.fn(),
      verifyScore: jest.fn(),
      getTallyMasterStatus: jest.fn(),
      getCertificationWorkflow: jest.fn(),
      generateSummaryReport: jest.fn(),
      getAuditHistory: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockAuditorService);

    controller = new AuditorController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'AUDITOR' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getStats', () => {
    it('should return auditor dashboard statistics', async () => {
      const mockStats = {
        totalAudits: 50,
        pendingAudits: 10,
        completedAudits: 40,
        auditedToday: 5,
        flaggedScores: 3,
      };

      mockAuditorService.getStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getStats).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockAuditorService.getStats.mockRejectedValue(error);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get auditor stats error', error);
    });
  });

  describe('getPendingAudits', () => {
    it('should return paginated pending audits with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'audit-1', categoryId: 'cat-1', status: 'TALLY_CERTIFIED' },
          { id: 'audit-2', categoryId: 'cat-2', status: 'TALLY_CERTIFIED' },
        ],
        page: 1,
        limit: 20,
        total: 2,
        hasMore: false,
      };

      mockAuditorService.getPendingAudits.mockResolvedValue(mockResult as any);

      await controller.getPendingAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getPendingAudits).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return paginated pending audits with custom pagination', async () => {
      mockReq.query = { page: '2', limit: '10' };
      const mockResult = {
        data: [],
        page: 2,
        limit: 10,
        total: 5,
        hasMore: false,
      };

      mockAuditorService.getPendingAudits.mockResolvedValue(mockResult as any);

      await controller.getPendingAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getPendingAudits).toHaveBeenCalledWith(2, 10);
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

      mockAuditorService.getPendingAudits.mockResolvedValue(mockResult as any);

      await controller.getPendingAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getPendingAudits).toHaveBeenCalledWith(1, 20);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockAuditorService.getPendingAudits.mockRejectedValue(error);

      await controller.getPendingAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get pending audits error', error);
    });
  });

  describe('getCompletedAudits', () => {
    it('should return paginated completed audits with default pagination', async () => {
      const mockResult = {
        data: [
          { id: 'audit-3', categoryId: 'cat-3', status: 'AUDITOR_CERTIFIED', completedAt: new Date() },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockAuditorService.getCompletedAudits.mockResolvedValue(mockResult as any);

      await controller.getCompletedAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getCompletedAudits).toHaveBeenCalledWith(1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return paginated completed audits with custom pagination', async () => {
      mockReq.query = { page: '3', limit: '50' };
      const mockResult = {
        data: [],
        page: 3,
        limit: 50,
        total: 100,
        hasMore: true,
      };

      mockAuditorService.getCompletedAudits.mockResolvedValue(mockResult as any);

      await controller.getCompletedAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getCompletedAudits).toHaveBeenCalledWith(3, 50);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query error');
      mockAuditorService.getCompletedAudits.mockRejectedValue(error);

      await controller.getCompletedAudits(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get completed audits error', error);
    });
  });

  describe('finalCertification', () => {
    it('should certify category successfully', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockResult = {
        success: true,
        message: 'Category certified by auditor',
        certification: { id: 'cert-1', status: 'AUDITOR_CERTIFIED' },
      };

      mockAuditorService.finalCertification.mockResolvedValue(mockResult as any);

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.finalCertification).toHaveBeenCalledWith('cat-1', 'user-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID and user required' });
      expect(mockAuditorService.finalCertification).not.toHaveBeenCalled();
    });

    it('should return 400 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID and user required' });
    });

    it('should return 400 when userId is missing', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = {} as any;

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID and user required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Certification failed');
      mockAuditorService.finalCertification.mockRejectedValue(error);

      await controller.finalCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Final certification error', error);
    });
  });

  describe('rejectAudit', () => {
    it('should reject audit successfully', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { reason: 'Discrepancies found in scores' };
      const mockResult = {
        success: true,
        message: 'Audit rejected',
        rejection: { id: 'reject-1', reason: 'Discrepancies found in scores' },
      };

      mockAuditorService.rejectAudit.mockResolvedValue(mockResult as any);

      await controller.rejectAudit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.rejectAudit).toHaveBeenCalledWith(
        'cat-1',
        'user-1',
        'Discrepancies found in scores'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should reject audit without reason', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = {};
      const mockResult = {
        success: true,
        message: 'Audit rejected',
      };

      mockAuditorService.rejectAudit.mockResolvedValue(mockResult as any);

      await controller.rejectAudit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.rejectAudit).toHaveBeenCalledWith('cat-1', 'user-1', undefined);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.rejectAudit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID and user required' });
    });

    it('should return 400 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.rejectAudit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID and user required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { reason: 'Test' };
      const error = new Error('Rejection failed');
      mockAuditorService.rejectAudit.mockRejectedValue(error);

      await controller.rejectAudit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Reject audit error', error);
    });
  });

  describe('getScoreVerification', () => {
    it('should return score verification data for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockVerification = {
        category: { id: 'cat-1', name: 'Vocal Performance' },
        scores: [
          { id: 'score-1', contestantId: 'cont-1', score: 95, verified: false },
        ],
        verificationStats: {
          total: 10,
          verified: 8,
          pending: 2,
        },
      };

      mockAuditorService.getScoreVerification.mockResolvedValue(mockVerification as any);

      await controller.getScoreVerification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getScoreVerification).toHaveBeenCalledWith('cat-1', undefined);
      expect(mockRes.json).toHaveBeenCalledWith(mockVerification);
    });

    it('should return score verification data for specific contestant', async () => {
      mockReq.params = { categoryId: 'cat-1', contestantId: 'cont-1' };
      const mockVerification = {
        category: { id: 'cat-1', name: 'Vocal' },
        contestant: { id: 'cont-1', name: 'John Doe' },
        scores: [
          { id: 'score-1', score: 95, judgeId: 'judge-1' },
        ],
      };

      mockAuditorService.getScoreVerification.mockResolvedValue(mockVerification as any);

      await controller.getScoreVerification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getScoreVerification).toHaveBeenCalledWith('cat-1', 'cont-1');
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getScoreVerification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Category not found');
      mockAuditorService.getScoreVerification.mockRejectedValue(error);

      await controller.getScoreVerification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get score verification error', error);
    });
  });

  describe('verifyScore', () => {
    it('should verify score successfully', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.body = {
        verified: true,
        comments: 'Score is correct',
        issues: [],
      };

      const mockResult = {
        success: true,
        message: 'Score verified',
        verification: { id: 'verify-1', scoreId: 'score-1', verified: true },
      };

      mockAuditorService.verifyScore.mockResolvedValue(mockResult as any);

      await controller.verifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.verifyScore).toHaveBeenCalledWith('score-1', 'user-1', {
        verified: true,
        comments: 'Score is correct',
        issues: [],
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should verify score with issues', async () => {
      mockReq.params = { scoreId: 'score-2' };
      mockReq.body = {
        verified: false,
        comments: 'Score discrepancy detected',
        issues: ['Total does not match', 'Missing criterion score'],
      };

      const mockResult = {
        success: true,
        message: 'Score verification recorded',
      };

      mockAuditorService.verifyScore.mockResolvedValue(mockResult as any);

      await controller.verifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.verifyScore).toHaveBeenCalledWith('score-2', 'user-1', {
        verified: false,
        comments: 'Score discrepancy detected',
        issues: ['Total does not match', 'Missing criterion score'],
      });
    });

    it('should return 400 when scoreId is missing', async () => {
      mockReq.params = {};

      await controller.verifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Score ID and user required' });
    });

    it('should return 400 when user is not authenticated', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = undefined;

      await controller.verifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Score ID and user required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.body = { verified: true };
      const error = new Error('Verification failed');
      mockAuditorService.verifyScore.mockRejectedValue(error);

      await controller.verifyScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Verify score error', error);
    });
  });

  describe('getTallyMasterStatus', () => {
    it('should return tally master status', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockStatus = {
        category: { id: 'cat-1', name: 'Vocal' },
        tallyMasterCertified: true,
        certifiedBy: { id: 'user-2', name: 'Tally Master User' },
        certifiedAt: new Date(),
        totalsCertified: true,
      };

      mockAuditorService.getTallyMasterStatus.mockResolvedValue(mockStatus as any);

      await controller.getTallyMasterStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getTallyMasterStatus).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockStatus);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getTallyMasterStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Status retrieval failed');
      mockAuditorService.getTallyMasterStatus.mockRejectedValue(error);

      await controller.getTallyMasterStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get tally master status error', error);
    });
  });

  describe('getCertificationWorkflow', () => {
    it('should return certification workflow', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockWorkflow = {
        category: { id: 'cat-1', name: 'Vocal' },
        steps: [
          { name: 'JUDGE_CERTIFIED', completed: true },
          { name: 'TALLY_CERTIFIED', completed: true },
          { name: 'AUDITOR_CERTIFIED', completed: false },
        ],
        currentStep: 'AUDITOR_REVIEW',
        canCertify: true,
      };

      mockAuditorService.getCertificationWorkflow.mockResolvedValue(mockWorkflow as any);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getCertificationWorkflow).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockWorkflow);
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Workflow error');
      mockAuditorService.getCertificationWorkflow.mockRejectedValue(error);

      await controller.getCertificationWorkflow(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certification workflow error', error);
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate summary report without details', async () => {
      mockReq.body = { categoryId: 'cat-1', includeDetails: false };
      const mockReport = {
        category: { id: 'cat-1', name: 'Vocal' },
        summary: {
          totalContestants: 10,
          totalScores: 100,
          verifiedScores: 98,
        },
      };

      mockAuditorService.generateSummaryReport.mockResolvedValue(mockReport as any);

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.generateSummaryReport).toHaveBeenCalledWith('cat-1', 'user-1', false);
      expect(mockRes.json).toHaveBeenCalledWith(mockReport);
    });

    it('should generate summary report with details', async () => {
      mockReq.body = { categoryId: 'cat-1', includeDetails: true };
      const mockReport = {
        category: { id: 'cat-1', name: 'Vocal' },
        summary: {
          totalContestants: 10,
          totalScores: 100,
        },
        details: [
          { contestantId: 'cont-1', scores: [] },
        ],
      };

      mockAuditorService.generateSummaryReport.mockResolvedValue(mockReport as any);

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.generateSummaryReport).toHaveBeenCalledWith('cat-1', 'user-1', true);
    });

    it('should handle includeDetails as string "true"', async () => {
      mockReq.body = { categoryId: 'cat-1', includeDetails: 'true' };
      const mockReport = { summary: {} };

      mockAuditorService.generateSummaryReport.mockResolvedValue(mockReport as any);

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.generateSummaryReport).toHaveBeenCalledWith('cat-1', 'user-1', true);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 when userId is missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = {} as any;

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      const error = new Error('Report generation failed');
      mockAuditorService.generateSummaryReport.mockRejectedValue(error);

      await controller.generateSummaryReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Generate summary report error', error);
    });
  });

  describe('getAuditHistory', () => {
    it('should return audit history without categoryId filter', async () => {
      const mockHistory = {
        data: [
          { id: 'hist-1', action: 'CERTIFIED', timestamp: new Date() },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockAuditorService.getAuditHistory.mockResolvedValue(mockHistory as any);

      await controller.getAuditHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getAuditHistory).toHaveBeenCalledWith(undefined, 1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should return audit history filtered by categoryId', async () => {
      mockReq.query = { categoryId: 'cat-1' };
      const mockHistory = {
        data: [
          { id: 'hist-1', categoryId: 'cat-1', action: 'CERTIFIED' },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockAuditorService.getAuditHistory.mockResolvedValue(mockHistory as any);

      await controller.getAuditHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getAuditHistory).toHaveBeenCalledWith('cat-1', 1, 20);
    });

    it('should handle custom pagination', async () => {
      mockReq.query = { categoryId: 'cat-1', page: '5', limit: '50' };
      const mockHistory = {
        data: [],
        page: 5,
        limit: 50,
        total: 200,
        hasMore: true,
      };

      mockAuditorService.getAuditHistory.mockResolvedValue(mockHistory as any);

      await controller.getAuditHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getAuditHistory).toHaveBeenCalledWith('cat-1', 5, 50);
    });

    it('should handle invalid pagination parameters', async () => {
      mockReq.query = { page: 'invalid', limit: 'bad' };
      const mockHistory = {
        data: [],
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
      };

      mockAuditorService.getAuditHistory.mockResolvedValue(mockHistory as any);

      await controller.getAuditHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAuditorService.getAuditHistory).toHaveBeenCalledWith(undefined, 1, 20);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('History retrieval failed');
      mockAuditorService.getAuditHistory.mockRejectedValue(error);

      await controller.getAuditHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get audit history error', error);
    });
  });
});
