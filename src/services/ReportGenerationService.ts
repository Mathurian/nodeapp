/**
 * Report Generation Service
 * Handles report data generation and winner calculations
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';

export interface ContestantScore {
  contestant: any;
  totalScore: number;
  totalPossibleScore: number | null;
  categoriesParticipated: number;
}

export interface ReportData {
  event?: any;
  contest?: any;
  categories?: any[];
  scores?: any[];
  winners?: ContestantScore[];
  statistics?: any;
  metadata?: {
    generatedAt: string;
    generatedBy?: string;
    reportType: string;
  };
}

@injectable()
export class ReportGenerationService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Calculate winners for a contest
   */
  async calculateContestWinners(contest: any): Promise<ContestantScore[]> {
    try {
      // Get all criteria for all categories to calculate total possible scores
      const allCriteria = await this.prisma.criterion.findMany({
        where: {
          categoryId: { in: contest.categories.map((c: any) => c.id) }
        }
      });

      // Calculate total possible per category per judge (from criteria)
      const categoryMaxScoresFromCriteria: Record<string, number> = {};
      allCriteria.forEach((criterion: any) => {
        if (!categoryMaxScoresFromCriteria[criterion.categoryId]) {
          categoryMaxScoresFromCriteria[criterion.categoryId] = 0;
        }
        categoryMaxScoresFromCriteria[criterion.categoryId] += criterion.maxScore;
      });

      // Build categoryMaxScores map
      const categoryMaxScores: Record<string, number | null> = {};
      contest.categories.forEach((cat: any) => {
        const criteriaSum = categoryMaxScoresFromCriteria[cat.id] || 0;
        categoryMaxScores[cat.id] = criteriaSum > 0 ? criteriaSum : (cat.scoreCap || null);
      });

      // Aggregate scores across all categories in the contest
      const allScores: any = await this.prisma.score.findMany({
        where: {
          categoryId: { in: contest.categories.map((c: any) => c.id) }
        },
        include: {
          contestant: true,
          judge: true,
          criterion: true,
          category: true
        } as any
      } as any);

      // Group by contestant and sum scores
      const contestantTotals: Record<string, any> = {};
      allScores.forEach((score: any) => {
        const contestantId = score.contestantId;
        if (!contestantTotals[contestantId]) {
          contestantTotals[contestantId] = {
            contestant: score.contestant,
            totalScore: 0,
            totalPossibleScore: 0,
            categories: new Set(),
            categoryJudgePairs: new Set()
          };
        }
        if (score.score !== null) {
          contestantTotals[contestantId].totalScore += score.score;
          contestantTotals[contestantId].categoryJudgePairs.add(
            `${score.categoryId}-${score.judgeId}`
          );
        }
        contestantTotals[contestantId].categories.add(score.categoryId);
      });

      // Calculate winners with total possible scores
      const winners = Object.values(contestantTotals).map((item: any) => {
        let totalPossible = 0;
        let hasValidMaxScore = false;

        item.categoryJudgePairs.forEach((pair: string) => {
          const [categoryId] = pair.split('-');
          const categoryMax = categoryId ? categoryMaxScores[categoryId] : undefined;
          if (categoryMax !== null && categoryMax !== undefined && categoryMax > 0) {
            totalPossible += categoryMax;
            hasValidMaxScore = true;
          }
        });

        const calculatedTotalPossible = hasValidMaxScore ? totalPossible : null;

        return {
          contestant: item.contestant,
          totalScore: item.totalScore,
          totalPossibleScore: calculatedTotalPossible,
          categoriesParticipated: item.categories.size
        };
      }).sort((a, b) => b.totalScore - a.totalScore);

      return winners;
    } catch (error) {
      this.handleError(error, { method: 'calculateContestWinners', contestId: contest.id });
    }
  }

  /**
   * Calculate category total possible score
   */
  async calculateCategoryTotalPossible(category: any): Promise<number | null> {
    try {
      const criteria = await this.prisma.criterion.findMany({
        where: { categoryId: category.id }
      });

      if (criteria.length > 0) {
        return criteria.reduce((sum: number, c: any) => sum + (c.maxScore || 0), 0);
      }

      return category.scoreCap || null;
    } catch (error) {
      this.handleError(error, { method: 'calculateCategoryTotalPossible', categoryId: category.id });
    }
  }

  /**
   * Generate comprehensive event report data
   */
  async generateEventReportData(eventId: string, userId?: string): Promise<ReportData> {
    try {
      const event: any = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          contests: {
            include: {
              categories: {
                include: {
                  scores: {
                    include: {
                      contestant: true,
                      judge: true,
                      criterion: true
                    }
                  }
                }
              }
            }
          }
        } as any
      } as any);

      this.assertExists(event, 'Event', eventId);

      // Calculate winners for each contest
      const contestsWithWinners = await Promise.all(
        event.contests.map(async (contest: any) => {
          const winners = await this.calculateContestWinners(contest);
          return {
            ...contest,
            winners
          };
        })
      );

      return {
        event: {
          ...event,
          contests: contestsWithWinners
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'event_comprehensive'
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'generateEventReportData', eventId });
    }
  }

  /**
   * Generate contest results report data
   */
  async generateContestResultsData(contestId: string, userId?: string): Promise<ReportData> {
    try {
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: contestId },
        include: {
          event: true,
          categories: {
            include: {
              scores: {
                include: {
                  contestant: true,
                  judge: true,
                  criterion: true
                }
              }
            }
          }
        } as any
      } as any);

      this.assertExists(contest, 'Contest', contestId);

      const winners = await this.calculateContestWinners(contest);

      return {
        contest: {
          ...contest,
          winners
        },
        winners,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'contest_results'
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'generateContestResultsData', contestId });
    }
  }

  /**
   * Generate judge performance report data
   */
  async generateJudgePerformanceData(judgeId: string, userId?: string): Promise<ReportData> {
    try {
      const judge: any = await this.prisma.judge.findUnique({
        where: { id: judgeId },
        include: {
          scores: {
            include: {
              contestant: true,
              category: true,
              criterion: true
            }
          }
        } as any
      } as any);

      this.assertExists(judge, 'Judge', judgeId);

      // Calculate statistics
      const totalScoresGiven = judge.scores.length;
      const averageScore = totalScoresGiven > 0
        ? judge.scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / totalScoresGiven
        : 0;

      const categoryIds = new Set(judge.scores.map((s: any) => s.categoryId).filter(Boolean));

      const statistics = {
        totalScoresGiven,
        averageScore: Number(averageScore.toFixed(2)),
        categoriesJudged: categoryIds.size,
        categoryBreakdown: this.calculateCategoryBreakdown(judge.scores)
      };

      return {
        scores: judge.scores,
        statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'judge_performance'
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'generateJudgePerformanceData', judgeId });
    }
  }

  /**
   * Generate system analytics report data
   */
  async generateSystemAnalyticsData(userId?: string): Promise<ReportData> {
    try {
      const [
        totalEvents,
        totalContests,
        totalCategories,
        totalScores,
        totalUsers,
        activeEvents
      ] = await Promise.all([
        this.prisma.event.count(),
        this.prisma.contest.count(),
        this.prisma.category.count(),
        this.prisma.score.count(),
        this.prisma.user.count(),
        this.prisma.event.count({ where: { archived: false } })
      ]);

      const statistics = {
        totalEvents,
        activeEvents,
        archivedEvents: totalEvents - activeEvents,
        totalContests,
        totalCategories,
        totalScores,
        totalUsers,
        averageScoresPerEvent: totalEvents > 0 ? Number((totalScores / totalEvents).toFixed(2)) : 0,
        averageContestsPerEvent: totalEvents > 0 ? Number((totalContests / totalEvents).toFixed(2)) : 0
      };

      return {
        statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'system_analytics'
        }
      };
    } catch (error) {
      this.handleError(error, { method: 'generateSystemAnalyticsData' });
    }
  }

  /**
   * Calculate category breakdown for scores
   */
  private calculateCategoryBreakdown(scores: any[]): Record<string, any> {
    const breakdown: Record<string, any> = {};

    scores.forEach(score => {
      const categoryId = score.categoryId;
      if (!breakdown[categoryId]) {
        breakdown[categoryId] = {
          categoryName: score.category?.name || 'Unknown',
          count: 0,
          totalScore: 0,
          averageScore: 0
        };
      }
      breakdown[categoryId].count++;
      breakdown[categoryId].totalScore += score.score || 0;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(categoryId => {
      const cat = breakdown[categoryId];
      cat.averageScore = cat.count > 0 ? Number((cat.totalScore / cat.count).toFixed(2)) : 0;
    });

    return breakdown;
  }
}
