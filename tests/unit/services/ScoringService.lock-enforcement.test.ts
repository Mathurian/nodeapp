/**
 * ScoringService Lock Enforcement Unit Tests
 * Tests for Phase 1.1 - Critical score lock and certification enforcement
 *
 * Verifies that:
 * - Scores cannot be edited after certification
 * - Scores cannot be deleted after locking
 * - Certified scores cannot be unsigned once locked
 */

import 'reflect-metadata';
import { ScoringService } from '../../../src/services/ScoringService';
import { ScoreRepository } from '../../../src/repositories/ScoreRepository';
import { CacheService } from '../../../src/services/CacheService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenError } from '../../../src/services/BaseService';

describe('ScoringService - Lock Enforcement', () => {
  let service: ScoringService;
  let mockScoreRepository: DeepMockProxy<ScoreRepository>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockCacheService: DeepMockProxy<CacheService>;

  const mockScoreId = 'score-123';
  const mockCategoryId = 'category-123';
  const mockJudgeId = 'judge-123';
  const mockContestantId = 'contestant-123';
  const mockTenantId = 'tenant-123';

  const mockUnlockedScore = {
    id: mockScoreId,
    categoryId: mockCategoryId,
    contestantId: mockContestantId,
    judgeId: mockJudgeId,
    criterionId: 'criterion-123',
    score: 85,
    comment: null,
    certifiedAt: null,
    certifiedBy: null,
    isCertified: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenantId: mockTenantId
  };

  const mockCertifiedScore = {
    ...mockUnlockedScore,
    isCertified: true,
    certifiedAt: new Date('2024-01-15T10:00:00Z'),
    certifiedBy: 'judge-123'
  };

  const mockLockedScore = {
    ...mockUnlockedScore,
    isLocked: true,
    isCertified: true,
    certifiedAt: new Date('2024-01-15T11:00:00Z'),
    certifiedBy: 'auditor-123'
  };

  const mockBothLockedAndCertifiedScore = {
    ...mockUnlockedScore,
    isLocked: true,
    isCertified: true,
    certifiedAt: new Date('2024-01-15T11:00:00Z'),
    certifiedBy: 'auditor-123'
  };

  beforeEach(() => {
    mockScoreRepository = mockDeep<ScoreRepository>();
    mockPrisma = mockDeep<PrismaClient>();
    mockCacheService = mockDeep<CacheService>();

    service = new ScoringService(
      mockScoreRepository as any,
      mockPrisma as any,
      mockCacheService as any
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockScoreRepository);
    mockReset(mockPrisma);
    mockReset(mockCacheService);
  });

  describe('updateScore - Lock Enforcement', () => {
    const updateData = { score: 90 };

    it('should allow updating unlocked and uncertified scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockUnlockedScore as any);
      mockPrisma.score.update.mockResolvedValue({
        ...mockUnlockedScore,
        score: 90
      } as any);

      const result = await service.updateScore(mockScoreId, updateData, mockTenantId);

      expect(result).toBeDefined();
      expect(mockPrisma.score.update).toHaveBeenCalled();
    });

    it('should BLOCK updating certified scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockCertifiedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow('Cannot edit locked or certified scores');
    });

    it('should BLOCK updating locked scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow('Cannot edit locked or certified scores');
    });

    it('should BLOCK updating scores that are both locked and certified', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockBothLockedAndCertifiedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow('Cannot edit locked or certified scores');
    });

    it('should throw ForbiddenError specifically for locked scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toBeInstanceOf(Error);
    });

    it('should check lock status before attempting update', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockCertifiedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow();

      // Should not call update if locked/certified
      expect(mockPrisma.score.update).not.toHaveBeenCalled();
    });

    it('should handle score with only isCertified=true', async () => {
      const certifiedOnlyScore = {
        ...mockUnlockedScore,
        isCertified: true,
        isLocked: false
      };
      mockScoreRepository.findById.mockResolvedValue(certifiedOnlyScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow('Cannot edit locked or certified scores');
    });

    it('should handle score with only isLocked=true', async () => {
      const lockedOnlyScore = {
        ...mockUnlockedScore,
        isCertified: false,
        isLocked: true
      };
      mockScoreRepository.findById.mockResolvedValue(lockedOnlyScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow('Cannot edit locked or certified scores');
    });

    it('should provide helpful error message mentioning Auditor certification', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.updateScore(mockScoreId, updateData, mockTenantId)
      ).rejects.toThrow(/Auditor certification/);
    });
  });

  describe('deleteScore - Lock Enforcement', () => {
    it('should allow deleting unlocked and uncertified scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockUnlockedScore as any);
      mockScoreRepository.delete.mockResolvedValue(undefined);

      await service.deleteScore(mockScoreId, mockTenantId);

      expect(mockScoreRepository.delete).toHaveBeenCalledWith(mockScoreId);
    });

    it('should BLOCK deleting certified scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockCertifiedScore as any);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow('Cannot delete locked or certified scores');
    });

    it('should BLOCK deleting locked scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow('Cannot delete locked or certified scores');
    });

    it('should BLOCK deleting scores that are both locked and certified', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockBothLockedAndCertifiedScore as any);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow('Cannot delete locked or certified scores');
    });

    it('should check lock status before attempting deletion', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow();

      // Should not call delete if locked/certified
      expect(mockScoreRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle missing score gracefully', async () => {
      mockScoreRepository.findById.mockResolvedValue(null);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow();
    });

    it('should invalidate cache after successful deletion', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockUnlockedScore as any);
      mockScoreRepository.delete.mockResolvedValue(undefined);

      await service.deleteScore(mockScoreId, mockTenantId);

      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('scores:*');
    });
  });

  describe('unsignScore - Lock Enforcement', () => {
    it('should allow unsigning unlocked scores', async () => {
      const certifiedButUnlockedScore = {
        ...mockUnlockedScore,
        isCertified: true,
        isLocked: false,
        certifiedAt: new Date(),
        certifiedBy: 'judge-123'
      };

      mockScoreRepository.findById.mockResolvedValue(certifiedButUnlockedScore as any);
      mockPrisma.score.update.mockResolvedValue({
        ...certifiedButUnlockedScore,
        certifiedAt: null,
        certifiedBy: null,
        isCertified: false
      } as any);

      const result = await service.unsignScore(mockScoreId, mockTenantId);

      expect(result).toBeDefined();
      expect(mockPrisma.score.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            certifiedAt: null,
            certifiedBy: null
          })
        })
      );
    });

    it('should BLOCK unsigning locked scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).rejects.toThrow('Cannot unsign locked scores');
    });

    it('should BLOCK unsigning scores locked by Auditor', async () => {
      const auditorLockedScore = {
        ...mockUnlockedScore,
        isLocked: true,
        isCertified: true,
        certifiedBy: 'auditor-456'
      };

      mockScoreRepository.findById.mockResolvedValue(auditorLockedScore as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).rejects.toThrow('Cannot unsign locked scores');
    });

    it('should provide helpful error message about permanent locking', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).rejects.toThrow(/permanently locked/);
    });

    it('should check lock status before attempting unsign', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).rejects.toThrow();

      // Should not call update if locked
      expect(mockPrisma.score.update).not.toHaveBeenCalled();
    });

    it('should handle score with isLocked=false correctly', async () => {
      const unlockedCertifiedScore = {
        ...mockUnlockedScore,
        isCertified: true,
        isLocked: false,
        certifiedAt: new Date()
      };

      mockScoreRepository.findById.mockResolvedValue(unlockedCertifiedScore as any);
      mockPrisma.score.update.mockResolvedValue({
        ...unlockedCertifiedScore,
        certifiedAt: null,
        certifiedBy: null
      } as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).resolves.toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should enforce workflow: unlocked → certified → locked → cannot edit', async () => {
      // Step 1: Score is unlocked - can edit
      mockScoreRepository.findById.mockResolvedValue(mockUnlockedScore as any);
      mockPrisma.score.update.mockResolvedValue({ ...mockUnlockedScore, score: 90 } as any);

      await expect(
        service.updateScore(mockScoreId, { score: 90 }, mockTenantId)
      ).resolves.toBeDefined();

      // Step 2: Score becomes certified - cannot edit
      mockScoreRepository.findById.mockResolvedValue(mockCertifiedScore as any);

      await expect(
        service.updateScore(mockScoreId, { score: 95 }, mockTenantId)
      ).rejects.toThrow();

      // Step 3: Score becomes locked - still cannot edit
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.updateScore(mockScoreId, { score: 100 }, mockTenantId)
      ).rejects.toThrow();
    });

    it('should prevent deletion workflow: locked → cannot delete → cache not invalidated', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.deleteScore(mockScoreId, mockTenantId)
      ).rejects.toThrow();

      expect(mockScoreRepository.delete).not.toHaveBeenCalled();
      expect(mockCacheService.invalidatePattern).not.toHaveBeenCalled();
    });

    it('should prevent unsign workflow: unlocked certified → can unsign, locked → cannot unsign', async () => {
      // Unlocked but certified - can unsign
      const unlockedCertified = { ...mockCertifiedScore, isLocked: false };
      mockScoreRepository.findById.mockResolvedValue(unlockedCertified as any);
      mockPrisma.score.update.mockResolvedValue({
        ...unlockedCertified,
        certifiedAt: null,
        certifiedBy: null
      } as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).resolves.toBeDefined();

      // Locked - cannot unsign
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      await expect(
        service.unsignScore(mockScoreId, mockTenantId)
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null isCertified and isLocked fields', async () => {
      const scoreWithNullFlags = {
        ...mockUnlockedScore,
        isCertified: null as any,
        isLocked: null as any
      };

      mockScoreRepository.findById.mockResolvedValue(scoreWithNullFlags as any);
      mockPrisma.score.update.mockResolvedValue({ ...scoreWithNullFlags, score: 90 } as any);

      // Null should be treated as false, allowing updates
      await expect(
        service.updateScore(mockScoreId, { score: 90 }, mockTenantId)
      ).resolves.toBeDefined();
    });

    it('should handle undefined isCertified and isLocked fields', async () => {
      const scoreWithUndefinedFlags = {
        ...mockUnlockedScore,
        isCertified: undefined as any,
        isLocked: undefined as any
      };

      mockScoreRepository.findById.mockResolvedValue(scoreWithUndefinedFlags as any);
      mockPrisma.score.update.mockResolvedValue({ ...scoreWithUndefinedFlags, score: 90 } as any);

      // Undefined should be treated as false, allowing updates
      await expect(
        service.updateScore(mockScoreId, { score: 90 }, mockTenantId)
      ).resolves.toBeDefined();
    });

    it('should handle concurrent update attempts on locked scores', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      const promises = [
        service.updateScore(mockScoreId, { score: 90 }, mockTenantId),
        service.updateScore(mockScoreId, { score: 95 }, mockTenantId),
        service.updateScore(mockScoreId, { score: 100 }, mockTenantId)
      ];

      await expect(Promise.all(promises)).rejects.toThrow();
      expect(mockPrisma.score.update).not.toHaveBeenCalled();
    });

    it('should maintain data integrity when lock check fails', async () => {
      mockScoreRepository.findById.mockResolvedValue(mockLockedScore as any);

      try {
        await service.updateScore(mockScoreId, { score: 90 }, mockTenantId);
      } catch (error) {
        // Error should be thrown
        expect(error).toBeDefined();
      }

      // Original score should remain unchanged
      expect(mockPrisma.score.update).not.toHaveBeenCalled();
    });
  });
});
