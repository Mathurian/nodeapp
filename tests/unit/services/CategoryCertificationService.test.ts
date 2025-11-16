/**
 * CategoryCertificationService Unit Tests
 * Comprehensive tests for category certification service
 */

import 'reflect-metadata';
import { CategoryCertificationService } from '../../../src/services/CategoryCertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('CategoryCertificationService', () => {
  let service: CategoryCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockCategoryContestant = {
    id: 'cc-1',
    categoryId: 'category-1',
    contestantId: 'contestant-1',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    contestant: {
      id: 'contestant-1',
      name: 'John Doe',
      age: 12,
      school: 'Lincoln School',
      bio: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockCategoryJudge = {
    id: 'cj-1',
    categoryId: 'category-1',
    judgeId: 'judge-1',
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    judge: {
      id: 'judge-1',
      name: 'Judge Smith',
      bio: 'Experienced judge',
      specialties: ['Dance'],
      certifications: ['Level 1'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockJudgeContestantCert = {
    id: 'jcc-1',
    judgeId: 'judge-1',
    contestantId: 'contestant-1',
    categoryId: 'category-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryCertification = {
    id: 'cert-1',
    categoryId: 'category-1',
    role: 'JUDGE',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CategoryCertificationService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getCertificationProgress', () => {
    it('should get certification progress for a category', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        mockCategoryContestant,
        { ...mockCategoryContestant, id: 'cc-2', contestantId: 'contestant-2' } as any,
      ]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([
        mockCategoryJudge,
        { ...mockCategoryJudge, id: 'cj-2', judgeId: 'judge-2' } as any,
      ]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
      ]);
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'TALLY_MASTER' })
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'AUDITOR' });
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        { ...mockCategoryCertification, role: 'BOARD' },
      ]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.categoryId).toBe('category-1');
      expect(result.judgeProgress.totalContestants).toBe(2);
      expect(result.judgeProgress.contestantsCertified).toBe(1);
      expect(result.judgeProgress.isCategoryCertified).toBe(false);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(true);
      expect(result.auditorProgress.isCategoryCertified).toBe(true);
      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });

    it('should show fully certified category', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([mockCategoryContestant]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([mockCategoryJudge]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
      ]);
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'TALLY_MASTER' })
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'AUDITOR' });
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        { ...mockCategoryCertification, role: 'BOARD' },
      ]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(true);
    });

    it('should handle category with no contestants', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([mockCategoryJudge]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.totalContestants).toBe(0);
      expect(result.judgeProgress.isCategoryCertified).toBe(true);
    });

    it('should handle category with no judges', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([mockCategoryContestant]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(true);
    });

    it('should handle category with no tally master certification', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([mockCategoryContestant]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([mockCategoryJudge]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
      ]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.tallyMasterProgress.isCategoryCertified).toBe(false);
      expect(result.auditorProgress.isCategoryCertified).toBe(false);
      expect(result.boardProgress.isCategoryCertified).toBe(false);
    });

    it('should calculate judge progress correctly with multiple judges', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        mockCategoryContestant,
        { ...mockCategoryContestant, id: 'cc-2', contestantId: 'contestant-2' } as any,
      ]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([
        mockCategoryJudge,
        { ...mockCategoryJudge, id: 'cj-2', judgeId: 'judge-2' } as any,
        { ...mockCategoryJudge, id: 'cj-3', judgeId: 'judge-3' } as any,
      ]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
        { ...mockJudgeContestantCert, id: 'jcc-2', judgeId: 'judge-2' },
        { ...mockJudgeContestantCert, id: 'jcc-3', judgeId: 'judge-3' },
      ]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.contestantsCertified).toBe(3);
      expect(result.judgeProgress.totalContestants).toBe(2);
      expect(result.judgeProgress.isCategoryCertified).toBe(false); // 3 out of 6 needed
    });

    it('should handle multiple board certifications', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([mockCategoryContestant]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([mockCategoryJudge]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
      ]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        { ...mockCategoryCertification, role: 'BOARD', userId: 'board-1' },
        { ...mockCategoryCertification, role: 'ORGANIZER', userId: 'org-1' },
        { ...mockCategoryCertification, role: 'ADMIN', userId: 'admin-1' },
      ]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });
  });

  describe('certifyCategory', () => {
    it('should certify a category for a role', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.create.mockResolvedValue(mockCategoryCertification);

      const result = await service.certifyCategory('category-1', 'user-1', 'JUDGE');

      expect(result).toEqual(mockCategoryCertification);
      expect(mockPrisma.categoryCertification.findFirst).toHaveBeenCalledWith({
        where: { categoryId: 'category-1', role: 'JUDGE' },
      });
      expect(mockPrisma.categoryCertification.create).toHaveBeenCalledWith({
        data: {
          categoryId: 'category-1',
          role: 'JUDGE',
          userId: 'user-1',
        },
      });
    });

    it('should certify with different roles', async () => {
      const roles = ['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ADMIN'];

      for (const role of roles) {
        mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
        mockPrisma.categoryCertification.create.mockResolvedValue({
          ...mockCategoryCertification,
          role,
        } as any);

        const result = await service.certifyCategory('category-1', 'user-1', role);

        expect(result.role).toBe(role);
      }
    });

    it('should throw error when already certified', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(mockCategoryCertification);

      await expect(service.certifyCategory('category-1', 'user-1', 'JUDGE')).rejects.toThrow(
        'Category already certified for this role'
      );

      expect(mockPrisma.categoryCertification.create).not.toHaveBeenCalled();
    });

    it('should allow certification by different users for different roles', async () => {
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.categoryCertification.create
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'JUDGE', userId: 'user-1' })
        .mockResolvedValueOnce({
          ...mockCategoryCertification,
          role: 'TALLY_MASTER',
          userId: 'user-2',
        });

      const result1 = await service.certifyCategory('category-1', 'user-1', 'JUDGE');
      const result2 = await service.certifyCategory('category-1', 'user-2', 'TALLY_MASTER');

      expect(result1.userId).toBe('user-1');
      expect(result2.userId).toBe('user-2');
    });

    it('should handle database errors during certification', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.create.mockRejectedValue(new Error('Database error'));

      await expect(service.certifyCategory('category-1', 'user-1', 'JUDGE')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getCertificationProgress', async () => {
      mockPrisma.categoryContestant.findMany.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getCertificationProgress('category-1')).rejects.toThrow(
        'Connection failed'
      );
    });

    it('should handle invalid category IDs', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('invalid-id');

      expect(result.categoryId).toBe('invalid-id');
      expect(result.judgeProgress.totalContestants).toBe(0);
    });

    it('should handle null values gracefully', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result).toBeDefined();
      expect(result.judgeProgress.isCategoryCertified).toBe(true);
    });
  });

  describe('certification workflow', () => {
    it('should track certification workflow stages', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([mockCategoryContestant]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([mockCategoryJudge]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        mockJudgeContestantCert,
      ]);

      // Stage 1: Judge certification complete
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      let result = await service.getCertificationProgress('category-1');
      expect(result.judgeProgress.isCategoryCertified).toBe(true);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(false);

      // Stage 2: Tally Master certification added
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'TALLY_MASTER' })
        .mockResolvedValueOnce(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      result = await service.getCertificationProgress('category-1');
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(true);
      expect(result.auditorProgress.isCategoryCertified).toBe(false);

      // Stage 3: Auditor certification added
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'TALLY_MASTER' })
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'AUDITOR' });
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      result = await service.getCertificationProgress('category-1');
      expect(result.auditorProgress.isCategoryCertified).toBe(true);
      expect(result.boardProgress.isCategoryCertified).toBe(false);

      // Stage 4: Board certification added
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'TALLY_MASTER' })
        .mockResolvedValueOnce({ ...mockCategoryCertification, role: 'AUDITOR' });
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        { ...mockCategoryCertification, role: 'BOARD' },
      ]);

      result = await service.getCertificationProgress('category-1');
      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });

    it('should prevent duplicate certifications for same role', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(mockCategoryCertification);

      await expect(service.certifyCategory('category-1', 'user-1', 'JUDGE')).rejects.toThrow(
        'Category already certified for this role'
      );

      await expect(service.certifyCategory('category-1', 'user-2', 'JUDGE')).rejects.toThrow(
        'Category already certified for this role'
      );
    });
  });
});
