/**
 * ContestCertificationService Unit Tests
 * Aligned with tenant-aware contest certification workflows.
 */

import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ContestCertificationService } from '../../../src/services/ContestCertificationService';
import { ForbiddenError, NotFoundError } from '../../../src/services/BaseService';

describe('ContestCertificationService', () => {
  let service: ContestCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const TEST_CONTEST_ID = 'contest-123';
  const TEST_USER_ID = 'user-456';
  const TEST_TENANT_ID = 'tenant-1';
  const BASE_TIME = new Date('2026-02-25T12:00:00.000Z');

  const buildContest = (
    overrides: Partial<{
      id: string;
      name: string;
      description: string | null;
      eventId: string;
      tenantId: string;
    }> = {}
  ) => ({
    id: TEST_CONTEST_ID,
    name: 'Finals',
    description: 'Final round competition',
    eventId: 'event-123',
    tenantId: TEST_TENANT_ID,
    ...overrides,
  });

  const buildContestCertification = (
    overrides: Partial<{
      id: string;
      contestId: string;
      role: string;
      userId: string;
      tenantId: string;
      boardRoleSnapshot: string | null;
      certifiedAt: Date;
    }> = {}
  ) => ({
    id: 'cert-1',
    contestId: TEST_CONTEST_ID,
    role: 'TALLY_MASTER',
    userId: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    boardRoleSnapshot: null,
    certifiedAt: BASE_TIME,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ContestCertificationService(mockPrisma as any);

    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getCertificationProgress', () => {
    it('returns progress with no certifications', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(buildContest() as any);
      mockPrisma.contestCertification.findMany.mockResolvedValue([]);

      const result = await service.getCertificationProgress(TEST_CONTEST_ID);

      expect(result).toEqual({
        contestId: TEST_CONTEST_ID,
        tallyMaster: false,
        auditor: false,
        board: false,
        organizer: false,
        certifications: [],
      });
      expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
        where: { id: TEST_CONTEST_ID },
        select: {
          id: true,
          name: true,
          description: true,
          eventId: true,
        },
      });
      expect(mockPrisma.contestCertification.findMany).toHaveBeenCalledWith({
        where: { contestId: TEST_CONTEST_ID },
      });
    });

    it('returns progress flags for existing certifications', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(buildContest() as any);
      mockPrisma.contestCertification.findMany.mockResolvedValue(
        [
          buildContestCertification({ id: 'cert-1', role: 'TALLY_MASTER', userId: 'tm-1' }),
          buildContestCertification({ id: 'cert-2', role: 'AUDITOR', userId: 'auditor-1' }),
          buildContestCertification({ id: 'cert-3', role: 'BOARD', userId: 'board-1' }),
          buildContestCertification({ id: 'cert-4', role: 'ORGANIZER', userId: 'org-1' }),
        ] as any
      );

      const result = await service.getCertificationProgress(TEST_CONTEST_ID);

      expect(result).toMatchObject({
        contestId: TEST_CONTEST_ID,
        tallyMaster: true,
        auditor: true,
        board: true,
        organizer: true,
      });
      expect(result.certifications).toHaveLength(4);
    });

    it('throws NotFoundError when the contest does not exist', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(service.getCertificationProgress(TEST_CONTEST_ID)).rejects.toThrow(
        NotFoundError
      );
      expect(mockPrisma.contestCertification.findMany).not.toHaveBeenCalled();
    });
  });

  describe('certifyContest', () => {
    beforeEach(() => {
      mockPrisma.contest.findUnique.mockResolvedValue(buildContest() as any);
      mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null as any);
    });

    it('allows TALLY_MASTER to certify', async () => {
      const certification = buildContestCertification({ role: 'TALLY_MASTER' });
      mockPrisma.contestCertification.create.mockResolvedValue(certification as any);

      const result = await service.certifyContest(
        TEST_CONTEST_ID,
        TEST_USER_ID,
        'TALLY_MASTER',
        TEST_TENANT_ID
      );

      expect(result).toEqual(certification);
      expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
        data: {
          tenantId: TEST_TENANT_ID,
          contestId: TEST_CONTEST_ID,
          role: 'TALLY_MASTER',
          userId: TEST_USER_ID,
          boardRoleSnapshot: null,
        },
      });
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('allows BOARD to certify and records board role snapshot', async () => {
      const certification = buildContestCertification({
        role: 'BOARD',
        boardRoleSnapshot: 'Chair',
      });
      mockPrisma.user.findFirst.mockResolvedValue({ boardRole: 'Chair' } as any);
      mockPrisma.contestCertification.create.mockResolvedValue(certification as any);

      const result = await service.certifyContest(
        TEST_CONTEST_ID,
        TEST_USER_ID,
        'BOARD',
        TEST_TENANT_ID
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
        select: { boardRole: true },
      });
      expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
        data: {
          tenantId: TEST_TENANT_ID,
          contestId: TEST_CONTEST_ID,
          role: 'BOARD',
          userId: TEST_USER_ID,
          boardRoleSnapshot: 'Chair',
        },
      });
      expect(result).toEqual(certification);
    });

    it('allows BOARD to certify when no board role is set', async () => {
      const certification = buildContestCertification({
        role: 'BOARD',
        boardRoleSnapshot: null,
      });
      mockPrisma.user.findFirst.mockResolvedValue(null as any);
      mockPrisma.contestCertification.create.mockResolvedValue(certification as any);

      const result = await service.certifyContest(
        TEST_CONTEST_ID,
        TEST_USER_ID,
        'BOARD',
        TEST_TENANT_ID
      );

      expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
        data: {
          tenantId: TEST_TENANT_ID,
          contestId: TEST_CONTEST_ID,
          role: 'BOARD',
          userId: TEST_USER_ID,
          boardRoleSnapshot: null,
        },
      });
      expect(result.boardRoleSnapshot).toBeNull();
    });

    it('throws ForbiddenError for unauthorized roles', async () => {
      await expect(
        service.certifyContest(TEST_CONTEST_ID, TEST_USER_ID, 'JUDGE', TEST_TENANT_ID)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        service.certifyContest(TEST_CONTEST_ID, TEST_USER_ID, 'CONTESTANT', TEST_TENANT_ID)
      ).rejects.toThrow(ForbiddenError);
      await expect(
        service.certifyContest(TEST_CONTEST_ID, TEST_USER_ID, 'ADMIN', TEST_TENANT_ID)
      ).rejects.toThrow(ForbiddenError);

      expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the contest does not exist', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(
        service.certifyContest(TEST_CONTEST_ID, TEST_USER_ID, 'TALLY_MASTER', TEST_TENANT_ID)
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.contestCertification.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.contestCertification.create).not.toHaveBeenCalled();
    });

    it('throws when the role is already certified for the contest', async () => {
      mockPrisma.contestCertification.findFirst.mockResolvedValue(
        buildContestCertification({ role: 'AUDITOR', userId: 'existing-user' }) as any
      );

      await expect(
        service.certifyContest(TEST_CONTEST_ID, TEST_USER_ID, 'AUDITOR', TEST_TENANT_ID)
      ).rejects.toThrow('Contest already certified for this role');

      expect(mockPrisma.contestCertification.create).not.toHaveBeenCalled();
    });
  });
});
