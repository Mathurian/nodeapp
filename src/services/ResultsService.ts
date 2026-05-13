import { injectable, inject } from 'tsyringe';
import { PrismaClient, UserRole, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import {
  DEFAULT_PUBLISHED_RESULTS_VISIBILITY,
  PUBLISHED_RESULTS_BYPASS_ROLES,
  PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS,
  parseVisibilityRoles,
  resolveVisibilityRoles,
  isRoleVisible,
} from '../utils/publishedResultsVisibility';

// Prisma payload types for proper type safety
type UserWithJudge = Prisma.UserGetPayload<{
  include: { judge: true };
}>;

type UserWithContestantId = Prisma.UserGetPayload<{
  select: { contestantId: true; tenantId: true };
}>;

type ScoreWithRelations = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    score: true;
    comment: true;
    createdAt: true;
    updatedAt: true;
    categoryId: true;
    contestantId: true;
    judgeId: true;
    criterionId: true;
    isCertified: true;
    certifiedBy: true;
    certifiedAt: true;
    category: {
      select: {
        id: true;
        name: true;
        description: true;
        scoreCap: true;
        totalsCertified: true;
        contestId: true;
        contest: {
          select: {
            id: true;
            name: true;
            description: true;
            eventId: true;
            createdAt: true;
            updatedAt: true;
            event: {
              select: {
                id: true;
                name: true;
                startDate: true;
                endDate: true;
                createdAt: true;
                updatedAt: true;
              };
            };
          };
        };
      };
    };
    contestant: {
      select: {
        id: true;
        name: true;
        email: true;
        contestantNumber: true;
      };
    };
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    criterion: {
      select: {
        id: true;
        name: true;
        maxScore: true;
        categoryId: true;
        createdAt: true;
        updatedAt: true;
      };
    };
  };
}>;

// P2-1 NOTE: CategoryScore type removed as part of N+1 optimization
// The aggregation-based approach no longer needs this type

type CategoryWithContest = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      include: {
        event: true;
      };
    };
  };
}>;

type ContestantScore = Prisma.ScoreGetPayload<{
  include: {
    category: {
      include: {
        contest: {
          include: {
            event: true;
          };
        };
      };
    };
    judge: true;
  };
}>;

type CategoryScoreDetailed = Prisma.ScoreGetPayload<{
  include: {
    contestant: true;
    judge: true;
    category: true;
    criterion: true;
  };
}>;

type ContestScore = Prisma.ScoreGetPayload<{
  include: {
    category: true;
    contestant: true;
    judge: true;
  };
}>;

type EventScore = Prisma.ScoreGetPayload<{
  include: {
    category: {
      include: {
        contest: true;
      };
    };
    contestant: true;
    judge: true;
  };
}>;

type Category = Prisma.CategoryGetPayload<{ select: { id: true } }>;
type CategoryFull = Prisma.CategoryGetPayload<{}>;
type Contest = Prisma.ContestGetPayload<{}>;
type Event = Prisma.EventGetPayload<{}>;
type Assignment = Prisma.AssignmentGetPayload<{}>;

// Filter interfaces
interface ResultsFilter {
  userRole: UserRole;
  userId: string;
  offset?: number;
  limit?: number;
}

interface ContestantResultsFilter {
  contestantId: string;
  userRole: UserRole;
  userId: string;
}

interface CategoryResultsFilter {
  categoryId: string;
  userRole: UserRole;
  userId: string;
}

interface ContestResultsFilter {
  contestId: string;
  userRole: UserRole;
  userId: string;
}

interface EventResultsFilter {
  eventId: string;
  userRole: UserRole;
  userId: string;
}
interface CategoriesFilter {
  userRole: UserRole;
  userId: string;
}

interface ResultsScopeEvent {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
}

interface ResultsScopeContest {
  id: string;
  name: string;
  eventId: string;
  event: ResultsScopeEvent;
}

interface ResultsScopeCategory {
  id: string;
  name: string;
  contestId: string;
  scoreCap: number | null;
  boardApproved: boolean;
  totalsCertified: boolean;
  contest: ResultsScopeContest;
}

interface ResultsScopeOptions {
  events: ResultsScopeEvent[];
  contests: ResultsScopeContest[];
  categories: ResultsScopeCategory[];
}

interface ContestantResultsVisibility {
  canViewWinners: boolean;
  canViewOverallResults: boolean;
  canViewMinimumWinningScore: boolean;
}

// Complex return type interfaces
interface ResultWithTotals extends ScoreWithRelations {
  certificationStatus: 'CERTIFIED' | 'PENDING';
  totalEarned: number;
  totalPossible: number;
}

interface AllResultsResponse {
  results: ResultWithTotals[];
  total: number;
}

interface CategoryResultWithRanking {
  contestant: CategoryScoreDetailed['contestant'];
  category: CategoryScoreDetailed['category'];
  totalScore: number;
  averageScore: number;
  scoreCount: number;
  scores: CategoryScoreDetailed[];
  rank?: number;
}

@injectable()
export class ResultsService extends BaseService {
  constructor(@inject('PrismaClient') protected prisma: PrismaClient) {
    super();
  }

  private isContestVisibleToContestant(contest: {
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

  private async getSettingWithTenantFallback(key: string, tenantId: string): Promise<string | null> {
    const tenantSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId }
    });
    if (tenantSetting?.value !== undefined && tenantSetting?.value !== null) {
      return tenantSetting.value;
    }

    const globalSetting = await this.prisma.systemSetting.findFirst({
      where: { key, tenantId: null }
    });
    return globalSetting?.value ?? null;
  }

  private async getContestantVisibility(tenantId: string): Promise<ContestantResultsVisibility> {
    const [winnersRaw, overallRaw, minimumWinningScoreRaw] = await Promise.all([
      this.getSettingWithTenantFallback('contestant_visibility_canViewWinners', tenantId),
      this.getSettingWithTenantFallback('contestant_visibility_canViewOverallResults', tenantId),
      this.getSettingWithTenantFallback('contestant_visibility_canViewMinimumWinningScore', tenantId),
    ]);

    return {
      canViewWinners: (winnersRaw ?? 'true') === 'true',
      canViewOverallResults: (overallRaw ?? 'true') === 'true',
      canViewMinimumWinningScore: (minimumWinningScoreRaw ?? 'false') === 'true',
    };
  }

  private async getPublishedResultsVisibilitySettings(tenantId: string) {
    const [detailedRaw, winnersRaw, progressRaw] = await Promise.all([
      this.getSettingWithTenantFallback(
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.detailedResultsRoles,
        tenantId
      ),
      this.getSettingWithTenantFallback(
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.winnersRoles,
        tenantId
      ),
      this.getSettingWithTenantFallback(
        PUBLISHED_RESULTS_VISIBILITY_SETTING_KEYS.progressRoles,
        tenantId
      ),
    ]);

    return {
      detailedResultsRoles: parseVisibilityRoles(
        detailedRaw,
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.detailedResultsRoles
      ),
      winnersRoles: parseVisibilityRoles(
        winnersRaw,
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.winnersRoles
      ),
      progressRoles: parseVisibilityRoles(
        progressRaw,
        DEFAULT_PUBLISHED_RESULTS_VISIBILITY.progressRoles
      ),
    };
  }

  private buildResultsScopeOptions(
    categories: CategoryWithContest[],
    options: { includeCategories?: boolean } = {},
  ): ResultsScopeOptions {
    const includeCategories = options.includeCategories !== false;
    const eventMap = new Map<string, ResultsScopeEvent>();
    const contestMap = new Map<string, ResultsScopeContest>();

    const normalizedCategories: ResultsScopeCategory[] = includeCategories
      ? categories.map((category) => {
          const event = {
            id: category.contest.event.id,
            name: category.contest.event.name,
            startDate: category.contest.event.startDate,
            endDate: category.contest.event.endDate,
          };

          eventMap.set(event.id, event);

          const contest = {
            id: category.contest.id,
            name: category.contest.name,
            eventId: category.contest.eventId,
            event,
          };

          contestMap.set(contest.id, contest);

          return {
            id: category.id,
            name: category.name,
            contestId: category.contestId,
            scoreCap: category.scoreCap ?? null,
            boardApproved: Boolean(category.boardApproved),
            totalsCertified: Boolean(category.totalsCertified),
            contest,
          };
        })
      : [];

    if (!includeCategories) {
      categories.forEach((category) => {
        const event = {
          id: category.contest.event.id,
          name: category.contest.event.name,
          startDate: category.contest.event.startDate,
          endDate: category.contest.event.endDate,
        };

        eventMap.set(event.id, event);
        contestMap.set(category.contest.id, {
          id: category.contest.id,
          name: category.contest.name,
          eventId: category.contest.eventId,
          event,
        });
      });
    }

    return {
      events: Array.from(eventMap.values()),
      contests: Array.from(contestMap.values()),
      categories: normalizedCategories,
    };
  }

  private async getContestantAccessibleCategoriesAndVisibility(
    userId: string,
  ): Promise<{
    categories: CategoryWithContest[];
    visibility: ContestantResultsVisibility | null;
  }> {
    const contestantUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { contestantId: true, tenantId: true },
    }) as UserWithContestantId | null;

    if (!contestantUser?.contestantId || !contestantUser.tenantId) {
      return { categories: [], visibility: null };
    }

    const visibility = await this.getContestantVisibility(contestantUser.tenantId);
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [
          {
            categoryContestants: {
              some: {
                contestantId: contestantUser.contestantId,
              },
            },
          },
          {
            contest: {
              contestContestants: {
                some: {
                  contestantId: contestantUser.contestantId,
                },
              },
            },
          },
        ],
      },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }) as CategoryWithContest[];

    return {
      categories: categories.filter((category) => this.isContestVisibleToContestant(category.contest as any)),
      visibility,
    };
  }

  private async getEventResultsVisibilityState(eventId: string, tenantId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        hideResultsUntilEventPublished: true,
        resultsVisibleRolesOverride: true,
        winnersVisibleRolesOverride: true,
        progressVisibleRolesOverride: true,
        contests: {
          where: {
            deletedAt: null,
            archived: false,
          },
          select: {
            id: true,
            winnersPublished: true,
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return {
      ...event,
      fullyPublished:
        event.contests.length > 0 &&
        event.contests.every((contest) => Boolean(contest.winnersPublished)),
    };
  }

  private async canAccessDetailedResultsForEvent(
    role: UserRole,
    tenantId: string,
    eventId: string,
    contestPublished: boolean
  ): Promise<boolean> {
    if (role === 'CONTESTANT') {
      return contestPublished;
    }

    if (PUBLISHED_RESULTS_BYPASS_ROLES.has(role)) {
      return true;
    }

    if (!contestPublished) {
      return false;
    }

    const [tenantVisibility, eventVisibility] = await Promise.all([
      this.getPublishedResultsVisibilitySettings(tenantId),
      this.getEventResultsVisibilityState(eventId, tenantId),
    ]);

    if (!eventVisibility) {
      return false;
    }

    if (eventVisibility.hideResultsUntilEventPublished && !eventVisibility.fullyPublished) {
      return false;
    }

    const effectiveRoles = resolveVisibilityRoles(
      eventVisibility.resultsVisibleRolesOverride,
      tenantVisibility.detailedResultsRoles
    );

    return isRoleVisible(effectiveRoles, role);
  }

  private async getApprovedDeductionMap(
    tenantId: string,
    categoryIds: string[],
    contestantIds: string[]
  ): Promise<Map<string, number>> {
    if (categoryIds.length === 0 || contestantIds.length === 0) {
      return new Map<string, number>();
    }

    const requests = await this.prisma.deductionRequest.findMany({
      where: {
        tenantId,
        status: 'APPROVED',
        categoryId: { in: categoryIds },
        contestantId: { in: contestantIds },
      },
      select: {
        categoryId: true,
        contestantId: true,
        amount: true,
      },
    });

    const map = new Map<string, number>();
    for (const request of requests) {
      const key = `${request.contestantId}:${request.categoryId}`;
      map.set(key, (map.get(key) || 0) + Math.abs(Number(request.amount || 0)));
    }
    return map;
  }

  /**
   * Get all results with role-based filtering and pagination
   */
  async getAllResults(filter: ResultsFilter): Promise<AllResultsResponse> {
    const { userRole, userId, offset = 0, limit = 50 } = filter;

    let whereClause: Prisma.ScoreWhereInput = {};
    const selectClause: Prisma.ScoreSelect = {
      id: true,
      score: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
      categoryId: true,
      contestantId: true,
      judgeId: true,
      criterionId: true,
      isCertified: true,
      certifiedBy: true,
      certifiedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          description: true,
          scoreCap: true,
          totalsCertified: true,
          contestId: true,
          contest: {
            select: {
              id: true,
              name: true,
              description: true,
              eventId: true,
              createdAt: true,
              updatedAt: true,
              event: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
        },
      },
      contestant: {
        select: {
          id: true,
          name: true,
          email: true,
          contestantNumber: true,
        },
      },
      judge: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      criterion: {
        select: {
          id: true,
          name: true,
          maxScore: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    };

    // Role-based filtering
    switch (userRole) {
      case 'ADMIN':
      case 'ORGANIZER':
      case 'BOARD':
      case 'TALLY_MASTER':
      case 'AUDITOR':
        // Full access to all results
        break;

      case 'JUDGE': {
        const judgeUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { judge: true },
        }) as UserWithJudge | null;

        if (!judgeUser?.judge) {
          return { results: [], total: 0 };
        }

        whereClause = {
          judgeId: judgeUser.judge.id,
          category: {
            contest: {
              winnersPublished: true,
            },
          },
        };
        break;
      }

      case 'EMCEE': {
        whereClause = {
          category: {
            contest: {
              winnersPublished: true,
            },
          },
        };
        break;
      }

      case 'CONTESTANT': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { contestantId: true, tenantId: true },
        }) as UserWithContestantId | null;

        if (!user?.contestantId) {
          return { results: [], total: 0 };
        }

        const visibility = await this.getContestantVisibility(user.tenantId);
        if (!visibility.canViewOverallResults) {
          return { results: [], total: 0 };
        }

        // Get certified category IDs
        const certifiedCategories = await this.prisma.category.findMany({
          where: { totalsCertified: true },
          select: { id: true },
        }) as Category[];
        const certifiedCategoryIds = certifiedCategories.map((c) => c.id);

        if (certifiedCategoryIds.length === 0) {
          return { results: [], total: 0 };
        }

        whereClause = {
          contestantId: user.contestantId,
          categoryId: { in: certifiedCategoryIds },
        };
        break;
      }

      default:
        throw new Error('Insufficient permissions');
    }

    const results = await this.prisma.score.findMany({
      where: whereClause,
      select: selectClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }) as unknown as ScoreWithRelations[];
    let filteredResults = results;

    if (userRole === 'JUDGE' || userRole === 'EMCEE') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });
      const tenantId = user?.tenantId;
      if (!tenantId) {
        return { results: [], total: 0 };
      }

      const allowedResults = await Promise.all(
        results.map(async (result) => {
          const eventId = result.category?.contest?.eventId;
          if (!eventId) {
            return null;
          }

          const allowed = await this.canAccessDetailedResultsForEvent(
            userRole,
            tenantId,
            eventId,
            true
          );

          return allowed ? result : null;
        })
      );

      filteredResults = allowedResults.filter((result): result is ScoreWithRelations => Boolean(result));
    }

    const total = filteredResults.length;

    // P2-1 OPTIMIZATION: Fix N+1 query issue
    // Previous implementation ran 1 + N queries (N = number of results)
    // New implementation uses aggregation: 2 queries total regardless of result count

    // Step 1: Extract unique (categoryId, contestantId) pairs
    const categoryContestantPairs: Array<{ categoryId: string; contestantId: string }> = [];
    const seen = new Set<string>();

    filteredResults.forEach(result => {
      const key = `${result.categoryId}_${result.contestantId}`;
      if (!seen.has(key)) {
        seen.add(key);
        categoryContestantPairs.push({
          categoryId: result.categoryId,
          contestantId: result.contestantId,
        });
      }
    });

    // Step 2: Use aggregation to get totals in SINGLE query
    const aggregatedTotals = categoryContestantPairs.length > 0
      ? await this.prisma.score.groupBy({
          by: ['categoryId', 'contestantId'],
          where: {
            OR: categoryContestantPairs.map(pair => ({
              categoryId: pair.categoryId,
              contestantId: pair.contestantId,
            })),
          },
          _sum: {
            score: true,
          },
          _count: true,
        })
      : [];

    // Step 3: Create lookup map from aggregation results
    const totalsMap = new Map<string, { totalEarned: number; count: number }>(
      aggregatedTotals.map(agg => [
        `${agg.categoryId}_${agg.contestantId}`,
        {
          totalEarned: agg._sum.score || 0,
          count: agg._count,
        },
      ])
    );

    // Step 4: Enrich results from map (no queries in loop!)
    const resultsWithTotals: ResultWithTotals[] = filteredResults.map((result): ResultWithTotals => {
      const key = `${result.categoryId}_${result.contestantId}`;
      const totals = totalsMap.get(key) || { totalEarned: 0, count: 0 };
      const possible = result.category?.scoreCap || 0;

      return {
        ...result,
        certificationStatus: result.isCertified ? 'CERTIFIED' : 'PENDING',
        certifiedBy: result.certifiedBy,
        certifiedAt: result.certifiedAt,
        totalEarned: totals.totalEarned,
        totalPossible: possible,
      };
    });

    return { results: resultsWithTotals, total };
  }

  /**
   * Get all categories with related data
   */
  async getCategories(filter: CategoriesFilter): Promise<CategoryWithContest[]> {
    const { userRole, userId } = filter;
    const where: Prisma.CategoryWhereInput = {};

    if (userRole === 'JUDGE') {
      const judgeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      }) as UserWithJudge | null;

      if (!judgeUser?.judge) {
        return [];
      }

      where.OR = [
        {
          assignments: {
            some: {
              judgeId: judgeUser.judge.id,
              status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] },
            },
          },
        },
        {
          contest: {
            assignments: {
              some: {
                judgeId: judgeUser.judge.id,
                categoryId: null,
                status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] },
              },
            },
          },
        },
      ];
      where.contest = {
        winnersPublished: true,
      };
    } else if (userRole === 'EMCEE') {
      where.contest = {
        winnersPublished: true,
      };
    } else if (userRole === 'CONTESTANT') {
      const { categories, visibility } = await this.getContestantAccessibleCategoriesAndVisibility(userId);
      if (!visibility?.canViewWinners) {
        return [];
      }
      return categories;
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'SUPER_ADMIN'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }) as CategoryWithContest[];

    if (userRole === 'JUDGE' || userRole === 'EMCEE') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true },
      });
      const tenantId = user?.tenantId;
      if (!tenantId) {
        return [];
      }

      const allowedCategories = await Promise.all(
        categories.map(async (category) => {
          const allowed = await this.canAccessDetailedResultsForEvent(
            userRole,
            tenantId,
            category.contest.eventId,
            Boolean((category.contest as any).winnersPublished)
          );
          return allowed ? category : null;
        })
      );

      return allowedCategories.filter((category): category is CategoryWithContest => Boolean(category));
    }

    return categories;
  }

  async getScopeOptions(filter: CategoriesFilter): Promise<ResultsScopeOptions> {
    if (filter.userRole === 'CONTESTANT') {
      const { categories, visibility } = await this.getContestantAccessibleCategoriesAndVisibility(filter.userId);
      if (!visibility || (!visibility.canViewWinners && !visibility.canViewOverallResults)) {
        return {
          events: [],
          contests: [],
          categories: [],
        };
      }

      return this.buildResultsScopeOptions(categories, {
        includeCategories: visibility.canViewWinners,
      });
    }

    const categories = await this.getCategories(filter);
    return this.buildResultsScopeOptions(categories);
  }

  /**
   * Get results for a specific contestant
   */
  async getContestantResults(filter: ContestantResultsFilter): Promise<ContestantScore[]> {
    const { contestantId, userRole, userId } = filter;

    let whereClause: Prisma.ScoreWhereInput = { contestantId };

    // CONTESTANT can only see their own results
    if (userRole === 'CONTESTANT') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true, tenantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId || user.contestantId !== contestantId) {
        throw new Error('Access denied. You can only view your own results.');
      }

      const visibility = await this.getContestantVisibility(user.tenantId);
      if (!visibility.canViewWinners) {
        return [];
      }
    } else if (userRole === 'JUDGE') {
      const judgeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      }) as UserWithJudge | null;

      if (!judgeUser?.judge) {
        return [];
      }

      whereClause = {
        ...whereClause,
        judgeId: judgeUser.judge.id,
        category: {
          contest: {
            winnersPublished: true,
          },
        },
      };
    } else if (userRole === 'EMCEE') {
      whereClause = {
        ...whereClause,
        category: {
          contest: {
            winnersPublished: true,
          },
        },
      };
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    const scores = await this.prisma.score.findMany({
      where: whereClause,
      include: {
        category: {
          include: {
            contest: {
              include: {
                event: true,
              },
            },
          },
        },
        judge: true,
      },
    }) as ContestantScore[];

    if (userRole !== 'JUDGE' && userRole !== 'EMCEE') {
      return scores;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    const tenantId = user?.tenantId;
    if (!tenantId) {
      return [];
    }

    const filteredScores = await Promise.all(
      scores.map(async (score) => {
        const eventId = score.category?.contest?.eventId;
        if (!eventId) {
          return null;
        }

        const allowed = await this.canAccessDetailedResultsForEvent(
          userRole,
          tenantId,
          eventId,
          true
        );

        return allowed ? score : null;
      })
    );

    return filteredScores.filter((score): score is ContestantScore => Boolean(score));
  }

  /**
   * Get results for a specific category with rankings
   */
  async getCategoryResults(filter: CategoryResultsFilter): Promise<CategoryResultWithRanking[]> {
    const { categoryId, userRole, userId } = filter;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    }) as CategoryFull | null;

    if (!category) {
      throw new Error('Category not found');
    }

    let whereClause: Prisma.ScoreWhereInput = { categoryId };

    if (userRole === 'CONTESTANT') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true, tenantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
        return [];
      }

      const visibility = await this.getContestantVisibility(user.tenantId);
      if (!visibility.canViewWinners) {
        return [];
      }

      const categoryWithContest = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: {
          contest: {
            select: {
              contestantViewRestricted: true,
              contestantViewReleaseDate: true,
              event: {
                select: {
                  contestantViewRestricted: true,
                  contestantViewReleaseDate: true
                }
              }
            }
          }
        }
      });

      if (!categoryWithContest?.contest || !this.isContestVisibleToContestant(categoryWithContest.contest as any)) {
        return [];
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE' || userRole === 'EMCEE') {
      const contestPublication = await this.prisma.contest.findUnique({
        where: { id: category.contestId },
        select: { winnersPublished: true, eventId: true, tenantId: true },
      });

      if (!contestPublication?.winnersPublished) {
        return [];
      }

      const canViewDetailedResults = await this.canAccessDetailedResultsForEvent(
        userRole,
        contestPublication.tenantId,
        contestPublication.eventId,
        true
      );

      if (!canViewDetailedResults) {
        return [];
      }

      if (userRole === 'JUDGE') {
        const judgeUser = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { judge: true },
        }) as UserWithJudge | null;

        if (!judgeUser?.judge) {
          return [];
        }

        // Check assignment
        const assignment = await this.prisma.assignment.findFirst({
          where: {
            judgeId: judgeUser.judge.id,
            OR: [
              { categoryId },
              { contestId: category.contestId, categoryId: null }
            ],
            status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
          },
        }) as Assignment | null;

        if (!assignment) {
          const hasScores = await this.prisma.score.findFirst({
            where: {
              categoryId,
              judgeId: judgeUser.judge.id,
            },
          });

          if (!hasScores) {
            throw new Error('Not assigned to this category');
          }
        }
      }
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    const scores = await this.prisma.score.findMany({
      where: whereClause,
      include: {
        contestant: true,
        judge: true,
        category: true,
        criterion: true,
      },
    }) as CategoryScoreDetailed[];

    // Group by contestant and calculate totals
    const resultsMap = new Map<string, CategoryResultWithRanking>();

    scores.forEach((score) => {
      if (!score.contestant) return;

      const contestantId = score.contestantId;

      if (!resultsMap.has(contestantId)) {
        resultsMap.set(contestantId, {
          contestant: score.contestant,
          category: score.category,
          totalScore: 0,
          averageScore: 0,
          scoreCount: 0,
          scores: [],
        });
      }

      const result = resultsMap.get(contestantId)!;
      if (score.score !== null && score.score !== undefined) {
        result.totalScore += score.score;
        result.scoreCount++;
      }
      result.scores.push(score);
    });

    // Apply approved deductions (source of truth: approved deduction requests).
    const deductionMap = await this.getApprovedDeductionMap(
      category.tenantId,
      [categoryId],
      Array.from(resultsMap.keys())
    );

    // Backward-compat: include overall_deductions table entries as well.
    if (resultsMap.size > 0) {
      const deductions = await this.prisma.overallDeduction.findMany({
        where: {
          categoryId,
          contestantId: { in: Array.from(resultsMap.keys()) },
        },
        select: {
          contestantId: true,
          deduction: true,
        },
      });

      for (const deduction of deductions) {
        const row = resultsMap.get(deduction.contestantId);
        if (!row) continue;
        const key = `${deduction.contestantId}:${categoryId}`;
        deductionMap.set(key, (deductionMap.get(key) || 0) + Math.abs(Number(deduction.deduction || 0)));
      }

      for (const [key, amount] of deductionMap.entries()) {
        const [contestantId] = key.split(':');
        if (!contestantId) continue;
        const row = resultsMap.get(contestantId);
        if (!row) continue;
        row.totalScore -= amount;
      }
    }

    // Calculate averages and create final results array
    const results: CategoryResultWithRanking[] = Array.from(resultsMap.values()).map((result) => ({
      ...result,
      averageScore: result.scoreCount > 0 ? result.totalScore / result.scoreCount : 0,
    }));

    // Sort by total score descending
    results.sort((a, b) => b.totalScore - a.totalScore);

    // Add ranking
    results.forEach((result, index) => {
      result.rank = index + 1;
    });

    return results;
  }

  /**
   * Get results for a specific contest
   */
  async getContestResults(filter: ContestResultsFilter): Promise<ContestScore[]> {
    const { contestId, userRole, userId } = filter;

    // Verify contest exists
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
    }) as Contest | null;

    if (!contest) {
      throw new Error('Contest not found');
    }

    let whereClause: Prisma.ScoreWhereInput = {
      category: {
        contestId,
      },
    };

    if (userRole === 'CONTESTANT') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true, tenantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
        return [];
      }

      const visibility = await this.getContestantVisibility(user.tenantId);
      if (!visibility.canViewOverallResults) {
        return [];
      }

      const contestVisibility = await this.prisma.contest.findUnique({
        where: { id: contestId },
        select: {
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

      if (!contestVisibility || !this.isContestVisibleToContestant(contestVisibility as any)) {
        return [];
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE') {
      const judgeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      }) as UserWithJudge | null;

      if (!judgeUser?.judge) {
        return [];
      }

      if (!contest.winnersPublished) {
        return [];
      }

      const canViewDetailedResults = await this.canAccessDetailedResultsForEvent(
        userRole,
        contest.tenantId,
        contest.eventId,
        true
      );

      if (!canViewDetailedResults) {
        return [];
      }

      const assignment = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          contestId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        },
      }) as Assignment | null;

      if (!assignment) {
        const hasScores = await this.prisma.score.findFirst({
          where: {
            judgeId: judgeUser.judge.id,
            category: {
              contestId,
            },
          },
        });

        if (!hasScores) {
          throw new Error('Not assigned to this contest');
        }
      }
    } else if (userRole === 'EMCEE') {
      if (!contest.winnersPublished) {
        return [];
      }

      const canViewDetailedResults = await this.canAccessDetailedResultsForEvent(
        userRole,
        contest.tenantId,
        contest.eventId,
        true
      );

      if (!canViewDetailedResults) {
        return [];
      }
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    const contestScores = await this.prisma.score.findMany({
      where: whereClause,
      include: {
        category: true,
        contestant: true,
        judge: true,
      },
    }) as ContestScore[];

    if (contestScores.length === 0) {
      return contestScores;
    }

    const contestantIds = Array.from(new Set(contestScores.map((score) => score.contestantId)));
    const categoryIds = Array.from(new Set(contestScores.map((score) => score.categoryId)));
    const approvedDeductionMap = await this.getApprovedDeductionMap(contest.tenantId, categoryIds, contestantIds);
    const deductions = await this.prisma.overallDeduction.findMany({
      where: {
        contestantId: { in: contestantIds },
        categoryId: { in: categoryIds },
      },
      select: {
        contestantId: true,
        categoryId: true,
        deduction: true,
      },
    });

    const deductionByKey = new Map<string, number>();
    deductions.forEach((row) => {
      const key = `${row.contestantId}:${row.categoryId}`;
      deductionByKey.set(key, (deductionByKey.get(key) || 0) + Math.abs(Number(row.deduction || 0)));
    });
    approvedDeductionMap.forEach((amount, key) => {
      deductionByKey.set(key, (deductionByKey.get(key) || 0) + amount);
    });

    const appliedKeys = new Set<string>();
    return contestScores.map((score) => {
      const key = `${score.contestantId}:${score.categoryId}`;
      const overallDeduction = appliedKeys.has(key) ? 0 : (deductionByKey.get(key) || 0);
      appliedKeys.add(key);
      return {
        ...score,
        deduction: Number(score.deduction || 0) + overallDeduction
      };
    });
  }

  /**
   * Get results for a specific event
   */
  async getEventResults(filter: EventResultsFilter): Promise<EventScore[]> {
    const { eventId, userRole, userId } = filter;

    // Verify event exists
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    }) as Event | null;

    if (!event) {
      throw new Error('Event not found');
    }

    let whereClause: Prisma.ScoreWhereInput = {
      category: {
        contest: {
          eventId,
        },
      },
    };

    if (userRole === 'CONTESTANT') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true, tenantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
        return [];
      }

      const visibility = await this.getContestantVisibility(user.tenantId);
      if (!visibility.canViewOverallResults) {
        return [];
      }

      if (event.contestantViewRestricted) {
        if (!event.contestantViewReleaseDate || event.contestantViewReleaseDate > new Date()) {
          return [];
        }
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE') {
      const judgeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      }) as UserWithJudge | null;

      if (!judgeUser?.judge) {
        return [];
      }

      whereClause = {
        category: {
          contest: {
            eventId,
            winnersPublished: true,
          },
        },
      };

      const canViewDetailedResults = await this.canAccessDetailedResultsForEvent(
        userRole,
        event.tenantId,
        eventId,
        true
      );

      if (!canViewDetailedResults) {
        return [];
      }

      const assignment = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          eventId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        },
      }) as Assignment | null;

      if (!assignment) {
        const hasScores = await this.prisma.score.findFirst({
          where: {
            judgeId: judgeUser.judge.id,
            category: {
              contest: {
                eventId,
              },
            },
          },
        });

        if (!hasScores) {
          throw new Error('Not assigned to this event');
        }
      }
    } else if (userRole === 'EMCEE') {
      const canViewDetailedResults = await this.canAccessDetailedResultsForEvent(
        userRole,
        event.tenantId,
        eventId,
        true
      );

      if (!canViewDetailedResults) {
        return [];
      }

      whereClause = {
        category: {
          contest: {
            eventId,
            winnersPublished: true,
          },
        },
      };
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    const eventScores = await this.prisma.score.findMany({
      where: whereClause,
      include: {
        category: {
          include: {
            contest: true,
          },
        },
        contestant: true,
        judge: true,
      },
    }) as EventScore[];

    if (eventScores.length === 0) {
      return eventScores;
    }

    const contestantIds = Array.from(new Set(eventScores.map((score) => score.contestantId)));
    const categoryIds = Array.from(new Set(eventScores.map((score) => score.categoryId)));
    const approvedDeductionMap = await this.getApprovedDeductionMap(event.tenantId, categoryIds, contestantIds);
    const deductions = await this.prisma.overallDeduction.findMany({
      where: {
        contestantId: { in: contestantIds },
        categoryId: { in: categoryIds },
      },
      select: {
        contestantId: true,
        categoryId: true,
        deduction: true,
      },
    });

    const deductionByKey = new Map<string, number>();
    deductions.forEach((row) => {
      const key = `${row.contestantId}:${row.categoryId}`;
      deductionByKey.set(key, (deductionByKey.get(key) || 0) + Math.abs(Number(row.deduction || 0)));
    });
    approvedDeductionMap.forEach((amount, key) => {
      deductionByKey.set(key, (deductionByKey.get(key) || 0) + amount);
    });

    const appliedKeys = new Set<string>();
    return eventScores.map((score) => {
      const key = `${score.contestantId}:${score.categoryId}`;
      const overallDeduction = appliedKeys.has(key) ? 0 : (deductionByKey.get(key) || 0);
      appliedKeys.add(key);
      return {
        ...score,
        deduction: Number(score.deduction || 0) + overallDeduction
      };
    });
  }
}
