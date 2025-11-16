/**
 * ContestCertificationService Unit Tests
 * Comprehensive test coverage for contest certification workflows
 */

import 'reflect-metadata';
import { ContestCertificationService } from '../../../src/services/ContestCertificationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../src/services/BaseService';

describe('ContestCertificationService', () => {
  let service: ContestCertificationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const contestId = 'contest-123';
  const userId = 'user-456';

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ContestCertificationService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ContestCertificationService);
    });

    it('should extend BaseService', () => {
      expect(service).toHaveProperty('notFoundError');
      expect(service).toHaveProperty('forbiddenError');
      expect(service).toHaveProperty('badRequestError');
    });
  });

  describe('getCertificationProgress', () => {
    const mockContest = {
      id: contestId,
      name: 'Preliminary Round',
      description: 'First round competition',
      eventId: 'event-123'
    };

    describe('success cases', () => {
      it('should return certification progress with all roles uncertified', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue([]);

        const result = await service.getCertificationProgress(contestId);

        expect(result).toEqual({
          contestId,
          tallyMaster: false,
          auditor: false,
          board: false,
          organizer: false,
          certifications: []
        });

        expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
          where: { id: contestId },
          select: {
            id: true,
            name: true,
            description: true,
            eventId: true
          }
        });
      });

      it('should return certification progress with some roles certified', async () => {
        const certifications = [
          {
            id: 'cert-1',
            contestId,
            role: 'TALLY_MASTER',
            userId: 'user-1',
            certifiedAt: new Date()
          },
          {
            id: 'cert-2',
            contestId,
            role: 'AUDITOR',
            userId: 'user-2',
            certifiedAt: new Date()
          }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result).toMatchObject({
          contestId,
          tallyMaster: true,
          auditor: true,
          board: false,
          organizer: false
        });
        expect(result.certifications).toHaveLength(2);
      });

      it('should return certification progress with all roles certified', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'TALLY_MASTER', userId: 'user-1', certifiedAt: new Date() },
          { id: 'cert-2', contestId, role: 'AUDITOR', userId: 'user-2', certifiedAt: new Date() },
          { id: 'cert-3', contestId, role: 'BOARD', userId: 'user-3', certifiedAt: new Date() },
          { id: 'cert-4', contestId, role: 'ORGANIZER', userId: 'user-4', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result).toMatchObject({
          contestId,
          tallyMaster: true,
          auditor: true,
          board: true,
          organizer: true
        });
        expect(result.certifications).toHaveLength(4);
      });

      it('should handle only tally master certification', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'TALLY_MASTER', userId: 'user-1', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result.tallyMaster).toBe(true);
        expect(result.auditor).toBe(false);
        expect(result.board).toBe(false);
        expect(result.organizer).toBe(false);
      });

      it('should handle only auditor certification', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'AUDITOR', userId: 'user-1', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result.tallyMaster).toBe(false);
        expect(result.auditor).toBe(true);
        expect(result.board).toBe(false);
        expect(result.organizer).toBe(false);
      });

      it('should handle only board certification', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'BOARD', userId: 'user-1', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result.tallyMaster).toBe(false);
        expect(result.auditor).toBe(false);
        expect(result.board).toBe(true);
        expect(result.organizer).toBe(false);
      });

      it('should handle only organizer certification', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'ORGANIZER', userId: 'user-1', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result.tallyMaster).toBe(false);
        expect(result.auditor).toBe(false);
        expect(result.board).toBe(false);
        expect(result.organizer).toBe(true);
      });

      it('should call contestCertification.findMany with correct parameters', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue([]);

        await service.getCertificationProgress(contestId);

        expect(mockPrisma.contestCertification.findMany).toHaveBeenCalledWith({
          where: { contestId }
        });
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundError when contest does not exist', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        await expect(service.getCertificationProgress(contestId))
          .rejects
          .toThrow(NotFoundError);

        expect(mockPrisma.contestCertification.findMany).not.toHaveBeenCalled();
      });

      it('should handle database errors in contest lookup', async () => {
        mockPrisma.contest.findUnique.mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(service.getCertificationProgress(contestId))
          .rejects
          .toThrow('Database connection failed');
      });

      it('should handle database errors in certification lookup', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockRejectedValue(
          new Error('Certification query failed')
        );

        await expect(service.getCertificationProgress(contestId))
          .rejects
          .toThrow('Certification query failed');
      });
    });

    describe('edge cases', () => {
      it('should handle empty contest description', async () => {
        const contestWithoutDesc = { ...mockContest, description: null };

        mockPrisma.contest.findUnique.mockResolvedValue(contestWithoutDesc as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue([]);

        const result = await service.getCertificationProgress(contestId);

        expect(result.contestId).toBe(contestId);
      });

      it('should handle duplicate role certifications correctly', async () => {
        const certifications = [
          { id: 'cert-1', contestId, role: 'TALLY_MASTER', userId: 'user-1', certifiedAt: new Date() },
          { id: 'cert-2', contestId, role: 'TALLY_MASTER', userId: 'user-2', certifiedAt: new Date() }
        ];

        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findMany.mockResolvedValue(certifications as any);

        const result = await service.getCertificationProgress(contestId);

        expect(result.tallyMaster).toBe(true);
        expect(result.certifications).toHaveLength(2);
      });
    });
  });

  describe('certifyContest', () => {
    const mockContest = {
      id: contestId,
      name: 'Finals',
      eventId: 'event-123'
    };

    const mockCertification = {
      id: 'cert-789',
      contestId,
      role: 'TALLY_MASTER',
      userId,
      certifiedAt: new Date()
    };

    describe('authorization', () => {
      it('should allow TALLY_MASTER to certify', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        const result = await service.certifyContest(contestId, userId, 'TALLY_MASTER');

        expect(result).toEqual(mockCertification);
      });

      it('should allow AUDITOR to certify', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        const result = await service.certifyContest(contestId, userId, 'AUDITOR');

        expect(result).toBeDefined();
      });

      it('should allow BOARD to certify', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        const result = await service.certifyContest(contestId, userId, 'BOARD');

        expect(result).toBeDefined();
      });

      it('should allow ORGANIZER to certify', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        const result = await service.certifyContest(contestId, userId, 'ORGANIZER');

        expect(result).toBeDefined();
      });

      it('should throw ForbiddenError for ADMIN role', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'ADMIN')
        ).rejects.toThrow(ForbiddenError);

        expect(mockPrisma.contest.findUnique).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenError for JUDGE role', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'JUDGE')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError for CONTESTANT role', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'CONTESTANT')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError for EMCEE role', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'EMCEE')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError for invalid role', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'INVALID_ROLE')
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('success cases', () => {
      beforeEach(() => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
      });

      it('should create certification for TALLY_MASTER', async () => {
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        const result = await service.certifyContest(contestId, userId, 'TALLY_MASTER');

        expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
          data: {
            contestId,
            role: 'TALLY_MASTER',
            userId
          }
        });
        expect(result).toEqual(mockCertification);
      });

      it('should create certification for AUDITOR', async () => {
        const auditorCert = { ...mockCertification, role: 'AUDITOR' };
        mockPrisma.contestCertification.create.mockResolvedValue(auditorCert as any);

        const result = await service.certifyContest(contestId, userId, 'AUDITOR');

        expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
          data: {
            contestId,
            role: 'AUDITOR',
            userId
          }
        });
        expect(result.role).toBe('AUDITOR');
      });

      it('should create certification for BOARD', async () => {
        const boardCert = { ...mockCertification, role: 'BOARD' };
        mockPrisma.contestCertification.create.mockResolvedValue(boardCert as any);

        const result = await service.certifyContest(contestId, userId, 'BOARD');

        expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
          data: {
            contestId,
            role: 'BOARD',
            userId
          }
        });
        expect(result.role).toBe('BOARD');
      });

      it('should create certification for ORGANIZER', async () => {
        const organizerCert = { ...mockCertification, role: 'ORGANIZER' };
        mockPrisma.contestCertification.create.mockResolvedValue(organizerCert as any);

        const result = await service.certifyContest(contestId, userId, 'ORGANIZER');

        expect(mockPrisma.contestCertification.create).toHaveBeenCalledWith({
          data: {
            contestId,
            role: 'ORGANIZER',
            userId
          }
        });
        expect(result.role).toBe('ORGANIZER');
      });

      it('should verify contest exists before certification', async () => {
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        await service.certifyContest(contestId, userId, 'TALLY_MASTER');

        expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
          where: { id: contestId }
        });
      });

      it('should check for existing certification before creating', async () => {
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        await service.certifyContest(contestId, userId, 'TALLY_MASTER');

        expect(mockPrisma.contestCertification.findFirst).toHaveBeenCalledWith({
          where: { contestId, role: 'TALLY_MASTER' }
        });
      });
    });

    describe('error cases', () => {
      it('should throw NotFoundError when contest does not exist', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow(NotFoundError);

        expect(mockPrisma.contestCertification.findFirst).not.toHaveBeenCalled();
        expect(mockPrisma.contestCertification.create).not.toHaveBeenCalled();
      });

      it('should throw BadRequestError when contest already certified for role', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(mockCertification as any);

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow(BadRequestError);

        expect(mockPrisma.contestCertification.create).not.toHaveBeenCalled();
      });

      it('should handle database errors in contest lookup', async () => {
        mockPrisma.contest.findUnique.mockRejectedValue(
          new Error('Database error')
        );

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow('Database error');
      });

      it('should handle database errors in existing certification check', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockRejectedValue(
          new Error('Query failed')
        );

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow('Query failed');
      });

      it('should handle database errors in certification creation', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create.mockRejectedValue(
          new Error('Create failed')
        );

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow('Create failed');
      });
    });

    describe('edge cases', () => {
      it('should allow different users to certify same contest for different roles', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create
          .mockResolvedValueOnce({ ...mockCertification, role: 'TALLY_MASTER', userId: 'user-1' } as any)
          .mockResolvedValueOnce({ ...mockCertification, role: 'AUDITOR', userId: 'user-2' } as any);

        const result1 = await service.certifyContest(contestId, 'user-1', 'TALLY_MASTER');
        const result2 = await service.certifyContest(contestId, 'user-2', 'AUDITOR');

        expect(result1.role).toBe('TALLY_MASTER');
        expect(result2.role).toBe('AUDITOR');
      });

      it('should handle same user certifying for different roles', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst.mockResolvedValue(null);
        mockPrisma.contestCertification.create
          .mockResolvedValueOnce({ ...mockCertification, role: 'TALLY_MASTER' } as any)
          .mockResolvedValueOnce({ ...mockCertification, role: 'AUDITOR' } as any);

        const result1 = await service.certifyContest(contestId, userId, 'TALLY_MASTER');
        const result2 = await service.certifyContest(contestId, userId, 'AUDITOR');

        expect(result1.userId).toBe(userId);
        expect(result2.userId).toBe(userId);
      });

      it('should handle role name case sensitivity', async () => {
        await expect(
          service.certifyContest(contestId, userId, 'tally_master')
        ).rejects.toThrow(ForbiddenError);

        await expect(
          service.certifyContest(contestId, userId, 'TallyMaster')
        ).rejects.toThrow(ForbiddenError);
      });

      it('should prevent double certification for same role', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contestCertification.findFirst
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(mockCertification as any);
        mockPrisma.contestCertification.create.mockResolvedValue(mockCertification as any);

        await service.certifyContest(contestId, userId, 'TALLY_MASTER');

        await expect(
          service.certifyContest(contestId, userId, 'TALLY_MASTER')
        ).rejects.toThrow(BadRequestError);
      });
    });
  });
});
