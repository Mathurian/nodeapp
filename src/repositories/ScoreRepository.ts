/**
 * Score Repository
 * Data access layer for Score entity
 */

import { Score } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';

// Type for Score with common relations
export type ScoreWithRelations = Score & {
  categoryId?: string;
  category?: { name: string; [key: string]: unknown };
  [key: string]: unknown;
};

@injectable()
export class ScoreRepository extends BaseRepository<Score> {
  protected getModelName(): string {
    return 'score';
  }

  /**
   * Find scores by event
   */
  async findByEvent(eventId: string, tenantId: string): Promise<ScoreWithRelations[]> {
    return this.prisma.score.findMany({
      where: {
        tenantId,
        category: {
          contest: {
            eventId,
            tenantId
          }
        }
      },
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        contestant: {
          select: {
            id: true,
            name: true,
            email: true,
            contestantNumber: true
          }
        },
        category: {
          include: {
            contest: true
          }
        }
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by contest
   */
  async findByContest(contestId: string, tenantId: string): Promise<ScoreWithRelations[]> {
    return this.prisma.score.findMany({
      where: {
        tenantId,
        category: {
          contestId,
          tenantId
        }
      },
      include: {
        judge: true,
        contestant: true,
        category: {
          include: {
            contest: true
          }
        }
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by category
   */
  async findByCategory(categoryId: string, tenantId: string): Promise<ScoreWithRelations[]> {
    return this.prisma.score.findMany({
      where: { categoryId, tenantId },
      include: {
        judge: true,
        contestant: true,
        category: {
          include: {
            contest: true
          }
        }
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by judge
   */
  async findByJudge(judgeId: string, tenantId: string): Promise<ScoreWithRelations[]> {
    return this.prisma.score.findMany({
      where: { judgeId, tenantId },
      include: {
        judge: true,
        contestant: true,
        category: {
          include: {
            contest: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by contestant
   */
  async findByContestant(contestantId: string, tenantId: string): Promise<ScoreWithRelations[]> {
    return this.prisma.score.findMany({
      where: { contestantId, tenantId },
      include: {
        judge: true,
        contestant: true,
        category: {
          include: {
            contest: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find score by judge, contestant, and category (should be unique)
   */
  async findByJudgeContestantCategory(
    judgeId: string,
    contestantId: string,
    categoryId: string,
    tenantId: string
  ): Promise<Score | null> {
    return this.findFirst({
      judgeId,
      contestantId,
      categoryId,
      tenantId
    });
  }

  /**
   * Get average score for contestant in category
   */
  async getAverageScoreForContestantInCategory(
    contestantId: string,
    categoryId: string,
    tenantId: string
  ): Promise<number> {
    const result = await this.prisma.score.aggregate({
      where: {
        contestantId,
        categoryId,
        tenantId
      },
      _avg: {
        score: true
      }
    });

    return result._avg?.score || 0;
  }

  /**
   * Get total score for contestant in contest
   */
  async getTotalScoreForContestantInContest(
    contestantId: string,
    contestId: string,
    tenantId: string
  ): Promise<number> {
    const result = await this.prisma.score.aggregate({
      where: {
        contestantId,
        tenantId,
        category: {
          contestId,
          tenantId
        }
      },
      _sum: {
        score: true
      }
    });

    return result._sum?.score || 0;
  }

  /**
   * Get contestant scores grouped by category
   */
  async getContestantScoresByCategory(
    contestantId: string,
    contestId: string,
    tenantId: string
  ): Promise<Array<{ categoryId: string; categoryName: string; averageScore: number; judgeCount: number }>> {
    const scores = await this.prisma.score.findMany({
      where: {
        contestantId,
        tenantId,
        category: {
          contestId,
          tenantId
        }
      },
      include: {
        category: true
      }
    });

    const categoryScores = new Map<string, { name: string; scores: number[] }>();

    scores.forEach((score) => {
      if (!categoryScores.has(score.categoryId)) {
        categoryScores.set(score.categoryId, {
          name: score.category.name,
          scores: []
        });
      }
      const scoreValue = 'score' in score && typeof score.score === 'number' ? score.score : 0;
      categoryScores.get(score.categoryId)!.scores.push(scoreValue);
    });

    return Array.from(categoryScores.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      averageScore: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
      judgeCount: data.scores.length
    }));
  }

  /**
   * Get judge completion status for contest
   */
  async getJudgeCompletionStatus(
    contestId: string,
    tenantId: string
  ): Promise<Array<{ judgeId: string; judgeName: string; totalScores: number; expectedScores: number }>> {
    // Get all judges and contestants for the contest
    const contest = await this.prisma.contest.findFirst({
      where: { id: contestId, tenantId },
      include: {
        contestJudges: {
          include: {
            judge: true
          }
        },
        contestContestants: {
          include: {
            contestant: true
          }
        },
        categories: true
      }
    });

    if (!contest) {
      return [];
    }

    const contestData = contest as { contestContestants?: unknown[]; categories?: unknown[]; contestJudges?: Array<{ judgeId: string; judge: { name: string } }> };
    const expectedScoresPerJudge = (contestData.contestContestants?.length || 0) * (contestData.categories?.length || 0);

    const judgeStatus = await Promise.all(
      (contestData.contestJudges || []).map(async (contestJudge) => {
        const scoreCount = await this.count({
          judgeId: contestJudge.judgeId,
          contestId,
          tenantId
        });

        return {
          judgeId: contestJudge.judgeId,
          judgeName: contestJudge.judge.name,
          totalScores: scoreCount,
          expectedScores: expectedScoresPerJudge
        };
      })
    );

    return judgeStatus;
  }

  /**
   * Bulk create scores (for batch operations)
   */
  async bulkCreateScores(scores: Array<{
    judgeId: string;
    contestantId: string;
    categoryId: string;
    contestId: string;
    tenantId: string;
    score: number;
  }>): Promise<number> {
    return this.createMany(scores);
  }

  /**
   * Delete scores by contest (for cleanup)
   */
  async deleteByContest(contestId: string, tenantId: string): Promise<number> {
    return this.deleteMany({ contestId, tenantId });
  }

  /**
   * Get score statistics for contest
   */
  async getContestScoreStats(contestId: string, tenantId: string): Promise<{
    totalScores: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }> {
    const result = await this.prisma.score.aggregate({
      where: {
        tenantId,
        category: {
          contestId,
          tenantId
        }
      },
      _count: true,
      _avg: { score: true },
      _max: { score: true },
      _min: { score: true }
    });

    return {
      totalScores: result._count,
      averageScore: result._avg?.score ?? 0,
      highestScore: result._max?.score ?? 0,
      lowestScore: result._min?.score ?? 0
    };
  }
}
