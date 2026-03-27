/**
 * CategoryCertificationService Unit Tests
 * Aligned with tenant-aware certification records and stage helpers.
 */

import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { CategoryCertificationService } from '../../../src/services/CategoryCertificationService';
import {
  applyCertificationStage,
  refreshRoleStages,
  upsertCategoryRoleCertification,
} from '../../../src/utils/certificationPipeline';

jest.mock('../../../src/utils/certificationPipeline', () => ({
  applyCertificationStage: jest.fn(),
  refreshRoleStages: jest.fn(),
  upsertCategoryRoleCertification: jest.fn(),
}));

describe('CategoryCertificationService', () => {
  let service: CategoryCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const TEST_TENANT_ID = 'tenant-1';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  const mockedApplyCertificationStage = jest.mocked(applyCertificationStage);
  const mockedRefreshRoleStages = jest.mocked(refreshRoleStages);
  const mockedUpsertCategoryRoleCertification = jest.mocked(upsertCategoryRoleCertification);

  const buildContestant = (
    overrides: Partial<{
      id: string;
      name: string;
      tenantId: string;
      contestantNumber: number | null;
      bio: string | null;
      email: string | null;
      gender: string | null;
      pronouns: string | null;
      imagePath: string | null;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ) => ({
    id: 'contestant-1',
    name: 'John Doe',
    tenantId: TEST_TENANT_ID,
    contestantNumber: 1,
    bio: null,
    email: null,
    gender: null,
    pronouns: null,
    imagePath: null,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  });

  const buildJudge = (
    overrides: Partial<{
      id: string;
      name: string;
      tenantId: string;
      email: string | null;
      gender: string | null;
      pronouns: string | null;
      bio: string | null;
      imagePath: string | null;
      isHeadJudge: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ) => ({
    id: 'judge-1',
    name: 'Judge Smith',
    tenantId: TEST_TENANT_ID,
    email: null,
    gender: null,
    pronouns: null,
    bio: 'Experienced judge',
    imagePath: null,
    isHeadJudge: false,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    ...overrides,
  });

  const buildCategoryContestant = (
    overrides: Partial<{
      categoryId: string;
      contestantId: string;
      tenantId: string;
      contestant: ReturnType<typeof buildContestant>;
    }> = {}
  ) => ({
    categoryId: 'category-1',
    contestantId: 'contestant-1',
    tenantId: TEST_TENANT_ID,
    contestant: buildContestant(),
    ...overrides,
  });

  const buildCategoryJudge = (
    overrides: Partial<{
      categoryId: string;
      judgeId: string;
      tenantId: string;
      judge: ReturnType<typeof buildJudge>;
    }> = {}
  ) => ({
    categoryId: 'category-1',
    judgeId: 'judge-1',
    tenantId: TEST_TENANT_ID,
    judge: buildJudge(),
    ...overrides,
  });

  const buildJudgeContestantCertification = (
    overrides: Partial<{
      id: string;
      judgeId: string;
      contestantId: string;
      categoryId: string;
      certifiedAt: Date;
      comments: string | null;
      tenantId: string;
    }> = {}
  ) => ({
    id: 'jcc-1',
    judgeId: 'judge-1',
    contestantId: 'contestant-1',
    categoryId: 'category-1',
    certifiedAt: BASE_TIME,
    comments: null,
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const buildCategoryCertification = (
    overrides: Partial<{
      id: string;
      categoryId: string;
      role: string;
      userId: string;
      signatureName: string | null;
      boardRoleSnapshot: string | null;
      certifiedAt: Date;
      comments: string | null;
      tenantId: string;
    }> = {}
  ) => ({
    id: 'cert-1',
    categoryId: 'category-1',
    role: 'JUDGE',
    userId: 'user-1',
    signatureName: null,
    boardRoleSnapshot: null,
    certifiedAt: BASE_TIME,
    comments: null,
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const buildCertificationRecord = (
    overrides: Partial<{
      id: string;
      categoryId: string;
      contestId: string;
      eventId: string;
      userId: string | null;
      status: 'PENDING' | 'IN_PROGRESS' | 'CERTIFIED';
      currentStep: number;
      totalSteps: number;
      judgeCertified: boolean;
      tallyCertified: boolean;
      auditorCertified: boolean;
      boardApproved: boolean;
      certifiedAt: Date | null;
      certifiedBy: string | null;
      rejectionReason: string | null;
      comments: string | null;
      createdAt: Date;
      updatedAt: Date;
      tenantId: string;
    }> = {}
  ) => ({
    id: 'certification-1',
    categoryId: 'category-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    userId: 'user-1',
    status: 'PENDING' as const,
    currentStep: 1,
    totalSteps: 4,
    judgeCertified: false,
    tallyCertified: false,
    auditorCertified: false,
    boardApproved: false,
    certifiedAt: null,
    certifiedBy: null,
    rejectionReason: null,
    comments: null,
    createdAt: BASE_TIME,
    updatedAt: BASE_TIME,
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const setGroupedJudgeCertifications = (rows: Array<{ judgeId: string }>) => {
    (mockPrisma.judgeCertification.groupBy as any).mockResolvedValue(rows);
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new CategoryCertificationService(mockPrisma as any);

    mockedApplyCertificationStage.mockReset();
    mockedRefreshRoleStages.mockReset();
    mockedUpsertCategoryRoleCertification.mockReset();

    mockedUpsertCategoryRoleCertification.mockResolvedValue(buildCategoryCertification() as any);
    mockedRefreshRoleStages.mockResolvedValue(buildCertificationRecord() as any);
    mockedApplyCertificationStage.mockResolvedValue(buildCertificationRecord() as any);

    mockPrisma.certification.findFirst.mockResolvedValue(null);
    setGroupedJudgeCertifications([]);
    mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
    mockPrisma.categoryCertification.findMany.mockResolvedValue([] as any);
    mockPrisma.user.findFirst.mockResolvedValue(null as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getCertificationProgress', () => {
    it('should get certification progress for a category', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        buildCategoryContestant(),
        buildCategoryContestant({
          contestantId: 'contestant-2',
          contestant: buildContestant({ id: 'contestant-2', name: 'Jane Doe', contestantNumber: 2 }),
        }),
      ] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([
        buildCategoryJudge(),
        buildCategoryJudge({
          judgeId: 'judge-2',
          judge: buildJudge({ id: 'judge-2', name: 'Judge Jones' }),
        }),
      ] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
      ] as any);
      setGroupedJudgeCertifications([{ judgeId: 'judge-1' }]);
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'TALLY_MASTER' }) as any)
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'AUDITOR' }) as any);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        buildCategoryCertification({ role: 'BOARD', userId: 'board-1' }),
      ] as any);

      const result = await service.getCertificationProgress('category-1');

      expect(result.categoryId).toBe('category-1');
      expect(result.judgeProgress.totalContestants).toBe(2);
      expect(result.judgeProgress.contestantsCertified).toBe(1);
      expect(result.judgeProgress.isCategoryCertified).toBe(false);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(true);
      expect(result.auditorProgress.isCategoryCertified).toBe(true);
      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });

    it('should show fully certified category when all judges are certified', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([buildCategoryContestant()] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([buildCategoryJudge()] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
      ] as any);
      setGroupedJudgeCertifications([{ judgeId: 'judge-1' }]);
      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'TALLY_MASTER' }) as any)
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'AUDITOR' }) as any);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        buildCategoryCertification({ role: 'BOARD', userId: 'board-1' }),
      ] as any);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(true);
    });

    it('should handle category with no contestants', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([buildCategoryJudge()] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      setGroupedJudgeCertifications([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.totalContestants).toBe(0);
      expect(result.judgeProgress.isCategoryCertified).toBe(false);
    });

    it('should handle category with no judges', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([buildCategoryContestant()] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      setGroupedJudgeCertifications([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(false);
    });

    it('should handle category with no tally master certification', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([buildCategoryContestant()] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([buildCategoryJudge()] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
      ] as any);
      setGroupedJudgeCertifications([{ judgeId: 'judge-1' }]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(true);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(false);
      expect(result.auditorProgress.isCategoryCertified).toBe(false);
      expect(result.boardProgress.isCategoryCertified).toBe(false);
    });

    it('should calculate judge progress correctly with multiple judges', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([
        buildCategoryContestant(),
        buildCategoryContestant({
          contestantId: 'contestant-2',
          contestant: buildContestant({ id: 'contestant-2', name: 'Jane Doe', contestantNumber: 2 }),
        }),
      ] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([
        buildCategoryJudge(),
        buildCategoryJudge({
          judgeId: 'judge-2',
          judge: buildJudge({ id: 'judge-2', name: 'Judge Jones' }),
        }),
        buildCategoryJudge({
          judgeId: 'judge-3',
          judge: buildJudge({ id: 'judge-3', name: 'Judge Patel' }),
        }),
      ] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
        buildJudgeContestantCertification({ id: 'jcc-2', judgeId: 'judge-2' }),
        buildJudgeContestantCertification({ id: 'jcc-3', judgeId: 'judge-3' }),
      ] as any);
      setGroupedJudgeCertifications([
        { judgeId: 'judge-1' },
        { judgeId: 'judge-2' },
      ]);

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.contestantsCertified).toBe(3);
      expect(result.judgeProgress.totalContestants).toBe(2);
      expect(result.judgeProgress.isCategoryCertified).toBe(false);
    });

    it('should handle multiple board certifications', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([buildCategoryContestant()] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([buildCategoryJudge()] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
      ] as any);
      setGroupedJudgeCertifications([{ judgeId: 'judge-1' }]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        buildCategoryCertification({ role: 'BOARD', userId: 'board-1' }),
        buildCategoryCertification({ role: 'ORGANIZER', userId: 'org-1' }),
        buildCategoryCertification({ role: 'ADMIN', userId: 'admin-1' }),
      ] as any);

      const result = await service.getCertificationProgress('category-1');

      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });

    it('should use certification record flags when present', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);
      mockPrisma.certification.findFirst.mockResolvedValue(
        buildCertificationRecord({
          judgeCertified: true,
          tallyCertified: true,
          auditorCertified: true,
          boardApproved: true,
          status: 'CERTIFIED',
          currentStep: 4,
        }) as any
      );

      const result = await service.getCertificationProgress('category-1');

      expect(result.judgeProgress.isCategoryCertified).toBe(true);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(true);
      expect(result.auditorProgress.isCategoryCertified).toBe(true);
      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });
  });

  describe('certifyCategory', () => {
    it('should certify a category for a judge role', async () => {
      const createdCertification = buildCategoryCertification({ role: 'JUDGE' });
      mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(createdCertification as any);

      const result = await service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID);

      expect(result).toEqual(createdCertification);
      expect(mockPrisma.categoryCertification.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          categoryId: 'category-1',
          role: 'JUDGE',
          userId: 'user-1',
        },
      });
      expect(mockedUpsertCategoryRoleCertification).toHaveBeenCalledWith({
        prisma: mockPrisma,
        tenantId: TEST_TENANT_ID,
        categoryId: 'category-1',
        role: 'JUDGE',
        userId: 'user-1',
        boardRoleSnapshot: null,
      });
      expect(mockedRefreshRoleStages).not.toHaveBeenCalled();
      expect(mockedApplyCertificationStage).not.toHaveBeenCalled();
    });

    it('should certify gated roles when prerequisites are satisfied', async () => {
      const cases = [
        {
          role: 'TALLY_MASTER',
          synced: buildCertificationRecord({ judgeCertified: true }),
        },
        {
          role: 'AUDITOR',
          synced: buildCertificationRecord({ judgeCertified: true, tallyCertified: true }),
        },
        {
          role: 'BOARD',
          synced: buildCertificationRecord({
            judgeCertified: true,
            tallyCertified: true,
            auditorCertified: true,
          }),
        },
      ] as const;

      for (const { role, synced } of cases) {
        mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(
          buildCategoryCertification({ role, userId: 'user-1' }) as any
        );
        mockedRefreshRoleStages.mockResolvedValueOnce(synced as any);
        mockedApplyCertificationStage.mockResolvedValueOnce(synced as any);

        if (role === 'BOARD') {
          mockPrisma.user.findFirst.mockResolvedValueOnce({ boardRole: 'Chair' } as any);
        }

        const result = await service.certifyCategory('category-1', 'user-1', role, TEST_TENANT_ID);

        expect(result.role).toBe(role);
      }

      expect(mockedApplyCertificationStage).toHaveBeenCalledTimes(3);
    });

    it('should include board role snapshot for board certifications', async () => {
      mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(
        buildCategoryCertification({ role: 'BOARD', boardRoleSnapshot: 'Chair' }) as any
      );
      mockedRefreshRoleStages.mockResolvedValueOnce(
        buildCertificationRecord({
          judgeCertified: true,
          tallyCertified: true,
          auditorCertified: true,
        }) as any
      );
      mockedApplyCertificationStage.mockResolvedValueOnce(
        buildCertificationRecord({
          judgeCertified: true,
          tallyCertified: true,
          auditorCertified: true,
        }) as any
      );
      mockPrisma.user.findFirst.mockResolvedValueOnce({ boardRole: 'Chair' } as any);

      await service.certifyCategory('category-1', 'user-1', 'BOARD', TEST_TENANT_ID);

      expect(mockedUpsertCategoryRoleCertification).toHaveBeenCalledWith({
        prisma: mockPrisma,
        tenantId: TEST_TENANT_ID,
        categoryId: 'category-1',
        role: 'BOARD',
        userId: 'user-1',
        boardRoleSnapshot: 'Chair',
      });
    });

    it('should throw error when already certified by the same user for the same role', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(
        buildCategoryCertification({ role: 'JUDGE' }) as any
      );

      await expect(
        service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID)
      ).rejects.toThrow('Category already certified by this user for this role');

      expect(mockedUpsertCategoryRoleCertification).not.toHaveBeenCalled();
    });

    it('should allow certification by different users for the same role', async () => {
      mockedUpsertCategoryRoleCertification
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'JUDGE', userId: 'user-1' }) as any)
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'JUDGE', userId: 'user-2' }) as any);

      const result1 = await service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID);
      const result2 = await service.certifyCategory('category-1', 'user-2', 'JUDGE', TEST_TENANT_ID);

      expect(result1.userId).toBe('user-1');
      expect(result2.userId).toBe('user-2');
    });

    it('should reject tally master certification before judge certification is complete', async () => {
      mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(
        buildCategoryCertification({ role: 'TALLY_MASTER' }) as any
      );
      mockedRefreshRoleStages.mockResolvedValueOnce(buildCertificationRecord({ judgeCertified: false }) as any);

      await expect(
        service.certifyCategory('category-1', 'user-1', 'TALLY_MASTER', TEST_TENANT_ID)
      ).rejects.toThrow('Judge certification must be completed first');

      expect(mockedApplyCertificationStage).not.toHaveBeenCalled();
    });

    it('should reject auditor certification before tally certification is complete', async () => {
      mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(
        buildCategoryCertification({ role: 'AUDITOR' }) as any
      );
      mockedRefreshRoleStages.mockResolvedValueOnce(
        buildCertificationRecord({ judgeCertified: true, tallyCertified: false }) as any
      );

      await expect(
        service.certifyCategory('category-1', 'user-1', 'AUDITOR', TEST_TENANT_ID)
      ).rejects.toThrow('Tally Master certification must be completed first');

      expect(mockedApplyCertificationStage).not.toHaveBeenCalled();
    });

    it('should reject board certification before auditor certification is complete', async () => {
      mockedUpsertCategoryRoleCertification.mockResolvedValueOnce(
        buildCategoryCertification({ role: 'BOARD' }) as any
      );
      mockedRefreshRoleStages.mockResolvedValueOnce(
        buildCertificationRecord({
          judgeCertified: true,
          tallyCertified: true,
          auditorCertified: false,
        }) as any
      );
      mockPrisma.user.findFirst.mockResolvedValueOnce({ boardRole: 'Chair' } as any);

      await expect(
        service.certifyCategory('category-1', 'user-1', 'BOARD', TEST_TENANT_ID)
      ).rejects.toThrow('Auditor certification must be completed first');

      expect(mockedApplyCertificationStage).not.toHaveBeenCalled();
    });

    it('should handle database errors during certification', async () => {
      mockedUpsertCategoryRoleCertification.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID)
      ).rejects.toThrow('Database error');
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

      const result = await service.getCertificationProgress('invalid-id');

      expect(result.categoryId).toBe('invalid-id');
      expect(result.judgeProgress.totalContestants).toBe(0);
    });

    it('should handle empty values gracefully', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([]);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([]);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress('category-1');

      expect(result).toBeDefined();
      expect(result.judgeProgress.isCategoryCertified).toBe(false);
    });
  });

  describe('certification workflow', () => {
    it('should track certification workflow stages', async () => {
      mockPrisma.categoryContestant.findMany.mockResolvedValue([buildCategoryContestant()] as any);
      mockPrisma.categoryJudge.findMany.mockResolvedValue([buildCategoryJudge()] as any);
      mockPrisma.judgeContestantCertification.findMany.mockResolvedValue([
        buildJudgeContestantCertification(),
      ] as any);
      setGroupedJudgeCertifications([{ judgeId: 'judge-1' }]);

      mockPrisma.categoryCertification.findFirst.mockResolvedValue(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      let result = await service.getCertificationProgress('category-1');
      expect(result.judgeProgress.isCategoryCertified).toBe(true);
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(false);

      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'TALLY_MASTER' }) as any)
        .mockResolvedValueOnce(null);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      result = await service.getCertificationProgress('category-1');
      expect(result.tallyMasterProgress.isCategoryCertified).toBe(true);
      expect(result.auditorProgress.isCategoryCertified).toBe(false);

      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'TALLY_MASTER' }) as any)
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'AUDITOR' }) as any);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);

      result = await service.getCertificationProgress('category-1');
      expect(result.auditorProgress.isCategoryCertified).toBe(true);
      expect(result.boardProgress.isCategoryCertified).toBe(false);

      mockPrisma.categoryCertification.findFirst
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'TALLY_MASTER' }) as any)
        .mockResolvedValueOnce(buildCategoryCertification({ role: 'AUDITOR' }) as any);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([
        buildCategoryCertification({ role: 'BOARD', userId: 'board-1' }),
      ] as any);

      result = await service.getCertificationProgress('category-1');
      expect(result.boardProgress.isCategoryCertified).toBe(true);
    });

    it('should prevent duplicate certifications for the same user and role', async () => {
      mockPrisma.categoryCertification.findFirst.mockResolvedValue(
        buildCategoryCertification({ role: 'JUDGE' }) as any
      );

      await expect(
        service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID)
      ).rejects.toThrow('Category already certified by this user for this role');

      await expect(
        service.certifyCategory('category-1', 'user-1', 'JUDGE', TEST_TENANT_ID)
      ).rejects.toThrow('Category already certified by this user for this role');
    });
  });
});
