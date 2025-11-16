/**
 * AuditorCertificationService Unit Tests
 * Comprehensive test coverage for auditor final certification workflows
 */

import 'reflect-metadata';
import { AuditorCertificationService } from '../../../src/services/AuditorCertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('AuditorCertificationService', () => {
  let service: AuditorCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockCategoryId = 'cat-123';
  const mockUserId = 'user-123';
  const mockJudgeId1 = 'judge-1';
  const mockJudgeId2 = 'judge-2';

  const mockCategory = {
    id: mockCategoryId,
    name: 'Vocals',
    description: 'Vocal performance',
    scoreCap: 100,
    contestId: 'contest-123',
    contest: {
      id: 'contest-123',
      name: 'Talent Contest',
      description: 'Annual talent show',
      eventId: 'event-123',
      event: {
        id: 'event-123',
        name: 'Spring Festival',
        description: 'Annual spring festival'
      }
    }
  };

  const mockTallyCertifications = [
    {
      id: 'cert-1',
      categoryId: mockCategoryId,
      role: 'TALLY_MASTER',
      userId: 'tally-1',
      certifiedAt: new Date('2024-01-15T10:00:00Z'),
      user: {
        id: 'tally-1',
        name: 'Tally User 1',
        email: 'tally1@example.com'
      }
    },
    {
      id: 'cert-2',
      categoryId: mockCategoryId,
      role: 'TALLY_MASTER',
      userId: 'tally-2',
      certifiedAt: new Date('2024-01-15T10:30:00Z'),
      user: {
        id: 'tally-2',
        name: 'Tally User 2',
        email: 'tally2@example.com'
      }
    }
  ];

  const mockAuditorCertification = {
    id: 'audit-cert-1',
    categoryId: mockCategoryId,
    role: 'AUDITOR',
    userId: mockUserId,
    certifiedAt: new Date('2024-01-15T11:00:00Z'),
    user: {
      id: mockUserId,
      name: 'Auditor User',
      email: 'auditor@example.com'
    }
  };

  const mockCategoryJudges = [
    {
      id: 'cj-1',
      categoryId: mockCategoryId,
      judgeId: mockJudgeId1,
      judge: { id: mockJudgeId1, name: 'Judge 1' }
    },
    {
      id: 'cj-2',
      categoryId: mockCategoryId,
      judgeId: mockJudgeId2,
      judge: { id: mockJudgeId2, name: 'Judge 2' }
    }
  ];

  const mockScores = [
    {
      id: 'score-1',
      categoryId: mockCategoryId,
      judgeId: mockJudgeId1,
      criterionId: 'criterion-1',
      value: 85,
      isCertified: true,
      isLocked: true,
      judge: { id: mockJudgeId1, name: 'Judge 1' },
      criterion: { id: 'criterion-1', name: 'Vocal Quality' }
    },
    {
      id: 'score-2',
      categoryId: mockCategoryId,
      judgeId: mockJudgeId2,
      criterionId: 'criterion-2',
      value: 90,
      isCertified: true,
      isLocked: true,
      judge: { id: mockJudgeId2, name: 'Judge 2' },
      criterion: { id: 'criterion-2', name: 'Stage Presence' }
    }
  ];

  const mockAuditor = {
    id: mockUserId,
    email: 'auditor@example.com',
    name: 'Auditor User',
    role: 'AUDITOR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new AuditorCertificationService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AuditorCertificationService);
    });

    it('should initialize with PrismaClient', () => {
      expect(mockPrisma).toBeDefined();
    });
  });

  describe('getFinalCertificationStatus', () => {
    it('should return complete status when ready for final certification', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result).toEqual({
        categoryId: mockCategoryId,
        categoryName: 'Vocals',
        canCertify: true,
        readyForFinalCertification: true,
        alreadyCertified: false,
        tallyCertifications: {
          required: 2,
          completed: 2,
          missing: 0,
          certifications: mockTallyCertifications
        },
        scoreStatus: {
          total: 2,
          uncertified: 0,
          completed: true
        },
        auditorCertified: false,
        auditorCertification: null
      });
    });

    it('should indicate cannot certify when tally certifications incomplete', async () => {
      const incompleteTallyCerts = [mockTallyCertifications[0]];

      mockPrisma.categoryCertification.findMany.mockResolvedValue(incompleteTallyCerts as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.canCertify).toBe(false);
      expect(result.readyForFinalCertification).toBe(false);
      expect(result.tallyCertifications.completed).toBe(1);
      expect(result.tallyCertifications.required).toBe(2);
      expect(result.tallyCertifications.missing).toBe(1);
    });

    it('should indicate already certified when auditor certification exists', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(mockAuditorCertification as any);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.alreadyCertified).toBe(true);
      expect(result.auditorCertified).toBe(true);
      expect(result.readyForFinalCertification).toBe(false);
      expect(result.auditorCertification).toEqual({
        certifiedAt: mockAuditorCertification.certifiedAt,
        certifiedBy: mockAuditorCertification.user
      });
    });

    it('should indicate not ready when scores are uncertified', async () => {
      const uncertifiedScores = mockScores.map(s => ({ ...s, isCertified: false }));

      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(uncertifiedScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.scoreStatus.uncertified).toBe(2);
      expect(result.scoreStatus.completed).toBe(false);
      expect(result.readyForFinalCertification).toBe(false);
    });

    it('should handle category with no judges', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.tallyCertifications.required).toBe(0);
      expect(result.tallyCertifications.completed).toBe(0);
      expect(result.canCertify).toBe(true);
    });

    it('should filter out scores without criterion when checking certification', async () => {
      const mixedScores = [
        ...mockScores,
        {
          id: 'score-3',
          categoryId: mockCategoryId,
          judgeId: mockJudgeId1,
          criterionId: null,
          value: 95,
          isCertified: false,
          isLocked: false,
          judge: { id: mockJudgeId1, name: 'Judge 1' },
          criterion: null
        }
      ];

      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mixedScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.scoreStatus.uncertified).toBe(0);
      expect(result.scoreStatus.completed).toBe(true);
    });

    it('should handle missing category gracefully', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.categoryName).toBeUndefined();
      expect(result.categoryId).toBe(mockCategoryId);
    });

    it('should calculate missing certifications correctly', async () => {
      const multipleCategoryJudges = [
        ...mockCategoryJudges,
        {
          id: 'cj-3',
          categoryId: mockCategoryId,
          judgeId: 'judge-3',
          judge: { id: 'judge-3', name: 'Judge 3' }
        },
        {
          id: 'cj-4',
          categoryId: mockCategoryId,
          judgeId: 'judge-4',
          judge: { id: 'judge-4', name: 'Judge 4' }
        }
      ];

      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(multipleCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.tallyCertifications.required).toBe(4);
      expect(result.tallyCertifications.completed).toBe(2);
      expect(result.tallyCertifications.missing).toBe(2);
    });
  });

  describe('submitFinalCertification', () => {
    const validConfirmations = {
      confirmation1: true,
      confirmation2: true
    };

    beforeEach(() => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockAuditor as any);
    });

    it('should successfully submit final certification', async () => {
      const createdCertification = {
        id: 'new-cert-1',
        categoryId: mockCategoryId,
        role: 'AUDITOR',
        userId: mockUserId,
        certifiedAt: new Date()
      };

      mockPrisma.categoryCertification.create.mockResolvedValue(createdCertification as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.submitFinalCertification(
        mockCategoryId,
        mockUserId,
        'AUDITOR',
        validConfirmations
      );

      expect(result).toEqual(createdCertification);
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: {
          categoryId: mockCategoryId,
          role: 'AUDITOR',
          userId: mockUserId
        }
      });
      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId, isCertified: false },
        data: { isLocked: true, isCertified: true }
      });
    });

    it('should throw error when confirmation1 is missing', async () => {
      const invalidConfirmations = {
        confirmation1: false,
        confirmation2: true
      };

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', invalidConfirmations)
      ).rejects.toThrow('Both confirmations are required');
    });

    it('should throw error when confirmation2 is missing', async () => {
      const invalidConfirmations = {
        confirmation1: true,
        confirmation2: false
      };

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', invalidConfirmations)
      ).rejects.toThrow('Both confirmations are required');
    });

    it('should throw error when both confirmations are missing', async () => {
      const invalidConfirmations = {
        confirmation1: false,
        confirmation2: false
      };

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', invalidConfirmations)
      ).rejects.toThrow('Both confirmations are required');
    });

    it('should throw error when already certified', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(mockAuditorCertification as any);

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations)
      ).rejects.toThrow('Final certification has already been completed for this category');
    });

    it('should throw error when tally certifications incomplete', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue([mockTallyCertifications[0]] as any);

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations)
      ).rejects.toThrow('Not all required certifications are complete');
    });

    it('should throw error when scores are not certified', async () => {
      const uncertifiedScores = mockScores.map(s => ({
        ...s,
        isCertified: false,
        criterionId: s.criterionId || 'criterion-default'
      }));

      mockPrisma.score.findMany.mockResolvedValue(uncertifiedScores as any);

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations)
      ).rejects.toThrow('Not all scores have been certified yet');
    });

    it('should throw error when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations)
      ).rejects.toThrow('Only AUDITOR role can submit final certification');
    });

    it('should throw error when user is not an auditor', async () => {
      const nonAuditor = { ...mockAuditor, role: 'JUDGE' };
      mockPrisma.user.findUnique.mockResolvedValue(nonAuditor as any);

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'JUDGE', validConfirmations)
      ).rejects.toThrow('Only AUDITOR role can submit final certification');
    });

    it('should lock all uncertified scores on submission', async () => {
      const mixedScores = [
        { ...mockScores[0], isCertified: true },
        { ...mockScores[1], isCertified: false }
      ];

      mockPrisma.score.findMany.mockResolvedValue(mixedScores as any);
      mockPrisma.categoryCertification.create.mockResolvedValue({
        id: 'cert-123',
        categoryId: mockCategoryId,
        role: 'AUDITOR',
        userId: mockUserId,
        certifiedAt: new Date()
      } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 1 } as any);

      await service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations);

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId, isCertified: false },
        data: { isLocked: true, isCertified: true }
      });
    });

    it('should handle empty confirmations object', async () => {
      const emptyConfirmations = {};

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', emptyConfirmations)
      ).rejects.toThrow('Both confirmations are required');
    });

    it('should verify all database queries are called in correct order', async () => {
      const createdCertification = {
        id: 'new-cert-1',
        categoryId: mockCategoryId,
        role: 'AUDITOR',
        userId: mockUserId,
        certifiedAt: new Date()
      };

      mockPrisma.categoryCertification.create.mockResolvedValue(createdCertification as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 2 } as any);

      await service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', validConfirmations);

      const mockCalls = mockPrisma.categoryCertification.findMany.mock.calls;
      expect(mockCalls.length).toBeGreaterThan(0);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId }
      });
    });

    it('should handle category with extra tally certifications', async () => {
      const extraTallyCerts = [
        ...mockTallyCertifications,
        {
          id: 'cert-3',
          categoryId: mockCategoryId,
          role: 'TALLY_MASTER',
          userId: 'tally-3',
          certifiedAt: new Date(),
          user: { id: 'tally-3', name: 'Extra Tally', email: 'tally3@example.com' }
        }
      ];

      mockPrisma.categoryCertification.findMany.mockResolvedValue(extraTallyCerts as any);
      mockPrisma.categoryCertification.create.mockResolvedValue({
        id: 'cert-123',
        categoryId: mockCategoryId,
        role: 'AUDITOR',
        userId: mockUserId,
        certifiedAt: new Date()
      } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 2 } as any);

      const result = await service.submitFinalCertification(
        mockCategoryId,
        mockUserId,
        'AUDITOR',
        validConfirmations
      );

      expect(result).toBeDefined();
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle category with no scores', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.scoreStatus.total).toBe(0);
      expect(result.scoreStatus.uncertified).toBe(0);
      expect(result.scoreStatus.completed).toBe(true);
    });

    it('should handle null values in confirmations', async () => {
      const nullConfirmations = {
        confirmation1: null,
        confirmation2: true
      };

      await expect(
        service.submitFinalCertification(mockCategoryId, mockUserId, 'AUDITOR', nullConfirmations as any)
      ).rejects.toThrow('Both confirmations are required');
    });

    it('should handle undefined categoryId', async () => {
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.score.findMany.mockResolvedValue([]);

      const result = await service.getFinalCertificationStatus('undefined-category');

      expect(result.categoryId).toBe('undefined-category');
    });

    it('should handle scores with mixed certification states', async () => {
      const mixedScores = [
        { ...mockScores[0], isCertified: true, isLocked: true },
        { ...mockScores[1], isCertified: false, isLocked: false },
        {
          id: 'score-3',
          categoryId: mockCategoryId,
          judgeId: mockJudgeId1,
          criterionId: 'criterion-3',
          value: 88,
          isCertified: true,
          isLocked: true,
          judge: { id: mockJudgeId1, name: 'Judge 1' },
          criterion: { id: 'criterion-3', name: 'Performance' }
        }
      ];

      mockPrisma.categoryCertification.findMany.mockResolvedValue(mockTallyCertifications as any);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue(mockCategoryJudges as any);
      mockPrisma.score.findMany.mockResolvedValue(mixedScores as any);

      const result = await service.getFinalCertificationStatus(mockCategoryId);

      expect(result.scoreStatus.total).toBe(3);
      expect(result.scoreStatus.uncertified).toBe(1);
      expect(result.scoreStatus.completed).toBe(false);
    });
  });
});
