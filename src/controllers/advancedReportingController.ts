import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AdvancedReportingService } from '../services/AdvancedReportingService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient, Prisma, Event, Contest, Category, Score } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
  };
  tenantId?: string;
}

interface EventWithContests extends Event {
  contests: ContestWithCategories[];
}

interface ContestWithCategories extends Contest {
  categories: CategoryWithCount[];
}

interface CategoryWithCount extends Category {
  _count: {
    scores: number;
  };
}

interface ScoreWithRelations extends Score {
  category: {
    id: string;
    name: string;
    contest: {
      id: string;
      name: string;
    };
  };
  contestant: {
    id: string;
    name: string;
  };
  judge: {
    id: string;
    name: string;
  };
}

export class AdvancedReportingController {
  private advancedReportingService: AdvancedReportingService;
  private prisma: PrismaClient;

  constructor() {
    this.advancedReportingService = container.resolve(AdvancedReportingService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  generateScoreReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId, contestId, categoryId } = req.query;
      const report = await this.advancedReportingService.generateScoreReport(
        eventId as string | undefined,
        contestId as string | undefined,
        categoryId as string | undefined
      );
      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };

  generateSummaryReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;
      const report = await this.advancedReportingService.generateSummaryReport(eventId!);
      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };

  generateEventReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { eventId } = authReq.params;

      if (!eventId) {
        return sendSuccess(res, {}, 'eventId is required', 400);
      }

      // Get event with all related data
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          contests: {
            include: {
              categories: {
                include: {
                  _count: {
                    select: {
                      scores: true
                    }
                  }
                }
              }
            }
          }
        }
      }) as EventWithContests | null;

      // Verify tenant access
      if (event && event.tenantId !== authReq.user!.tenantId) {
        return sendSuccess(res, {}, 'Event not found', 404);
      }

      if (!event) {
        return sendSuccess(res, {}, 'Event not found', 404);
      }

      // Get contest IDs for this event
      const contests = await this.prisma.contest.findMany({
        where: { eventId, tenantId: authReq.user!.tenantId },
        select: { id: true }
      });
      const contestIds = contests.map(c => c.id);

      // Get category IDs for these contests
      const categories = await this.prisma.category.findMany({
        where: { contestId: { in: contestIds }, tenantId: authReq.user!.tenantId },
        select: { id: true }
      });
      const categoryIds = categories.map(c => c.id);

      // Get total scores, contestants, judges and categories for this event
      const [totalScores, totalContestants, totalCategories, totalJudges] = await Promise.all([
        this.prisma.score.count({
          where: {
            tenantId: authReq.user!.tenantId,
            categoryId: { in: categoryIds }
          }
        }),
        this.prisma.contestContestant.count({
          where: {
            tenantId: authReq.user!.tenantId,
            contestId: { in: contestIds }
          }
        }),
        this.prisma.category.count({
          where: {
            tenantId: authReq.user!.tenantId,
            contestId: { in: contestIds }
          }
        }),
        this.prisma.assignment.count({
          where: {
            eventId,
            tenantId: authReq.user!.tenantId
          }
        })
      ]);

      const report = {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          archived: event.archived,
          isLocked: event.isLocked
        },
        summary: {
          totalContests: event.contests.length,
          totalCategories,
          totalContestants,
          totalJudges,
          totalScores
        },
        contests: event.contests.map((contest) => ({
          id: contest.id,
          name: contest.name,
          categories: contest.categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            scores: cat._count.scores
          }))
        })),
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };

  generateJudgePerformanceReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { judgeId } = authReq.params;
      const eventId = authReq.query['eventId'] as string | undefined;
      const contestId = authReq.query['contestId'] as string | undefined;

      if (!judgeId) {
        return sendSuccess(res, {}, 'judgeId is required', 400);
      }

      // Get judge information
      const judge = await this.prisma.judge.findUnique({
        where: {
          id: judgeId,
          tenantId: authReq.user!.tenantId
        }
      });

      if (!judge) {
        return sendSuccess(res, {}, 'Judge not found', 404);
      }

      // Build where clause for scores
      let categoryFilter: Prisma.CategoryWhereInput | undefined = undefined;
      if (eventId && contestId) {
        categoryFilter = {
          contestId,
          contest: { eventId }
        };
      } else if (eventId) {
        categoryFilter = {
          contest: { eventId }
        };
      } else if (contestId) {
        categoryFilter = {
          contestId
        };
      }

      const scoreWhere: Prisma.ScoreWhereInput = {
        judgeId,
        tenantId: authReq.user!.tenantId,
        ...(categoryFilter && { category: categoryFilter })
      };

      // Get all scores by this judge
      const scores = await this.prisma.score.findMany({
        where: scoreWhere,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              contest: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          contestant: {
            select: {
              id: true,
              name: true
            }
          },
          judge: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }) as ScoreWithRelations[];

      // Calculate statistics
      const totalScores = scores.length;
      const certifiedScores = scores.filter(s => s.isCertified).length;
      const scoreValues = scores.map(s => s.score).filter((s): s is number => s !== null);
      const avgScore = scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : 0;
      const maxScore = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
      const minScore = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;

      // Group by category
      interface CategoryStats {
        categoryId: string;
        categoryName: string;
        contestName: string;
        count: number;
        total: number;
        avg: number;
      }

      const byCategory = scores.reduce((acc: Record<string, CategoryStats>, score) => {
        const catId = score.category.id;
        if (!acc[catId]) {
          acc[catId] = {
            categoryId: catId,
            categoryName: score.category.name,
            contestName: score.category.contest.name,
            count: 0,
            total: 0,
            avg: 0
          };
        }
        acc[catId].count++;
        acc[catId].total += score.score || 0;
        acc[catId].avg = acc[catId].total / acc[catId].count;
        return acc;
      }, {});

      const report = {
        judge: {
          id: judge.id,
          name: judge.name,
          email: judge.email
        },
        summary: {
          totalScores,
          certifiedScores,
          certificationRate: totalScores > 0 ? ((certifiedScores / totalScores) * 100).toFixed(2) : '0',
          averageScore: parseFloat(avgScore.toFixed(2)),
          maxScore,
          minScore
        },
        byCategory: Object.values(byCategory),
        filters: {
          eventId,
          contestId
        },
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };

  generateSystemAnalyticsReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const days = parseInt(authReq.query['days'] as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get comprehensive system statistics
      const tenantId = authReq.user!.tenantId;
      const [
        totalUsers,
        totalEvents,
        totalContests,
        totalCategories,
        totalContestants,
        totalJudges,
        totalScores,
        recentActivity,
        usersByRole,
        eventsByStatus
      ] = await Promise.all([
        this.prisma.user.count({ where: { tenantId } }),
        this.prisma.event.count({ where: { tenantId } }),
        this.prisma.contest.count({ where: { tenantId } }),
        this.prisma.category.count({ where: { tenantId } }),
        this.prisma.contestant.count({ where: { tenantId } }),
        this.prisma.judge.count({ where: { tenantId } }),
        this.prisma.score.count({ where: { tenantId } }),

        // Recent activity
        this.prisma.activityLog.count({
          where: {
            createdAt: { gte: since }
          }
        }),

        // Users by role
        this.prisma.user.groupBy({
          by: ['role'],
          where: { tenantId },
          _count: { id: true }
        }),

        // Events by archived status
        this.prisma.event.groupBy({
          by: ['archived'],
          where: { tenantId },
          _count: { id: true }
        })
      ]);

      // Get recent events
      const recentEvents = await this.prisma.event.findMany({
        where: { tenantId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          archived: true,
          isLocked: true,
          createdAt: true
        }
      });

      // Get scoring statistics
      const scoringStats = await this.prisma.score.aggregate({
        where: { tenantId },
        _avg: { score: true },
        _max: { score: true },
        _min: { score: true }
      });

      const certifiedScores = await this.prisma.score.count({
        where: {
          tenantId,
          isCertified: true
        }
      });

      const report = {
        summary: {
          totalUsers,
          totalEvents,
          totalContests,
          totalCategories,
          totalContestants,
          totalJudges,
          totalScores,
          certifiedScores,
          certificationRate: totalScores > 0 ? ((certifiedScores / totalScores) * 100).toFixed(2) : '0'
        },
        activity: {
          recentActivityLogs: recentActivity,
          timeRangeDays: days
        },
        usersByRole: usersByRole.map(r => ({
          role: r.role,
          count: r._count?.id || 0
        })),
        eventsByStatus: eventsByStatus.map(e => ({
          archived: e.archived,
          count: e._count?.id || 0
        })),
        scoringStatistics: {
          averageScore: scoringStats._avg.score || 0,
          maxScore: scoringStats._max.score || 0,
          minScore: scoringStats._min.score || 0
        },
        recentEvents,
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };

  generateContestResultsReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const { contestId } = authReq.params;

      if (!contestId) {
        return sendSuccess(res, {}, 'contestId is required', 400);
      }

      // Get contest with all related data
      const contest = await this.prisma.contest.findUnique({
        where: { id: contestId },
        include: {
          categories: {
            include: {
              _count: {
                select: {
                  scores: true
                }
              }
            }
          }
        }
      }) as ContestWithCategories | null;

      if (!contest) {
        return sendSuccess(res, {}, 'Contest not found', 404);
      }

      // Verify contest tenant access
      if (contest.tenantId !== authReq.user!.tenantId) {
        return sendSuccess(res, {}, 'Contest not found', 404);
      }

      // Get event info separately
      const event = await this.prisma.event.findUnique({
        where: { id: contest.eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true
        }
      });

      // Get results for each category
      const categoryResults = await Promise.all(
        contest.categories.map(async (category) => {
          interface ContestantScore {
            contestantId: string;
            contestantName: string;
            scores: {
              judgeName: string;
              score: number;
              certified: boolean;
            }[];
            total: number;
            average: number;
            rank: number;
          }

          // Get all scores for this category, grouped by contestant
          const scores = await this.prisma.score.findMany({
            where: {
              categoryId: category.id,
              tenantId: authReq.user!.tenantId
            },
            include: {
              contestant: {
                select: {
                  id: true,
                  name: true
                }
              },
              judge: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }) as ScoreWithRelations[];

          // Calculate total scores per contestant
          const contestantScores = scores.reduce((acc: Record<string, ContestantScore>, score) => {
            const cId = score.contestantId;
            if (!acc[cId]) {
              acc[cId] = {
                contestantId: cId,
                contestantName: score.contestant.name,
                scores: [],
                total: 0,
                average: 0,
                rank: 0
              };
            }
            acc[cId].scores.push({
              judgeName: score.judge.name,
              score: score.score || 0,
              certified: score.isCertified
            });
            acc[cId].total += score.score || 0;
            return acc;
          }, {});

          // Calculate averages and sort by total score
          const rankings = Object.values(contestantScores)
            .map((c) => {
              c.average = c.scores.length > 0 ? c.total / c.scores.length : 0;
              return c;
            })
            .sort((a, b) => b.total - a.total)
            .map((c, index: number) => {
              c.rank = index + 1;
              return c;
            });

          // Count contestants for this category
          const contestantCount = await this.prisma.contestContestant.count({
            where: {
              contestId,
              tenantId: authReq.user!.tenantId
            }
          });

          return {
            categoryId: category.id,
            categoryName: category.name,
            totalContestants: contestantCount,
            totalScores: category._count.scores,
            rankings
          };
        })
      );

      const report = {
        contest: {
          id: contest.id,
          name: contest.name,
          event
        },
        categories: categoryResults,
        summary: {
          totalCategories: contest.categories.length,
          totalContestants: categoryResults.reduce((sum, cat) => sum + cat.totalContestants, 0),
          totalScores: categoryResults.reduce((sum, cat) => sum + cat.totalScores, 0)
        },
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new AdvancedReportingController();
export const generateScoreReport = controller.generateScoreReport;
export const generateSummaryReport = controller.generateSummaryReport;
export const generateEventReport = controller.generateEventReport;
export const generateJudgePerformanceReport = controller.generateJudgePerformanceReport;
export const generateSystemAnalyticsReport = controller.generateSystemAnalyticsReport;
export const generateContestResultsReport = controller.generateContestResultsReport;
