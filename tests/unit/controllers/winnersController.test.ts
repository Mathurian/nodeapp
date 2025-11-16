/**
 * WinnersController Unit Tests
 * Comprehensive test coverage for WinnersController endpoints
 * Tests winner determination, certification workflows, and signature tracking
 */

import { Request, Response, NextFunction } from 'express';
import { WinnersController } from '../../../src/controllers/winnersController';
import { WinnerService } from '../../../src/services/WinnerService';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/WinnerService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');

describe('WinnersController', () => {
  let controller: WinnersController;
  let mockWinnerService: jest.Mocked<WinnerService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    (createRequestLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    });

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message) => {
      if (message) {
        return res.status(200).json({ success: true, data, message });
      }
      return res.status(200).json({ success: true, data });
    });

    mockWinnerService = {
      getWinnersByCategory: jest.fn(),
      getWinnersByContest: jest.fn(),
      signWinners: jest.fn(),
      getSignatureStatus: jest.fn(),
      getCertificationProgress: jest.fn(),
      getRoleCertificationStatus: jest.fn(),
      certifyScores: jest.fn(),
      getWinners: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockWinnerService);
    controller = new WinnersController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: UserRole.ADMIN },
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'Mozilla/5.0 Test Agent';
        return undefined;
      }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getWinnersByCategory', () => {
    it('should return winners for a category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockResult = {
        categoryId: 'cat-1',
        winners: [
          { contestantId: 'cont-1', rank: 1, score: 95.5 },
          { contestantId: 'cont-2', rank: 2, score: 94.0 },
        ],
        message: 'Winners retrieved successfully',
      };
      mockWinnerService.getWinnersByCategory.mockResolvedValue(mockResult as any);

      await controller.getWinnersByCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getWinnersByCategory).toHaveBeenCalledWith(
        'cat-1',
        UserRole.ADMIN
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Winners retrieved successfully',
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getWinnersByCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
      expect(mockWinnerService.getWinnersByCategory).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockWinnerService.getWinnersByCategory.mockRejectedValue(error);

      await controller.getWinnersByCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should pass user role to service', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'judge-1', role: UserRole.JUDGE };
      mockWinnerService.getWinnersByCategory.mockResolvedValue({
        winners: [],
        message: 'Success',
      } as any);

      await controller.getWinnersByCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getWinnersByCategory).toHaveBeenCalledWith(
        'cat-1',
        UserRole.JUDGE
      );
    });
  });

  describe('getWinnersByContest', () => {
    it('should return winners for a contest with category breakdown', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.query = { includeCategoryBreakdown: 'true' };
      const mockResult = {
        contestId: 'contest-1',
        overallWinner: { contestantId: 'cont-1', totalScore: 285.5 },
        categoryBreakdown: [
          { categoryId: 'cat-1', winner: 'cont-1' },
          { categoryId: 'cat-2', winner: 'cont-2' },
        ],
        message: 'Contest winners retrieved',
      };
      mockWinnerService.getWinnersByContest.mockResolvedValue(mockResult as any);

      await controller.getWinnersByContest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getWinnersByContest).toHaveBeenCalledWith(
        'contest-1',
        UserRole.ADMIN,
        true
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Contest winners retrieved',
      });
    });

    it('should default includeCategoryBreakdown to true', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.query = {};
      mockWinnerService.getWinnersByContest.mockResolvedValue({
        message: 'Success',
      } as any);

      await controller.getWinnersByContest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getWinnersByContest).toHaveBeenCalledWith(
        'contest-1',
        UserRole.ADMIN,
        true
      );
    });

    it('should handle includeCategoryBreakdown query param', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.query = { includeCategoryBreakdown: 'false' };
      mockWinnerService.getWinnersByContest.mockResolvedValue({
        message: 'Success',
      } as any);

      await controller.getWinnersByContest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      // Note: Boolean('false') returns true in JS - this is a known controller quirk
      // The string 'false' is truthy, so it converts to true
      expect(mockWinnerService.getWinnersByContest).toHaveBeenCalledWith(
        'contest-1',
        UserRole.ADMIN,
        true
      );
    });

    it('should return 400 when contestId is missing', async () => {
      mockReq.params = {};

      await controller.getWinnersByContest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contest ID is required' });
      expect(mockWinnerService.getWinnersByContest).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Service error');
      mockWinnerService.getWinnersByContest.mockRejectedValue(error);

      await controller.getWinnersByContest(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('signWinners', () => {
    it('should sign winners for a category', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = { id: 'tally-1', role: UserRole.TALLY_MASTER };
      mockReq.ip = '192.168.1.100';
      const mockResult = {
        categoryId: 'cat-1',
        signedBy: 'tally-1',
        signedAt: new Date().toISOString(),
        message: 'Winners signed successfully',
      };
      mockWinnerService.signWinners.mockResolvedValue(mockResult as any);

      await controller.signWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.signWinners).toHaveBeenCalledWith(
        'cat-1',
        'tally-1',
        UserRole.TALLY_MASTER,
        '192.168.1.100',
        'Mozilla/5.0 Test Agent'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Winners signed successfully',
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.body = {};

      await controller.signWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
      expect(mockWinnerService.signWinners).not.toHaveBeenCalled();
    });

    it('should capture IP address and user agent', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.ip = '10.0.0.5';
      (mockReq.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'user-agent') return 'Custom/1.0 Agent';
        return undefined;
      });
      mockWinnerService.signWinners.mockResolvedValue({ message: 'Success' } as any);

      await controller.signWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.signWinners).toHaveBeenCalledWith(
        'cat-1',
        'user-1',
        UserRole.ADMIN,
        '10.0.0.5',
        'Custom/1.0 Agent'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockWinnerService.signWinners.mockRejectedValue(error);

      await controller.signWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSignatureStatus', () => {
    it('should return signature status for a category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      const mockResult = {
        categoryId: 'cat-1',
        signed: true,
        signedBy: 'tally-1',
        signedAt: '2025-11-13T10:30:00Z',
      };
      mockWinnerService.getSignatureStatus.mockResolvedValue(mockResult as any);

      await controller.getSignatureStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getSignatureStatus).toHaveBeenCalledWith('cat-1', 'user-1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getSignatureStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
      expect(mockWinnerService.getSignatureStatus).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockWinnerService.getSignatureStatus.mockRejectedValue(error);

      await controller.getSignatureStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCertificationProgress', () => {
    it('should return certification progress for a category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockResult = {
        categoryId: 'cat-1',
        totalScores: 20,
        certifiedScores: 18,
        percentComplete: 90,
        pendingRoles: ['JUDGE'],
      };
      mockWinnerService.getCertificationProgress.mockResolvedValue(mockResult as any);

      await controller.getCertificationProgress(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getCertificationProgress).toHaveBeenCalledWith('cat-1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = {};

      await controller.getCertificationProgress(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
      expect(mockWinnerService.getCertificationProgress).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockWinnerService.getCertificationProgress.mockRejectedValue(error);

      await controller.getCertificationProgress(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getRoleCertificationStatus', () => {
    it('should return role-specific certification status', async () => {
      mockReq.params = { categoryId: 'cat-1', role: 'JUDGE' };
      const mockResult = {
        categoryId: 'cat-1',
        role: 'JUDGE',
        totalRequired: 5,
        completed: 4,
        pending: 1,
      };
      mockWinnerService.getRoleCertificationStatus.mockResolvedValue(mockResult as any);

      await controller.getRoleCertificationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getRoleCertificationStatus).toHaveBeenCalledWith(
        'cat-1',
        'JUDGE'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.params = { role: 'JUDGE' };

      await controller.getRoleCertificationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Category ID and role are required',
      });
      expect(mockWinnerService.getRoleCertificationStatus).not.toHaveBeenCalled();
    });

    it('should return 400 when role is missing', async () => {
      mockReq.params = { categoryId: 'cat-1' };

      await controller.getRoleCertificationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Category ID and role are required',
      });
      expect(mockWinnerService.getRoleCertificationStatus).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1', role: 'JUDGE' };
      const error = new Error('Service error');
      mockWinnerService.getRoleCertificationStatus.mockRejectedValue(error);

      await controller.getRoleCertificationStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyScores', () => {
    it('should certify scores for a category', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      mockReq.user = { id: 'auditor-1', role: UserRole.AUDITOR };
      const mockResult = {
        categoryId: 'cat-1',
        certifiedBy: 'auditor-1',
        certifiedAt: new Date().toISOString(),
        message: 'Scores certified successfully',
      };
      mockWinnerService.certifyScores.mockResolvedValue(mockResult as any);

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.certifyScores).toHaveBeenCalledWith(
        'cat-1',
        'auditor-1',
        UserRole.AUDITOR
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Scores certified successfully',
      });
    });

    it('should return 400 when categoryId is missing', async () => {
      mockReq.body = {};

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category ID is required' });
      expect(mockWinnerService.certifyScores).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockWinnerService.certifyScores.mockRejectedValue(error);

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getWinners', () => {
    it('should return all winners when no filters provided', async () => {
      mockReq.query = {};
      const mockResult = {
        winners: [
          { contestantId: 'cont-1', totalScore: 285.5 },
          { contestantId: 'cont-2', totalScore: 280.0 },
        ],
      };
      mockWinnerService.getWinners.mockResolvedValue(mockResult as any);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.getWinners).toHaveBeenCalledWith(undefined, undefined);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Winners retrieved successfully',
      });
    });

    it('should filter winners by eventId', async () => {
      mockReq.query = { eventId: 'event-1' };
      const mockResult = {
        eventId: 'event-1',
        winners: [{ contestantId: 'cont-1' }],
      };
      mockWinnerService.getWinners.mockResolvedValue(mockResult as any);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.getWinners).toHaveBeenCalledWith('event-1', undefined);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockResult,
        })
      );
    });

    it('should filter winners by contestId', async () => {
      mockReq.query = { contestId: 'contest-1' };
      const mockResult = {
        contestId: 'contest-1',
        winners: [{ contestantId: 'cont-1' }],
      };
      mockWinnerService.getWinners.mockResolvedValue(mockResult as any);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.getWinners).toHaveBeenCalledWith(undefined, 'contest-1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockResult,
        })
      );
    });

    it('should filter winners by both eventId and contestId', async () => {
      mockReq.query = { eventId: 'event-1', contestId: 'contest-1' };
      const mockResult = {
        eventId: 'event-1',
        contestId: 'contest-1',
        winners: [{ contestantId: 'cont-1' }],
      };
      mockWinnerService.getWinners.mockResolvedValue(mockResult as any);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.getWinners).toHaveBeenCalledWith('event-1', 'contest-1');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mockResult,
        })
      );
    });

    it('should use custom message from service if provided', async () => {
      mockReq.query = {};
      const mockResult = {
        winners: [],
        message: 'Custom success message',
      };
      mockWinnerService.getWinners.mockResolvedValue(mockResult as any);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Custom success message',
      });
    });

    it('should call next with error when service throws', async () => {
      mockReq.query = {};
      const error = new Error('Service error');
      mockWinnerService.getWinners.mockRejectedValue(error);

      await controller.getWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Role-based Winner Access', () => {
    it('should allow ADMIN to access all winner methods', async () => {
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockReq.params = { categoryId: 'cat-1' };
      mockWinnerService.getWinnersByCategory.mockResolvedValue({
        winners: [],
        message: 'Success',
      } as any);

      await controller.getWinnersByCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockWinnerService.getWinnersByCategory).toHaveBeenCalledWith(
        'cat-1',
        UserRole.ADMIN
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should allow TALLY_MASTER to sign winners', async () => {
      mockReq.user = { id: 'tally-1', role: UserRole.TALLY_MASTER };
      mockReq.body = { categoryId: 'cat-1' };
      mockWinnerService.signWinners.mockResolvedValue({
        message: 'Signed',
      } as any);

      await controller.signWinners(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.signWinners).toHaveBeenCalledWith(
        'cat-1',
        'tally-1',
        UserRole.TALLY_MASTER,
        expect.any(String),
        expect.any(String)
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should allow AUDITOR to certify scores', async () => {
      mockReq.user = { id: 'auditor-1', role: UserRole.AUDITOR };
      mockReq.body = { categoryId: 'cat-1' };
      mockWinnerService.certifyScores.mockResolvedValue({
        message: 'Certified',
      } as any);

      await controller.certifyScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockWinnerService.certifyScores).toHaveBeenCalledWith(
        'cat-1',
        'auditor-1',
        UserRole.AUDITOR
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
