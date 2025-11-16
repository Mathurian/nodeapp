/**
 * CertificationController Unit Tests
 * Comprehensive test coverage for CertificationController endpoints
 * Tests certification workflows, CRUD operations, and multi-step approval process
 */

import { Request, Response, NextFunction } from 'express';
import { CertificationController } from '../../../src/controllers/certificationController';
import { CertificationService } from '../../../src/services/CertificationService';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/CertificationService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');

describe('CertificationController', () => {
  let controller: CertificationController;
  let mockCertificationService: jest.Mocked<CertificationService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockCertification = {
    id: 'cert-1',
    categoryId: 'cat-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    userId: 'user-1',
    status: 'PENDING',
    currentStep: 1,
    totalSteps: 4,
    judgeCertified: false,
    tallyCertified: false,
    auditorCertified: false,
    boardApproved: false,
    comments: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    certifiedAt: null,
    certifiedBy: null,
    category: { id: 'cat-1', name: 'Category 1' },
    contest: { id: 'contest-1', name: 'Contest 1' },
    event: { id: 'event-1', name: 'Event 1' },
    user: { id: 'user-1', name: 'User 1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    (createRequestLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    });

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    mockCertificationService = {
      getOverallStatus: jest.fn(),
      certifyAll: jest.fn(),
    } as any;

    mockPrisma = mockDeep<PrismaClient>();

    (container.resolve as jest.Mock) = jest.fn((token) => {
      if (token === 'PrismaClient') return mockPrisma;
      if (token === CertificationService) return mockCertificationService;
      return mockCertificationService;
    });

    controller = new CertificationController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: UserRole.ADMIN },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getOverallStatus', () => {
    it('should return overall certification status for an event', async () => {
      mockReq.params = { eventId: 'event-1' };
      const mockStatus = {
        eventId: 'event-1',
        total: 10,
        certified: 5,
        pending: 3,
        inProgress: 2,
      };
      mockCertificationService.getOverallStatus.mockResolvedValue(mockStatus as any);

      await controller.getOverallStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockCertificationService.getOverallStatus).toHaveBeenCalledWith('event-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStatus);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { eventId: 'event-1' };
      const error = new Error('Service error');
      mockCertificationService.getOverallStatus.mockRejectedValue(error);

      await controller.getOverallStatus(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyAll', () => {
    it('should certify all categories for an event', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      const mockResult = {
        certifiedCount: 10,
        message: 'All categories certified',
      };
      mockCertificationService.certifyAll.mockResolvedValue(mockResult as any);

      await controller.certifyAll(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCertificationService.certifyAll).toHaveBeenCalledWith(
        'event-1',
        'admin-1',
        UserRole.ADMIN
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockResult,
        'All categories certified'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { eventId: 'event-1' };
      const error = new Error('Service error');
      mockCertificationService.certifyAll.mockRejectedValue(error);

      await controller.certifyAll(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAllCertifications', () => {
    it('should return paginated certifications', async () => {
      mockReq.query = { page: '1', limit: '20' };
      const mockCertifications = [mockCertification];
      mockPrisma.certification.findMany.mockResolvedValue(mockCertifications as any);
      mockPrisma.certification.count.mockResolvedValue(50);

      await controller.getAllCertifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.findMany).toHaveBeenCalled();
      expect(mockPrisma.certification.count).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        certifications: mockCertifications,
        pagination: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
          hasMore: true,
        },
      });
    });

    it('should filter by status', async () => {
      mockReq.query = { status: 'CERTIFIED', page: '1', limit: '50' };
      mockPrisma.certification.findMany.mockResolvedValue([mockCertification] as any);
      mockPrisma.certification.count.mockResolvedValue(10);

      await controller.getAllCertifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'CERTIFIED' },
        })
      );
    });

    it('should filter by eventId, contestId, and categoryId', async () => {
      mockReq.query = {
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'cat-1',
        page: '1',
        limit: '50',
      };
      mockPrisma.certification.findMany.mockResolvedValue([mockCertification] as any);
      mockPrisma.certification.count.mockResolvedValue(1);

      await controller.getAllCertifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            eventId: 'event-1',
            contestId: 'contest-1',
            categoryId: 'cat-1',
          },
        })
      );
    });

    it('should call next with error when prisma throws', async () => {
      mockReq.query = {};
      const error = new Error('Database error');
      mockPrisma.certification.findMany.mockRejectedValue(error);

      await controller.getAllCertifications(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createCertification', () => {
    it('should create a new certification', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
        comments: 'Test comment',
      };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };

      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findUnique.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-1' } as any);
      mockPrisma.certification.create.mockResolvedValue(mockCertification as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-1',
            contestId: 'contest-1',
            eventId: 'event-1',
            userId: 'user-1',
            status: 'PENDING',
            currentStep: 1,
            totalSteps: 4,
            comments: 'Test comment',
          }),
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockCertification,
        'Certification created successfully',
        201
      );
    });

    it('should return 400 when required fields are missing', async () => {
      mockReq.body = { categoryId: 'cat-1' }; // Missing contestId and eventId

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'categoryId, contestId, and eventId are required',
        400
      );
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 409 when certification already exists', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification already exists for this category/contest/event',
        409
      );
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 404 when category not found', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.contest.findUnique.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-1' } as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Category not found', 404);
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 404 when contest not found', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findUnique.mockResolvedValue(null);
      mockPrisma.event.findUnique.mockResolvedValue({ id: 'event-1' } as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Contest not found', 404);
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 404 when event not found', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findUnique.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'Event not found', 404);
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCertification', () => {
    it('should update certification', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { status: 'IN_PROGRESS', comments: 'Updated' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        status: 'IN_PROGRESS',
        comments: 'Updated',
      } as any);

      await controller.updateCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: { status: 'IN_PROGRESS', comments: 'Updated' },
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Certification updated successfully'
      );
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { status: 'IN_PROGRESS' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.updateCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification not found',
        404
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteCertification', () => {
    it('should delete certification', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      mockPrisma.certification.delete.mockResolvedValue(mockCertification as any);

      await controller.deleteCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.delete).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification deleted successfully'
      );
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.deleteCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification not found',
        404
      );
      expect(mockPrisma.certification.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCertificationById', () => {
    it('should return certification by id', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);

      await controller.getCertificationById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.findUnique).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCertification);
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.getCertificationById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification not found',
        404
      );
    });
  });

  describe('certifyJudge', () => {
    it('should certify as judge', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Judge approved' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        currentStep: 2,
        status: 'IN_PROGRESS',
      } as any);

      await controller.certifyJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: {
          judgeCertified: true,
          currentStep: 2,
          status: 'IN_PROGRESS',
          comments: 'Judge approved',
        },
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Judge certification completed successfully'
      );
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.certifyJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification not found',
        404
      );
    });

    it('should return 400 when judge already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);

      await controller.certifyJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Judge certification already completed',
        400
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });
  });

  describe('certifyTally', () => {
    it('should certify as tally master', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Tally approved' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        currentStep: 3,
      } as any);

      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: {
          tallyCertified: true,
          currentStep: 3,
          status: 'IN_PROGRESS',
          comments: 'Tally approved',
        },
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Tally Master certification completed successfully'
      );
    });

    it('should return 400 when judge not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);

      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Judge must certify first',
        400
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });

    it('should return 400 when tally already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);

      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Tally Master certification already completed',
        400
      );
    });
  });

  describe('certifyAuditor', () => {
    it('should certify as auditor', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Auditor approved' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        currentStep: 4,
      } as any);

      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Auditor certification completed successfully'
      );
    });

    it('should return 400 when tally not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);

      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Tally Master must certify first',
        400
      );
    });

    it('should return 400 when auditor already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
      } as any);

      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Auditor certification already completed',
        400
      );
    });
  });

  describe('approveBoard', () => {
    it('should approve by board and finalize certification', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Board approved' };
      mockReq.user = { id: 'board-user', role: UserRole.ADMIN };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
      } as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        boardApproved: true,
        status: 'CERTIFIED',
        certifiedBy: 'board-user',
      } as any);

      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: expect.objectContaining({
          boardApproved: true,
          status: 'CERTIFIED',
          certifiedBy: 'board-user',
        }),
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Board approval completed - Certification finalized'
      );
    });

    it('should return 400 when auditor not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);

      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Auditor must certify first',
        400
      );
    });

    it('should return 400 when board already approved', async () => {
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        boardApproved: true,
      } as any);

      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Board approval already completed',
        400
      );
    });
  });

  describe('rejectCertification', () => {
    it('should reject certification with reason', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { rejectionReason: 'Scores inconsistent' };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      mockPrisma.certification.update.mockResolvedValue({
        ...mockCertification,
        status: 'REJECTED',
        rejectionReason: 'Scores inconsistent',
      } as any);

      await controller.rejectCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Scores inconsistent',
          certifiedBy: 'admin-1',
        },
        include: expect.any(Object),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Certification rejected'
      );
    });

    it('should return 400 when rejection reason is missing', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = {};

      await controller.rejectCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Rejection reason is required',
        400
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { rejectionReason: 'Test' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.rejectCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Certification not found',
        404
      );
    });

    it('should return 400 when trying to reject finalized certification', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { rejectionReason: 'Test' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        status: 'CERTIFIED',
      } as any);

      await controller.rejectCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Cannot reject a finalized certification',
        400
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });
  });

  describe('getCertificationStats', () => {
    it('should return certification statistics', async () => {
      mockReq.query = {};
      mockPrisma.certification.count.mockImplementation((args: any) => {
        if (args.where?.status === 'PENDING') return Promise.resolve(3);
        if (args.where?.status === 'IN_PROGRESS') return Promise.resolve(2);
        if (args.where?.status === 'CERTIFIED') return Promise.resolve(5);
        if (args.where?.status === 'REJECTED') return Promise.resolve(1);
        if (args.where?.judgeCertified === true) return Promise.resolve(7);
        if (args.where?.tallyCertified === true) return Promise.resolve(6);
        if (args.where?.auditorCertified === true) return Promise.resolve(5);
        if (args.where?.boardApproved === true) return Promise.resolve(5);
        return Promise.resolve(11); // total
      });

      await controller.getCertificationStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        total: 11,
        byStatus: {
          pending: 3,
          inProgress: 2,
          certified: 5,
          rejected: 1,
        },
        byStage: {
          judgeCertified: 7,
          tallyCertified: 6,
          auditorCertified: 5,
          boardApproved: 5,
        },
        completionRate: '45.45%',
        rejectionRate: '9.09%',
        averageStep: '2.09',
      });
    });

    it('should filter stats by eventId and contestId', async () => {
      mockReq.query = { eventId: 'event-1', contestId: 'contest-1' };
      mockPrisma.certification.count.mockResolvedValue(5);

      await controller.getCertificationStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockPrisma.certification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-1',
            contestId: 'contest-1',
          }),
        })
      );
    });

    it('should handle zero certifications gracefully', async () => {
      mockReq.query = {};
      mockPrisma.certification.count.mockResolvedValue(0);

      await controller.getCertificationStats(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          total: 0,
          completionRate: '0%',
          rejectionRate: '0%',
          averageStep: '0',
        })
      );
    });
  });

  describe('Multi-step Certification Workflow', () => {
    it('should enforce proper certification order', async () => {
      // Start with pending certification
      let cert = { ...mockCertification };

      // Step 1: Judge must certify first
      mockReq.params = { id: 'cert-1' };
      mockPrisma.certification.findUnique.mockResolvedValue(cert as any);

      // Try to certify as Tally before Judge - should fail
      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Judge must certify first',
        400
      );

      // Try to certify as Auditor before any - should fail
      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Tally Master must certify first',
        400
      );

      // Try to approve by Board before any - should fail
      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {},
        'Auditor must certify first',
        400
      );
    });
  });
});
