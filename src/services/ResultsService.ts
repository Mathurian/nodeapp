import { injectable, inject } from 'tsyringe';
import { PrismaClient, UserRole } from '@prisma/client';
import { BaseService } from './BaseService';

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

@injectable()
export class ResultsService extends BaseService {
  constructor(@inject('PrismaClient') protected prisma: PrismaClient) {
    super();
  }

  /**
   * Get all results with role-based filtering and pagination
   */
  async getAllResults(filter: ResultsFilter) {
    const { userRole, userId, offset = 0, limit = 50 } = filter;

    let whereClause: any = {};
    const selectClause: any = {
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
        const judgeUser: any = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { judge: true },
        });

        if (!judgeUser?.judge) {
          return { results: [], total: 0 };
        }

        whereClause = {
          OR: [
            { judgeId: judgeUser.judge.id },
            { category: { judges: { some: { judgeId: judgeUser.judge.id } } } },
          ],
        } as any;
        break;
      }

      case 'CONTESTANT': {
        const user: any = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { contestantId: true },
        });

        if (!user?.contestantId) {
          return { results: [], total: 0 };
        }

        // Get visibility settings
        const canViewOverallResults: any = await this.prisma.systemSetting.findUnique({
          where: { key: 'contestant_can_view_overall_results' },
        });
        const canViewOverall = (canViewOverallResults?.value || 'true') === 'true';

        // Get certified category IDs
        const certifiedCategories: any = await this.prisma.category.findMany({
          where: { totalsCertified: true },
          select: { id: true },
        });
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

    const results: any = await this.prisma.score.findMany({
      where: whereClause,
      select: selectClause,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const total: any = await this.prisma.score.count({
      where: whereClause,
    });

    // Calculate totals for each result
    const resultsWithTotals = await Promise.all(
      results.map(async (result) => {
        const categoryScores: any = await this.prisma.score.findMany({
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
          } as any,
        });

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
  async getCategories() {
    return await (this.prisma.category.findMany as any)({
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    });
  }

  /**
   * Get results for a specific contestant
   */
  async getContestantResults(filter: ContestantResultsFilter) {
    const { contestantId, userRole, userId } = filter;

    let whereClause: any = { contestantId };

    // CONTESTANT can only see their own results
    if (userRole === 'CONTESTANT') {
      const user: any = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true },
      });

      if (!user?.contestantId || user.contestantId !== contestantId) {
        throw new Error('Access denied. You can only view your own results.');
      }
    } else if (userRole === 'JUDGE') {
      const judgeUser: any = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      });

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
      } as any,
    });
  }

  /**
   * Get results for a specific category with rankings
   */
  async getCategoryResults(filter: CategoryResultsFilter) {
    const { categoryId, userRole, userId } = filter;

    // Verify category exists
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    let whereClause: any = { categoryId };

    if (userRole === 'CONTESTANT') {
      const user: any = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true },
      });

      if (!user?.contestantId) {
        return [];
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE') {
      const judgeUser: any = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      });

      if (!judgeUser?.judge) {
        return [];
      }

      // Check assignment
      const assignment: any = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          categoryId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        },
      });

      if (!assignment) {
        const hasScores: any = await this.prisma.score.findFirst({
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

    const scores: any = await this.prisma.score.findMany({
      where: whereClause,
      include: {
        contestant: true,
        judge: true,
        category: true,
        criterion: true,
      } as any,
    });

    // Group by contestant and calculate totals
    const resultsMap = new Map();

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

      const result = resultsMap.get(contestantId);
      if (score.score !== null && score.score !== undefined) {
        result.totalScore += score.score;
        result.scoreCount++;
      }
      result.scores.push(score);
    });

    // Calculate averages and create final results array
    const results = Array.from(resultsMap.values()).map((result) => ({
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
  async getContestResults(filter: ContestResultsFilter) {
    const { contestId, userRole, userId } = filter;

    // Verify contest exists
    const contest: any = await this.prisma.contest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new Error('Contest not found');
    }

    let whereClause: any = {
      category: {
        contestId,
      },
    };

    if (userRole === 'CONTESTANT') {
      const user: any = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true },
      });

      if (!user?.contestantId) {
        return [];
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE') {
      const judgeUser: any = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      });

      if (!judgeUser?.judge) {
        return [];
      }

      const assignment: any = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          contestId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        },
      });

      if (!assignment) {
        const hasScores: any = await this.prisma.score.findFirst({
          where: {
            judgeId: judgeUser.judge.id,
            category: {
              contestId,
            },
          } as any,
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
      } as any,
    });
  }

  /**
   * Get results for a specific event
   */
  async getEventResults(filter: EventResultsFilter) {
    const { eventId, userRole, userId } = filter;

    // Verify event exists
    const event: any = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    let whereClause: any = {
      category: {
        contest: {
          eventId,
        },
      },
    };

    if (userRole === 'CONTESTANT') {
      const user: any = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { contestantId: true },
      });

      if (!user?.contestantId) {
        return [];
      }

      whereClause.contestantId = user.contestantId;
    } else if (userRole === 'JUDGE') {
      const judgeUser: any = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { judge: true },
      });

      if (!judgeUser?.judge) {
        return [];
      }

      const assignment: any = await this.prisma.assignment.findFirst({
        where: {
          judgeId: judgeUser.judge.id,
          eventId,
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        },
      });

      if (!assignment) {
        const hasScores: any = await this.prisma.score.findFirst({
          where: {
            judgeId: judgeUser.judge.id,
            category: {
              contest: {
                eventId,
              },
            },
          } as any,
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
      } as any,
    });
  }
}
