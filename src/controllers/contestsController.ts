/**
 * Contests Controller - TypeScript Implementation
 * Thin controller layer delegating business logic to ContestService
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { PrismaClient } from '@prisma/client';
import { ContestService } from '../services/ContestService';
import { StructureCopyService } from '../services/StructureCopyService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/responseHelpers';
import {
  contestUsesOlympicScoring,
  getContestJudgeCount,
  MIN_JUDGES_OLYMPIC
} from '../utils/olympicScoringValidation';

export class ContestsController {
  private contestService: ContestService;
  private structureCopyService: StructureCopyService;
  private prisma: PrismaClient;

  constructor() {
    this.contestService = container.resolve(ContestService);
    this.structureCopyService = container.resolve(StructureCopyService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  private async getSettingWithTenantFallback(key: string, tenantId: string): Promise<string | null> {
    const tenantSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId },
      select: { value: true }
    });
    if (tenantSetting?.value !== undefined && tenantSetting?.value !== null) {
      return tenantSetting.value;
    }

    const globalSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId: null },
      select: { value: true }
    });
    return globalSetting?.value ?? null;
  }

  private contestantCanViewContest(contest: {
    contestantViewRestricted?: boolean | null;
    contestantViewReleaseDate?: Date | null;
    event?: {
      contestantViewRestricted?: boolean | null;
      contestantViewReleaseDate?: Date | null;
    } | null;
  }): boolean {
    const now = new Date();
    const eventRestricted = Boolean(contest.event?.contestantViewRestricted);
    const eventRelease = contest.event?.contestantViewReleaseDate || null;
    if (eventRestricted && (!eventRelease || eventRelease > now)) {
      return false;
    }

    const contestRestricted = Boolean(contest.contestantViewRestricted);
    const contestRelease = contest.contestantViewReleaseDate || null;
    if (contestRestricted && (!contestRelease || contestRelease > now)) {
      return false;
    }

    return true;
  }

  /**
   * Get all contests with optional filters
   */
  getAllContests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, archived, search, createdAfter, createdBefore, sortBy, sortDirection } = req.query;

      const filters: any = {};

      // Tenant filter for non-SUPER_ADMIN users
      const isSuperAdmin = req.isSuperAdmin;
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!isSuperAdmin && tenantId) {
        filters.tenantId = tenantId;
      }

      if (eventId && typeof eventId === 'string') {
        filters.eventId = eventId;
      }

      if (archived !== undefined) {
        filters.archived = archived === 'true';
      }

      if (search && typeof search === 'string') {
        filters.search = search;
      }

      if (createdAfter && typeof createdAfter === 'string') {
        filters.createdAfter = new Date(createdAfter);
      }

      if (createdBefore && typeof createdBefore === 'string') {
        filters.createdBefore = new Date(createdBefore);
      }

      if (sortBy && typeof sortBy === 'string') {
        filters.sortBy = sortBy;
      }

      if (sortDirection && (sortDirection === 'asc' || sortDirection === 'desc')) {
        filters.sortDirection = sortDirection;
      }

      const contests = await this.contestService.getAllContests(filters);

      let filteredContests = contests;
      if (req.user?.role === 'CONTESTANT' && req.user.contestantId) {
        const contestantId = req.user.contestantId;
        const now = new Date();

        const contestRows = await this.prisma.contestContestant.findMany({
          where: { contestantId },
          select: { contestId: true }
        });
        const categoryRows = await this.prisma.categoryContestant.findMany({
          where: { contestantId },
          select: { category: { select: { contestId: true } } }
        });

        const allowedContestIds = new Set<string>();
        contestRows.forEach((row) => allowedContestIds.add(row.contestId));
        categoryRows.forEach((row: any) => row?.category?.contestId && allowedContestIds.add(row.category.contestId));

        const visibilityRows = await this.prisma.contest.findMany({
          where: { id: { in: Array.from(allowedContestIds) } },
          select: {
            id: true,
            contestantViewRestricted: true,
            contestantViewReleaseDate: true,
            event: {
              select: {
                contestantViewRestricted: true,
                contestantViewReleaseDate: true
              }
            }
          }
        });

        const visibleContestIds = new Set<string>();
        visibilityRows.forEach((contest) => {
          const blockedByEvent = contest.event.contestantViewRestricted &&
            (!contest.event.contestantViewReleaseDate || contest.event.contestantViewReleaseDate > now);
          const blockedByContest = contest.contestantViewRestricted &&
            (!contest.contestantViewReleaseDate || contest.contestantViewReleaseDate > now);
          if (!blockedByEvent && !blockedByContest) {
            visibleContestIds.add(contest.id);
          }
        });

        filteredContests = contests.filter((contest) => visibleContestIds.has(contest.id));
      }

      return sendSuccess(res, filteredContests, 'Contests retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contest by ID
   */
  getContestById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.getContestWithDetails(id);
      return sendSuccess(res, contest, 'Contest retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contests by event
   */
  getContestsByEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;
      const { includeArchived } = req.query;
      if (!eventId) {
        return sendError(res, 'Event ID is required', 400);
      }
      // When viewing contests for a specific event, allow showing archived contests
      const contests = await this.contestService.getContestsByEventId(
        eventId, 
        includeArchived === 'true', 
        true // forEventView = true
      );
      return sendSuccess(res, contests, 'Contests retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create contest
   */
  createContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        return sendError(res, 'Event ID is required', 400);
      }
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendError(res, 'Tenant context is required to create a contest', 400);
      }
      const event = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!event) {
        return sendError(res, 'Event not found', 404);
      }
      const { name, description, commentaryMode, commentaryScope, contestantNumberingMode } = req.body;

      const contest = await this.contestService.createContest({
        tenantId,
        eventId,
        name,
        description,
        commentaryMode,
        commentaryScope,
        contestantNumberingMode,
      });

      return sendCreated(res, contest, 'Contest created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update contest
   */
  updateContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const { name, description, commentaryMode, commentaryScope, contestantNumberingMode } = req.body;

      const contest = await this.contestService.updateContest(id, {
        name,
        description,
        commentaryMode,
        commentaryScope,
        contestantNumberingMode,
      });

      return sendSuccess(res, contest, 'Contest updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  cloneContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }

      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendError(res, 'Tenant context is required to clone a contest', 400);
      }

      const { targetEventId, name, includeCategories, includeCriteria } = req.body;
      const contest = await this.structureCopyService.cloneContest({
        tenantId,
        sourceContestId: id,
        targetEventId,
        name,
        includeCategories,
        includeCriteria,
        actorRole: req.user?.role,
      });

      return sendCreated(res, contest, 'Contest cloned successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete contest (soft delete)
   * S4-3: Pass userId for deletedBy tracking
   */
  deleteContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }

      // S4-3: Pass userId for deletedBy tracking
      const userId = req.user?.id;
      await this.contestService.deleteContest(id, userId);

      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Restore a soft-deleted contest
   * S4-3: Allow undeleting contests
   */
  restoreContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }

      const restoredContest = await this.contestService.restoreContest(id);
      return sendSuccess(res, restoredContest, 'Contest restored successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Archive contest
   */
  archiveContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.archiveContest(id);
      return sendSuccess(res, contest, 'Contest archived successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Reactivate contest (unarchive)
   */
  reactivateContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.unarchiveContest(id);
      return sendSuccess(res, contest, 'Contest reactivated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get archived contests
   */
  getArchivedContests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.query;
      const contests = eventId
        ? await this.contestService.getContestsByEventId(eventId as string, true, true) // forEventView = true
        : []; // Return empty array if no eventId specified

      return sendSuccess(res, contests, 'Archived contests retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contest statistics
   */
  getContestStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const stats = await this.contestService.getContestStats(id);
      return sendSuccess(res, stats, 'Contest statistics retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search contests
   */
  searchContests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return sendError(res, 'Search query is required', 400);
      }
      const contests = await this.contestService.searchContests(query);
      return sendSuccess(res, contests, 'Search results retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get Olympic scoring validation status for a contest
   * Returns warning if Olympic scoring is enabled but judge count is insufficient
   *
   * Note: Olympic scoring drops the highest and lowest scores before averaging.
   * With only 3 judges, this leaves only 1 score, which is statistically meaningless.
   * Therefore, we recommend at least 4 judges for Olympic scoring.
   */
  getOlympicScoringValidation = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }

      // Check if contest uses Olympic scoring
      const usesOlympic = await contestUsesOlympicScoring(id, this.prisma);

      // Get judge count for this contest
      const judgeCount = await getContestJudgeCount(id, this.prisma);

      // Minimum for meaningful Olympic scoring is 4 judges
      // (dropping high/low from 3 leaves only 1 score)
      const RECOMMENDED_MIN_JUDGES = 4;

      let warning: string | null = null;
      let severity: 'info' | 'warning' | 'error' = 'info';

      if (usesOlympic) {
        if (judgeCount < MIN_JUDGES_OLYMPIC) {
          // Critical: less than 3 judges - Olympic scoring cannot function
          warning = `Olympic scoring requires at least ${MIN_JUDGES_OLYMPIC} judges to function. Currently has ${judgeCount} judge(s) assigned. Consider switching to Straight scoring.`;
          severity = 'error';
        } else if (judgeCount < RECOMMENDED_MIN_JUDGES) {
          // Warning: exactly 3 judges - Olympic scoring works but leaves only 1 score
          warning = `With only ${judgeCount} judges, Olympic scoring will drop the highest and lowest scores, leaving only ${judgeCount - 2} score(s) for averaging. This may not be statistically meaningful. Consider adding more judges or switching to Straight scoring.`;
          severity = 'warning';
        }
      }

      return sendSuccess(res, {
        contestId: id,
        usesOlympicScoring: usesOlympic,
        judgeCount,
        minimumJudgesRequired: MIN_JUDGES_OLYMPIC,
        recommendedMinJudges: RECOMMENDED_MIN_JUDGES,
        warning,
        severity,
        canMigrateToStraight: usesOlympic && judgeCount < RECOMMENDED_MIN_JUDGES
      }, 'Olympic scoring validation retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  getMinimumWinningScore = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = String(req.user?.role || '');
      if (!id) return sendError(res, 'Contest ID is required', 400);
      if (!tenantId) return sendError(res, 'Tenant context is required', 400);
      if (!userId) return sendError(res, 'Unauthorized', 401);

      const contest = await this.prisma.contest.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          contestantViewRestricted: true,
          contestantViewReleaseDate: true,
          event: {
            select: {
              contestantViewRestricted: true,
              contestantViewReleaseDate: true
            }
          }
        }
      });
      if (!contest) return sendError(res, 'Contest not found', 404);

      if (userRole === 'CONTESTANT') {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { contestantId: true }
        });
        if (!user?.contestantId) {
          return sendError(res, 'Contestant profile not found', 403);
        }

        const [canViewOverallResultsRaw, canViewMinimumWinningScoreRaw] = await Promise.all([
          this.getSettingWithTenantFallback('contestant_visibility_canViewOverallResults', tenantId),
          this.getSettingWithTenantFallback('contestant_visibility_canViewMinimumWinningScore', tenantId),
        ]);
        const canViewOverallResults = (canViewOverallResultsRaw || 'true') === 'true';
        const canViewMinimumWinningScore = (canViewMinimumWinningScoreRaw || 'false') === 'true';
        if (!canViewOverallResults || !canViewMinimumWinningScore) {
          return sendError(res, 'Contestant minimum winning score visibility is disabled', 403);
        }

        if (!this.contestantCanViewContest(contest)) {
          return sendError(res, 'Contest results are not visible yet', 403);
        }

        const [contestAssignment, categoryAssignment] = await Promise.all([
          this.prisma.contestContestant.findFirst({
            where: { contestId: id, contestantId: user.contestantId }
          }),
          this.prisma.categoryContestant.findFirst({
            where: {
              contestantId: user.contestantId,
              category: { contestId: id }
            }
          })
        ]);

        if (!contestAssignment && !categoryAssignment) {
          const hasScores = await this.prisma.score.findFirst({
            where: {
              contestantId: user.contestantId,
              category: { contestId: id }
            },
            select: { id: true }
          });
          if (!hasScores) {
            return sendError(res, 'Not assigned to this contest', 403);
          }
        }
      }

      const key = `contest_min_winning_score:${id}`;
      const setting = await this.prisma.systemSetting.findFirst({
        where: { key, tenantId },
        select: { value: true }
      });
      const parsed = setting?.value ? Number(setting.value) : null;
      const minimumWinningScore = Number.isFinite(parsed as number) && (parsed as number) >= 0 ? parsed : null;

      return sendSuccess(res, { contestId: id, minimumWinningScore }, 'Minimum winning score retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  updateMinimumWinningScore = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId || req.user?.tenantId;
      const updatedBy = req.user?.id || null;
      if (!id) return sendError(res, 'Contest ID is required', 400);
      if (!tenantId) return sendError(res, 'Tenant context is required', 400);

      const raw = req.body?.minimumWinningScore;
      let minimumWinningScore: number | null = null;
      if (raw !== null && raw !== undefined && raw !== '') {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return sendError(res, 'minimumWinningScore must be a number greater than or equal to 0', 400);
        }
        minimumWinningScore = parsed;
      }

      const contest = await this.prisma.contest.findFirst({
        where: { id, tenantId },
        select: { id: true }
      });
      if (!contest) return sendError(res, 'Contest not found', 404);

      const key = `contest_min_winning_score:${id}`;

      if (minimumWinningScore === null) {
        await this.prisma.systemSetting.deleteMany({
          where: { key, tenantId }
        });
      } else {
        await this.prisma.systemSetting.upsert({
          where: { key_tenantId: { key, tenantId } },
          create: {
            key,
            value: String(minimumWinningScore),
            category: 'scoring',
            description: 'Contest minimum winning score threshold',
            tenantId,
            updatedBy
          },
          update: {
            value: String(minimumWinningScore),
            updatedBy
          }
        });
      }

      return sendSuccess(
        res,
        { contestId: id, minimumWinningScore },
        minimumWinningScore === null ? 'Minimum winning score cleared' : 'Minimum winning score updated successfully'
      );
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and individual methods
const controller = new ContestsController();
export const getAllContests = controller.getAllContests;
export const getContestById = controller.getContestById;
export const getContestsByEvent = controller.getContestsByEvent;
export const createContest = controller.createContest;
export const updateContest = controller.updateContest;
export const deleteContest = controller.deleteContest;
export const restoreContest = controller.restoreContest; // S4-3: Restore soft-deleted contests
export const archiveContest = controller.archiveContest;
export const reactivateContest = controller.reactivateContest;
export const getArchivedContests = controller.getArchivedContests;
export const getContestStats = controller.getContestStats;
export const searchContests = controller.searchContests;
export const getOlympicScoringValidation = controller.getOlympicScoringValidation;
export const getMinimumWinningScore = controller.getMinimumWinningScore;
export const updateMinimumWinningScore = controller.updateMinimumWinningScore;
export const cloneContest = controller.cloneContest;
