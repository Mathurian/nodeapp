import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AdvancedReportingService } from '../services/AdvancedReportingService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class AdvancedReportingController {
  private advancedReportingService: AdvancedReportingService;
  private prisma: PrismaClient;

  constructor() {
    this.advancedReportingService = container.resolve(AdvancedReportingService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  generateScoreReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId, contestId, categoryId } = req.query;
      const report = await this.advancedReportingService.generateScoreReport(
        eventId as string | undefined,
        contestId as string | undefined,
        categoryId as string | undefined
      );
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  generateSummaryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const report = await this.advancedReportingService.generateSummaryReport(eventId);
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  generateEventReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;

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
      });

      if (!event) {
        return sendSuccess(res, {}, 'Event not found', 404);
      }

      // Get total scores, contestants, judges and categories for this event
      const [totalScores, totalContestants, totalCategories, totalJudges] = await Promise.all([
        this.prisma.score.count({
          where: {
            category: {
              contest: {
                eventId
              }
            }
          }
        }),
        this.prisma.contestContestant.count({
          where: {
            contest: {
              eventId
            }
          }
        }),
        this.prisma.category.count({
          where: {
            contest: {
              eventId
            }
          }
        }),
        this.prisma.assignment.count({
          where: {
            eventId
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
        contests: event.contests.map((contest: any) => ({
          id: contest.id,
          name: contest.name,
          categories: contest.categories.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            scores: cat._count.scores
          }))
        })),
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  };

  generateJudgePerformanceReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId } = req.params;
      const eventId = req.query.eventId as string | undefined;
      const contestId = req.query.contestId as string | undefined;

      if (!judgeId) {
        return sendSuccess(res, {}, 'judgeId is required', 400);
      }

      // Get judge information
      const judge = await this.prisma.judge.findUnique({
        where: { id: judgeId }
      });

      if (!judge) {
        return sendSuccess(res, {}, 'Judge not found', 404);
      }

      // Build where clause for scores
      const scoreWhere: any = { judgeId };
      if (eventId) {
        scoreWhere.category = {
          contest: { eventId }
        };
      }
      if (contestId) {
        scoreWhere.category = {
          contestId
        };
      }

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
          }
        }
      });

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
      const byCategory = scores.reduce((acc: any, score) => {
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
        acc[catId].total += score.score;
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
      next(error);
    }
  };

  generateSystemAnalyticsReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get comprehensive system statistics
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
        this.prisma.user.count(),
        this.prisma.event.count(),
        this.prisma.contest.count(),
        this.prisma.category.count(),
        this.prisma.contestant.count(),
        this.prisma.judge.count(),
        this.prisma.score.count(),

        // Recent activity
        this.prisma.activityLog.count({
          where: {
            createdAt: { gte: since }
          }
        }),

        // Users by role
        this.prisma.user.groupBy({
          by: ['role'],
          _count: { id: true }
        }),

        // Events by archived status
        this.prisma.event.groupBy({
          by: ['archived'],
          _count: { id: true }
        })
      ]);

      // Get recent events
      const recentEvents = await this.prisma.event.findMany({
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
        _avg: { score: true },
        _max: { score: true },
        _min: { score: true }
      });

      const certifiedScores = await this.prisma.score.count({
        where: { isCertified: true }
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
      next(error);
    }
  };

  generateContestResultsReport = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestId } = req.params;

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
      });

      if (!contest) {
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
        contest.categories.map(async (category: any) => {
          // Get all scores for this category, grouped by contestant
          const scores = await this.prisma.score.findMany({
            where: {
              categoryId: category.id
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
          });

          // Calculate total scores per contestant
          const contestantScores = scores.reduce((acc: any, score) => {
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
            .map((c: any) => {
              c.average = c.scores.length > 0 ? c.total / c.scores.length : 0;
              return c;
            })
            .sort((a: any, b: any) => b.total - a.total)
            .map((c: any, index: number) => {
              c.rank = index + 1;
              return c;
            });

          // Count contestants for this category
          const contestantCount = await this.prisma.contestContestant.count({
            where: {
              contestId,
              contest: {
                categories: {
                  some: {
                    id: category.id
                  }
                }
              }
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
          totalContestants: categoryResults.reduce((sum: any, cat: any) => sum + cat.totalContestants, 0),
          totalScores: categoryResults.reduce((sum: any, cat: any) => sum + cat.totalScores, 0)
        },
        generatedAt: new Date()
      };

      return sendSuccess(res, report);
    } catch (error) {
      next(error);
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
