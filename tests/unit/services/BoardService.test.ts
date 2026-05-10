import 'reflect-metadata';
/**
 * BoardService Tests
 *
 * Comprehensive test suite for board-level functionality including final
 * approval workflow, certification management, and score removal handling.
 *
 * Test Coverage:
 * - Dashboard statistics
 * - Certification approval/rejection
 * - Certification status tracking
 * - Score removal request handling
 * - Final board approval workflow
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { mockDeep, DeepMockProxy, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../../src/services/BaseService';
jest.mock('../../../src/utils/certificationPipeline', () => ({
  applyCertificationStage: jest.fn(),
  refreshRoleStages: jest.fn(),
  upsertCategoryRoleCertification: jest.fn(),
}));

const { BoardService } =
  require('../../../src/services/BoardService') as typeof import('../../../src/services/BoardService');

describe('BoardService', () => {
  let service: InstanceType<typeof BoardService>;
  let prismaMock: DeepMockProxy<PrismaClient>;
  const tenantId = 'tenant-1';

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    service = new BoardService(prismaMock as any);
  });

  afterEach(() => {
    mockReset(prismaMock);
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return board dashboard statistics', async () => {
      prismaMock.contest.count.mockResolvedValue(10);
      prismaMock.category.count.mockResolvedValue(3);
      prismaMock.certification.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        contests: 10,
        categories: 3,
        certified: 1,
        pending: 2,
      });
    });

    it('should handle zero counts', async () => {
      prismaMock.contest.count.mockResolvedValue(0);
      prismaMock.category.count.mockResolvedValue(0);
      prismaMock.certification.count.mockResolvedValue(0);

      const result = await service.getStats(tenantId);

      expect(result).toEqual({
        contests: 0,
        categories: 0,
        certified: 0,
        pending: 0,
      });
    });
  });

  describe('getCertifications', () => {
    it('should return categories with final certifications', async () => {
      const mockCertifications = [
        {
          id: 'cat1',
          tenantId,
          categoryId: 'category-1',
          contestId: 'contest-1',
          status: 'PENDING',
          comments: null,
          certifiedBy: 'auditor-1',
          userId: 'auditor-1',
          certifiedAt: new Date('2026-01-01T00:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-01T00:00:00Z'),
          auditorCertified: true,
          boardApproved: false,
        },
        {
          id: 'cat2',
          tenantId,
          categoryId: 'category-2',
          contestId: 'contest-2',
          status: 'PENDING',
          comments: null,
          certifiedBy: 'auditor-2',
          userId: 'auditor-2',
          certifiedAt: new Date('2026-01-02T00:00:00Z'),
          createdAt: new Date('2026-01-02T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          auditorCertified: true,
          boardApproved: false,
        },
      ];

      prismaMock.certification.findMany.mockResolvedValue(mockCertifications as any);
      prismaMock.categoryCertification.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([
        { id: 'category-1', name: 'Solo' },
        { id: 'category-2', name: 'Duo' },
      ] as any);
      prismaMock.contest.findMany.mockResolvedValue([
        { id: 'contest-1', name: 'Contest One', event: { id: 'event-1', name: 'Event One' } },
        { id: 'contest-2', name: 'Contest Two', event: { id: 'event-2', name: 'Event Two' } },
      ] as any);

      const result = await service.getCertifications(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cat1');
      expect(result[0].categoryName).toBe('Solo');
    });

    it('should exclude categories without final certification', async () => {
      prismaMock.certification.findMany.mockResolvedValue([]);

      const result = await service.getCertifications(tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('approveCertification', () => {
    it('should approve category certification', async () => {
      const categoryRecord = {
        id: 'cat1',
        name: 'Solo',
        contestId: 'contest-1',
        contest: {
          eventId: 'event-1',
          name: 'Contest One',
          event: { name: 'Event One' },
        },
      };
      const syncedCertification = {
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
        contestId: 'contest-1',
        eventId: 'event-1',
        status: 'IN_PROGRESS',
        comments: null,
        boardApproved: false,
        auditorCertified: true,
        tallyCertified: true,
        judgeCertified: false,
      };
      const boardApprovedCertification = {
        ...syncedCertification,
        status: 'CERTIFIED',
        boardApproved: true,
        comments: 'Approved',
      };

      prismaMock.certification.findFirst.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
      } as any);
      prismaMock.user.findFirst.mockResolvedValue({
        role: 'BOARD',
        boardRole: 'CHAIR',
      } as any);
      prismaMock.category.findFirst.mockResolvedValue(categoryRecord as any);
      prismaMock.certification.upsert.mockResolvedValue(syncedCertification as any);
      prismaMock.categoryJudge.findMany.mockResolvedValue([]);
      (prismaMock.assignment.groupBy as unknown as jest.Mock<any>).mockResolvedValue([]);
      prismaMock.judgeCertification.findMany.mockResolvedValue([]);
      prismaMock.certification.update
        .mockResolvedValueOnce(syncedCertification as any)
        .mockResolvedValueOnce(syncedCertification as any)
        .mockResolvedValueOnce({ ...syncedCertification, comments: 'Approved' } as any)
        .mockResolvedValueOnce(boardApprovedCertification as any);
      prismaMock.categoryCertification.findFirst.mockResolvedValue(null);
      prismaMock.categoryCertification.create.mockResolvedValue({} as any);
      prismaMock.categoryCertification.findMany.mockResolvedValue([]);
      prismaMock.tallyMasterAssignment.findMany.mockResolvedValue([]);
      prismaMock.auditorAssignment.findMany.mockResolvedValue([]);
      prismaMock.event.findFirst.mockResolvedValue(null);
      prismaMock.systemSetting.findFirst.mockResolvedValue(null);
      prismaMock.user.findMany.mockResolvedValue([]);

      const result = await service.approveCertification('cert-1', 'board-1', tenantId, {
        typedSignature: 'Board Member',
        comments: 'Approved',
      });

      expect(result).toEqual({
        message: 'Certification approved',
        certificationId: 'cert-1',
        categoryId: 'cat1',
      });
      expect(prismaMock.certification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cert-1',
          tenantId,
        },
      });
      expect(prismaMock.categoryCertification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          categoryId: 'cat1',
          role: 'BOARD',
          userId: 'board-1',
          boardRoleSnapshot: 'CHAIR',
          signatureName: 'Board Member',
          comments: 'Approved',
        }),
      });
    });

    it('should throw NotFoundError when certification does not exist', async () => {
      prismaMock.certification.findFirst.mockResolvedValue(null);

      await expect(service.approveCertification('nonexistent', 'board-1', tenantId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should reject approval when auditor certification is incomplete', async () => {
      prismaMock.certification.findFirst.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
      } as any);
      prismaMock.user.findFirst.mockResolvedValue({ role: 'BOARD', boardRole: null } as any);
      prismaMock.category.findFirst.mockResolvedValue({
        id: 'cat1',
        contestId: 'contest-1',
        contest: { eventId: 'event-1' },
      } as any);
      prismaMock.certification.upsert.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
        contestId: 'contest-1',
        eventId: 'event-1',
        auditorCertified: false,
        boardApproved: false,
        tallyCertified: false,
        judgeCertified: false,
        status: 'PENDING',
      } as any);
      prismaMock.categoryJudge.findMany.mockResolvedValue([]);
      (prismaMock.assignment.groupBy as unknown as jest.Mock<any>).mockResolvedValue([]);
      prismaMock.judgeCertification.findMany.mockResolvedValue([]);
      prismaMock.categoryCertification.findMany.mockResolvedValue([]);
      prismaMock.tallyMasterAssignment.findMany.mockResolvedValue([]);
      prismaMock.auditorAssignment.findMany.mockResolvedValue([]);
      prismaMock.event.findFirst.mockResolvedValue(null);
      prismaMock.systemSetting.findFirst.mockResolvedValue(null);
      prismaMock.certification.update.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
        contestId: 'contest-1',
        eventId: 'event-1',
        auditorCertified: false,
        boardApproved: false,
        tallyCertified: false,
        judgeCertified: false,
        status: 'PENDING',
      } as any);

      await expect(service.approveCertification('cert-1', 'board-1', tenantId)).rejects.toThrow(
        'Auditor certification must be completed first'
      );
    });

    it('should reject approval when board stage is already complete', async () => {
      prismaMock.certification.findFirst.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
      } as any);
      prismaMock.user.findFirst.mockResolvedValue({ role: 'BOARD', boardRole: null } as any);
      prismaMock.category.findFirst.mockResolvedValue({
        id: 'cat1',
        contestId: 'contest-1',
        contest: { eventId: 'event-1' },
      } as any);
      prismaMock.certification.upsert.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
        contestId: 'contest-1',
        eventId: 'event-1',
        auditorCertified: true,
        boardApproved: true,
        tallyCertified: true,
        judgeCertified: true,
        status: 'CERTIFIED',
      } as any);
      prismaMock.categoryJudge.findMany.mockResolvedValue([]);
      (prismaMock.assignment.groupBy as unknown as jest.Mock<any>).mockResolvedValue([]);
      prismaMock.judgeCertification.findMany.mockResolvedValue([]);
      prismaMock.categoryCertification.findMany.mockResolvedValue([]);
      prismaMock.tallyMasterAssignment.findMany.mockResolvedValue([]);
      prismaMock.auditorAssignment.findMany.mockResolvedValue([]);
      prismaMock.event.findFirst.mockResolvedValue(null);
      prismaMock.systemSetting.findFirst.mockResolvedValue(null);
      prismaMock.certification.update.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
        contestId: 'contest-1',
        eventId: 'event-1',
        auditorCertified: true,
        boardApproved: true,
        tallyCertified: true,
        judgeCertified: true,
        status: 'CERTIFIED',
      } as any);

      await expect(service.approveCertification('cert-1', 'board-1', tenantId)).rejects.toThrow(
        'Board approval already completed for this category'
      );
    });
  });

  describe('rejectCertification', () => {
    it('should reject category certification with reason', async () => {
      prismaMock.certification.findFirst.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
      } as any);

      const result = await service.rejectCertification('cert-1', tenantId, 'Incomplete scores');

      expect(result.message).toBe('Certification rejected');
      expect(prismaMock.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Incomplete scores',
        },
      });
    });

    it('should handle rejection without reason', async () => {
      prismaMock.certification.findFirst.mockResolvedValue({
        id: 'cert-1',
        tenantId,
        categoryId: 'cat1',
      } as any);
      prismaMock.certification.update.mockResolvedValue({} as any);

      await service.rejectCertification('cert-1', tenantId);

      expect(prismaMock.certification.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: {
          status: 'REJECTED',
          rejectionReason: 'Rejected by Board',
        },
      });
    });

    it('should throw NotFoundError when certification does not exist', async () => {
      prismaMock.certification.findFirst.mockResolvedValue(null);

      await expect(service.rejectCertification('nonexistent', tenantId, 'reason')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getCertificationStatus', () => {
    it('should return certification status summary', async () => {
      prismaMock.certification.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getCertificationStatus(tenantId);

      expect(result.total).toBe(3);
      expect(result.certified).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.approved).toBe(1);
    });

    it('should handle empty categories', async () => {
      prismaMock.certification.count.mockResolvedValue(0);

      const result = await service.getCertificationStatus(tenantId);

      expect(result).toEqual({
        total: 0,
        pending: 0,
        certified: 0,
        approved: 0,
      });
    });
  });

  describe('getScoreRemovalRequests', () => {
    it('should retrieve score removal requests', async () => {
      const mockRequests = [
        {
          id: 'req1',
          judge: { id: 'j1', name: 'Judge One' },
          category: {
            id: 'cat1',
            contest: { id: 'c1', event: { id: 'e1' } },
          },
          score: { id: 's1', contestant: { id: 'cont1' } },
        },
      ];

      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(1);

      const result = await service.getScoreRemovalRequests();

      expect(result.requests).toEqual(mockRequests);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should filter by status', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(0);

      await service.getScoreRemovalRequests('PENDING');

      expect(prismaMock.judgeScoreRemovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      );
    });

    it('should handle pagination', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(45);

      const result = await service.getScoreRemovalRequests(undefined, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        pages: 3,
      });
    });
  });

  describe('approveScoreRemoval', () => {
    it('should approve and execute score removal', async () => {
      const mockRequest = {
        id: 'req1',
        scoreId: 's1',
        score: { id: 's1' },
      };

      prismaMock.judgeScoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.delete.mockResolvedValue({} as any);
      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      } as any);

      const result = await service.approveScoreRemoval('req1', 'u1', 'Approved');

      expect(result.status).toBe('APPROVED');
      expect(prismaMock.score.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      // Service uses reviewedById and reviewedAt fields
      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: {
          status: 'APPROVED',
          reviewedById: 'u1',
          reviewedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.judgeScoreRemovalRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.approveScoreRemoval('nonexistent', 'u1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('rejectScoreRemoval', () => {
    it('should reject score removal request', async () => {
      const mockUpdated = {
        id: 'req1',
        status: 'REJECTED',
        reviewedById: 'u1',
      };

      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue(mockUpdated as any);

      const result = await service.rejectScoreRemoval('req1', 'u1', 'Invalid request');

      expect(result.status).toBe('REJECTED');
      // Service uses reviewedById and reviewedAt fields
      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: {
          status: 'REJECTED',
          reviewedById: 'u1',
          reviewedAt: expect.any(Date),
        },
      });
    });

    it('should handle rejection without reason', async () => {
      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.rejectScoreRemoval('req1', 'u1');

      // Service uses reviewedById and reviewedAt fields
      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: {
          status: 'REJECTED',
          reviewedById: 'u1',
          reviewedAt: expect.any(Date),
        },
      });
    });
  });
});
