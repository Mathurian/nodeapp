/**
 * Score Repository
 * Data access layer for Score entity
 */

import { Score, Prisma } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';

export type ScoreWithRelations = Prisma.ScoreGetPayload<{
  include: {
    judge: true;
    contestant: true;
    category: true;
    contest: true;
  };
}>;

@injectable()
export class ScoreRepository extends BaseRepository<Score> {
  protected getModelName(): string {
    return 'score';
  }

  /**
   * Find scores by event
   */
  async findByEvent(eventId: string): Promise<ScoreWithRelations[]> {
    return this.getModel().findMany({
      where: {
        contest: {
          eventId
        }
      },
      include: {
        judge: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        contestant: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        category: true,
        contest: true
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by contest
   */
  async findByContest(contestId: string): Promise<ScoreWithRelations[]> {
    return this.getModel().findMany({
      where: { contestId },
      include: {
        judge: true,
        contestant: true,
        category: true,
        contest: true
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by category
   */
  async findByCategory(categoryId: string): Promise<ScoreWithRelations[]> {
    return this.getModel().findMany({
      where: { categoryId },
      include: {
        judge: true,
        contestant: true,
        category: true,
        contest: true
      }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by judge
   */
  async findByJudge(judgeId: string): Promise<ScoreWithRelations[]> {
    return this.getModel().findMany({
      where: { judgeId },
      include: {
        judge: true,
        contestant: true,
        category: true,
        contest: true
      },
      orderBy: { createdAt: 'desc' }
    }) as Promise<ScoreWithRelations[]>;
  }

  /**
   * Find scores by contestant
   */
  async findByContestant(contestantId: string): Promise<ScoreWithRelations[]> {
    return this.getModel().findMany({
      where: { contestantId },
      include: {
        judge: true,
        contestant: true,
        category: true,
        contest: true
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
    categoryId: string
  ): Promise<Score | null> {
    return this.findFirst({
      judgeId,
      contestantId,
      categoryId
    });
  }

  /**
   * Get average score for contestant in category
   */
  async getAverageScoreForContestantInCategory(
    contestantId: string,
    categoryId: string
  ): Promise<number> {
    const result = await this.getModel().aggregate({
      where: {
        contestantId,
        categoryId
      },
      _avg: {
        value: true
      }
    });

    return result._avg.value || 0;
  }

  /**
   * Get total score for contestant in contest
   */
  async getTotalScoreForContestantInContest(
    contestantId: string,
    contestId: string
  ): Promise<number> {
    const result = await this.getModel().aggregate({
      where: {
        contestantId,
        contestId
      },
      _sum: {
        value: true
      }
    });

    return result._sum.value || 0;
  }

  /**
   * Get contestant scores grouped by category
   */
  async getContestantScoresByCategory(
    contestantId: string,
    contestId: string
  ): Promise<Array<{ categoryId: string; categoryName: string; averageScore: number; judgeCount: number }>> {
    const scores = await this.getModel().findMany({
      where: {
        contestantId,
        contestId
      },
      include: {
        category: true
      }
    });

    const categoryScores = new Map<string, { name: string; scores: number[] }>();

    scores.forEach((score: any) => {
      if (!categoryScores.has(score.categoryId)) {
        categoryScores.set(score.categoryId, {
          name: score.category.name,
          scores: []
        });
      }
      categoryScores.get(score.categoryId)!.scores.push(score.value);
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
    contestId: string
  ): Promise<Array<{ judgeId: string; judgeName: string; totalScores: number; expectedScores: number }>> {
    // Get all judges and contestants for the contest
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        judges: {
          include: {
            judge: true
          }
        },
        contestants: {
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

    const expectedScoresPerJudge = contest.contestants.length * contest.categories.length;

    const judgeStatus = await Promise.all(
      contest.judges.map(async (contestJudge: any) => {
        const scoreCount = await this.count({
          judgeId: contestJudge.judgeId,
          contestId
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
    value: number;
  }>): Promise<number> {
    return this.createMany(scores);
  }

  /**
   * Delete scores by contest (for cleanup)
   */
  async deleteByContest(contestId: string): Promise<number> {
    return this.deleteMany({ contestId });
  }

  /**
   * Get score statistics for contest
   */
  async getContestScoreStats(contestId: string): Promise<{
    totalScores: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  }> {
    const result = await this.getModel().aggregate({
      where: { contestId },
      _count: true,
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true }
    });

    return {
      totalScores: result._count,
      averageScore: result._avg.value || 0,
      highestScore: result._max.value || 0,
      lowestScore: result._min.value || 0
    };
  }
}
