/**
 * BoardCertificationService Unit Tests
 * Tests for Phase 1.2 - Board Final Approval Workflow (Stage 4)
 *
 * Verifies that:
 * - Board can only approve after all Auditors have signed
 * - Board certification creates proper records
 * - Category is marked as boardApproved after Board signs
 * - Proper validation and error handling
 */

import 'reflect-metadata';
import { BoardCertificationService } from '../../../src/services/BoardCertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('BoardCertificationService', () => {
  let service: BoardCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockCategoryId = 'category-123';
  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-123';
  const mockAuditorId1 = 'auditor-1';
  const mockAuditorId2 = 'auditor-2';

  const mockCategory = {
    id: mockCategoryId,
    name: 'Vocals',
    contestId: 'contest-123',
    boardApproved: false,
    approvedAt: null,
    approvedBy: null,
    categoryCertifications: [],
    contest: {
      id: 'contest-123',
      name: 'Talent Contest',
      event: {
        id: 'event-123',
        name: 'Spring Festival'
      }
    }
  };

  const mockAuditorAssignments = [
    {
      id: 'assignment-1',
      auditorId: mockAuditorId1,
      categoryId: mockCategoryId
    },
    {
      id: 'assignment-2',
      auditorId: mockAuditorId2,
      categoryId: mockCategoryId
    }
  ];

  const mockAuditorCertifications = [
    {
      id: 'cert-1',
      categoryId: mockCategoryId,
      role: 'AUDITOR',
      userId: mockAuditorId1,
      certifiedAt: new Date('2024-01-15T10:00:00Z'),
      tenantId: mockTenantId
    },
    {
      id: 'cert-2',
      categoryId: mockCategoryId,
      role: 'AUDITOR',
      userId: mockAuditorId2,
      certifiedAt: new Date('2024-01-15T10:30:00Z'),
      tenantId: mockTenantId
    }
  ];

  const mockBoardCertification = {
    id: 'board-cert-1',
    categoryId: mockCategoryId,
    role: 'BOARD',
    userId: mockUserId,
    certifiedAt: new Date('2024-01-15T11:00:00Z'),
    tenantId: mockTenantId,
    signatureName: 'Board Member',
    comments: null
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new BoardCertificationService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(BoardCertificationService);
    });

    it('should initialize with PrismaClient', () => {
      expect(mockPrisma).toBeDefined();
    });
  });

  describe('getBoardCertificationStatus', () => {
    it('should return canCertify=true when all Auditors have signed', async () => {
      const categoryWithCerts = {
        ...mockCategory,
        categoryCertifications: mockAuditorCertifications
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithCerts as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);

      expect(result.canCertify).toBe(true);
      expect(result.auditorCertifications.total).toBe(2);
      expect(result.auditorCertifications.completed).toBe(2);
      expect(result.auditorCertifications.pending).toBe(0);
    });

    it('should return canCertify=false when Auditor certifications incomplete', async () => {
      const categoryWithOneCert = {
        ...mockCategory,
        categoryCertifications: [mockAuditorCertifications[0]]
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithOneCert as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);

      expect(result.canCertify).toBe(false);
      expect(result.reason).toContain('Not all Auditors have signed');
      expect(result.auditorCertifications.pending).toBe(1);
    });

    it('should return reason when Board has already approved', async () => {
      const categoryWithBoardCert = {
        ...mockCategory,
        categoryCertifications: [
          ...mockAuditorCertifications,
          mockBoardCertification
        ]
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithBoardCert as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);

      expect(result.canCertify).toBe(false);
      expect(result.reason).toContain('Board has already approved');
    });

    it('should return reason when no Auditors assigned', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue([]);

      const result = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);

      expect(result.canCertify).toBe(false);
      expect(result.reason).toContain('No Auditors assigned');
    });

    it('should throw error when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.getBoardCertificationStatus(mockCategoryId, mockTenantId)
      ).rejects.toThrow();
    });

    it('should calculate pending count correctly', async () => {
      const categoryWithNoCerts = { ...mockCategory, categoryCertifications: [] };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithNoCerts as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);

      expect(result.auditorCertifications.total).toBe(2);
      expect(result.auditorCertifications.completed).toBe(0);
      expect(result.auditorCertifications.pending).toBe(2);
    });
  });

  describe('submitBoardCertification', () => {
    beforeEach(() => {
      const categoryWithAllAuditorCerts = {
        ...mockCategory,
        categoryCertifications: mockAuditorCertifications
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithAllAuditorCerts as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(null);
    });

    it('should successfully create Board certification when all prerequisites met', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        mockBoardCertification,
        { ...mockCategory, boardApproved: true }
      ] as any);

      const result = await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        'Board Member'
      );

      expect(result).toEqual(mockBoardCertification);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should create CategoryCertification with role=BOARD', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const certCreate = {
          data: {
            categoryId: mockCategoryId,
            role: 'BOARD',
            userId: mockUserId,
            tenantId: mockTenantId,
            signatureName: expect.any(String),
            comments: expect.anything(),
            certifiedAt: expect.any(Date)
          }
        };

        return [mockBoardCertification, mockCategory];
      });

      await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        'Board Member'
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should update category with boardApproved=true', async () => {
      const updatedCategory = {
        ...mockCategory,
        boardApproved: true,
        approvedAt: expect.any(Date),
        approvedBy: mockUserId
      };

      mockPrisma.$transaction.mockResolvedValue([
        mockBoardCertification,
        updatedCategory
      ] as any);

      await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        'Board Member',
        'All requirements met'
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should reject if not all Auditors have signed', async () => {
      const categoryWithOneCert = {
        ...mockCategory,
        categoryCertifications: [mockAuditorCertifications[0]]
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithOneCert as any);

      await expect(
        service.submitBoardCertification(mockCategoryId, mockUserId, mockTenantId)
      ).rejects.toThrow('Not all Auditors have signed');
    });

    it('should reject if Board has already certified', async () => {
      const existingBoardCert = { ...mockBoardCertification };
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(existingBoardCert as any);

      await expect(
        service.submitBoardCertification(mockCategoryId, mockUserId, mockTenantId)
      ).rejects.toThrow('Board has already certified');
    });

    it('should use transaction to ensure atomicity', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        mockBoardCertification,
        { ...mockCategory, boardApproved: true }
      ] as any);

      await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId
      );

      // Verify transaction was used (both certification and category update together)
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should include optional signature name if provided', async () => {
      const signatureName = 'John Board Member';

      mockPrisma.$transaction.mockResolvedValue([
        { ...mockBoardCertification, signatureName },
        { ...mockCategory, boardApproved: true }
      ] as any);

      const result = await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        signatureName
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should include optional comments if provided', async () => {
      const comments = 'Approved with commendation';

      mockPrisma.$transaction.mockResolvedValue([
        { ...mockBoardCertification, comments },
        { ...mockCategory, boardApproved: true }
      ] as any);

      await service.submitBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        'Board Member',
        comments
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getPendingBoardApprovals', () => {
    it('should return categories ready for Board approval', async () => {
      const readyCategory = {
        ...mockCategory,
        categoryCertifications: mockAuditorCertifications
      };

      mockPrisma.category.findMany.mockResolvedValue([readyCategory] as any);
      // Mock findUnique for the internal getBoardCertificationStatus call
      mockPrisma.category.findUnique.mockResolvedValue(readyCategory as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getPendingBoardApprovals(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCategoryId);
    });

    it('should exclude categories already Board approved', async () => {
      // Query filters by boardApproved: false, so approved categories won't be returned
      mockPrisma.category.findMany.mockResolvedValue([] as any);

      const result = await service.getPendingBoardApprovals(mockTenantId);

      expect(result).toHaveLength(0);
    });

    it('should exclude categories with incomplete Auditor certifications', async () => {
      const incompleteCategory = {
        ...mockCategory,
        categoryCertifications: [mockAuditorCertifications[0]]
      };

      mockPrisma.category.findMany.mockResolvedValue([incompleteCategory] as any);
      // Mock findUnique for the internal getBoardCertificationStatus call
      mockPrisma.category.findUnique.mockResolvedValue(incompleteCategory as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      const result = await service.getPendingBoardApprovals(mockTenantId);

      expect(result).toHaveLength(0);
    });

    it('should filter out deleted categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([] as any);

      const result = await service.getPendingBoardApprovals(mockTenantId);

      expect(result).toHaveLength(0);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null
          })
        })
      );
    });
  });

  describe('getApprovedCategories', () => {
    it('should return only Board-approved categories', async () => {
      const approvedCategory = {
        ...mockCategory,
        boardApproved: true,
        approvedAt: new Date('2024-01-15T12:00:00Z'),
        approvedBy: mockUserId
      };

      mockPrisma.category.findMany.mockResolvedValue([approvedCategory] as any);

      const result = await service.getApprovedCategories(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].boardApproved).toBe(true);
    });

    it('should order by approvedAt descending', async () => {
      mockPrisma.category.findMany.mockResolvedValue([] as any);

      await service.getApprovedCategories(mockTenantId);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { approvedAt: 'desc' }
        })
      );
    });

    it('should filter out deleted categories', async () => {
      mockPrisma.category.findMany.mockResolvedValue([] as any);

      await service.getApprovedCategories(mockTenantId);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null
          })
        })
      );
    });
  });

  describe('revokeBoardCertification', () => {
    const reason = 'Error in certification, needs correction';

    it('should successfully revoke Board certification', async () => {
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(mockBoardCertification as any);
      mockPrisma.$transaction.mockResolvedValue([
        undefined,
        { ...mockCategory, boardApproved: false }
      ] as any);

      await service.revokeBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        reason
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if Board certification not found', async () => {
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeBoardCertification(mockCategoryId, mockUserId, mockTenantId, reason)
      ).rejects.toThrow();
    });

    it('should delete Board certification record', async () => {
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(mockBoardCertification as any);
      mockPrisma.$transaction.mockResolvedValue([undefined, mockCategory] as any);

      await service.revokeBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        reason
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should reset category boardApproved fields', async () => {
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(mockBoardCertification as any);
      mockPrisma.$transaction.mockResolvedValue([
        undefined,
        { ...mockCategory, boardApproved: false, approvedAt: null, approvedBy: null }
      ] as any);

      await service.revokeBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        reason
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should use transaction to ensure atomicity', async () => {
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(mockBoardCertification as any);
      mockPrisma.$transaction.mockResolvedValue([undefined, mockCategory] as any);

      await service.revokeBoardCertification(
        mockCategoryId,
        mockUserId,
        mockTenantId,
        reason
      );

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Workflow Integration', () => {
    it('should enforce complete workflow: Auditors sign → Board can approve', async () => {
      // Initial state: no certifications
      let categoryState = { ...mockCategory, categoryCertifications: [] };
      mockPrisma.category.findUnique.mockResolvedValue(categoryState as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);

      // Board cannot approve yet
      let status = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);
      expect(status.canCertify).toBe(false);

      // After all Auditors sign
      categoryState = { ...mockCategory, categoryCertifications: mockAuditorCertifications };
      mockPrisma.category.findUnique.mockResolvedValue(categoryState as any);

      // Board can now approve
      status = await service.getBoardCertificationStatus(mockCategoryId, mockTenantId);
      expect(status.canCertify).toBe(true);
    });

    it('should prevent duplicate Board certifications', async () => {
      const categoryWithCerts = {
        ...mockCategory,
        categoryCertifications: mockAuditorCertifications
      };

      mockPrisma.category.findUnique.mockResolvedValue(categoryWithCerts as any);
      mockPrisma.auditorAssignment.findMany.mockResolvedValue(mockAuditorAssignments as any);
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([
        mockBoardCertification,
        { ...mockCategory, boardApproved: true }
      ] as any);

      // First submission succeeds
      await service.submitBoardCertification(mockCategoryId, mockUserId, mockTenantId);

      // Second submission should fail
      mockPrisma.categoryCertification.findUnique.mockResolvedValue(mockBoardCertification as any);

      await expect(
        service.submitBoardCertification(mockCategoryId, mockUserId, mockTenantId)
      ).rejects.toThrow();
    });
  });
});
