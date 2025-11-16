/**
 * BulkCertificationResetService Unit Tests
 * Comprehensive test coverage for bulk certification reset operations
 */

import 'reflect-metadata';
import { BulkCertificationResetService } from '../../../src/services/BulkCertificationResetService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('BulkCertificationResetService', () => {
  let service: BulkCertificationResetService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockUserId = 'user-123';
  const mockEventId = 'event-123';
  const mockContestId = 'contest-123';
  const mockCategoryId = 'category-123';

  const mockCategory = {
    id: mockCategoryId,
    name: 'Vocals',
    contestId: mockContestId,
    totalsCertified: true
  };

  const mockContest = {
    id: mockContestId,
    name: 'Talent Contest',
    eventId: mockEventId,
    categories: [
      { id: 'cat-1' },
      { id: 'cat-2' }
    ]
  };

  const mockEvent = {
    id: mockEventId,
    name: 'Spring Festival',
    contests: [
      {
        id: 'contest-1',
        categories: [{ id: 'cat-1' }, { id: 'cat-2' }]
      },
      {
        id: 'contest-2',
        categories: [{ id: 'cat-3' }]
      }
    ]
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new BulkCertificationResetService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(BulkCertificationResetService);
    });

    it('should initialize with PrismaClient', () => {
      expect(mockPrisma).toBeDefined();
    });
  });

  describe('resetCertifications - Permission Checks', () => {
    it('should allow ADMIN to reset certifications', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      const result = await service.resetCertifications(
        { categoryId: mockCategoryId },
        mockUserId,
        'ADMIN'
      );

      expect(result).toBeDefined();
      expect(result.resetCount).toBeGreaterThan(0);
    });

    it('should allow ORGANIZER to reset certifications', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      const result = await service.resetCertifications(
        { categoryId: mockCategoryId },
        mockUserId,
        'ORGANIZER'
      );

      expect(result).toBeDefined();
    });

    it('should allow BOARD to reset certifications', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      const result = await service.resetCertifications(
        { categoryId: mockCategoryId },
        mockUserId,
        'BOARD'
      );

      expect(result).toBeDefined();
    });

    it('should deny JUDGE from resetting certifications', async () => {
      await expect(
        service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'JUDGE')
      ).rejects.toThrow('You do not have permission to reset certifications');
    });

    it('should deny TALLY_MASTER from resetting certifications', async () => {
      await expect(
        service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'TALLY_MASTER')
      ).rejects.toThrow('You do not have permission to reset certifications');
    });

    it('should deny AUDITOR from resetting certifications', async () => {
      await expect(
        service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'AUDITOR')
      ).rejects.toThrow('You do not have permission to reset certifications');
    });

    it('should deny CONTESTANT from resetting certifications', async () => {
      await expect(
        service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'CONTESTANT')
      ).rejects.toThrow('You do not have permission to reset certifications');
    });
  });

  describe('resetCertifications - Reset All', () => {
    it('should reset all certifications system-wide', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.certification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 12 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 7 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 100 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 20 } as any);

      const result = await service.resetCertifications(
        { resetAll: true },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(49); // 10+5+8+12+7+3+4
      expect(result.message).toContain('49 certification records system-wide');
      expect(mockPrisma.categoryCertification.deleteMany).toHaveBeenCalledWith({});
      expect(mockPrisma.contestCertification.deleteMany).toHaveBeenCalledWith({});
    });

    it('should reset scores during system-wide reset', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.certification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 50 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 10 } as any);

      await service.resetCertifications({ resetAll: true }, mockUserId, 'ADMIN');

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });
    });

    it('should reset category totals during system-wide reset', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.certification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 50 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 10 } as any);

      await service.resetCertifications({ resetAll: true }, mockUserId, 'ADMIN');

      expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
        data: {
          totalsCertified: false
        }
      });
    });
  });

  describe('resetCertifications - Category Reset', () => {
    beforeEach(() => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
    });

    it('should reset certifications for a specific category', async () => {
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      const result = await service.resetCertifications(
        { categoryId: mockCategoryId },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(11); // 3+2+4+1+1
      expect(result.message).toContain('11 certification records for category');
    });

    it('should throw error when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.resetCertifications({ categoryId: 'invalid-id' }, mockUserId, 'ADMIN')
      ).rejects.toThrow('Category not found');
    });

    it('should reset category certifications with correct filter', async () => {
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      await service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'ADMIN');

      expect(mockPrisma.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId }
      });
    });

    it('should reset scores for category', async () => {
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      await service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'ADMIN');

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId },
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });
    });

    it('should reset certification records with complete data', async () => {
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      await service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'ADMIN');

      expect(mockPrisma.certification.updateMany).toHaveBeenCalledWith({
        where: { categoryId: mockCategoryId },
        data: {
          status: 'PENDING',
          currentStep: 1,
          judgeCertified: false,
          tallyCertified: false,
          auditorCertified: false,
          boardApproved: false,
          certifiedAt: null,
          certifiedBy: null,
          rejectionReason: null,
          comments: null
        }
      });
    });

    it('should reset category totalsCertified flag', async () => {
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.category.update.mockResolvedValue(mockCategory as any);

      await service.resetCertifications({ categoryId: mockCategoryId }, mockUserId, 'ADMIN');

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: mockCategoryId },
        data: {
          totalsCertified: false
        }
      });
    });
  });

  describe('resetCertifications - Contest Reset', () => {
    beforeEach(() => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
    });

    it('should reset certifications for a specific contest', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 20 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 5 } as any);

      const result = await service.resetCertifications(
        { contestId: mockContestId },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(17); // 2+4+3+5+2+1
      expect(result.message).toContain('17 certification records for contest');
    });

    it('should throw error when contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(
        service.resetCertifications({ contestId: 'invalid-id' }, mockUserId, 'ADMIN')
      ).rejects.toThrow('Contest not found');
    });

    it('should reset contest certifications with correct filter', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 20 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 5 } as any);

      await service.resetCertifications({ contestId: mockContestId }, mockUserId, 'ADMIN');

      expect(mockPrisma.contestCertification.deleteMany).toHaveBeenCalledWith({
        where: { contestId: mockContestId }
      });
    });

    it('should reset all category certifications in contest', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 20 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 5 } as any);

      await service.resetCertifications({ contestId: mockContestId }, mockUserId, 'ADMIN');

      expect(mockPrisma.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['cat-1', 'cat-2'] }
        }
      });
    });

    it('should reset scores for all categories in contest', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 20 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 5 } as any);

      await service.resetCertifications({ contestId: mockContestId }, mockUserId, 'ADMIN');

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['cat-1', 'cat-2'] }
        },
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });
    });

    it('should reset all categories totalsCertified in contest', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 4 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 20 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 5 } as any);

      await service.resetCertifications({ contestId: mockContestId }, mockUserId, 'ADMIN');

      expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
        where: {
          contestId: mockContestId
        },
        data: {
          totalsCertified: false
        }
      });
    });
  });

  describe('resetCertifications - Event Reset', () => {
    beforeEach(() => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });
    });

    it('should reset certifications for a specific event', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 30 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 8 } as any);

      const result = await service.resetCertifications(
        { eventId: mockEventId },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(27); // 3+6+5+8+3+2
      expect(result.message).toContain('27 certification records for event');
    });

    it('should throw error when event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.resetCertifications({ eventId: 'invalid-id' }, mockUserId, 'ADMIN')
      ).rejects.toThrow('Event not found');
    });

    it('should reset all contest certifications in event', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 30 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 8 } as any);

      await service.resetCertifications({ eventId: mockEventId }, mockUserId, 'ADMIN');

      expect(mockPrisma.contestCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] }
        }
      });
    });

    it('should reset all category certifications in event', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 30 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 8 } as any);

      await service.resetCertifications({ eventId: mockEventId }, mockUserId, 'ADMIN');

      expect(mockPrisma.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['cat-1', 'cat-2', 'cat-3'] }
        }
      });
    });

    it('should reset scores for all categories in event', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 30 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 8 } as any);

      await service.resetCertifications({ eventId: mockEventId }, mockUserId, 'ADMIN');

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['cat-1', 'cat-2', 'cat-3'] }
        },
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });
    });

    it('should reset all categories totalsCertified in event', async () => {
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 6 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 5 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 8 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 3 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 2 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 10 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 30 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 8 } as any);

      await service.resetCertifications({ eventId: mockEventId }, mockUserId, 'ADMIN');

      expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] }
        },
        data: {
          totalsCertified: false
        }
      });
    });
  });

  describe('resetCertifications - Validation', () => {
    it('should throw error when no parameters provided', async () => {
      await expect(
        service.resetCertifications({}, mockUserId, 'ADMIN')
      ).rejects.toThrow('Either eventId, contestId, categoryId, or resetAll must be provided');
    });

    it('should throw error when empty DTO provided', async () => {
      await expect(
        service.resetCertifications({}, mockUserId, 'ADMIN')
      ).rejects.toThrow('Either eventId, contestId, categoryId, or resetAll must be provided');
    });
  });

  describe('edge cases', () => {
    it('should handle zero certification counts', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.certification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.resetCertifications({ resetAll: true }, mockUserId, 'ADMIN');

      expect(result.resetCount).toBe(0);
    });

    it('should handle contest with no categories', async () => {
      const emptyContest = {
        ...mockContest,
        categories: []
      };

      mockPrisma.contest.findUnique.mockResolvedValue(emptyContest as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.resetCertifications(
        { contestId: mockContestId },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(1);
    });

    it('should handle event with no contests', async () => {
      const emptyEvent = {
        ...mockEvent,
        contests: []
      };

      mockPrisma.event.findUnique.mockResolvedValue(emptyEvent as any);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrisma);
      });

      mockPrisma.contestCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.categoryCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.judgeContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewContestantCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.reviewJudgeScoreCertification.deleteMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.certification.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.score.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.category.updateMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.resetCertifications(
        { eventId: mockEventId },
        mockUserId,
        'ADMIN'
      );

      expect(result.resetCount).toBe(0);
    });
  });
});
