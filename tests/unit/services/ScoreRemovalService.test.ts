/**
 * ScoreRemovalService Tests
 *
 * Comprehensive test suite for score removal request workflow requiring
 * 3-signature approval (Tally Master, Auditor, Board).
 *
 * Test Coverage:
 * - Request creation
 * - Authorization checks
 * - Sequential signature workflow
 * - All three signature types
 * - Automatic approval on complete signatures
 * - Request status tracking
 * - Score removal execution
 * - Validation and error handling
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { ScoreRemovalService } from '../../src/services/ScoreRemovalService';
import { NotFoundError, ValidationError, ForbiddenError } from '../../src/services/BaseService';

describe('ScoreRemovalService', () => {
  let service: ScoreRemovalService;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mock<PrismaClient>();
    service = new ScoreRemovalService(prismaMock as any);
  });

  describe('createRequest', () => {
    it('should create a score removal request', async () => {
      const mockCategory = { id: 'cat1', name: 'Solo' };
      const mockJudge = { id: 'j1', name: 'Judge One' };
      const mockRequest = {
        id: 'req1',
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Invalid scores',
        status: 'PENDING',
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.judge.findUnique.mockResolvedValue(mockJudge as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue(mockRequest as any);

      const result = await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Invalid scores',
        requestedBy: 'u1',
        userRole: 'BOARD',
      });

      expect(result.id).toBe('req1');
      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalledWith({
        data: {
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Invalid scores',
          requestedBy: 'u1',
          status: 'PENDING',
        },
        include: expect.any(Object),
      });
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.createRequest({
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
        service.createRequest({
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
        service.createRequest({
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
        service.createRequest({
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'JUDGE',
        })
      ).rejects.toThrow('Only Board and Admin can initiate score removal requests');
    });

    it('should allow ADMIN role to create requests', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue({} as any);

      await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Test',
        requestedBy: 'u1',
        userRole: 'ADMIN',
      });

      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalled();
    });

    it('should trim reason text', async () => {
      prismaMock.category.findUnique.mockResolvedValue({ id: 'cat1' } as any);
      prismaMock.judge.findUnique.mockResolvedValue({ id: 'j1' } as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue({} as any);

      await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: '  Test reason  ',
        requestedBy: 'u1',
        userRole: 'BOARD',
      });

      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Test reason',
          }),
        })
      );
    });
  });

  describe('getAll', () => {
    it('should retrieve all score removal requests', async () => {
      const mockRequests = [
        {
          id: 'req1',
          judge: { id: 'j1', name: 'Judge One' },
          category: { id: 'cat1', name: 'Solo', contest: { id: 'c1', name: 'Contest' } },
        },
      ];

      prismaMock.scoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);

      const result = await service.getAll();

      expect(result).toEqual(mockRequests);
      expect(prismaMock.scoreRemovalRequest.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      prismaMock.scoreRemovalRequest.findMany.mockResolvedValue([]);

      await service.getAll('PENDING');

      expect(prismaMock.scoreRemovalRequest.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no requests exist', async () => {
      prismaMock.scoreRemovalRequest.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should retrieve a specific request by ID', async () => {
      const mockRequest = {
        id: 'req1',
        judge: { id: 'j1', name: 'Judge One' },
        category: { id: 'cat1', contest: { id: 'c1' } },
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);

      const result = await service.getById('req1');

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundError);
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

      const mockUpdated = {
        ...mockRequest,
        auditorSignature: 'Dr. Smith',
        auditorSignedAt: expect.any(Date),
        auditorSignedBy: 'u1',
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(mockUpdated as any);

      const result = await service.signRequest('req1', {
        signatureName: 'Dr. Smith',
        userId: 'u1',
        userRole: 'AUDITOR',
      });

      expect(result.request.auditorSignature).toBe('Dr. Smith');
      expect(result.allSigned).toBe(false);
    });

    it('should add tally master signature', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
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

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'Board Member',
        userId: 'u3',
        userRole: 'BOARD',
      });

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
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

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({
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
      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
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
      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(null);

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

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);

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

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);

      await expect(
        service.signRequest('req1', {
          signatureName: 'Another Name',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('You have already signed this request or your signature is not required');
    });

    it('should maintain partial approval state', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({
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

  describe('executeRemoval', () => {
    it('should execute score removal when approved', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
        judge: { id: 'j1' },
        category: { id: 'cat1' },
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.deleteMany.mockResolvedValue({ count: 5 } as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      const result = await service.executeRemoval('req1');

      expect(result.deletedCount).toBe(5);
      expect(prismaMock.score.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat1',
          judgeId: 'j1',
        },
      });
      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(null);

      await expect(service.executeRemoval('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when request is not approved', async () => {
      const mockRequest = { id: 'req1', status: 'PENDING' };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);

      await expect(service.executeRemoval('req1')).rejects.toThrow(
        'Request must be approved before execution'
      );
    });

    it('should handle zero scores deleted', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
        judge: { id: 'j1' },
        category: { id: 'cat1' },
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      const result = await service.executeRemoval('req1');

      expect(result.deletedCount).toBe(0);
    });

    it('should update status to COMPLETED after execution', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'APPROVED',
        categoryId: 'cat1',
        judgeId: 'j1',
        judge: { id: 'j1' },
        category: { id: 'cat1' },
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.deleteMany.mockResolvedValue({ count: 3 } as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.executeRemoval('req1');

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'COMPLETED' },
      });
    });
  });

  describe('signature workflow integration', () => {
    it('should require all three signatures before auto-approval', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: 'Dr. Smith',
        tallySignature: null,
        boardSignature: null,
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({
        ...mockRequest,
        tallySignature: 'J. Doe',
      } as any);

      const result = await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(result.allSigned).toBe(false);
      expect(result.request.status).toBe('PENDING');
    });

    it('should track signature timestamps', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        auditorSignature: null,
      };

      const signedAt = new Date();
      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({
        ...mockRequest,
        auditorSignature: 'Dr. Smith',
        auditorSignedAt: signedAt,
      } as any);

      await service.signRequest('req1', {
        signatureName: 'Dr. Smith',
        userId: 'u1',
        userRole: 'AUDITOR',
      });

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          auditorSignedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should track who signed each role', async () => {
      const mockRequest = {
        id: 'req1',
        status: 'PENDING',
        tallySignature: null,
      };

      prismaMock.scoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.signRequest('req1', {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          tallySignedBy: 'u2',
        }),
        include: expect.any(Object),
      });
    });
  });
});
