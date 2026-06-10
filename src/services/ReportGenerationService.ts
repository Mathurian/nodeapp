/**
 * Report Generation Service
 * Handles report data generation and winner calculations
 */

import { injectable, inject } from 'tsyringe';
import { CommentaryMode, CommentaryScope, PrismaClient, Prisma } from '@prisma/client';
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

type ReportScoreComment = Prisma.ScoreCommentGetPayload<{
  select: {
    comment: true;
    createdAt: true;
    updatedAt: true;
    isPrivate: true;
  };
}>;

type ReportJudgeComment = Prisma.JudgeCommentGetPayload<{
  select: {
    scope: true;
    scopeKey: true;
    contestantId: true;
    judgeId: true;
    comment: true;
    createdAt: true;
  };
}>;

type ReportCategoryContext = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    scoreCap: true;
    commentaryMode: true;
    commentaryScope: true;
    totalsCertified: true;
    tenantId: true;
    criteria: {
      select: {
        id: true;
        name: true;
        maxScore: true;
      };
    };
    scores: {
      select: {
        id: true;
        contestantId: true;
        judgeId: true;
        categoryId: true;
        criterionId: true;
        score: true;
        isCertified: true;
        certifiedAt: true;
        certifiedBy: true;
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
            name: true;
            maxScore: true;
            categoryId: true;
          };
        };
        scoreComments: {
          select: {
            comment: true;
            createdAt: true;
            updatedAt: true;
            isPrivate: true;
          };
        };
      };
    };
  };
}>;

type ContestReportContext = Prisma.ContestGetPayload<{
  select: {
    id: true;
    name: true;
    eventId: true;
    tenantId: true;
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
        commentaryMode: true;
        commentaryScope: true;
        totalsCertified: true;
        tenantId: true;
        criteria: {
          select: {
            id: true;
            name: true;
            maxScore: true;
          };
        };
        scores: {
          select: {
            id: true;
            contestantId: true;
            judgeId: true;
            categoryId: true;
            criterionId: true;
            score: true;
            isCertified: true;
            certifiedAt: true;
            certifiedBy: true;
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
                name: true;
                maxScore: true;
                categoryId: true;
              };
            };
            scoreComments: {
              select: {
                comment: true;
                createdAt: true;
                updatedAt: true;
                isPrivate: true;
              };
            };
          };
        };
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
  contestantReport?: ContestantReport;
  categories?: CategoryWithScores[];
  scores?: JudgeScoreForReport[];
  winners?: ContestantScore[];
  statistics?: SystemStatistics | JudgeStatistics | Record<string, string | number>;
  drilldown?: ReportDrilldown;
  metadata?: {
    generatedAt: string;
    generatedBy?: string;
    reportType: string;
    scope?: {
      eventId?: string;
      eventName?: string;
      contestIds?: string[];
      contestNames?: string[];
      contestantId?: string;
      contestantName?: string;
      filterMode?: 'all_contests_in_event' | 'selected_contests' | 'single_contest' | 'single_contestant' | 'system';
    };
  };
}

interface ContestantTotals {
  contestant: ContestantBasic;
  totalScore: number;
  totalPossibleScore: number;
  categories: Set<string>;
  categoryJudgePairs: Set<string>;
}

export interface ReportCriterionDrilldown {
  scoreId: string;
  criterionId: string | null;
  criterionName: string;
  score: number | null;
  maxScore: number | null;
  commentary: string | null;
  commentaryUpdatedAt: string | null;
}

export interface ReportJudgeCategoryDrilldown {
  categoryId: string;
  categoryName: string;
  commentaryMode: CommentaryMode;
  commentaryScope: CommentaryScope;
  totalScore: number;
  totalPossibleScore: number | null;
  commentary: string | null;
  commentaryCreatedAt: string | null;
  criteria: ReportCriterionDrilldown[];
}

export interface ReportContestantJudgeDrilldown {
  judgeId: string;
  judgeName: string;
  totalScore: number;
  totalPossibleScore: number | null;
  categories: ReportJudgeCategoryDrilldown[];
}

export interface ReportContestantDrilldown {
  contestantId: string;
  contestantName: string;
  contestantNumber: number | null;
  totalScore: number;
  totalPossibleScore: number | null;
  judgeCount: number;
  judges: ReportContestantJudgeDrilldown[];
}

export interface ReportContestDrilldown {
  contestId: string;
  contestName: string;
  eventId: string;
  eventName: string;
  contestantCount: number;
  contestants: ReportContestantDrilldown[];
}

export interface ReportDrilldown {
  certifiedOnly: boolean;
  contests: ReportContestDrilldown[];
}

export interface ContestantReportOption {
  id: string;
  name: string;
  contestantNumber: number | null;
}

export interface ContestantReportGeneralCommentary {
  scope: CommentaryScope;
  scopeLabel: string;
  judgeId: string;
  judgeName: string;
  categoryId: string | null;
  categoryName: string | null;
  comment: string;
  createdAt: string;
}

export interface ContestantReportCriterion {
  scoreId: string;
  criterionId: string | null;
  criterionName: string;
  score: number | null;
  maxScore: number | null;
  commentary: string | null;
  commentaryUpdatedAt: string | null;
}

export interface ContestantReportJudgeCategory {
  categoryId: string;
  categoryName: string;
  commentaryMode: CommentaryMode;
  commentaryScope: CommentaryScope;
  totalScore: number;
  totalPossibleScore: number | null;
  commentary: string | null;
  commentaryCreatedAt: string | null;
  criteria: ContestantReportCriterion[];
}

export interface ContestantReportJudge {
  judgeId: string;
  judgeName: string;
  totalScore: number;
  totalPossibleScore: number | null;
  categories: ContestantReportJudgeCategory[];
}

export interface ContestantReportCategory {
  categoryId: string;
  categoryName: string;
  commentaryMode: CommentaryMode;
  commentaryScope: CommentaryScope;
  totalScore: number;
  totalPossibleScore: number | null;
  generalCommentary: ContestantReportGeneralCommentary[];
  judges: ContestantReportJudge[];
}

export interface ContestantReport {
  certifiedOnly: boolean;
  event: {
    id: string;
    name: string;
  };
  contest: {
    id: string;
    name: string;
  };
  contestant: {
    id: string;
    name: string;
    contestantNumber: number | null;
  };
  totalScore: number;
  totalPossibleScore: number | null;
  categoryCount: number;
  judgeCount: number;
  scoredCriterionCount: number;
  generalCommentary: ContestantReportGeneralCommentary[];
  categories: ContestantReportCategory[];
}

export interface GenerateEventReportOptions {
  contestIds?: string[];
}

interface CalculateContestWinnersOptions {
  certifiedOnly?: boolean;
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
  async calculateContestWinners(
    contest: ContestWithCategories,
    options?: CalculateContestWinnersOptions,
  ): Promise<ContestantScore[]> {
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
          categoryId: { in: contest.categories.map((c) => c.id) },
          ...(options?.certifiedOnly
            ? {
                isCertified: true,
                category: {
                  totalsCertified: true,
                },
              }
            : {}),
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

  private getCategoryTotalPossibleFromCriteria(
    category: Pick<ReportCategoryContext, 'scoreCap' | 'criteria'>,
  ): number | null {
    const criteriaSum = category.criteria.reduce((sum, criterion) => sum + (criterion.maxScore || 0), 0);
    if (criteriaSum > 0) {
      return criteriaSum;
    }

    return category.scoreCap || null;
  }

  private buildCertifiedContestContext(contest: ContestReportContext): ContestReportContext {
    return {
      ...contest,
      categories: contest.categories
        .filter((category) => category.totalsCertified)
        .map((category) => ({
          ...category,
          scores: category.scores.filter((score) => score.isCertified),
        })),
    };
  }

  private getJudgeCommentLookupKey(
    scope: CommentaryScope,
    scopeKey: string,
    contestantId: string,
    judgeId: string,
  ): string {
    return `${scope}:${scopeKey}:${contestantId}:${judgeId}`;
  }

  private getJudgeCommentScopeKey(
    category: Pick<ReportCategoryContext, 'id' | 'commentaryScope'>,
    contest: Pick<ContestReportContext, 'id' | 'eventId'>,
  ): { scope: CommentaryScope; scopeKey: string } {
    switch (category.commentaryScope) {
      case CommentaryScope.EVENT:
        return {
          scope: CommentaryScope.EVENT,
          scopeKey: contest.eventId,
        };
      case CommentaryScope.CONTEST:
        return {
          scope: CommentaryScope.CONTEST,
          scopeKey: contest.id,
        };
      case CommentaryScope.CATEGORY:
      default:
        return {
          scope: CommentaryScope.CATEGORY,
          scopeKey: category.id,
        };
    }
  }

  private getLatestScoreComment(scoreComments: ReportScoreComment[]): ReportScoreComment | null {
    if (!Array.isArray(scoreComments) || scoreComments.length === 0) {
      return null;
    }

    return [...scoreComments].sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
      const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
      return rightTime - leftTime;
    })[0] || null;
  }

  private getReadableCommentaryScopeLabel(
    scope: CommentaryScope,
    contest: Pick<ContestReportContext, 'name' | 'event'>,
    category: Pick<ReportCategoryContext, 'name'>,
  ): string {
    switch (scope) {
      case CommentaryScope.EVENT:
        return `${contest.event.name} (event)`;
      case CommentaryScope.CONTEST:
        return `${contest.name} (contest)`;
      case CommentaryScope.CATEGORY:
      default:
        return `${category.name} (category)`;
    }
  }

  private async loadJudgeCommentsForDrilldown(
    contests: ContestReportContext[],
  ): Promise<Map<string, ReportJudgeComment>> {
    const tenantIds = Array.from(new Set(contests.map((contest) => contest.tenantId).filter(Boolean)));
    const contestantIds = Array.from(
      new Set(
        contests.flatMap((contest) =>
          contest.categories.flatMap((category) => category.scores.map((score) => score.contestantId)),
        ),
      ),
    );
    const judgeIds = Array.from(
      new Set(
        contests.flatMap((contest) =>
          contest.categories.flatMap((category) => category.scores.map((score) => score.judgeId)),
        ),
      ),
    );

    if (tenantIds.length === 0 || contestantIds.length === 0 || judgeIds.length === 0) {
      return new Map();
    }

    const categoryScopeKeys = Array.from(
      new Set(
        contests.flatMap((contest) =>
          contest.categories
            .filter((category) => category.commentaryScope === CommentaryScope.CATEGORY)
            .map((category) => category.id),
        ),
      ),
    );
    const contestScopeKeys = Array.from(
      new Set(
        contests
          .flatMap((contest) =>
            contest.categories
              .filter((category) => category.commentaryScope === CommentaryScope.CONTEST)
              .map(() => contest.id),
          )
          .filter(Boolean),
      ),
    );
    const eventScopeKeys = Array.from(
      new Set(
        contests
          .flatMap((contest) =>
            contest.categories
              .filter((category) => category.commentaryScope === CommentaryScope.EVENT)
              .map(() => contest.eventId),
          )
          .filter(Boolean),
      ),
    );

    const scopeFilters: Prisma.JudgeCommentWhereInput[] = [];
    if (categoryScopeKeys.length > 0) {
      scopeFilters.push({
        scope: CommentaryScope.CATEGORY,
        scopeKey: { in: categoryScopeKeys },
      });
    }
    if (contestScopeKeys.length > 0) {
      scopeFilters.push({
        scope: CommentaryScope.CONTEST,
        scopeKey: { in: contestScopeKeys },
      });
    }
    if (eventScopeKeys.length > 0) {
      scopeFilters.push({
        scope: CommentaryScope.EVENT,
        scopeKey: { in: eventScopeKeys },
      });
    }

    if (scopeFilters.length === 0) {
      return new Map();
    }

    const judgeComments = await this.prisma.judgeComment.findMany({
      where: {
        tenantId: { in: tenantIds },
        contestantId: { in: contestantIds },
        judgeId: { in: judgeIds },
        OR: scopeFilters,
      },
      select: {
        scope: true,
        scopeKey: true,
        contestantId: true,
        judgeId: true,
        comment: true,
        createdAt: true,
      },
    });

    return new Map(
      judgeComments.map((judgeComment) => [
        this.getJudgeCommentLookupKey(
          judgeComment.scope,
          judgeComment.scopeKey,
          judgeComment.contestantId,
          judgeComment.judgeId,
        ),
        judgeComment,
      ]),
    );
  }

  private async buildReportDrilldown(contests: ContestReportContext[]): Promise<ReportDrilldown> {
    const filteredContests = contests.map((contest) => this.buildCertifiedContestContext(contest));
    const judgeCommentsByKey = await this.loadJudgeCommentsForDrilldown(filteredContests);

    const contestDrilldowns: ReportContestDrilldown[] = filteredContests.map((contest) => {
      const contestantMap = new Map<
        string,
        {
          contestantId: string;
          contestantName: string;
          contestantNumber: number | null;
          judges: Map<
            string,
            {
              judgeId: string;
              judgeName: string;
              categories: Map<string, ReportJudgeCategoryDrilldown>;
            }
          >;
        }
      >();

      contest.categories.forEach((category) => {
        const categoryTotalPossible = this.getCategoryTotalPossibleFromCriteria(category);

        category.scores.forEach((score) => {
          const contestantEntry = contestantMap.get(score.contestantId) || {
            contestantId: score.contestant.id,
            contestantName: score.contestant.name,
            contestantNumber: score.contestant.contestantNumber,
            judges: new Map(),
          };
          contestantMap.set(score.contestantId, contestantEntry);

          const judgeEntry = contestantEntry.judges.get(score.judgeId) || {
            judgeId: score.judge.id,
            judgeName: score.judge.name,
            categories: new Map(),
          };
          contestantEntry.judges.set(score.judgeId, judgeEntry);

          const scopeContext = this.getJudgeCommentScopeKey(category, contest);
          const judgeComment =
            category.commentaryMode === CommentaryMode.PER_CRITERION
              ? null
              : judgeCommentsByKey.get(
                  this.getJudgeCommentLookupKey(
                    scopeContext.scope,
                    scopeContext.scopeKey,
                    score.contestantId,
                    score.judgeId,
                  ),
                ) || null;

          const categoryEntry = judgeEntry.categories.get(category.id) || {
            categoryId: category.id,
            categoryName: category.name,
            commentaryMode: category.commentaryMode,
            commentaryScope: category.commentaryScope,
            totalScore: 0,
            totalPossibleScore: categoryTotalPossible,
            commentary: judgeComment?.comment?.trim() || null,
            commentaryCreatedAt: judgeComment?.createdAt ? judgeComment.createdAt.toISOString() : null,
            criteria: [],
          };

          if (score.score !== null) {
            categoryEntry.totalScore += score.score;
          }

          const latestScoreComment =
            category.commentaryMode === CommentaryMode.PER_CATEGORY
              ? null
              : this.getLatestScoreComment(score.scoreComments);

          categoryEntry.criteria.push({
            scoreId: score.id,
            criterionId: score.criterionId,
            criterionName: score.criterion?.name || 'Criterion',
            score: score.score,
            maxScore: score.criterion?.maxScore || null,
            commentary: latestScoreComment?.comment || null,
            commentaryUpdatedAt: latestScoreComment?.updatedAt
              ? latestScoreComment.updatedAt.toISOString()
              : latestScoreComment?.createdAt
                ? latestScoreComment.createdAt.toISOString()
                : null,
          });

          judgeEntry.categories.set(category.id, categoryEntry);
        });
      });

      const contestants = Array.from(contestantMap.values())
        .map<ReportContestantDrilldown>((contestantEntry) => {
          const judges = Array.from(contestantEntry.judges.values())
            .map<ReportContestantJudgeDrilldown>((judgeEntry) => {
              const categories = Array.from(judgeEntry.categories.values())
                .map((categoryEntry) => ({
                  ...categoryEntry,
                  criteria: [...categoryEntry.criteria].sort((left, right) =>
                    left.criterionName.localeCompare(right.criterionName, undefined, {
                      sensitivity: 'base',
                      numeric: true,
                    }),
                  ),
                }))
                .sort((left, right) =>
                  left.categoryName.localeCompare(right.categoryName, undefined, {
                    sensitivity: 'base',
                    numeric: true,
                  }),
                );

              const totalScore = categories.reduce((sum, categoryEntry) => sum + categoryEntry.totalScore, 0);
              const totalPossibleValues = categories
                .map((categoryEntry) => categoryEntry.totalPossibleScore)
                .filter((value): value is number => typeof value === 'number' && value > 0);

              return {
                judgeId: judgeEntry.judgeId,
                judgeName: judgeEntry.judgeName,
                totalScore,
                totalPossibleScore:
                  totalPossibleValues.length > 0
                    ? totalPossibleValues.reduce((sum, value) => sum + value, 0)
                    : null,
                categories,
              };
            })
            .sort((left, right) =>
              left.judgeName.localeCompare(right.judgeName, undefined, {
                sensitivity: 'base',
                numeric: true,
              }),
            );

          const totalScore = judges.reduce((sum, judgeEntry) => sum + judgeEntry.totalScore, 0);
          const totalPossibleValues = judges
            .map((judgeEntry) => judgeEntry.totalPossibleScore)
            .filter((value): value is number => typeof value === 'number' && value > 0);

          return {
            contestantId: contestantEntry.contestantId,
            contestantName: contestantEntry.contestantName,
            contestantNumber: contestantEntry.contestantNumber,
            totalScore,
            totalPossibleScore:
              totalPossibleValues.length > 0
                ? totalPossibleValues.reduce((sum, value) => sum + value, 0)
                : null,
            judgeCount: judges.length,
            judges,
          };
        })
        .sort((left, right) => {
          if (left.contestantNumber !== null && right.contestantNumber !== null) {
            return left.contestantNumber - right.contestantNumber;
          }
          if (left.contestantNumber !== null) {
            return -1;
          }
          if (right.contestantNumber !== null) {
            return 1;
          }
          return left.contestantName.localeCompare(right.contestantName, undefined, {
            sensitivity: 'base',
            numeric: true,
          });
        });

      return {
        contestId: contest.id,
        contestName: contest.name,
        eventId: contest.event.id,
        eventName: contest.event.name,
        contestantCount: contestants.length,
        contestants,
      };
    });

    return {
      certifiedOnly: true,
      contests: contestDrilldowns,
    };
  }

  async getContestantReportOptions(contestId: string, tenantId: string): Promise<ContestantReportOption[]> {
    try {
      const contestants = await this.prisma.contestant.findMany({
        where: {
          tenantId,
          scores: {
            some: {
              isCertified: true,
              category: {
                contestId,
                totalsCertified: true,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          contestantNumber: true,
        },
        orderBy: [{ contestantNumber: 'asc' }, { name: 'asc' }],
      });

      return contestants.map((contestant) => ({
        id: contestant.id,
        name: contestant.name,
        contestantNumber: contestant.contestantNumber,
      }));
    } catch (error) {
      this.handleError(error, {
        method: 'getContestantReportOptions',
        contestId,
        tenantId,
      });
    }
  }

  async generateContestantResultsData(
    contestId: string,
    contestantId: string,
    userId?: string,
  ): Promise<ReportData> {
    try {
      const contest = await this.prisma.contest.findUnique({
        where: { id: contestId },
        select: {
          id: true,
          name: true,
          eventId: true,
          tenantId: true,
          event: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
              scoreCap: true,
              commentaryMode: true,
              commentaryScope: true,
              totalsCertified: true,
              tenantId: true,
              criteria: {
                select: {
                  id: true,
                  name: true,
                  maxScore: true,
                },
              },
              scores: {
                where: {
                  contestantId,
                  isCertified: true,
                },
                select: {
                  id: true,
                  contestantId: true,
                  judgeId: true,
                  categoryId: true,
                  criterionId: true,
                  score: true,
                  isCertified: true,
                  certifiedAt: true,
                  certifiedBy: true,
                  contestant: {
                    select: {
                      id: true,
                      name: true,
                      contestantNumber: true,
                    },
                  },
                  judge: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  criterion: {
                    select: {
                      id: true,
                      name: true,
                      maxScore: true,
                      categoryId: true,
                    },
                  },
                  scoreComments: {
                    select: {
                      comment: true,
                      createdAt: true,
                      updatedAt: true,
                      isPrivate: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      this.assertExists(contest, 'Contest', contestId);

      const typedContest = this.buildCertifiedContestContext(contest as unknown as ContestReportContext);
      const contestWithScores = {
        ...typedContest,
        categories: typedContest.categories.filter((category) => category.scores.length > 0),
      };

      if (contestWithScores.categories.length === 0) {
        throw new Error('No certified contestant report data found');
      }

      const judgeCommentsByKey = await this.loadJudgeCommentsForDrilldown([contestWithScores]);
      const contestant = contestWithScores.categories[0]?.scores[0]?.contestant;

      if (!contestant) {
        throw new Error('Contestant not found in certified contest data');
      }

      const generalCommentaryMap = new Map<string, ContestantReportGeneralCommentary>();
      const categoryReports = contestWithScores.categories
        .map<ContestantReportCategory>((category) => {
          const categoryTotalPossible = this.getCategoryTotalPossibleFromCriteria(category);
          const judgeCategoryMap = new Map<string, ContestantReportJudgeCategory>();
          const categoryGeneralMap = new Map<string, ContestantReportGeneralCommentary>();

          category.scores.forEach((score) => {
            const scopeContext = this.getJudgeCommentScopeKey(category, contestWithScores);
            const judgeComment =
              category.commentaryMode === CommentaryMode.PER_CRITERION
                ? null
                : judgeCommentsByKey.get(
                    this.getJudgeCommentLookupKey(
                      scopeContext.scope,
                      scopeContext.scopeKey,
                      score.contestantId,
                      score.judgeId,
                    ),
                  ) || null;

            if (judgeComment?.comment?.trim()) {
              const commentaryEntry: ContestantReportGeneralCommentary = {
                scope: scopeContext.scope,
                scopeLabel: this.getReadableCommentaryScopeLabel(scopeContext.scope, contestWithScores, category),
                judgeId: score.judge.id,
                judgeName: score.judge.name,
                categoryId: scopeContext.scope === CommentaryScope.CATEGORY ? category.id : null,
                categoryName: scopeContext.scope === CommentaryScope.CATEGORY ? category.name : null,
                comment: judgeComment.comment.trim(),
                createdAt: judgeComment.createdAt.toISOString(),
              };
              const generalKey = `${scopeContext.scope}:${scopeContext.scopeKey}:${score.judgeId}`;
              generalCommentaryMap.set(generalKey, commentaryEntry);
              categoryGeneralMap.set(generalKey, commentaryEntry);
            }

            const judgeCategoryEntry = judgeCategoryMap.get(score.judgeId) || {
              categoryId: category.id,
              categoryName: category.name,
              commentaryMode: category.commentaryMode,
              commentaryScope: category.commentaryScope,
              totalScore: 0,
              totalPossibleScore: categoryTotalPossible,
              commentary: judgeComment?.comment?.trim() || null,
              commentaryCreatedAt: judgeComment?.createdAt ? judgeComment.createdAt.toISOString() : null,
              criteria: [],
            };

            if (score.score !== null) {
              judgeCategoryEntry.totalScore += score.score;
            }

            const latestScoreComment =
              category.commentaryMode === CommentaryMode.PER_CATEGORY
                ? null
                : this.getLatestScoreComment(score.scoreComments);

            judgeCategoryEntry.criteria.push({
              scoreId: score.id,
              criterionId: score.criterionId,
              criterionName: score.criterion?.name || 'Criterion',
              score: score.score,
              maxScore: score.criterion?.maxScore || null,
              commentary: latestScoreComment?.comment || null,
              commentaryUpdatedAt: latestScoreComment?.updatedAt
                ? latestScoreComment.updatedAt.toISOString()
                : latestScoreComment?.createdAt
                  ? latestScoreComment.createdAt.toISOString()
                  : null,
            });

            judgeCategoryMap.set(score.judgeId, judgeCategoryEntry);
          });

          const judges = Array.from(judgeCategoryMap.entries())
            .map<ContestantReportJudge>(([judgeId, categoryEntry]) => ({
              judgeId,
              judgeName:
                category.scores.find((score) => score.judgeId === judgeId)?.judge.name || 'Judge',
              totalScore: categoryEntry.totalScore,
              totalPossibleScore: categoryEntry.totalPossibleScore,
              categories: [
                {
                  ...categoryEntry,
                  criteria: [...categoryEntry.criteria].sort((left, right) =>
                    left.criterionName.localeCompare(right.criterionName, undefined, {
                      sensitivity: 'base',
                      numeric: true,
                    }),
                  ),
                },
              ],
            }))
            .sort((left, right) =>
              left.judgeName.localeCompare(right.judgeName, undefined, {
                sensitivity: 'base',
                numeric: true,
              }),
            );

          const totalScore = judges.reduce((sum, judge) => sum + judge.totalScore, 0);

          return {
            categoryId: category.id,
            categoryName: category.name,
            commentaryMode: category.commentaryMode,
            commentaryScope: category.commentaryScope,
            totalScore,
            totalPossibleScore:
              categoryTotalPossible !== null ? categoryTotalPossible * judges.length : null,
            generalCommentary: Array.from(categoryGeneralMap.values()).sort((left, right) =>
              left.judgeName.localeCompare(right.judgeName, undefined, {
                sensitivity: 'base',
                numeric: true,
              }),
            ),
            judges,
          };
        })
        .sort((left, right) =>
          left.categoryName.localeCompare(right.categoryName, undefined, {
            sensitivity: 'base',
            numeric: true,
          }),
        );

      const totalScore = categoryReports.reduce((sum, category) => sum + category.totalScore, 0);
      const totalPossibleValues = categoryReports
        .map((category) => category.totalPossibleScore)
        .filter((value): value is number => typeof value === 'number' && value > 0);
      const judgeIds = new Set(categoryReports.flatMap((category) => category.judges.map((judge) => judge.judgeId)));
      const scoredCriterionCount = categoryReports.reduce(
        (sum, category) =>
          sum +
          category.judges.reduce((judgeSum, judge) => judgeSum + judge.categories[0]!.criteria.length, 0),
        0,
      );

      const contestantReport: ContestantReport = {
        certifiedOnly: true,
        event: {
          id: contestWithScores.event.id,
          name: contestWithScores.event.name,
        },
        contest: {
          id: contestWithScores.id,
          name: contestWithScores.name,
        },
        contestant: {
          id: contestant.id,
          name: contestant.name,
          contestantNumber: contestant.contestantNumber,
        },
        totalScore,
        totalPossibleScore:
          totalPossibleValues.length > 0
            ? totalPossibleValues.reduce((sum, value) => sum + value, 0)
            : null,
        categoryCount: categoryReports.length,
        judgeCount: judgeIds.size,
        scoredCriterionCount,
        generalCommentary: Array.from(generalCommentaryMap.values()).sort((left, right) => {
          if (left.scope !== right.scope) {
            return left.scope.localeCompare(right.scope);
          }
          return left.judgeName.localeCompare(right.judgeName, undefined, {
            sensitivity: 'base',
            numeric: true,
          });
        }),
        categories: categoryReports,
      };

      return {
        contestantReport,
        statistics: {
          totalScore,
          totalPossibleScore: contestantReport.totalPossibleScore ?? 'N/A',
          categoryCount: contestantReport.categoryCount,
          judgeCount: contestantReport.judgeCount,
          scoredCriterionCount: contestantReport.scoredCriterionCount,
          generalCommentaryCount: contestantReport.generalCommentary.length,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'contestant_results',
          scope: {
            eventId: contestWithScores.event.id,
            eventName: contestWithScores.event.name,
            contestIds: [contestWithScores.id],
            contestNames: [contestWithScores.name],
            contestantId: contestant.id,
            contestantName: contestant.name,
            filterMode: 'single_contestant',
          },
        },
      };
    } catch (error) {
      this.handleError(error, {
        method: 'generateContestantResultsData',
        contestId,
        contestantId,
      });
    }
  }

  /**
   * Generate comprehensive event report data
   */
  async generateEventReportData(
    eventId: string,
    userId?: string,
    options?: GenerateEventReportOptions,
  ): Promise<ReportData> {
    try {
      const normalizedContestIds = Array.from(
        new Set((options?.contestIds || []).map((contestId) => String(contestId || '').trim()).filter(Boolean)),
      );

      // P2-2 OPTIMIZATION: Selective field loading
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          contests: {
            ...(normalizedContestIds.length > 0
              ? {
                  where: {
                    id: {
                      in: normalizedContestIds,
                    },
                  },
                }
              : {}),
            select: {
              id: true,
              name: true,
              eventId: true,
              tenantId: true,
              event: {
                select: {
                  id: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
              categories: {
                select: {
                  id: true,
                  name: true,
                  scoreCap: true,
                  commentaryMode: true,
                  commentaryScope: true,
                  totalsCertified: true,
                  tenantId: true,
                  criteria: {
                    select: {
                      id: true,
                      name: true,
                      maxScore: true,
                    },
                  },
                  scores: {
                    select: {
                      id: true,
                      contestantId: true,
                      judgeId: true,
                      categoryId: true,
                      criterionId: true,
                      score: true,
                      isCertified: true,
                      certifiedAt: true,
                      certifiedBy: true,
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
                          name: true,
                          maxScore: true,
                          categoryId: true,
                        }
                      },
                      scoreComments: {
                        select: {
                          comment: true,
                          createdAt: true,
                          updatedAt: true,
                          isPrivate: true,
                        },
                      },
                    }
                  }
                }
              }
            }
          }
        }
      });

      this.assertExists(event, 'Event', eventId);

      const typedEvent = event as unknown as {
        id: string;
        name: string;
        startDate: Date;
        endDate: Date | null;
        contests: ContestReportContext[];
      };

      // Calculate winners for each contest
      const contestsWithWinners: ContestWithWinners[] = await Promise.all(
        typedEvent.contests.map(async (contest) => {
          const certifiedContest = this.buildCertifiedContestContext(contest);
          const winners = await this.calculateContestWinners(certifiedContest as unknown as ContestWithCategories, {
            certifiedOnly: true,
          });
          return {
            ...certifiedContest,
            winners
          };
        })
      );

      const drilldown = await this.buildReportDrilldown(typedEvent.contests);

      const totalCategories = contestsWithWinners.reduce(
        (sum, contest) => sum + (Array.isArray(contest.categories) ? contest.categories.length : 0),
        0
      );
      const totalScores = contestsWithWinners.reduce(
        (sum, contest) => sum + (Array.isArray(contest.categories)
          ? contest.categories.reduce((categorySum, category) => categorySum + (Array.isArray(category.scores) ? category.scores.length : 0), 0)
          : 0),
        0
      );
      const uniqueContestants = new Set<string>();
      contestsWithWinners.forEach((contest) => {
        if (!Array.isArray(contest.categories)) return;
        contest.categories.forEach((category) => {
          if (!Array.isArray(category.scores)) return;
          category.scores.forEach((score) => {
            if (score.contestantId) {
              uniqueContestants.add(score.contestantId);
            }
          });
        });
      });
      const winnersCount = contestsWithWinners.reduce(
        (sum, contest) => sum + (Array.isArray(contest.winners) ? contest.winners.length : 0),
        0
      );
      const scopedContestIds = contestsWithWinners.map((contest) => contest.id);
      const scopedContestNames = contestsWithWinners.map((contest) => contest.name);

      return {
        event: {
          ...typedEvent,
          contests: contestsWithWinners
        },
        statistics: {
          totalContests: contestsWithWinners.length,
          totalCategories,
          totalScores,
          uniqueContestants: uniqueContestants.size,
          totalWinners: winnersCount,
        },
        drilldown,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'event_comprehensive',
          scope: {
            eventId: event.id,
            eventName: event.name,
            contestIds: scopedContestIds,
            contestNames: scopedContestNames,
            filterMode: normalizedContestIds.length > 0 ? 'selected_contests' : 'all_contests_in_event',
          },
        }
      };
    } catch (error) {
      this.handleError(error, {
        method: 'generateEventReportData',
        eventId,
        contestIds: options?.contestIds,
      });
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
          tenantId: true,
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
              commentaryMode: true,
              commentaryScope: true,
              totalsCertified: true,
              tenantId: true,
              criteria: {
                select: {
                  id: true,
                  name: true,
                  maxScore: true,
                },
              },
              scores: {
                select: {
                  id: true,
                  contestantId: true,
                  judgeId: true,
                  categoryId: true,
                  criterionId: true,
                  score: true,
                  isCertified: true,
                  certifiedAt: true,
                  certifiedBy: true,
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
                      name: true,
                      maxScore: true,
                      categoryId: true,
                    }
                  },
                  scoreComments: {
                    select: {
                      comment: true,
                      createdAt: true,
                      updatedAt: true,
                      isPrivate: true,
                    },
                  },
                }
              }
            }
          }
        }
      });

      this.assertExists(contest, 'Contest', contestId);

      const typedContest = contest as unknown as ContestReportContext;
      const certifiedContest = this.buildCertifiedContestContext(typedContest);
      const winners = await this.calculateContestWinners(
        certifiedContest as unknown as ContestWithEventAndCategories,
        {
          certifiedOnly: true,
        },
      );
      const drilldown = await this.buildReportDrilldown([typedContest]);

      return {
        contest: {
          ...(certifiedContest as unknown as ContestWithEventAndCategories),
          winners
        },
        winners,
        drilldown,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userId,
          reportType: 'contest_results',
          scope: {
            eventId: contest.event.id,
            eventName: contest.event.name,
            contestIds: [contest.id],
            contestNames: [contest.name],
            filterMode: 'single_contest',
          },
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
   * SECURITY FIX: Now properly tenant-scoped - regular users only see their tenant's data
   * SUPER_ADMIN users see all data across all tenants
   */
  async generateSystemAnalyticsData(userId?: string, tenantId?: string, userRole?: string): Promise<ReportData> {
    try {
      // SECURITY: Determine if user should see all tenant data or just their own
      const isSuperAdmin = userRole === 'SUPER_ADMIN';

      // Build tenant filter - SUPER_ADMIN sees everything, others see only their tenant
      const tenantFilter = isSuperAdmin ? {} : { tenantId };

      const [
        totalEvents,
        totalContests,
        totalCategories,
        totalScores,
        totalUsers,
        activeEvents
      ] = await Promise.all([
        this.prisma.event.count({ where: tenantFilter }),
        this.prisma.contest.count({ where: tenantFilter }),
        this.prisma.category.count({ where: tenantFilter }),
        this.prisma.score.count({ where: tenantFilter }),
        this.prisma.user.count({ where: tenantFilter }),
        this.prisma.event.count({ where: { ...tenantFilter, archived: false } })
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
          reportType: 'system_analytics',
          scope: {
            filterMode: 'system',
          },
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
