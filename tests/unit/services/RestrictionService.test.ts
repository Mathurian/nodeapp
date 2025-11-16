/**
 * RestrictionService Unit Tests
 * Comprehensive tests for restriction operations
 */

import 'reflect-metadata';
import { RestrictionService } from '../../../src/services/RestrictionService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../src/services/BaseService';

describe('RestrictionService', () => {
  let service: RestrictionService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    contestantViewRestricted: false,
    contestantViewReleaseDate: null,
    isLocked: false,
    lockedAt: null,
    lockVerifiedBy: null
  };

  const mockContest = {
    id: 'contest-1',
    name: 'Test Contest',
    eventId: 'event-1',
    contestantViewRestricted: false,
    contestantViewReleaseDate: null,
    isLocked: false,
    lockedAt: null,
    lockVerifiedBy: null,
    event: mockEvent
  };

  const mockUser = {
    id: 'user-1',
    name: 'Admin User',
    role: 'ADMIN'
  };

  const mockVerifier = {
    id: 'user-2',
    name: 'Verifier User',
    role: 'BOARD'
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new RestrictionService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RestrictionService);
    });
  });

  describe('setContestantViewRestriction', () => {
    describe('for events', () => {
      it('should set restriction on event for ADMIN', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.setContestantViewRestriction(
          { eventId: 'event-1', restricted: true },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
          where: { id: 'event-1' }
        });
        expect(mockPrisma.event.update).toHaveBeenCalled();
      });

      it('should set restriction on event for ORGANIZER', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);

        await service.setContestantViewRestriction(
          { eventId: 'event-1', restricted: true },
          'user-1',
          'ORGANIZER'
        );

        expect(mockPrisma.event.update).toHaveBeenCalled();
      });

      it('should set restriction on event for BOARD', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);

        await service.setContestantViewRestriction(
          { eventId: 'event-1', restricted: true },
          'user-1',
          'BOARD'
        );

        expect(mockPrisma.event.update).toHaveBeenCalled();
      });

      it('should restrict all contests when restricting event', async () => {
        const releaseDate = new Date('2025-12-31');
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.setContestantViewRestriction(
          { eventId: 'event-1', restricted: true, releaseDate },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.updateMany).toHaveBeenCalledWith({
          where: { eventId: 'event-1' },
          data: expect.any(Object)
        });
      });

      it('should throw error when event not found', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(null);

        await expect(
          service.setContestantViewRestriction(
            { eventId: 'invalid-id', restricted: true },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(NotFoundError);
      });

      it('should throw error when user lacks permission', async () => {
        await expect(
          service.setContestantViewRestriction(
            { eventId: 'event-1', restricted: true },
            'user-1',
            'JUDGE'
          )
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('for contests', () => {
      it('should set restriction on contest', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contest.update.mockResolvedValue(mockContest as any);

        await service.setContestantViewRestriction(
          { contestId: 'contest-1', restricted: true },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.findUnique).toHaveBeenCalledWith({
          where: { id: 'contest-1' }
        });
        expect(mockPrisma.contest.update).toHaveBeenCalled();
      });

      it('should set restriction with release date', async () => {
        const releaseDate = new Date('2025-12-31');
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contest.update.mockResolvedValue(mockContest as any);

        await service.setContestantViewRestriction(
          { contestId: 'contest-1', restricted: true, releaseDate },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.update).toHaveBeenCalled();
      });

      it('should throw error when contest not found', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        await expect(
          service.setContestantViewRestriction(
            { contestId: 'invalid-id', restricted: true },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(NotFoundError);
      });
    });

    it('should throw error when neither eventId nor contestId provided', async () => {
      await expect(
        service.setContestantViewRestriction(
          { restricted: true } as any,
          'user-1',
          'ADMIN'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('canContestantView', () => {
    describe('for contests', () => {
      it('should return true when no restrictions', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(true);
      });

      it('should return false when event is restricted without release date', async () => {
        const restrictedContest = {
          ...mockContest,
          event: { ...mockEvent, contestantViewRestricted: true }
        };
        mockPrisma.contest.findUnique.mockResolvedValue(restrictedContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(false);
      });

      it('should return true when event restriction is released', async () => {
        const releaseDate = new Date(Date.now() - 1000);
        const restrictedContest = {
          ...mockContest,
          event: { ...mockEvent, contestantViewRestricted: true, contestantViewReleaseDate: releaseDate }
        };
        mockPrisma.contest.findUnique.mockResolvedValue(restrictedContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(true);
      });

      it('should return false when event restriction not yet released', async () => {
        const releaseDate = new Date(Date.now() + 100000);
        const restrictedContest = {
          ...mockContest,
          event: { ...mockEvent, contestantViewRestricted: true, contestantViewReleaseDate: releaseDate }
        };
        mockPrisma.contest.findUnique.mockResolvedValue(restrictedContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(false);
      });

      it('should return false when contest is restricted without release date', async () => {
        const restrictedContest = {
          ...mockContest,
          contestantViewRestricted: true
        };
        mockPrisma.contest.findUnique.mockResolvedValue(restrictedContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(false);
      });

      it('should return true when contest restriction is released', async () => {
        const releaseDate = new Date(Date.now() - 1000);
        const restrictedContest = {
          ...mockContest,
          contestantViewRestricted: true,
          contestantViewReleaseDate: releaseDate
        };
        mockPrisma.contest.findUnique.mockResolvedValue(restrictedContest as any);

        const result = await service.canContestantView(undefined, 'contest-1');

        expect(result).toBe(true);
      });

      it('should return false when contest not found', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        const result = await service.canContestantView(undefined, 'invalid-id');

        expect(result).toBe(false);
      });
    });

    describe('for events', () => {
      it('should return true when event not restricted', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

        const result = await service.canContestantView('event-1');

        expect(result).toBe(true);
      });

      it('should return false when event restricted without release date', async () => {
        const restrictedEvent = { ...mockEvent, contestantViewRestricted: true };
        mockPrisma.event.findUnique.mockResolvedValue(restrictedEvent as any);

        const result = await service.canContestantView('event-1');

        expect(result).toBe(false);
      });

      it('should return true when event restriction is released', async () => {
        const releaseDate = new Date(Date.now() - 1000);
        const restrictedEvent = {
          ...mockEvent,
          contestantViewRestricted: true,
          contestantViewReleaseDate: releaseDate
        };
        mockPrisma.event.findUnique.mockResolvedValue(restrictedEvent as any);

        const result = await service.canContestantView('event-1');

        expect(result).toBe(true);
      });

      it('should return false when event not found', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(null);

        const result = await service.canContestantView('invalid-id');

        expect(result).toBe(false);
      });
    });

    it('should return true when no IDs provided', async () => {
      const result = await service.canContestantView();

      expect(result).toBe(true);
    });
  });

  describe('lockEventContest', () => {
    describe('locking events', () => {
      it('should lock event for ADMIN', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.lockEventContest(
          { eventId: 'event-1', locked: true },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.event.update).toHaveBeenCalledWith({
          where: { id: 'event-1' },
          data: expect.objectContaining({
            lockedAt: expect.any(Date),
            lockVerifiedBy: null
          })
        });
      });

      it('should lock all contests when locking event', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.lockEventContest(
          { eventId: 'event-1', locked: true },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.updateMany).toHaveBeenCalledWith({
          where: { eventId: 'event-1' },
          data: expect.objectContaining({
            isLocked: true,
            lockedAt: expect.any(Date),
            lockVerifiedBy: null
          })
        });
      });

      it('should throw error when user lacks permission', async () => {
        await expect(
          service.lockEventContest(
            { eventId: 'event-1', locked: true },
            'user-1',
            'JUDGE'
          )
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw error when event not found', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(null);

        await expect(
          service.lockEventContest(
            { eventId: 'invalid-id', locked: true },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('unlocking events', () => {
      it('should unlock event with valid verifier', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.user.findUnique.mockResolvedValue(mockVerifier as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.lockEventContest(
          { eventId: 'event-1', locked: false, verifiedBy: 'user-2' },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.event.update).toHaveBeenCalledWith({
          where: { id: 'event-1' },
          data: expect.objectContaining({
            lockVerifiedBy: 'user-2'
          })
        });
      });

      it('should unlock all contests when unlocking event', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.user.findUnique.mockResolvedValue(mockVerifier as any);
        mockPrisma.event.update.mockResolvedValue(mockEvent as any);
        mockPrisma.contest.updateMany.mockResolvedValue({ count: 3 } as any);

        await service.lockEventContest(
          { eventId: 'event-1', locked: false, verifiedBy: 'user-2' },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.updateMany).toHaveBeenCalledWith({
          where: { eventId: 'event-1' },
          data: expect.objectContaining({
            lockVerifiedBy: 'user-2'
          })
        });
      });

      it('should throw error when verifier is missing', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

        await expect(
          service.lockEventContest(
            { eventId: 'event-1', locked: false },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(ValidationError);
      });

      it('should throw error when verifier is same as user', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

        await expect(
          service.lockEventContest(
            { eventId: 'event-1', locked: false, verifiedBy: 'user-1' },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(ValidationError);
      });

      it('should throw error when verifier lacks permission', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.user.findUnique.mockResolvedValue({ ...mockVerifier, role: 'JUDGE' } as any);

        await expect(
          service.lockEventContest(
            { eventId: 'event-1', locked: false, verifiedBy: 'user-2' },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(ValidationError);
      });

      it('should throw error when verifier not found', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(
          service.lockEventContest(
            { eventId: 'event-1', locked: false, verifiedBy: 'invalid-id' },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(ValidationError);
      });
    });

    describe('locking contests', () => {
      it('should lock contest', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.contest.update.mockResolvedValue(mockContest as any);

        await service.lockEventContest(
          { contestId: 'contest-1', locked: true },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.update).toHaveBeenCalledWith({
          where: { id: 'contest-1' },
          data: expect.objectContaining({
            lockedAt: expect.any(Date),
            lockVerifiedBy: null
          })
        });
      });

      it('should throw error when contest not found', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        await expect(
          service.lockEventContest(
            { contestId: 'invalid-id', locked: true },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(NotFoundError);
      });
    });

    describe('unlocking contests', () => {
      it('should unlock contest with valid verifier', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);
        mockPrisma.user.findUnique.mockResolvedValue(mockVerifier as any);
        mockPrisma.contest.update.mockResolvedValue(mockContest as any);

        await service.lockEventContest(
          { contestId: 'contest-1', locked: false, verifiedBy: 'user-2' },
          'user-1',
          'ADMIN'
        );

        expect(mockPrisma.contest.update).toHaveBeenCalledWith({
          where: { id: 'contest-1' },
          data: expect.objectContaining({
            lockVerifiedBy: 'user-2'
          })
        });
      });

      it('should throw error when verifier is same as user', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

        await expect(
          service.lockEventContest(
            { contestId: 'contest-1', locked: false, verifiedBy: 'user-1' },
            'user-1',
            'ADMIN'
          )
        ).rejects.toThrow(ValidationError);
      });
    });

    it('should throw error when neither eventId nor contestId provided', async () => {
      await expect(
        service.lockEventContest(
          { locked: true } as any,
          'user-1',
          'ADMIN'
        )
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('isLocked', () => {
    describe('for contests', () => {
      it('should return false when contest not locked', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

        const result = await service.isLocked(undefined, 'contest-1');

        expect(result).toBe(false);
      });

      it('should return true when contest is locked', async () => {
        const lockedContest = { ...mockContest, isLocked: true };
        mockPrisma.contest.findUnique.mockResolvedValue(lockedContest as any);

        const result = await service.isLocked(undefined, 'contest-1');

        expect(result).toBe(true);
      });

      it('should return true when event is locked', async () => {
        const contestWithLockedEvent = {
          ...mockContest,
          event: { ...mockEvent, isLocked: true }
        };
        mockPrisma.contest.findUnique.mockResolvedValue(contestWithLockedEvent as any);

        const result = await service.isLocked(undefined, 'contest-1');

        expect(result).toBe(true);
      });

      it('should return false when contest not found', async () => {
        mockPrisma.contest.findUnique.mockResolvedValue(null);

        const result = await service.isLocked(undefined, 'invalid-id');

        expect(result).toBe(false);
      });
    });

    describe('for events', () => {
      it('should return false when event not locked', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);

        const result = await service.isLocked('event-1');

        expect(result).toBe(false);
      });

      it('should return true when event is locked', async () => {
        const lockedEvent = { ...mockEvent, isLocked: true };
        mockPrisma.event.findUnique.mockResolvedValue(lockedEvent as any);

        const result = await service.isLocked('event-1');

        expect(result).toBe(true);
      });

      it('should return false when event not found', async () => {
        mockPrisma.event.findUnique.mockResolvedValue(null);

        const result = await service.isLocked('invalid-id');

        expect(result).toBe(false);
      });
    });

    it('should return false when no IDs provided', async () => {
      const result = await service.isLocked();

      expect(result).toBe(false);
    });
  });
});
