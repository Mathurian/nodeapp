import { DataWipeService } from '../../../src/services/DataWipeService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenError, ValidationError } from '../../../src/services/BaseService';

describe('DataWipeService', () => {
  let service: DataWipeService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockTransaction: any;
  const adminTenantId = 'tenant-123';
  const irreversibleConfirmation = 'I_UNDERSTAND_THIS_IS_IRREVERSIBLE';

  const invokeGlobalWipe = (
    userRole: string = 'SUPER_ADMIN',
    confirmation: string = 'WIPE_ALL_DATA',
    secondaryConfirmation: string = irreversibleConfirmation,
    dryRun: boolean = false
  ) => {
    return service.wipeAllData('user-123', userRole, confirmation, secondaryConfirmation, dryRun);
  };

  const invokeEventWipe = (
    userRole: string = 'ADMIN',
    tenantId: string | undefined = adminTenantId,
    isSuperAdmin: boolean = false,
    dryRun: boolean = false
  ) => {
    return service.wipeEventData('event-123', 'user-456', userRole, tenantId, isSuperAdmin, dryRun);
  };

  beforeEach(() => {
    jest.clearAllMocks();

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
      judgeScoreRemovalRequest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
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
      category: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn() },
      contest: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn() },
      event: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), findFirst: jest.fn() },
      contestant: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      judge: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      user: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    mockPrisma.event.count.mockResolvedValue(1);
    mockPrisma.contest.count.mockResolvedValue(2);
    mockPrisma.category.count.mockResolvedValue(3);
    mockPrisma.score.count.mockResolvedValue(0);
    mockPrisma.file.count.mockResolvedValue(0);
    mockPrisma.assignment.count.mockResolvedValue(0);
    mockPrisma.deductionRequest.count.mockResolvedValue(0);
    mockPrisma.judgeComment.count.mockResolvedValue(0);
    mockPrisma.categoryCertification.count.mockResolvedValue(0);
    mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-123', tenantId: adminTenantId } as any);

    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockTransaction);
    });
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
      await expect(invokeGlobalWipe('USER')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for admin users', async () => {
      await expect(invokeGlobalWipe('ADMIN')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError for judge users', async () => {
      await expect(invokeGlobalWipe('JUDGE')).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError for invalid confirmation', async () => {
      await expect(
        invokeGlobalWipe('SUPER_ADMIN', 'INVALID')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty confirmation', async () => {
      await expect(invokeGlobalWipe('SUPER_ADMIN', '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for case-sensitive confirmation', async () => {
      await expect(
        invokeGlobalWipe('SUPER_ADMIN', 'wipe_all_data')
      ).rejects.toThrow(ValidationError);
    });

    it('should require secondary confirmation', async () => {
      await expect(
        invokeGlobalWipe('SUPER_ADMIN', 'WIPE_ALL_DATA', 'INVALID_SECONDARY')
      ).rejects.toThrow(ValidationError);
    });

    it('should successfully wipe all data for super admin with correct confirmation', async () => {
      await invokeGlobalWipe();

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should delete files in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.file.deleteMany).toHaveBeenCalled();
    });

    it('should delete scores in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.score.deleteMany).toHaveBeenCalled();
    });

    it('should delete judge comments in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.judgeComment.deleteMany).toHaveBeenCalled();
    });

    it('should delete all certifications in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.certification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.categoryCertification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.contestCertification.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.judgeCertification.deleteMany).toHaveBeenCalled();
    });

    it('should delete assignments in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.assignment.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.roleAssignment.deleteMany).toHaveBeenCalled();
    });

    it('should delete categories and criteria in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.criterion.deleteMany).toHaveBeenCalled();
      expect(mockTransaction.category.deleteMany).toHaveBeenCalled();
    });

    it('should delete contests in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.contest.deleteMany).toHaveBeenCalled();
    });

    it('should delete events in transaction', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.event.deleteMany).toHaveBeenCalled();
    });

    it('should deactivate non-admin users', async () => {
      await invokeGlobalWipe();

      expect(mockTransaction.user.updateMany).toHaveBeenCalledWith({
        where: {
          role: {
            notIn: ['SUPER_ADMIN', 'ADMIN'],
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

      await expect(invokeGlobalWipe()).rejects.toThrow();
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
      await expect(invokeEventWipe('USER')).rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to wipe event data', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should allow super admin to wipe event data without tenant context', async () => {
      await invokeEventWipe('SUPER_ADMIN', undefined, true);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should find all contests for the event', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.contest.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123', tenantId: adminTenantId },
        select: { id: true },
      });
    });

    it('should find all categories for contests', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.category.findMany).toHaveBeenCalledWith({
        where: { contestId: { in: ['contest-1', 'contest-2'] }, tenantId: adminTenantId },
        select: { id: true },
      });
    });

    it('should delete scores for all categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.score.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete judge comments for all categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.judgeComment.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete certifications for the event', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.certification.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: adminTenantId, eventId: 'event-123' },
      });
    });

    it('should delete category certifications', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.categoryCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete contest certifications', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.contestCertification.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete assignments for the event', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.assignment.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: adminTenantId, eventId: 'event-123' },
      });
    });

    it('should delete role assignments for the event', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.roleAssignment.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: adminTenantId, eventId: 'event-123' },
      });
    });

    it('should delete category contestants', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.categoryContestant.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete category judges', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.categoryJudge.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete contest contestants', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.contestContestant.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete contest judges', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.contestJudge.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete criteria for all categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.criterion.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete all categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.category.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          contestId: { in: ['contest-1', 'contest-2'] },
        },
      });
    });

    it('should delete all contests', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.contest.deleteMany).toHaveBeenCalledWith({
        where: { tenantId: adminTenantId, eventId: 'event-123' },
      });
    });

    it('should delete the event itself', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.event.deleteMany).toHaveBeenCalledWith({
        where: { id: 'event-123', tenantId: adminTenantId },
      });
    });

    it('should handle events with no contests', async () => {
      mockTransaction.contest.findMany.mockResolvedValue([]);
      mockTransaction.category.findMany.mockResolvedValue([]);

      await invokeEventWipe('ADMIN');

      expect(mockTransaction.event.deleteMany).toHaveBeenCalled();
    });

    it('should handle transaction rollback on error', async () => {
      mockTransaction.score.deleteMany.mockRejectedValue(new Error('Database error'));

      await expect(invokeEventWipe('ADMIN')).rejects.toThrow();
    });

    it('should delete deduction requests for categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.deductionRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });

    it('should delete score removal requests for categories', async () => {
      await invokeEventWipe('ADMIN');

      expect(mockTransaction.judgeScoreRemovalRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: adminTenantId,
          categoryId: { in: ['category-1', 'category-2', 'category-3'] },
        },
      });
    });
  });

  describe('security and validation', () => {
    it('should require exact confirmation string for wipeAllData', async () => {
      await expect(invokeGlobalWipe('SUPER_ADMIN', 'WIPE ALL DATA')).rejects.toThrow(ValidationError);

      await expect(invokeGlobalWipe('SUPER_ADMIN', 'WIPE_ALL_DATA ')).rejects.toThrow(ValidationError);

      await expect(invokeGlobalWipe('SUPER_ADMIN', ' WIPE_ALL_DATA')).rejects.toThrow(ValidationError);
    });

    it('should verify user role before wiping all data', async () => {
      const roles = ['USER', 'JUDGE', 'ORGANIZER', 'TALLYMASTER', 'EMCEE'];

      for (const role of roles) {
        await expect(invokeGlobalWipe(role)).rejects.toThrow(ForbiddenError);
      }
    });

    it('should verify user role before wiping event data', async () => {
      await expect(invokeEventWipe('JUDGE')).rejects.toThrow(ForbiddenError);

      await expect(invokeEventWipe('TALLYMASTER')).rejects.toThrow(ForbiddenError);
    });

    it('should require tenant context for non-super-admin event wipes', async () => {
      await expect(invokeEventWipe('ADMIN', undefined, false)).rejects.toThrow(ForbiddenError);
    });
  });
});
