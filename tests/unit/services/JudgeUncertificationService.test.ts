/**
 * JudgeUncertificationService Tests
 *
 * Comprehensive test suite for judge uncertification workflow with
 * 3-signature approval (Tally, Auditor, Board) and bulk score uncertification.
 *
 * Test Coverage:
 * - Request creation and authorization
 * - Retrieval with status filters
 * - Three-signature workflow
 * - Bulk score uncertification
 * - Execution after full approval
 * - Error handling and validation
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { JudgeUncertificationService } from '../../src/services/JudgeUncertificationService';
import { NotFoundError, ValidationError, ForbiddenError } from '../../src/services/BaseService';

describe('JudgeUncertificationService', () => {
  let service: JudgeUncertificationService;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mock<PrismaClient>();
    service = new JudgeUncertificationService(prismaMock as any);
  });

  describe('getUncertificationRequests', () => {
    it('should retrieve all uncertification requests', async () => {
      const mockRequests = [
        {
          id: 'req1',
          judge: { id: 'j1', name: 'Judge One' },
          category: { id: 'cat1', contest: { id: 'c1' } },
        },
      ];

      prismaMock.judgeUncertificationRequest.findMany.mockResolvedValue(mockRequests as any);

      const result = await service.getUncertificationRequests();

      expect(result).toEqual(mockRequests);
      expect(prismaMock.judgeUncertificationRequest.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      prismaMock.judgeUncertificationRequest.findMany.mockResolvedValue([]);

      await service.getUncertificationRequests('PENDING');

      expect(prismaMock.judgeUncertificationRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no requests exist', async () => {
      prismaMock.judgeUncertificationRequest.findMany.mockResolvedValue([]);

      const result = await service.getUncertificationRequests();

      expect(result).toEqual([]);
    });
  });

  describe('createUncertificationRequest', () => {
    it('should create an uncertification request', async () => {
      const mockCategory = { id: 'cat1', name: 'Solo' };
      const mockJudge = { id: 'j1', name: 'Judge One' };
      const mockRequest = {
        id: 'req1',
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Scoring errors',
        status: 'PENDING',
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.judge.findUnique.mockResolvedValue(mockJudge as any);
      prismaMock.judgeUncertificationRequest.create.mockResolvedValue(mockRequest as any);

      const result = await service.createUncertificationRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Scoring errors',
        requestedBy: 'u1',
        userRole: 'BOARD',
      });

      expect(result.id).toBe('req1');
      expect(prismaMock.judgeUncertificationRequest.create).toHaveBeenCalledWith({
        data: {
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Scoring errors',
          requestedBy: 'u1',
          status: 'PENDING',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.createUncertificationRequest({
          judgeId: '',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'BOARD',
        })
      ).rejects.toThrow('Judge ID, category ID, and reason are required');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);

      await expect(
        service.createUncertificationRequest({
          judgeId: 'j1',
          categoryId: 'nonexistent',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'BOARD',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when judge does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue(null);

      await expect(
        service.createUncertificationRequest({
          judgeId: 'nonexistent',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'BOARD',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when user role is not BOARD or ADMIN', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);

      await expect(
        service.createUncertificationRequest({
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'JUDGE',
        })
      ).rejects.toThrow('Only Board and Admin can initiate uncertification requests');
    });

    it('should trim reason text', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);
      prismaMock.judgeUncertificationRequest.create.mockResolvedValue({} as any);

      await service.createUncertificationRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: '  Test reason  ',
        requestedBy: 'u1',
        userRole: 'BOARD',
      });

      expect(prismaMock.judgeUncertificationRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Test reason',
          }),
        })
      );
    });
  });

  describe('signRequest', () => {
    it('should add auditor signature', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'Dr. Smith',
        userId: 'u1',
        userRole: 'AUDITOR',
      });

      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          auditorSignature: 'Dr. Smith',
          auditorSignedAt: expect.any(Date),
          auditorSignedBy: 'u1',
        }),
        include: expect.any(Object),
      });
    });

    it('should add tally master signature', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          tallySignature: 'J. Doe',
          tallySignedAt: expect.any(Date),
          tallySignedBy: 'u2',
        }),
        include: expect.any(Object),
      });
    });

    it('should add board signature', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'Board Member',
        userId: 'u3',
        userRole: 'BOARD',
      });

      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          boardSignature: 'Board Member',
          boardSignedAt: expect.any(Date),
          boardSignedBy: 'u3',
        }),
        include: expect.any(Object),
      });
    });

    it('should auto-approve when all three signatures are present', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
        tallySignature: 'J. Doe',
        boardSignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({
        ...mockRequest,
        boardSignature: 'Board Member',
        status: 'APPROVED',
      } as any);

      const result = await service.signRequest('req1', {
        signatureName: 'Board Member',
        userId: 'u3',
        userRole: 'BOARD',
      });

      expect(result.allSigned).toBe(true);
      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          status: 'APPROVED',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw ValidationError when signature name is missing', async () => {
      await expect(
        service.signRequest('req1', {
          signatureName: '',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('Signature name is required');
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.signRequest('nonexistent', {
          signatureName: 'Test',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when request already approved', async () => {
      const mockRequest = { id: 'req1', status: 'APPROVED' };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);

      await expect(
        service.signRequest('req1', {
          signatureName: 'Test',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('Request has already been approved');
    });

    it('should throw ValidationError when role already signed', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);

      await expect(
        service.signRequest('req1', {
          signatureName: 'Another Name',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('You have already signed this request or your signature is not required');
    });

    it('should not approve with partial signatures', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({
        ...mockRequest,
        tallySignature: 'J. Doe',
      } as any);

      const result = await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(result.allSigned).toBe(false);
    });
  });

  describe('executeUncertification', () => {
    it('should uncertify all judge scores in category', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.updateMany.mockResolvedValue({ count: 10 } as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      const result = await service.executeUncertification('req1');

      expect(result.message).toBe('Uncertification executed successfully');
      expect(prismaMock.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat1',
          judgeId: 'j1',
          isCertified: true,
        },
        data: { isCertified: false },
      });
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(null);

      await expect(service.executeUncertification('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when request is not approved', async () => {
      const mockRequest = { id: 'req1', status: 'PENDING' };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);

      await expect(service.executeUncertification('req1')).rejects.toThrow(
        'Request must be approved before execution'
      );
    });

    it('should update request status to COMPLETED', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.updateMany.mockResolvedValue({ count: 5 } as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.executeUncertification('req1');

      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should only uncertify certified scores', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.updateMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.executeUncertification('req1');

      expect(prismaMock.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat1',
          judgeId: 'j1',
          isCertified: true,
        },
        data: { isCertified: false },
      });
    });
  });

  describe('workflow integration', () => {
    it('should handle complete approval workflow', async () => {
      // Step 1: Create request
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);
      prismaMock.judgeUncertificationRequest.create.mockResolvedValue({
        id: 'req1',
        status: 'PENDING',
      } as any);

      await service.createUncertificationRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Test',
        requestedBy: 'u1',
        userRole: 'BOARD',
      });

      // Step 2: First signature (partial)
      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue({
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
        tallySignature: null,
        boardSignature: null,
      } as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({
        id: 'req1',
        auditorSignature: 'Dr. Smith',
        status: 'PENDING',
      } as any);

      const result1 = await service.signRequest('req1', {
        signatureName: 'Dr. Smith',
        userId: 'u1',
        userRole: 'AUDITOR',
      });

      expect(result1.allSigned).toBe(false);

      // Step 3: Final signature (auto-approve)
      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue({
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
        tallySignature: 'J. Doe',
        boardSignature: null,
      } as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({
        id: 'req1',
        status: 'APPROVED',
      } as any);

      const result2 = await service.signRequest('req1', {
        signatureName: 'Board Member',
        userId: 'u3',
        userRole: 'BOARD',
      });

      expect(result2.allSigned).toBe(true);
    });

    it('should track signature metadata', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        tallySignature: null,
      };

      prismaMock.judgeUncertificationRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.judgeUncertificationRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(prismaMock.judgeUncertificationRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          tallySignature: 'J. Doe',
          tallySignedAt: expect.any(Date),
          tallySignedBy: 'u2',
        }),
        include: expect.any(Object),
      });
    });
  });
});
