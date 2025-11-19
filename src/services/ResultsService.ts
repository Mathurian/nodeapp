import { injectable, inject } from 'tsyringe';
import { PrismaClient, UserRole, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

// Prisma payload types for proper type safety
type UserWithJudge = Prisma.UserGetPayload<{
  include: { judge: true };
}>;

type UserWithContestantId = Prisma.UserGetPayload<{
  select: { contestantId: true };
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

type CategoryScore = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    score: true;
    categoryId: true;
    contestantId: true;
    criterionId: true;
    category: {
      select: {
        id: true;
        name: true;
        scoreCap: true;
        totalsCertified: true;
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

type SystemSetting = Prisma.SystemSettingGetPayload<{}>;
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
        };
        break;
      }

      case 'CONTESTANT': {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { contestantId: true },
        }) as UserWithContestantId | null;

        if (!user?.contestantId) {
          return { results: [], total: 0 };
        }

        // Get visibility settings
        const canViewOverallResults = await this.prisma.systemSetting.findUnique({
          where: { key: 'contestant_can_view_overall_results' },
        }) as SystemSetting | null;
        const canViewOverall = (canViewOverallResults?.value || 'true') === 'true';

        // Get certified category IDs
        const certifiedCategories = await this.prisma.category.findMany({
          where: { totalsCertified: true },
          select: { id: true },
        }) as Category[];
        const certifiedCategoryIds = certifiedCategories.map((c) => c.id);

        if (certifiedCategoryIds.length === 0) {
          return { results: [], total: 0 };
        }

        if (canViewOverall) {
          whereClause = {
            categoryId: { in: certifiedCategoryIds },
          };
        } else {
          whereClause = {
            contestantId: user.contestantId,
            categoryId: { in: certifiedCategoryIds },
          };
        }
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

    const total = await this.prisma.score.count({
      where: whereClause,
    });

    // Calculate totals for each result
    const resultsWithTotals: ResultWithTotals[] = await Promise.all(
      results.map(async (result): Promise<ResultWithTotals> => {
        const categoryScores = await this.prisma.score.findMany({
          where: {
            categoryId: result.categoryId,
            contestantId: result.contestantId,
          },
          select: {
            id: true,
            score: true,
            categoryId: true,
            contestantId: true,
            criterionId: true,
            category: {
              select: {
                id: true,
                name: true,
                scoreCap: true,
                totalsCertified: true,
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
          },
        }) as CategoryScore[];

        const earned = categoryScores.reduce((sum, s) => sum + (s.score || 0), 0);
        const possible = result.category?.scoreCap || 0;

        return {
          ...result,
          certificationStatus: result.isCertified ? 'CERTIFIED' : 'PENDING',
          certifiedBy: result.certifiedBy,
          certifiedAt: result.certifiedAt,
          totalEarned: earned,
          totalPossible: possible,
        };
      })
    );

    return { results: resultsWithTotals, total };
  }

  /**
   * Get all categories with related data
   */
  async getCategories(): Promise<CategoryWithContest[]> {
    return await this.prisma.category.findMany({
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    }) as CategoryWithContest[];
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
        select: { contestantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId || user.contestantId !== contestantId) {
        throw new Error('Access denied. You can only view your own results.');
      }
    } else if (userRole === 'JUDGE') {
      const judgeUser = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      }) as UserWithJudge | null;

      if (!judgeUser?.judge) {
        return [];
      }

      whereClause.judgeId = judgeUser.judge.id;
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    return await this.prisma.score.findMany({
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
        select: { contestantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
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

      // Check assignment
      const assignment = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          categoryId,
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
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
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
        select: { contestantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
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
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    return await this.prisma.score.findMany({
      where: whereClause,
      include: {
        category: true,
        contestant: true,
        judge: true,
      },
    }) as ContestScore[];
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
        select: { contestantId: true },
      }) as UserWithContestantId | null;

      if (!user?.contestantId) {
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
    } else if (!['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE'].includes(userRole)) {
      throw new Error('Insufficient permissions');
    }

    return await this.prisma.score.findMany({
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
  }
}
