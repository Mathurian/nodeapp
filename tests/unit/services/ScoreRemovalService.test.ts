/**
 * ScoreRemovalService Tests
 * Aligned with tenant-aware request creation, signing, and execution flow.
 */

import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ScoreRemovalService } from '../../../src/services/ScoreRemovalService';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('ScoreRemovalService', () => {
  let service: ScoreRemovalService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  const TEST_TENANT_ID = 'tenant-1';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  const buildCategory = (
    overrides: Partial<{ id: string; name: string; tenantId: string }> = {}
  ) => ({
    id: 'cat1',
    name: 'Solo',
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const buildJudge = (
    overrides: Partial<{ id: string; name: string; email: string | null; tenantId: string }> = {}
  ) => ({
    id: 'j1',
    name: 'Judge One',
    email: 'judge@example.com',
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const buildScoreRemovalRequest = (
    overrides: Partial<{
      id: string;
      tenantId: string;
      judgeId: string;
      categoryId: string;
      reason: string;
      requestedBy: string;
      boardRoleSnapshot: string | null;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      auditorSignature: string | null;
      auditorSignedAt: Date | null;
      auditorSignedBy: string | null;
      tallySignature: string | null;
      tallySignedAt: Date | null;
      tallySignedBy: string | null;
      boardSignature: string | null;
      boardSignedAt: Date | null;
      boardSignedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
      judge: ReturnType<typeof buildJudge>;
      category: { id: string; name: string; contest?: { id: string; name: string } };
      requestedByUser: { id: string; name: string; role?: string; boardRole?: string | null };
    }> = {}
  ) => ({
    id: 'req1',
    tenantId: TEST_TENANT_ID,
    judgeId: 'j1',
    categoryId: 'cat1',
    reason: 'Invalid scores',
    requestedBy: 'u1',
    boardRoleSnapshot: null,
    status: 'PENDING' as const,
    auditorSignature: null,
    auditorSignedAt: null,
    auditorSignedBy: null,
    tallySignature: null,
    tallySignedAt: null,
    tallySignedBy: null,
    boardSignature: null,
    boardSignedAt: null,
    boardSignedBy: null,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    judge: buildJudge(),
    category: { id: 'cat1', name: 'Solo', contest: { id: 'c1', name: 'Contest' } },
    requestedByUser: { id: 'u1', name: 'Requester', role: 'BOARD', boardRole: 'Chair' },
    ...overrides,
  });

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    service = new ScoreRemovalService(prismaMock as any);
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('createRequest', () => {
    it('should create a score removal request', async () => {
      const mockRequest = buildScoreRemovalRequest({
        judge: buildJudge(),
        category: { id: 'cat1', name: 'Solo' },
      });

      prismaMock.category.findFirst.mockResolvedValue(buildCategory() as any);
      prismaMock.judge.findFirst.mockResolvedValue(buildJudge() as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue(mockRequest as any);

      const result = await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Invalid scores',
        requestedBy: 'u1',
        userRole: 'BOARD',
        tenantId: TEST_TENANT_ID,
      });

      expect(result.id).toBe('req1');
      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalledWith({
        data: {
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Invalid scores',
          requestedBy: 'u1',
          boardRoleSnapshot: null,
          tenantId: TEST_TENANT_ID,
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
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Judge ID, category ID, reason, and tenant ID are required');
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);
      prismaMock.judge.findFirst.mockResolvedValue(buildJudge() as any);

      await expect(
        service.createRequest({
          judgeId: 'j1',
          categoryId: 'nonexistent',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'BOARD',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when judge does not exist', async () => {
      prismaMock.category.findFirst.mockResolvedValue(buildCategory() as any);
      prismaMock.judge.findFirst.mockResolvedValue(null);

      await expect(
        service.createRequest({
          judgeId: 'nonexistent',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'BOARD',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when the user role is not BOARD or ADMIN', async () => {
      prismaMock.category.findFirst.mockResolvedValue(buildCategory() as any);
      prismaMock.judge.findFirst.mockResolvedValue(buildJudge() as any);

      await expect(
        service.createRequest({
          judgeId: 'j1',
          categoryId: 'cat1',
          reason: 'Test',
          requestedBy: 'u1',
          userRole: 'JUDGE',
          tenantId: TEST_TENANT_ID,
        })
      ).rejects.toThrow('Only Board and Admin can initiate score removal requests');
    });

    it('should allow ADMIN role to create requests', async () => {
      prismaMock.category.findFirst.mockResolvedValue(buildCategory() as any);
      prismaMock.judge.findFirst.mockResolvedValue(buildJudge() as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue(
        buildScoreRemovalRequest({ category: { id: 'cat1', name: 'Solo' } }) as any
      );

      await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: 'Test',
        requestedBy: 'u1',
        userRole: 'ADMIN',
        tenantId: TEST_TENANT_ID,
      });

      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalled();
    });

    it('should trim reason text and capture board role snapshot', async () => {
      prismaMock.category.findFirst.mockResolvedValue(buildCategory() as any);
      prismaMock.judge.findFirst.mockResolvedValue(buildJudge() as any);
      prismaMock.scoreRemovalRequest.create.mockResolvedValue(
        buildScoreRemovalRequest({
          reason: 'Test reason',
          boardRoleSnapshot: 'Chair',
          category: { id: 'cat1', name: 'Solo' },
        }) as any
      );

      await service.createRequest({
        judgeId: 'j1',
        categoryId: 'cat1',
        reason: '  Test reason  ',
        requestedBy: 'u1',
        userRole: 'BOARD',
        boardRole: 'Chair',
        tenantId: TEST_TENANT_ID,
      });

      expect(prismaMock.scoreRemovalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Test reason',
            boardRoleSnapshot: 'Chair',
          }),
        })
      );
    });
  });

  describe('getAll', () => {
    it('should retrieve all score removal requests', async () => {
      const mockRequests = [buildScoreRemovalRequest()];

      prismaMock.scoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);

      const result = await service.getAll(TEST_TENANT_ID);

      expect(result).toEqual(mockRequests);
      expect(prismaMock.scoreRemovalRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TEST_TENANT_ID },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      prismaMock.scoreRemovalRequest.findMany.mockResolvedValue([]);

      await service.getAll(TEST_TENANT_ID, 'PENDING');

      expect(prismaMock.scoreRemovalRequest.findMany).toHaveBeenCalledWith({
        where: { tenantId: TEST_TENANT_ID, status: 'PENDING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getById', () => {
    it('should retrieve a specific request by ID', async () => {
      const mockRequest = buildScoreRemovalRequest();

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);

      const result = await service.getById('req1', TEST_TENANT_ID);

      expect(result).toEqual(mockRequest);
    });

    it('should throw NotFoundError when the request does not exist', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(null);

      await expect(service.getById('nonexistent', TEST_TENANT_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('signRequest', () => {
    it('should add an auditor signature', async () => {
      const mockRequest = buildScoreRemovalRequest();
      const updated = buildScoreRemovalRequest({
        auditorSignature: 'Dr. Smith',
        auditorSignedBy: 'u1',
        auditorSignedAt: BASE_TIME,
      });

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(updated as any);

      const result = await service.signRequest('req1', TEST_TENANT_ID, {
        signatureName: 'Dr. Smith',
        userId: 'u1',
        userRole: 'AUDITOR',
      });

      expect(result.request.auditorSignature).toBe('Dr. Smith');
      expect(result.allSigned).toBe(false);
    });

    it('should add a tally master signature', async () => {
      const mockRequest = buildScoreRemovalRequest();

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          tallySignature: 'J. Doe',
          tallySignedBy: 'u2',
          tallySignedAt: BASE_TIME,
        }) as any
      );

      await service.signRequest('req1', TEST_TENANT_ID, {
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

    it('should add a board signature and board role snapshot', async () => {
      const mockRequest = buildScoreRemovalRequest();

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          boardSignature: 'Board Member',
          boardRoleSnapshot: 'Chair',
          boardSignedBy: 'u3',
          boardSignedAt: BASE_TIME,
        }) as any
      );

      await service.signRequest('req1', TEST_TENANT_ID, {
        signatureName: 'Board Member',
        userId: 'u3',
        userRole: 'BOARD',
        boardRole: 'Chair',
      });

      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          boardSignature: 'Board Member',
          boardRoleSnapshot: 'Chair',
          boardSignedAt: expect.any(Date),
          boardSignedBy: 'u3',
        }),
        include: expect.any(Object),
      });
    });

    it('should auto-approve when all three signatures are present', async () => {
      const mockRequest = buildScoreRemovalRequest({
        auditorSignature: 'Dr. Smith',
        tallySignature: 'J. Doe',
      });

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          auditorSignature: 'Dr. Smith',
          tallySignature: 'J. Doe',
          boardSignature: 'Board Member',
          status: 'APPROVED',
        }) as any
      );

      const result = await service.signRequest('req1', TEST_TENANT_ID, {
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

    it('should throw ValidationError when the signature name is missing', async () => {
      await expect(
        service.signRequest('req1', TEST_TENANT_ID, {
          signatureName: '',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('Signature name is required');
    });

    it('should throw NotFoundError when the request does not exist', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.signRequest('nonexistent', TEST_TENANT_ID, {
          signatureName: 'Test',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when the request is already approved', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(
        buildScoreRemovalRequest({ status: 'APPROVED' }) as any
      );

      await expect(
        service.signRequest('req1', TEST_TENANT_ID, {
          signatureName: 'Test',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('Request has already been approved');
    });

    it('should throw ValidationError when the role already signed', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(
        buildScoreRemovalRequest({ auditorSignature: 'Dr. Smith' }) as any
      );

      await expect(
        service.signRequest('req1', TEST_TENANT_ID, {
          signatureName: 'Another Name',
          userId: 'u1',
          userRole: 'AUDITOR',
        })
      ).rejects.toThrow('You have already signed this request or your signature is not required');
    });

    it('should maintain partial approval state', async () => {
      const mockRequest = buildScoreRemovalRequest({ auditorSignature: 'Dr. Smith' });

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          auditorSignature: 'Dr. Smith',
          tallySignature: 'J. Doe',
        }) as any
      );

      const result = await service.signRequest('req1', TEST_TENANT_ID, {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(result.allSigned).toBe(false);
    });
  });

  describe('executeRemoval', () => {
    it('should execute score removal when approved', async () => {
      const mockRequest = buildScoreRemovalRequest({
        status: 'APPROVED',
        judge: { id: 'j1', name: 'Judge One', email: 'judge@example.com', tenantId: TEST_TENANT_ID },
        category: { id: 'cat1', name: 'Solo' },
      });

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.score.deleteMany.mockResolvedValue({ count: 5 } as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(mockRequest as any);

      const result = await service.executeRemoval('req1', TEST_TENANT_ID);

      expect(result.deletedCount).toBe(5);
      expect(prismaMock.score.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'cat1',
          judgeId: 'j1',
          tenantId: TEST_TENANT_ID,
        },
      });
      expect(prismaMock.scoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'APPROVED' },
      });
    });

    it('should throw NotFoundError when the request does not exist', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(null);

      await expect(service.executeRemoval('nonexistent', TEST_TENANT_ID)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ValidationError when the request is not approved', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(
        buildScoreRemovalRequest({ status: 'PENDING' }) as any
      );

      await expect(service.executeRemoval('req1', TEST_TENANT_ID)).rejects.toThrow(
        'Request must be approved before execution'
      );
    });

    it('should handle zero scores deleted', async () => {
      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(
        buildScoreRemovalRequest({ status: 'APPROVED', category: { id: 'cat1', name: 'Solo' } }) as any
      );
      prismaMock.score.deleteMany.mockResolvedValue({ count: 0 } as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue({} as any);

      const result = await service.executeRemoval('req1', TEST_TENANT_ID);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('signature workflow integration', () => {
    it('should require all three signatures before auto-approval', async () => {
      const mockRequest = buildScoreRemovalRequest({
        auditorSignature: 'Dr. Smith',
      });

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          auditorSignature: 'Dr. Smith',
          tallySignature: 'J. Doe',
          status: 'PENDING',
        }) as any
      );

      const result = await service.signRequest('req1', TEST_TENANT_ID, {
        signatureName: 'J. Doe',
        userId: 'u2',
        userRole: 'TALLY_MASTER',
      });

      expect(result.allSigned).toBe(false);
      expect(result.request.status).toBe('PENDING');
    });

    it('should track signature timestamps', async () => {
      const mockRequest = buildScoreRemovalRequest();

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          auditorSignature: 'Dr. Smith',
          auditorSignedAt: BASE_TIME,
        }) as any
      );

      await service.signRequest('req1', TEST_TENANT_ID, {
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
      const mockRequest = buildScoreRemovalRequest();

      prismaMock.scoreRemovalRequest.findFirst.mockResolvedValue(mockRequest as any);
      prismaMock.scoreRemovalRequest.update.mockResolvedValue(
        buildScoreRemovalRequest({
          tallySignature: 'J. Doe',
          tallySignedBy: 'u2',
        }) as any
      );

      await service.signRequest('req1', TEST_TENANT_ID, {
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
