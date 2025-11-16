/**
 * BoardController Unit Tests
 * Comprehensive test coverage for BoardController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { BoardController } from '../../../src/controllers/boardController';
import { BoardService } from '../../../src/services/BoardService';
import { createRequestLogger } from '../../../src/utils/logger';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/BoardService');

describe('BoardController', () => {
  let controller: BoardController;
  let mockBoardService: jest.Mocked<BoardService>;
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
      warn: jest.fn(),
      error: jest.fn(),
    };
    (createRequestLogger as jest.Mock).mockReturnValue(mockLog);

    // Create mock service
    mockBoardService = {
      getStats: jest.fn(),
      getCertifications: jest.fn(),
      approveCertification: jest.fn(),
      rejectCertification: jest.fn(),
      getCertificationStatus: jest.fn(),
      getEmceeScripts: jest.fn(),
      createEmceeScript: jest.fn(),
      updateEmceeScript: jest.fn(),
      deleteEmceeScript: jest.fn(),
      getScoreRemovalRequests: jest.fn(),
      approveScoreRemoval: jest.fn(),
      rejectScoreRemoval: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockBoardService);

    controller = new BoardController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'BOARD' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getStats', () => {
    it('should return board dashboard statistics', async () => {
      const mockStats = {
        pendingCertifications: 5,
        approvedCertifications: 20,
        rejectedCertifications: 2,
        totalEmceeScripts: 15,
        pendingScoreRemovals: 3,
      };

      mockBoardService.getStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getStats).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockBoardService.getStats.mockRejectedValue(error);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get board stats error', error);
    });
  });

  describe('getCertifications', () => {
    it('should return all certifications', async () => {
      const mockCertifications = [
        { id: 'cert-1', categoryId: 'cat-1', status: 'AUDITOR_CERTIFIED' },
        { id: 'cert-2', categoryId: 'cat-2', status: 'BOARD_APPROVED' },
      ];

      mockBoardService.getCertifications.mockResolvedValue(mockCertifications as any);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getCertifications).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockCertifications);
    });

    it('should handle empty certifications list', async () => {
      mockBoardService.getCertifications.mockResolvedValue([]);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockBoardService.getCertifications.mockRejectedValue(error);

      await controller.getCertifications(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certifications error', error);
    });
  });

  describe('approveCertification', () => {
    it('should approve certification successfully', async () => {
      mockReq.params = { id: 'cat-1' };
      const mockResult = {
        success: true,
        message: 'Certification approved by board',
        certification: { id: 'cert-1', status: 'BOARD_APPROVED' },
      };

      mockBoardService.approveCertification.mockResolvedValue(mockResult as any);

      await controller.approveCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.approveCertification).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.approveCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
      expect(mockBoardService.approveCertification).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'cat-1' };
      const error = new Error('Approval failed');
      mockBoardService.approveCertification.mockRejectedValue(error);

      await controller.approveCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Approve certification error', error);
    });
  });

  describe('rejectCertification', () => {
    it('should reject certification with reason', async () => {
      mockReq.params = { id: 'cat-1' };
      mockReq.body = { reason: 'Scores need verification' };
      const mockResult = {
        success: true,
        message: 'Certification rejected',
        rejection: { id: 'reject-1', reason: 'Scores need verification' },
      };

      mockBoardService.rejectCertification.mockResolvedValue(mockResult as any);

      await controller.rejectCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.rejectCertification).toHaveBeenCalledWith('cat-1', 'Scores need verification');
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should reject certification without reason', async () => {
      mockReq.params = { id: 'cat-1' };
      mockReq.body = {};
      const mockResult = {
        success: true,
        message: 'Certification rejected',
      };

      mockBoardService.rejectCertification.mockResolvedValue(mockResult as any);

      await controller.rejectCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.rejectCertification).toHaveBeenCalledWith('cat-1', undefined);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.rejectCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'cat-1' };
      mockReq.body = { reason: 'Test' };
      const error = new Error('Rejection failed');
      mockBoardService.rejectCertification.mockRejectedValue(error);

      await controller.rejectCertification(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Reject certification error', error);
    });
  });

  describe('getCertificationStatus', () => {
    it('should return certification status summary', async () => {
      const mockStatus = {
        total: 50,
        pending: 5,
        approved: 40,
        rejected: 5,
        byContest: [
          { contestId: 'contest-1', total: 10, approved: 8 },
        ],
      };

      mockBoardService.getCertificationStatus.mockResolvedValue(mockStatus as any);

      await controller.getCertificationStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getCertificationStatus).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockStatus);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Status error');
      mockBoardService.getCertificationStatus.mockRejectedValue(error);

      await controller.getCertificationStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get certification status error', error);
    });
  });

  describe('getEmceeScripts', () => {
    it('should return all emcee scripts', async () => {
      const mockScripts = [
        { id: 'script-1', title: 'Opening Script', type: 'OPENING' },
        { id: 'script-2', title: 'Closing Script', type: 'CLOSING' },
      ];

      mockBoardService.getEmceeScripts.mockResolvedValue(mockScripts as any);

      await controller.getEmceeScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getEmceeScripts).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockScripts);
    });

    it('should handle empty scripts list', async () => {
      mockBoardService.getEmceeScripts.mockResolvedValue([]);

      await controller.getEmceeScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query error');
      mockBoardService.getEmceeScripts.mockRejectedValue(error);

      await controller.getEmceeScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get emcee scripts error', error);
    });
  });

  describe('createEmceeScript', () => {
    it('should create emcee script successfully', async () => {
      mockReq.body = {
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        type: 'OPENING',
        eventId: 'event-1',
        order: 1,
        notes: 'First script',
      };

      const mockScript = {
        id: 'script-new',
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        type: 'OPENING',
        userId: 'user-1',
      };

      mockBoardService.createEmceeScript.mockResolvedValue(mockScript as any);

      await controller.createEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.createEmceeScript).toHaveBeenCalledWith({
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        type: 'OPENING',
        eventId: 'event-1',
        contestId: undefined,
        categoryId: undefined,
        order: 1,
        notes: 'First script',
        userId: 'user-1',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockScript);
    });

    it('should create script with all optional fields', async () => {
      mockReq.body = {
        title: 'Category Script',
        content: 'Introducing...',
        type: 'CATEGORY',
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'cat-1',
        order: 5,
        notes: 'Category introduction',
      };

      const mockScript = {
        id: 'script-2',
        title: 'Category Script',
      };

      mockBoardService.createEmceeScript.mockResolvedValue(mockScript as any);

      await controller.createEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.createEmceeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          contestId: 'contest-1',
          categoryId: 'cat-1',
        })
      );
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.body = { title: 'Test', content: 'Test' };
      mockReq.user = undefined;

      await controller.createEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockBoardService.createEmceeScript).not.toHaveBeenCalled();
    });

    it('should return 401 when userId is missing', async () => {
      mockReq.body = { title: 'Test', content: 'Test' };
      mockReq.user = {} as any;

      await controller.createEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { title: 'Test', content: 'Test' };
      const error = new Error('Creation failed');
      mockBoardService.createEmceeScript.mockRejectedValue(error);

      await controller.createEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Create emcee script error', error);
    });
  });

  describe('updateEmceeScript', () => {
    it('should update emcee script successfully', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = {
        title: 'Updated Title',
        content: 'Updated content',
        type: 'OPENING',
        order: 2,
        isActive: true,
      };

      const mockUpdatedScript = {
        id: 'script-1',
        title: 'Updated Title',
        content: 'Updated content',
      };

      mockBoardService.updateEmceeScript.mockResolvedValue(mockUpdatedScript as any);

      await controller.updateEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.updateEmceeScript).toHaveBeenCalledWith('script-1', {
        title: 'Updated Title',
        content: 'Updated content',
        type: 'OPENING',
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
        order: 2,
        notes: undefined,
        isActive: true,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedScript);
    });

    it('should handle partial updates', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = { title: 'New Title Only' };

      const mockUpdatedScript = {
        id: 'script-1',
        title: 'New Title Only',
      };

      mockBoardService.updateEmceeScript.mockResolvedValue(mockUpdatedScript as any);

      await controller.updateEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.updateEmceeScript).toHaveBeenCalledWith('script-1', {
        title: 'New Title Only',
        content: undefined,
        type: undefined,
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
        order: undefined,
        notes: undefined,
        isActive: undefined,
      });
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};
      mockReq.body = { title: 'Test' };

      await controller.updateEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = { title: 'Test' };
      const error = new Error('Update failed');
      mockBoardService.updateEmceeScript.mockRejectedValue(error);

      await controller.updateEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Update emcee script error', error);
    });
  });

  describe('deleteEmceeScript', () => {
    it('should delete emcee script successfully', async () => {
      mockReq.params = { id: 'script-1' };
      const mockResult = {
        success: true,
        message: 'Script deleted successfully',
      };

      mockBoardService.deleteEmceeScript.mockResolvedValue(mockResult as any);

      await controller.deleteEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.deleteEmceeScript).toHaveBeenCalledWith('script-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.deleteEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'script-1' };
      const error = new Error('Delete failed');
      mockBoardService.deleteEmceeScript.mockRejectedValue(error);

      await controller.deleteEmceeScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Delete emcee script error', error);
    });
  });

  describe('generateReport', () => {
    it('should return 501 not implemented', async () => {
      mockReq.body = { type: 'BOARD_SUMMARY' };

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(501);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Report generation to be implemented in ReportGenerationService',
      });
      expect(mockLog.warn).toHaveBeenCalledWith('Generate report - not fully implemented', { type: 'BOARD_SUMMARY' });
    });

    it('should handle exception and call next', async () => {
      mockReq.body = { type: 'TEST' };
      const error = new Error('Unexpected error');

      // Force an error by making status throw
      mockRes.status = jest.fn().mockImplementation(() => {
        throw error;
      });

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Generate report error', error);
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

      mockBoardService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getScoreRemovalRequests).toHaveBeenCalledWith(undefined, 1, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should return requests filtered by status', async () => {
      mockReq.query = { status: 'APPROVED' };
      const mockResult = {
        data: [
          { id: 'req-1', status: 'APPROVED' },
        ],
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      };

      mockBoardService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getScoreRemovalRequests).toHaveBeenCalledWith('APPROVED', 1, 20);
    });

    it('should handle custom pagination', async () => {
      mockReq.query = { status: 'PENDING', page: '3', limit: '50' };
      const mockResult = {
        data: [],
        page: 3,
        limit: 50,
        total: 100,
        hasMore: true,
      };

      mockBoardService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getScoreRemovalRequests).toHaveBeenCalledWith('PENDING', 3, 50);
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

      mockBoardService.getScoreRemovalRequests.mockResolvedValue(mockResult as any);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.getScoreRemovalRequests).toHaveBeenCalledWith(undefined, 1, 20);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query failed');
      mockBoardService.getScoreRemovalRequests.mockRejectedValue(error);

      await controller.getScoreRemovalRequests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get score removal requests error', error);
    });
  });

  describe('approveScoreRemoval', () => {
    it('should approve score removal successfully', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = { reason: 'Board approved removal due to conflict' };
      const mockResult = {
        success: true,
        message: 'Score removal approved',
        approval: { id: 'approval-1', status: 'APPROVED' },
      };

      mockBoardService.approveScoreRemoval.mockResolvedValue(mockResult as any);

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.approveScoreRemoval).toHaveBeenCalledWith(
        'req-1',
        'user-1',
        'Board approved removal due to conflict'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should approve score removal without reason', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = {};
      const mockResult = {
        success: true,
        message: 'Score removal approved',
      };

      mockBoardService.approveScoreRemoval.mockResolvedValue(mockResult as any);

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.approveScoreRemoval).toHaveBeenCalledWith('req-1', 'user-1', undefined);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should return 400 when user is not authenticated', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.user = undefined;

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should return 400 when userId is missing', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.user = {} as any;

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = { reason: 'Test' };
      const error = new Error('Approval failed');
      mockBoardService.approveScoreRemoval.mockRejectedValue(error);

      await controller.approveScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Approve score removal error', error);
    });
  });

  describe('rejectScoreRemoval', () => {
    it('should reject score removal successfully', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = { reason: 'Insufficient evidence' };
      const mockResult = {
        success: true,
        message: 'Score removal rejected',
        rejection: { id: 'reject-1', reason: 'Insufficient evidence' },
      };

      mockBoardService.rejectScoreRemoval.mockResolvedValue(mockResult as any);

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.rejectScoreRemoval).toHaveBeenCalledWith(
        'req-1',
        'user-1',
        'Insufficient evidence'
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it('should reject score removal without reason', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = {};
      const mockResult = {
        success: true,
        message: 'Score removal rejected',
      };

      mockBoardService.rejectScoreRemoval.mockResolvedValue(mockResult as any);

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockBoardService.rejectScoreRemoval).toHaveBeenCalledWith('req-1', 'user-1', undefined);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should return 400 when user is not authenticated', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.user = undefined;

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should return 400 when userId is missing', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.user = {} as any;

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Request ID and user required' });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'req-1' };
      mockReq.body = { reason: 'Test' };
      const error = new Error('Rejection failed');
      mockBoardService.rejectScoreRemoval.mockRejectedValue(error);

      await controller.rejectScoreRemoval(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Reject score removal error', error);
    });
  });
});
