/**
 * CertificationController Unit Tests
 * Comprehensive test coverage for CertificationController endpoints
 * Tests certification workflows, CRUD operations, and multi-step approval process
 */

import { Request, Response, NextFunction } from 'express';
import { CertificationController } from '../../../src/controllers/certificationController';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess, sendNotFound, sendBadRequest, sendConflict } from '../../../src/utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserRole } from '@prisma/client';
import {
  applyCertificationStage,
  calculateCategoryScoreCoverage,
  refreshJudgeStage,
  refreshRoleStages,
  upsertCategoryRoleCertification,
} from '../../../src/utils/certificationPipeline';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/utils/certificationPipeline', () => ({
  applyCertificationStage: jest.fn(),
  calculateCategoryScoreCoverage: jest.fn(),
  refreshJudgeStage: jest.fn(),
  refreshRoleStages: jest.fn(),
  upsertCategoryRoleCertification: jest.fn(),
}));

describe('CertificationController', () => {
  let controller: CertificationController;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockCertification = {
    id: 'cert-1',
    tenantId: 'tenant-1',
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

    // Mock response helpers
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });
    (sendNotFound as jest.Mock).mockImplementation((res, message) => {
      return res.status(404).json({ success: false, error: message });
    });
    (sendBadRequest as jest.Mock).mockImplementation((res, message) => {
      return res.status(400).json({ success: false, error: message });
    });
    (sendConflict as jest.Mock).mockImplementation((res, message) => {
      return res.status(409).json({ success: false, error: message });
    });

    mockPrisma = mockDeep<PrismaClient>();
    mockPrisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Category 1' }] as any);
    mockPrisma.categoryJudge.findMany.mockResolvedValue([] as any);
    mockPrisma.contest.findMany.mockResolvedValue([{ id: 'contest-1', name: 'Contest 1' }] as any);
    mockPrisma.event.findMany.mockResolvedValue([{ id: 'event-1', name: 'Event 1' }] as any);
    mockPrisma.judgeCertification.upsert.mockResolvedValue({} as any);
    (applyCertificationStage as jest.Mock).mockResolvedValue({
      ...mockCertification,
      status: 'IN_PROGRESS',
    });
    (calculateCategoryScoreCoverage as jest.Mock).mockReturnValue({
      total: 0,
      submitted: 0,
      certified: 0,
      locked: 0,
      judges: 0,
      contestants: 0,
      criteria: 0,
      isComplete: false,
      perJudge: new Map(),
    });
    (refreshJudgeStage as jest.Mock).mockResolvedValue({
      ...mockCertification,
      judgeCertified: true,
      currentStep: 2,
      status: 'IN_PROGRESS',
    });
    (refreshRoleStages as jest.Mock).mockResolvedValue({
      ...mockCertification,
      judgeCertified: true,
      tallyCertified: false,
      auditorCertified: false,
      boardApproved: false,
      currentStep: 2,
      status: 'IN_PROGRESS',
    });
    (upsertCategoryRoleCertification as jest.Mock).mockResolvedValue({});

    (container.resolve as jest.Mock) = jest.fn((token) => {
      if (token === 'PrismaClient') return mockPrisma;
      return mockPrisma;
    });

    controller = new CertificationController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: UserRole.ADMIN, tenantId: 'tenant-1' },
      tenantId: 'tenant-1',
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
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
        certifications: [
          expect.objectContaining({
            id: 'cert-1',
            categoryName: 'Category 1',
            contestName: 'Contest 1',
            eventName: 'Event 1',
          }),
        ],
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
          where: expect.objectContaining({ status: 'CERTIFIED', tenantId: 'tenant-1' }),
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
          where: expect.objectContaining({
            eventId: 'event-1',
            contestId: 'contest-1',
            categoryId: 'cat-1',
            tenantId: 'tenant-1',
          }),
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
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };

      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1' } as any);
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

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'categoryId, contestId, and eventId are required'
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

      expect(sendConflict).toHaveBeenCalledWith(
        mockRes,
        'Certification already exists for this category/contest/event'
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
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1' } as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Category not found or access denied');
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 404 when contest not found', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue(null);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1' } as any);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Contest not found or access denied');
      expect(mockPrisma.certification.create).not.toHaveBeenCalled();
    });

    it('should return 404 when event not found', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestId: 'contest-1',
        eventId: 'event-1',
      };
      mockPrisma.certification.findUnique.mockResolvedValue(null);
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'cat-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await controller.createCertification(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendNotFound).toHaveBeenCalledWith(mockRes, 'Event not found or access denied');
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

      expect(sendNotFound).toHaveBeenCalledWith(
        mockRes,
        'Certification not found'
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

      expect(sendNotFound).toHaveBeenCalledWith(
        mockRes,
        'Certification not found'
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

      expect(sendNotFound).toHaveBeenCalledWith(
        mockRes,
        'Certification not found'
      );
    });
  });

  describe('certifyJudge', () => {
    it('should certify as judge', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Judge approved', typedSignature: 'Judge User' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      (applyCertificationStage as jest.Mock).mockResolvedValue({
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

      expect(applyCertificationStage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          categoryId: 'cat-1',
          role: 'JUDGE',
          comments: 'Judge approved',
          userId: 'user-1',
          certifiedBy: 'user-1',
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Judge certification completed successfully'
      );
    });

    it('should return 404 when certification not found', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Judge User' };
      mockPrisma.certification.findUnique.mockResolvedValue(null);

      await controller.certifyJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendNotFound).toHaveBeenCalledWith(
        mockRes,
        'Certification not found'
      );
    });

    it('should return 400 when judge already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Judge User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);

      await controller.certifyJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Judge certification already completed'
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });
  });

  describe('certifyTally', () => {
    it('should certify as tally master', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Tally approved', typedSignature: 'Tally User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: false,
      });
      (applyCertificationStage as jest.Mock).mockResolvedValue({
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

      expect(upsertCategoryRoleCertification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          categoryId: 'cat-1',
          role: 'TALLY_MASTER',
          userId: 'user-1',
          signatureName: 'Tally User',
          comments: 'Tally approved',
        })
      );
      expect(applyCertificationStage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'TALLY_MASTER',
          comments: 'Tally approved',
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Tally Master certification completed successfully'
      );
    });

    it('should return 400 when judge not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Tally User' };
      mockPrisma.certification.findUnique.mockResolvedValue(mockCertification as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        judgeCertified: false,
      });

      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Judge must certify first'
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });

    it('should return 400 when tally already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Tally User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      });

      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Tally Master certification already completed'
      );
    });
  });

  describe('certifyAuditor', () => {
    it('should certify as auditor', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Auditor approved', typedSignature: 'Auditor User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        tallyCertified: true,
        auditorCertified: false,
      });
      (applyCertificationStage as jest.Mock).mockResolvedValue({
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

      expect(upsertCategoryRoleCertification).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'AUDITOR',
          signatureName: 'Auditor User',
          comments: 'Auditor approved',
        })
      );
      expect(applyCertificationStage).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'AUDITOR', comments: 'Auditor approved' })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Auditor certification completed successfully'
      );
    });

    it('should return 400 when tally not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Auditor User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: false,
      });

      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Tally Master must certify first'
      );
    });

    it('should return 400 when auditor already certified', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Auditor User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        tallyCertified: true,
        auditorCertified: true,
      });

      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Auditor certification already completed'
      );
    });
  });

  describe('approveBoard', () => {
    it('should approve by board and finalize certification', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { comments: 'Board approved', typedSignature: 'Board User' };
      mockReq.user = { id: 'board-user', role: UserRole.ADMIN, tenantId: 'tenant-1' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        auditorCertified: true,
        boardApproved: false,
      });
      (applyCertificationStage as jest.Mock).mockResolvedValue({
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

      expect(upsertCategoryRoleCertification).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'BOARD',
          userId: 'board-user',
          signatureName: 'Board User',
          comments: 'Board approved',
        })
      );
      expect(applyCertificationStage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'BOARD',
          comments: 'Board approved',
          userId: 'board-user',
          certifiedBy: 'board-user',
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Board approval completed - Certification finalized'
      );
    });

    it('should return 400 when auditor not certified first', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Board User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        tallyCertified: true,
        auditorCertified: false,
      });

      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Auditor must certify first'
      );
    });

    it('should return 400 when board already approved', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { typedSignature: 'Board User' };
      mockPrisma.certification.findUnique.mockResolvedValue({
        ...mockCertification,
        judgeCertified: true,
        tallyCertified: true,
        auditorCertified: true,
        boardApproved: true,
      } as any);
      (refreshRoleStages as jest.Mock).mockResolvedValue({
        ...mockCertification,
        auditorCertified: true,
        boardApproved: true,
      });

      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Board approval already completed'
      );
    });
  });

  describe('rejectCertification', () => {
    it('should reject certification with reason', async () => {
      mockReq.params = { id: 'cert-1' };
      mockReq.body = { rejectionReason: 'Scores inconsistent' };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN, tenantId: 'tenant-1' };
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

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Rejection reason is required'
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

      expect(sendNotFound).toHaveBeenCalledWith(
        mockRes,
        'Certification not found'
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

      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Cannot reject a finalized certification'
      );
      expect(mockPrisma.certification.update).not.toHaveBeenCalled();
    });
  });

  describe('getCertificationStats', () => {
    it('should return certification statistics', async () => {
      mockReq.query = {};
      ((mockPrisma.certification.count as unknown as jest.Mock).mockImplementation)((args: any) => {
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

  describe('getCertificationOverview', () => {
    it('does not report judges complete when score coverage is incomplete', async () => {
      const signedAt = new Date('2026-05-10T00:00:00.000Z');
      mockPrisma.category.findMany.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Category 1',
          contestId: 'contest-1',
          contest: {
            id: 'contest-1',
            name: 'Contest 1',
            event: {
              id: 'event-1',
              name: 'Event 1',
            },
          },
        },
      ] as any);
      mockPrisma.certification.findMany.mockResolvedValue([
        {
          ...mockCertification,
          judgeCertified: true,
          status: 'IN_PROGRESS',
        },
      ] as any);
      mockPrisma.assignment.findMany.mockResolvedValue([
        {
          categoryId: 'cat-1',
          contestId: 'contest-1',
          eventId: 'event-1',
          judgeId: 'judge-1',
          judge: {
            id: 'judge-1',
            name: 'Judge One',
          },
        },
      ] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([] as any);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([
        {
          categoryId: 'cat-1',
          judgeId: 'judge-1',
          certifiedAt: signedAt,
        },
      ] as any);
      mockPrisma.score.findMany.mockResolvedValue([
        {
          categoryId: 'cat-1',
          judgeId: 'judge-1',
          contestantId: 'contestant-1',
          criterionId: 'criterion-1',
          isCertified: true,
          isLocked: true,
        },
      ] as any);
      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        { categoryId: 'cat-1', contestantId: 'contestant-1' },
        { categoryId: 'cat-1', contestantId: 'contestant-2' },
      ] as any);
      mockPrisma.criterion.findMany.mockResolvedValue([
        { categoryId: 'cat-1', id: 'criterion-1' },
      ] as any);
      mockPrisma.tallyMasterAssignment.findMany.mockResolvedValue([] as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue([] as any);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([] as any);
      mockPrisma.systemSetting.findMany.mockResolvedValue([] as any);
      mockPrisma.event.findMany.mockResolvedValue([
        {
          id: 'event-1',
          requireAllTallyCertifiers: true,
          requireAllAuditorCertifiers: true,
        },
      ] as any);
      (calculateCategoryScoreCoverage as jest.Mock).mockReturnValue({
        total: 2,
        submitted: 1,
        certified: 1,
        locked: 1,
        judges: 1,
        contestants: 2,
        criteria: 1,
        isComplete: false,
        perJudge: new Map([
          ['judge-1', {
            judgeId: 'judge-1',
            expected: 2,
            submitted: 1,
            certified: 1,
            locked: 1,
            scoreComplete: false,
          }],
        ]),
      });

      await controller.getCertificationOverview(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      const payload = (sendSuccess as jest.Mock).mock.calls.at(-1)?.[1];
      expect(payload).toBeDefined();
      expect(payload.contests).toHaveLength(1);
      expect(payload.contests[0].categories[0]).toEqual(
        expect.objectContaining({
          status: 'PENDING',
          currentStep: 1,
          judgeCertified: false,
          judgeProgress: {
            certified: 0,
            total: 1,
          },
          scoreProgress: {
            total: 2,
            submitted: 1,
            certified: 1,
            locked: 1,
            judges: 1,
            contestants: 2,
            criteria: 1,
          },
          judges: [
            expect.objectContaining({
              judgeId: 'judge-1',
              certified: false,
              certifiedAt: signedAt,
            }),
          ],
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
      mockReq.body = { typedSignature: 'Workflow User' };
      mockPrisma.certification.findUnique.mockResolvedValue(cert as any);
      (refreshRoleStages as jest.Mock)
        .mockResolvedValueOnce({ ...cert, judgeCertified: false })
        .mockResolvedValueOnce({ ...cert, judgeCertified: false, tallyCertified: false })
        .mockResolvedValueOnce({ ...cert, auditorCertified: false });

      // Try to certify as Tally before Judge - should fail
      await controller.certifyTally(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Judge must certify first'
      );

      // Try to certify as Auditor before any - should fail
      await controller.certifyAuditor(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Tally Master must certify first'
      );

      // Try to approve by Board before any - should fail
      await controller.approveBoard(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );
      expect(sendBadRequest).toHaveBeenCalledWith(
        mockRes,
        'Auditor must certify first'
      );
    });
  });
});
