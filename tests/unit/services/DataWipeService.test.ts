import { DataWipeService } from '../../../src/services/DataWipeService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenError, ValidationError } from '../../../src/services/BaseService';

describe('DataWipeService', () => {
  let service: DataWipeService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockTransaction: any;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new DataWipeService(mockPrisma as any);

    // Setup transaction mock
    mockTransaction = {
      file: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      score: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judgeComment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      certification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      categoryCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      contestCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judgeCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judgeContestantCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      reviewContestantCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      reviewJudgeScoreCertification: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      scoreRemovalRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judgeUncertificationRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      deductionRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      deductionApproval: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      overallDeduction: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      assignment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      roleAssignment: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      categoryContestant: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      categoryJudge: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      contestContestant: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      contestJudge: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      criterion: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      category: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      contest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn() },
      event: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), delete: jest.fn() },
      contestant: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judge: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockTransaction);
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataWipeService);
    });

    it('should inject PrismaClient', () => {
      expect(service['prisma']).toBeDefined();
    });
  });

  describe('wipeAllData', () => {
    it('should throw ForbiddenError for non-admin users', async () => {
      await expect(
        service.wipeAllData('user-123', 'USER', 'WIPE_ALL_DATA')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for organizer users', async () => {
      await expect(
        service.wipeAllData('user-123', 'ORGANIZER', 'WIPE_ALL_DATA')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for judge users', async () => {
      await expect(
        service.wipeAllData('user-123', 'JUDGE', 'WIPE_ALL_DATA')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError for invalid confirmation', async () => {
      await expect(
        service.wipeAllData('admin-123', 'ADMIN', 'INVALID')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty confirmation', async () => {
      await expect(
        service.wipeAllData('admin-123', 'ADMIN', '')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for case-sensitive confirmation', async () => {
      await expect(
        service.wipeAllData('admin-123', 'ADMIN', 'wipe_all_data')
      ).rejects.toThrow(ValidationError);
    });

    it('should successfully wipe all data for admin with correct confirmation', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should delete files in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.file.deleteMany).toHaveBeenCalled();
    });

    it('should delete scores in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.score.deleteMany).toHaveBeenCalled();
    });

    it('should delete judge comments in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.judgeComment.deleteMany).toHaveBeenCalled();
    });

    it('should delete all certifications in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.certification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.categoryCertification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.contestCertification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.judgeCertification.deleteMany).toHaveBeenCalled();
    });

    it('should delete assignments in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.assignment.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.roleAssignment.deleteMany).toHaveBeenCalled();
    });

    it('should delete categories and criteria in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.criterion.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.category.deleteMany).toHaveBeenCalled();
    });

    it('should delete contests in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.contest.deleteMany).toHaveBeenCalled();
    });

    it('should delete events in transaction', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.event.deleteMany).toHaveBeenCalled();
    });

    it('should deactivate non-admin users', async () => {
      await service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA');

      expect(mockTransaction.user.updateMany).toHaveBeenCalledWith({
        where: {
          role: {
            not: 'ADMIN',
          },
        },
        data: {
          isActive: false,
          judgeId: null,
          contestantId: null,
        },
      });
    });

    it('should handle transaction rollback on error', async () => {
      mockTransaction.score.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA')
      ).rejects.toThrow();
    });
  });

  describe('wipeEventData', () => {
    beforeEach(() => {
      mockTransaction.contest.findMany.mockResolvedValue([
        { id: 'contest-1' },
        { id: 'contest-2' },
      ]);

      mockTransaction.category.findMany.mockResolvedValue([
        { id: 'category-1' },
        { id: 'category-2' },
        { id: 'category-3' },
      ]);
    });

    it('should throw ForbiddenError for regular users', async () => {
      await expect(
        service.wipeEventData('event-123', 'user-456', 'USER')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to wipe event data', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should allow organizer to wipe event data', async () => {
      await service.wipeEventData('event-123', 'org-456', 'ORGANIZER');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should find all contests for the event', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.contest.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        select: { id: true },
      });
    });

    it('should find all categories for contests', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.category.findMany).toHaveBeenCalledWith({
        where: { contestId: { in: ['contest-1', 'contest-2'] } },
        select: { id: true },
      });
    });

    it('should delete scores for all categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.score.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete judge comments for all categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.judgeComment.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete certifications for the event', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.certification.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
    });

    it('should delete category certifications', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete contest certifications', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.contestCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete assignments for the event', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.assignment.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
    });

    it('should delete role assignments for the event', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.roleAssignment.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
    });

    it('should delete category contestants', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.categoryContestant.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete category judges', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.categoryJudge.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete contest contestants', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.contestContestant.deleteMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete contest judges', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.contestJudge.deleteMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete criteria for all categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.criterion.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete all categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.category.deleteMany).toHaveBeenCalledWith({
        where: {
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete all contests', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.contest.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
      });
    });

    it('should delete the event itself', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.event.delete).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
    });

    it('should handle events with no contests', async () => {
      mockTransaction.contest.findMany.mockResolvedValue([]);
      mockTransaction.category.findMany.mockResolvedValue([]);

      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.event.delete).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      mockTransaction.score.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.wipeEventData('event-123', 'admin-456', 'ADMIN')
      ).rejects.toThrow();
    });

    it('should delete deduction requests for categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.deductionRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete score removal requests for categories', async () => {
      await service.wipeEventData('event-123', 'admin-456', 'ADMIN');

      expect(mockTransaction.scoreRemovalRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });
  });

  describe('security and validation', () => {
    it('should require exact confirmation string for wipeAllData', async () => {
      await expect(
        service.wipeAllData('admin-123', 'ADMIN', 'WIPE ALL DATA')
      ).rejects.toThrow(ValidationError);

      await expect(
        service.wipeAllData('admin-123', 'ADMIN', 'WIPE_ALL_DATA ')
      ).rejects.toThrow(ValidationError);

      await expect(
        service.wipeAllData('admin-123', 'ADMIN', ' WIPE_ALL_DATA')
      ).rejects.toThrow(ValidationError);
    });

    it('should verify user role before wiping all data', async () => {
      const roles = ['USER', 'JUDGE', 'ORGANIZER', 'TALLYMASTER', 'EMCEE'];

      for (const role of roles) {
        await expect(
          service.wipeAllData('user-123', role, 'WIPE_ALL_DATA')
        ).rejects.toThrow(ForbiddenError);
      }
    });

    it('should verify user role before wiping event data', async () => {
      await expect(
        service.wipeEventData('event-123', 'user-456', 'JUDGE')
      ).rejects.toThrow(ForbiddenError);

      await expect(
        service.wipeEventData('event-123', 'user-456', 'TALLYMASTER')
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
