/**
 * Contestant Score Filter Service
 * Implements contestant-specific score visibility restrictions
 * Phase 2.1 - Complete Contestant Score Visibility Enforcement
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

type Score = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    contestantId: true;
    judgeId: true;
    categoryId: true;
    score: true;
  };
}>;

type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ORGANIZER'
  | 'BOARD'
  | 'TALLY_MASTER'
  | 'AUDITOR'
  | 'JUDGE'
  | 'EMCEE'
  | 'CONTESTANT';

export interface CanViewScoresResult {
  canView: boolean;
  reason?: string;
}

@injectable()
export class ContestantScoreFilterService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Check if a contestant can view scores for a given contest
   * Enforces time-based release restrictions at event and contest levels
   */
  async canContestantViewScores(
    contestId: string,
    contestantId: string,
    userId: string,
    userRole: UserRole,
    tenantId: string
  ): Promise<CanViewScoresResult> {
    // Admin, Organizer, and Board can always view
    if (['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      return { canView: true };
    }

    // Get contest with event data
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId, tenantId },
      include: {
        event: {
          select: {
            id: true,
            contestantViewRestricted: true,
            contestantViewReleaseDate: true,
          }
        }
      }
    });

    if (!contest) {
      return {
        canView: false,
        reason: 'Contest not found'
      };
    }

    // Check event-level restriction first (highest priority)
    if (contest.event.contestantViewRestricted) {
      if (!contest.event.contestantViewReleaseDate) {
        return {
          canView: false,
          reason: 'Event scores are restricted. No release date set.'
        };
      }

      if (new Date() < contest.event.contestantViewReleaseDate) {
        return {
          canView: false,
          reason: `Event scores will be released on ${contest.event.contestantViewReleaseDate.toLocaleString()}`
        };
      }
    }

    // Check contest-level restriction
    if (contest.contestantViewRestricted) {
      if (!contest.contestantViewReleaseDate) {
        return {
          canView: false,
          reason: 'Contest scores are restricted. No release date set.'
        };
      }

      if (new Date() < contest.contestantViewReleaseDate) {
        return {
          canView: false,
          reason: `Contest scores will be released on ${contest.contestantViewReleaseDate.toLocaleString()}`
        };
      }
    }

    // Verify user owns this contestant (for CONTESTANT role)
    if (userRole === 'CONTESTANT') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId, tenantId },
        select: { contestantId: true }
      });

      if (!user || user.contestantId !== contestantId) {
        return {
          canView: false,
          reason: 'You can only view your own scores'
        };
      }
    }

    return { canView: true };
  }

  /**
   * Filter scores array based on user role and contestant ownership
   * Returns only scores the user is permitted to see
   */
  async filterScoresForContestant(
    scores: Score[],
    contestantId: string | null,
    userRole: UserRole
  ): Promise<Score[]> {
    // Staff roles (Admin, Organizer, Board, Judges, Tally Masters, Auditors) see all scores
    if (['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      return scores;
    }

    // EMCEE sees all scores (for announcing)
    if (userRole === 'EMCEE') {
      return scores;
    }

    // Contestants only see their own scores
    if (userRole === 'CONTESTANT' && contestantId) {
      return scores.filter(s => s.contestantId === contestantId);
    }

    // Default: no access
    return [];
  }

  /**
   * Filter scores by category with permission checks
   * Enforces both time-based restrictions and ownership
   */
  async filterScoresByCategory(
    categoryId: string,
    userId: string,
    userRole: UserRole,
    contestantId: string | null,
    tenantId: string
  ): Promise<Score[]> {
    // Get category to find contest
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId, tenantId },
      select: { contestId: true }
    });

    if (!category || !category.contestId) {
      throw this.createNotFoundError('Category not found');
    }

    // Check if contestant can view scores for this contest
    if (userRole === 'CONTESTANT' && contestantId) {
      const canView = await this.canContestantViewScores(
        category.contestId,
        contestantId,
        userId,
        userRole,
        tenantId
      );

      if (!canView.canView) {
        throw this.forbiddenError(canView.reason || 'Access denied');
      }
    }

    // Fetch scores for this category
    const scores = await this.prisma.score.findMany({
      where: { categoryId, tenantId },
      select: {
        id: true,
        contestantId: true,
        judgeId: true,
        categoryId: true,
        score: true,
      }
    });

    // Apply filtering based on role
    return this.filterScoresForContestant(scores, contestantId, userRole);
  }

  /**
   * Check if scores should be visible for a specific contestant
   * Used for read-only permission checks
   */
  async areScoresVisible(
    contestId: string,
    userRole: UserRole,
    tenantId: string
  ): Promise<boolean> {
    // Staff always have visibility
    if (['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
      return true;
    }

    // For contestants, check restrictions
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId, tenantId },
      include: {
        event: {
          select: {
            contestantViewRestricted: true,
            contestantViewReleaseDate: true,
          }
        }
      }
    });

    if (!contest) {
      return false;
    }

    // Check event-level restriction
    if (contest.event.contestantViewRestricted) {
      if (!contest.event.contestantViewReleaseDate) {
        return false;
      }
      if (new Date() < contest.event.contestantViewReleaseDate) {
        return false;
      }
    }

    // Check contest-level restriction
    if (contest.contestantViewRestricted) {
      if (!contest.contestantViewReleaseDate) {
        return false;
      }
      if (new Date() < contest.contestantViewReleaseDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get release status information for a contest
   * Useful for UI to display release dates and reasons
   */
  async getScoreReleaseStatus(
    contestId: string,
    tenantId: string
  ): Promise<{
    isRestricted: boolean;
    releaseDate: Date | null;
    reason: string;
    restrictedBy: 'event' | 'contest' | null;
  }> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId, tenantId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            contestantViewRestricted: true,
            contestantViewReleaseDate: true,
          }
        }
      }
    });

    if (!contest) {
      return {
        isRestricted: false,
        releaseDate: null,
        reason: 'Contest not found',
        restrictedBy: null
      };
    }

    // Check event-level restriction first
    if (contest.event.contestantViewRestricted) {
      return {
        isRestricted: true,
        releaseDate: contest.event.contestantViewReleaseDate,
        reason: contest.event.contestantViewReleaseDate
          ? `Scores will be released on ${contest.event.contestantViewReleaseDate.toLocaleString()}`
          : 'Scores are restricted by event organizers',
        restrictedBy: 'event'
      };
    }

    // Check contest-level restriction
    if (contest.contestantViewRestricted) {
      return {
        isRestricted: true,
        releaseDate: contest.contestantViewReleaseDate,
        reason: contest.contestantViewReleaseDate
          ? `Scores will be released on ${contest.contestantViewReleaseDate.toLocaleString()}`
          : 'Scores are restricted by contest organizers',
        restrictedBy: 'contest'
      };
    }

    // No restrictions
    return {
      isRestricted: false,
      releaseDate: null,
      reason: 'Scores are publicly visible',
      restrictedBy: null
    };
  }
}
