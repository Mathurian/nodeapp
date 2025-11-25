/**
 * Report Generation Service
 * Handles report data generation and winner calculations
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

// Prisma payload types for complex queries
type ContestantBasic = Prisma.ContestantGetPayload<{
  select: {
    id: true;
    name: true;
    contestantNumber: true;
  };
}>;

type ScoreWithRelations = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    contestantId: true;
    judgeId: true;
    categoryId: true;
    score: true;
    contestant: {
      select: {
        id: true;
        name: true;
        contestantNumber: true;
      };
    };
    judge: {
      select: {
        id: true;
        name: true;
      };
    };
    criterion: {
      select: {
        id: true;
        maxScore: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type CategoryWithScores = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    scoreCap: true;
    scores: {
      select: {
        id: true;
        contestantId: true;
        judgeId: true;
        categoryId: true;
        score: true;
        contestant: {
          select: {
            id: true;
            name: true;
            contestantNumber: true;
          };
        };
        judge: {
          select: {
            id: true;
            name: true;
          };
        };
        criterion: {
          select: {
            id: true;
            maxScore: true;
          };
        };
      };
    };
  };
}>;

type ContestWithCategories = Prisma.ContestGetPayload<{
  select: {
    id: true;
    name: true;
    categories: {
      select: {
        id: true;
        name: true;
        scoreCap: true;
        scores: {
          select: {
            id: true;
            contestantId: true;
            judgeId: true;
            categoryId: true;
            score: true;
            contestant: {
              select: {
                id: true;
                name: true;
                contestantNumber: true;
              };
            };
            judge: {
              select: {
                id: true;
                name: true;
              };
            };
            criterion: {
              select: {
                id: true;
                maxScore: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type ContestWithEventAndCategories = Prisma.ContestGetPayload<{
  select: {
    id: true;
    name: true;
    eventId: true;
    event: {
      select: {
        id: true;
        name: true;
        startDate: true;
        endDate: true;
      };
    };
    categories: {
      select: {
        id: true;
        name: true;
        scoreCap: true;
        scores: {
          select: {
            id: true;
            contestantId: true;
            judgeId: true;
            categoryId: true;
            score: true;
            contestant: {
              select: {
                id: true;
                name: true;
                contestantNumber: true;
              };
            };
            judge: {
              select: {
                id: true;
                name: true;
              };
            };
            criterion: {
              select: {
                id: true;
                maxScore: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type JudgeWithScores = Prisma.JudgeGetPayload<{
  select: {
    id: true;
    name: true;
    judgeNumber: true;
    scores: {
      select: {
        id: true;
        contestantId: true;
        categoryId: true;
        score: true;
        contestant: {
          select: {
            id: true;
            name: true;
            contestantNumber: true;
          };
        };
        category: {
          select: {
            id: true;
            name: true;
          };
        };
        criterion: {
          select: {
            id: true;
            maxScore: true;
          };
        };
      };
    };
  };
}>;

type EventWithContests = Prisma.EventGetPayload<{
  select: {
    id: true;
    name: true;
    startDate: true;
    endDate: true;
    contests: {
      select: {
        id: true;
        name: true;
        categories: {
          select: {
            id: true;
            name: true;
            scoreCap: true;
            scores: {
              select: {
                id: true;
                contestantId: true;
                judgeId: true;
                categoryId: true;
                score: true;
                contestant: {
                  select: {
                    id: true;
                    name: true;
                    contestantNumber: true;
                  };
                };
                judge: {
                  select: {
                    id: true;
                    name: true;
                  };
                };
                criterion: {
                  select: {
                    id: true;
                    maxScore: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

type CategoryWithCriteria = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    scoreCap: true;
  };
}>;

type CriterionWithMaxScore = Prisma.CriterionGetPayload<{
  select: {
    categoryId: true;
    maxScore: true;
  };
}>;

type JudgeScoreForReport = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    contestantId: true;
    categoryId: true;
    score: true;
    contestant: {
      select: {
        id: true;
        name: true;
        contestantNumber: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
      };
    };
    criterion: {
      select: {
        id: true;
        maxScore: true;
      };
    };
  };
}>;

// Report-related interfaces
export interface ContestantScore {
  contestant: ContestantBasic;
  totalScore: number;
  totalPossibleScore: number | null;
  categoriesParticipated: number;
}

export interface CategoryBreakdown {
  categoryName: string;
  count: number;
  totalScore: number;
  averageScore: number;
}

export interface SystemStatistics {
  totalEvents: number;
  activeEvents: number;
  archivedEvents: number;
  totalContests: number;
  totalCategories: number;
  totalScores: number;
  totalUsers: number;
  averageScoresPerEvent: number;
  averageContestsPerEvent: number;
}

export interface JudgeStatistics {
  totalScoresGiven: number;
  averageScore: number;
  categoriesJudged: number;
  categoryBreakdown: Record<string, CategoryBreakdown>;
}

export interface ContestWithWinners extends ContestWithCategories {
  winners: ContestantScore[];
}

export interface EventWithContestsAndWinners {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date | null;
  contests: ContestWithWinners[];
}

export interface ReportData {
  event?: EventWithContestsAndWinners;
  contest?: ContestWithEventAndCategories & { winners: ContestantScore[] };
  categories?: CategoryWithScores[];
  scores?: JudgeScoreForReport[];
  winners?: ContestantScore[];
  statistics?: SystemStatistics | JudgeStatistics;
  metadata?: {
    generatedAt: string;
    generatedBy?: string;
    reportType: string;
  };
}

interface ContestantTotals {
  contestant: ContestantBasic;
  totalScore: number;
  totalPossibleScore: number;
  categories: Set<string>;
  categoryJudgePairs: Set<string>;
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
  async calculateContestWinners(contest: ContestWithCategories): Promise<ContestantScore[]> {
    try {
      // Get all criteria for all categories to calculate total possible scores
      const allCriteria: CriterionWithMaxScore[] = await this.prisma.criterion.findMany({
        where: {
          categoryId: { in: contest.categories.map((c) => c.id) }
        },
        select: {
          categoryId: true,
          maxScore: true
        }
      });

      // Calculate total possible per category per judge (from criteria)
      const categoryMaxScoresFromCriteria: Record<string, number> = {};
      allCriteria.forEach((criterion) => {
        const categoryId = criterion.categoryId;
        if (!categoryMaxScoresFromCriteria[categoryId]) {
          categoryMaxScoresFromCriteria[categoryId] = 0;
        }
        categoryMaxScoresFromCriteria[categoryId] = (categoryMaxScoresFromCriteria[categoryId] || 0) + criterion.maxScore;
      });

      // Build categoryMaxScores map
      const categoryMaxScores: Record<string, number | null> = {};
      contest.categories.forEach((cat) => {
        const criteriaSum = categoryMaxScoresFromCriteria[cat.id] || 0;
        categoryMaxScores[cat.id] = criteriaSum > 0 ? criteriaSum : (cat.scoreCap || null);
      });

      // Aggregate scores across all categories in the contest
      // P2-2 OPTIMIZATION: Selective field loading
      const allScores = await this.prisma.score.findMany({
        where: {
          categoryId: { in: contest.categories.map((c) => c.id) }
        },
        select: {
          id: true,
          contestantId: true,
          judgeId: true,
          categoryId: true,
          score: true,
          contestant: {
            select: {
              id: true,
              name: true,
              contestantNumber: true
            }
          },
          judge: {
            select: {
              id: true,
              name: true
            }
          },
          criterion: {
            select: {
              id: true,
              maxScore: true
            }
          },
          category: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const typedScores = allScores as unknown as ScoreWithRelations[];

      // Group by contestant and sum scores
      const contestantTotals: Record<string, ContestantTotals> = {};
      typedScores.forEach((score) => {
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
      const winners = Object.values(contestantTotals).map((item) => {
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
  async calculateCategoryTotalPossible(category: CategoryWithCriteria): Promise<number | null> {
    try {
      const criteria: CriterionWithMaxScore[] = await this.prisma.criterion.findMany({
        where: { categoryId: category.id },
        select: {
          categoryId: true,
          maxScore: true
        }
      });

      if (criteria.length > 0) {
        return criteria.reduce((sum: number, c) => sum + (c.maxScore || 0), 0);
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
      // P2-2 OPTIMIZATION: Selective field loading
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          contests: {
            select: {
              id: true,
              name: true,
              categories: {
                select: {
                  id: true,
                  name: true,
                  scoreCap: true,
                  scores: {
                    select: {
                      id: true,
                      contestantId: true,
                      judgeId: true,
                      categoryId: true,
                      score: true,
                      contestant: {
                        select: {
                          id: true,
                          name: true,
                          contestantNumber: true
                        }
                      },
                      judge: {
                        select: {
                          id: true,
                          name: true
                        }
                      },
                      criterion: {
                        select: {
                          id: true,
                          maxScore: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      this.assertExists(event, 'Event', eventId);

      // Calculate winners for each contest
      const contestsWithWinners: ContestWithWinners[] = await Promise.all(
        (event as unknown as EventWithContests).contests.map(async (contest) => {
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
      // P2-2 OPTIMIZATION: Selective field loading
      const contest = await this.prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          id: true,
          name: true,
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true
            }
          },
          categories: {
            select: {
              id: true,
              name: true,
              scoreCap: true,
              scores: {
                select: {
                  id: true,
                  contestantId: true,
                  judgeId: true,
                  categoryId: true,
                  score: true,
                  contestant: {
                    select: {
                      id: true,
                      name: true,
                      contestantNumber: true
                    }
                  },
                  judge: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  criterion: {
                    select: {
                      id: true,
                      maxScore: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      this.assertExists(contest, 'Contest', contestId);

      const winners = await this.calculateContestWinners(contest as unknown as ContestWithEventAndCategories);

      return {
        contest: {
          ...(contest as unknown as ContestWithEventAndCategories),
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
      // P2-2 OPTIMIZATION: Selective field loading
      const judge = await this.prisma.judge.findUnique({
        where: { id: judgeId },
        select: {
          id: true,
          name: true,
          scores: {
            select: {
              id: true,
              contestantId: true,
              categoryId: true,
              score: true,
              contestant: {
                select: {
                  id: true,
                  name: true,
                  contestantNumber: true
                }
              },
              category: {
                select: {
                  id: true,
                  name: true
                }
              },
              criterion: {
                select: {
                  id: true,
                  maxScore: true
                }
              }
            }
          }
        }
      });

      this.assertExists(judge, 'Judge', judgeId);

      const typedJudge = judge as unknown as JudgeWithScores;

      // Calculate statistics
      const totalScoresGiven = typedJudge.scores.length;
      const averageScore = totalScoresGiven > 0
        ? typedJudge.scores.reduce((sum: number, s) => sum + (s.score || 0), 0) / totalScoresGiven
        : 0;

      const categoryIds = new Set(typedJudge.scores.map((s) => s.categoryId).filter(Boolean));

      const statistics: JudgeStatistics = {
        totalScoresGiven,
        averageScore: Number(averageScore.toFixed(2)),
        categoriesJudged: categoryIds.size,
        categoryBreakdown: this.calculateCategoryBreakdown(typedJudge.scores)
      };

      return {
        scores: typedJudge.scores,
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

      const statistics: SystemStatistics = {
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
  private calculateCategoryBreakdown(scores: JudgeScoreForReport[]): Record<string, CategoryBreakdown> {
    const breakdown: Record<string, CategoryBreakdown> = {};

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
      if (cat) {
        cat.averageScore = cat.count > 0 ? Number((cat.totalScore / cat.count).toFixed(2)) : 0;
      }
    });

    return breakdown;
  }
}
