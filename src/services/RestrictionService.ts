/**
 * Event/Contest Restriction Service
 * Manages contestant view restrictions and edit locks
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

export interface SetContestantViewRestrictionDTO {
  eventId?: string;
  contestId?: string;
  restricted: boolean;
  releaseDate?: Date;
}

export interface LockEventContestDTO {
  eventId?: string;
  contestId?: string;
  locked: boolean;
  verifiedBy?: string; // Required when unlocking
}

@injectable()
export class RestrictionService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Set contestant view restriction for event or contest
   */
  async setContestantViewRestriction(
    dto: SetContestantViewRestrictionDTO,
    _userId: string,
    userRole: string
  ): Promise<void> {
    // Only admin, organizer, or board can set restrictions
    if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to set contestant view restrictions');
    }

    if (dto.eventId) {
      const event: any = await this.prisma.event.findUnique({
        where: { id: dto.eventId }
      });

      if (!event) {
        throw this.createNotFoundError('Event not found');
      }

      await this.prisma.event.update({
        where: { id: dto.eventId },
        data: {
          // contestantViewRestricted: dto.restricted,
          // contestantViewReleaseDate: dto.releaseDate || null
        }
      });

      // If restricting event, also restrict all contests
      if (dto.restricted) {
        await this.prisma.contest.updateMany({
          where: { eventId: dto.eventId },
          data: {
            // contestantViewRestricted: true,
            // contestantViewReleaseDate: dto.releaseDate || null
          }
        });
      }
    } else if (dto.contestId) {
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: dto.contestId }
      });

      if (!contest) {
        throw this.createNotFoundError('Contest not found');
      }

      await this.prisma.contest.update({
        where: { id: dto.contestId },
        data: {
          // contestantViewRestricted: dto.restricted,
          // contestantViewReleaseDate: dto.releaseDate || null
        }
      });
    } else {
      throw this.validationError('Either eventId or contestId must be provided');
    }
  }

  /**
   * Check if contestant can view scores/results
   */
  async canContestantView(
    eventId?: string,
    contestId?: string
  ): Promise<boolean> {
    if (contestId) {
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: contestId },
        include: {
          event: {
            select: {
              id: true,
              contestantViewRestricted: true,
              contestantViewReleaseDate: true
            }
          }
        } as any
      } as any);

      if (!contest) {
        return false;
      }

      // Check event-level restriction
      if (contest.event.contestantViewRestricted) {
        if (contest.event.contestantViewReleaseDate) {
          return new Date() >= contest.event.contestantViewReleaseDate;
        }
        return false;
      }

      return true;
    } else if (eventId) {
      const event: any = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return false;
      }

      if (event.contestantViewRestricted) {
        if (event.contestantViewReleaseDate) {
          return new Date() >= event.contestantViewReleaseDate;
        }
        return false;
      }

      return true;
    }

    return true;
  }

  /**
   * Lock event or contest for editing
   */
  async lockEventContest(
    dto: LockEventContestDTO,
    userId: string,
    userRole: string
  ): Promise<void> {
    // Only admin, organizer, or board can lock
    if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to lock events/contests');
    }

    if (dto.eventId) {
      const event: any = await this.prisma.event.findUnique({
        where: { id: dto.eventId }
      });

      if (!event) {
        throw this.createNotFoundError('Event not found');
      }

      if (dto.locked) {
        // Locking - no verification needed
        await this.prisma.event.update({
          where: { id: dto.eventId },
          data: {
            // isLocked: true,
            lockedAt: new Date(),
            lockVerifiedBy: null,
          }
        });

        // Lock all contests under this event
        await this.prisma.contest.updateMany({
          where: { eventId: dto.eventId },
          data: {
            isLocked: true,
            lockedAt: new Date(),
            lockVerifiedBy: null
          }
        });
      } else {
        // Unlocking - requires verification from another admin/organizer/board
        if (!dto.verifiedBy || dto.verifiedBy === userId) {
          throw this.validationError('Unlocking requires verification from a different admin/organizer/board user');
        }

        // Verify the verifier is an admin/organizer/board
        const verifier: any = await this.prisma.user.findUnique({
          where: { id: dto.verifiedBy },
          select: { role: true }
        });

        if (!verifier || !['ADMIN', 'ORGANIZER', 'BOARD'].includes(verifier.role)) {
          throw this.validationError('Verifier must be an admin, organizer, or board member');
        }

        await this.prisma.event.update({
          where: { id: dto.eventId },
          data: {
            // isLocked: false,
            lockVerifiedBy: dto.verifiedBy,
          }
        });

        // Unlock all contests under this event
        await this.prisma.contest.updateMany({
          where: { eventId: dto.eventId },
          data: {
            // isLocked: false,
            lockVerifiedBy: dto.verifiedBy,
          }
        });
      }
    } else if (dto.contestId) {
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: dto.contestId }
      });

      if (!contest) {
        throw this.createNotFoundError('Contest not found');
      }

      if (dto.locked) {
        // Locking - no verification needed
        await this.prisma.contest.update({
          where: { id: dto.contestId },
          data: {
            // isLocked: true,
            lockedAt: new Date(),
            lockVerifiedBy: null,
          }
        });
      } else {
        // Unlocking - requires verification
        if (!dto.verifiedBy || dto.verifiedBy === userId) {
          throw this.validationError('Unlocking requires verification from a different admin/organizer/board user');
        }

        const verifier: any = await this.prisma.user.findUnique({
          where: { id: dto.verifiedBy },
          select: { role: true }
        });

        if (!verifier || !['ADMIN', 'ORGANIZER', 'BOARD'].includes(verifier.role)) {
          throw this.validationError('Verifier must be an admin, organizer, or board member');
        }

        await this.prisma.contest.update({
          where: { id: dto.contestId },
          data: {
            // isLocked: false,
            lockVerifiedBy: dto.verifiedBy,
          }
        });
      }
    } else {
      throw this.validationError('Either eventId or contestId must be provided');
    }
  }

  /**
   * Check if event/contest is locked
   */
  async isLocked(eventId?: string, contestId?: string): Promise<boolean> {
    if (contestId) {
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: contestId },
        include: {
          event: true
        } as any
      } as any);

      if (!contest) {
        return false;
      }

      // Check event-level lock first
      if (contest.event.isLocked) {
        return true;
      }

      return contest.isLocked;
    } else if (eventId) {
      const event: any = await this.prisma.event.findUnique({
        where: { id: eventId }
      });

      if (!event) {
        return false;
      }

      return event.isLocked;
    }

    return false;
  }
}


