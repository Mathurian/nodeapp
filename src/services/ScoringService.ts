/**
 * Scoring Service
 * Business logic for score management
 */

import { Score, PrismaClient, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, NotFoundError, ValidationError, ForbiddenError, ConflictError } from './BaseService';
import { ScoreRepository } from '../repositories/ScoreRepository';
import { CacheService } from './CacheService';

// P2-4: Proper type definitions for score responses
type ScoreWithRelations = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    categoryId: true;
    contestantId: true;
    judgeId: true;
    criterionId: true;
    score: true;
    comment: true;
    certifiedAt: true;
    certifiedBy: true;
    createdAt: true;
    updatedAt: true;
    tenantId: true;
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
    category: {
      select: {
        id: true;
        name: true;
        scoreCap: true;
      };
    };
  };
}>;

type CategoryWithContest = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    contestId: true;
    contest: {
      select: {
        id: true;
        eventId: true;
        event: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

type UserWithJudge = Prisma.UserGetPayload<{
  select: {
    id: true;
    role: true;
    judge: {
      select: {
        id: true;
      };
    };
  };
}>;

export interface SubmitScoreDTO {
  categoryId: string;
  contestantId: string;
  criteriaId?: string;
  score: number;
  comments?: string;
  judgeId?: string; // Optional, will be extracted from auth context if not provided
}

export interface UpdateScoreDTO {
  score?: number;
  comments?: string;
}

export interface CertifyScoresResult {
  certified: number;
}

export interface ContestStatsResult {
  totalScores: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

@injectable()
export class ScoringService extends BaseService {
  constructor(
    @inject(ScoreRepository) private scoreRepository: ScoreRepository,
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  /**
   * P2-3: Invalidate score caches
   */
  private async invalidateScoreCaches(categoryId?: string, judgeId?: string, contestantId?: string, contestId?: string): Promise<void> {
    // Invalidate all score list caches
    await this.cacheService.invalidatePattern('scores:*');

    // Invalidate specific caches if IDs provided
    if (categoryId) {
      await this.cacheService.del(`scores:category:${categoryId}`);
    }
    if (judgeId) {
      await this.cacheService.del(`scores:judge:${judgeId}`);
    }
    if (contestantId) {
      await this.cacheService.del(`scores:contestant:${contestantId}`);
    }
    if (contestId) {
      await this.cacheService.del(`scores:contest:${contestId}`);
    }
  }

  /**
   * Get scores by category
   */
  async getScoresByCategory(categoryId: string, tenantId: string, contestantId?: string): Promise<Score[]> {
    try {
      if (contestantId) {
        // P2-2 OPTIMIZATION: Selective field loading instead of full includes
        return (await this.prisma.score.findMany({
          where: { categoryId, contestantId, tenantId },
          select: {
            id: true,
            categoryId: true,
            contestantId: true,
            judgeId: true,
            criterionId: true,
            score: true,
            comment: true,
            createdAt: true,
            updatedAt: true,
            tenantId: true,
            // Only select essential fields from relations
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
            category: {
              select: {
                id: true,
                name: true,
                scoreCap: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })) as unknown as Score[];
      }

      return await this.scoreRepository.findByCategory(categoryId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getScoresByCategory', categoryId, contestantId });
    }
  }

  /**
   * Submit a score
   */
  async submitScore(data: SubmitScoreDTO, userId: string, tenantId: string): Promise<ScoreWithRelations> {
    try {
      const { categoryId, contestantId, criteriaId, score, comments } = data;

      this.logInfo('Score submission requested', {
        categoryId,
        contestantId,
        criteriaId,
        score,
        hasComments: !!comments,
        userId
      });

      // Verify category exists and get context
      // P2-2 OPTIMIZATION: Selective field loading
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        select: {
          id: true,
          name: true,
          contestId: true,
          contest: {
            select: {
              id: true,
              eventId: true,
              event: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }) as CategoryWithContest | null;

      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      // Get the Judge record from the User
      // P2-2 OPTIMIZATION: Selective field loading
      const userWithJudge = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          judge: {
            select: {
              id: true
            }
          }
        }
      }) as UserWithJudge | null;

      if (!userWithJudge?.judge) {
        throw new ValidationError('User is not linked to a Judge record');
      }

      const judgeId = userWithJudge.judge.id;
      this.logDebug('Judge ID retrieved', { judgeId });

      // Validate judge assignment to this category
      const assignment = await this.prisma.assignment.findFirst({
        where: {
          tenantId,
          judgeId: userWithJudge.judge.id,
          OR: [
            { categoryId },
            { contestId: category.contestId, categoryId: null }
          ],
          status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] }
        }
      });

      if (!assignment && userWithJudge.role !== 'ADMIN') {
        throw new ForbiddenError('Not assigned to this category');
      }

      // Check if there's an existing score for this judge/contestant/category
      const existingScore = await this.prisma.score.findFirst({
        where: {
          tenantId,
          categoryId,
          contestantId,
          judgeId,
          criterionId: criteriaId || null
        }
      });

      if (existingScore) {
        throw new ConflictError('Score already exists for this combination');
      }

      // Create the score
      // P2-2 OPTIMIZATION: Selective field loading
      const newScore = await this.prisma.score.create({
        data: {
          categoryId,
          contestantId,
          criterionId: criteriaId || null,
          judgeId,
          score: score,
          tenantId,
          certifiedAt: null,
          certifiedBy: null
        },
        select: {
          id: true,
          categoryId: true,
          contestantId: true,
          judgeId: true,
          criterionId: true,
          score: true,
          comment: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
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
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        }
      }) as ScoreWithRelations;

      this.logInfo('Score submitted successfully', {
        scoreId: newScore.id,
        categoryId,
        contestantId,
        judgeId,
        score
      });

      // P2-3: Invalidate score caches
      await this.invalidateScoreCaches(categoryId, judgeId, contestantId);

      return newScore;
    } catch (error) {
      this.handleError(error, { method: 'submitScore', data });
    }
  }

  /**
   * Update an existing score
   */
  async updateScore(scoreId: string, data: UpdateScoreDTO, _tenantId: string): Promise<ScoreWithRelations> {
    try {
      const existingScore = await this.scoreRepository.findById(scoreId);
      this.assertExists(existingScore, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const updatedScore = await this.prisma.score.update({
        where: { id: scoreId },
        data: {
          score: data.score !== undefined ? data.score : existingScore!.score,
        },
        select: {
          id: true,
          categoryId: true,
          contestantId: true,
          judgeId: true,
          criterionId: true,
          score: true,
          comment: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
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
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        }
      }) as ScoreWithRelations;

      this.logInfo('Score updated successfully', { scoreId });

      // P2-3: Invalidate score caches
      await this.invalidateScoreCaches(
        existingScore!.categoryId,
        existingScore!.judgeId,
        existingScore!.contestantId
      );

      return updatedScore;
    } catch (error) {
      this.handleError(error, { method: 'updateScore', scoreId, data });
    }
  }

  /**
   * Delete a score
   */
  async deleteScore(scoreId: string, _tenantId: string): Promise<void> {
    try {
      const score = await this.scoreRepository.findById(scoreId);
      this.assertExists(score, 'Score', scoreId);

      await this.scoreRepository.delete(scoreId);

      this.logInfo('Score deleted successfully', { scoreId });

      // P2-3: Invalidate score caches
      await this.invalidateScoreCaches(
        score!.categoryId,
        score!.judgeId,
        score!.contestantId
      );
    } catch (error) {
      this.handleError(error, { method: 'deleteScore', scoreId });
    }
  }

  /**
   * Certify a single score
   */
  async certifyScore(scoreId: string, certifiedBy: string, _tenantId: string): Promise<ScoreWithRelations> {
    try {
      const score = await this.scoreRepository.findById(scoreId);
      this.assertExists(score, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const certifiedScore = await this.prisma.score.update({
        where: { id: scoreId },
        data: {
          certifiedAt: new Date(),
          certifiedBy: certifiedBy
        },
        select: {
          id: true,
          categoryId: true,
          contestantId: true,
          judgeId: true,
          criterionId: true,
          score: true,
          comment: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
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
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        }
      }) as ScoreWithRelations;

      this.logInfo('Score certified successfully', { scoreId, certifiedBy });

      // P2-3: Invalidate score caches
      await this.invalidateScoreCaches(
        score!.categoryId,
        score!.judgeId,
        score!.contestantId
      );

      return certifiedScore;
    } catch (error) {
      this.handleError(error, { method: 'certifyScore', scoreId });
    }
  }

  /**
   * Certify all scores for a category
   */
  async certifyScores(categoryId: string, certifiedBy: string, tenantId: string): Promise<CertifyScoresResult> {
    try {
      const result = await this.prisma.score.updateMany({
        where: {
          categoryId,
          tenantId,
          certifiedAt: null // Only certify uncertified scores
        },
        data: {
          certifiedAt: new Date(),
          certifiedBy: certifiedBy
        }
      });

      this.logInfo('Scores certified for category', {
        categoryId,
        certified: result.count,
        certifiedBy
      });

      // P2-3: Invalidate score caches for the category
      await this.invalidateScoreCaches(categoryId);

      return { certified: result.count };
    } catch (error) {
      this.handleError(error, { method: 'certifyScores', categoryId });
    }
  }

  /**
   * Unsign a score (remove certification)
   */
  async unsignScore(scoreId: string, _tenantId: string): Promise<ScoreWithRelations> {
    try {
      const score = await this.scoreRepository.findById(scoreId);
      this.assertExists(score, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const unsignedScore = await this.prisma.score.update({
        where: { id: scoreId },
        data: {
          certifiedAt: null,
          certifiedBy: null
        },
        select: {
          id: true,
          categoryId: true,
          contestantId: true,
          judgeId: true,
          criterionId: true,
          score: true,
          comment: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
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
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        }
      }) as ScoreWithRelations;

      this.logInfo('Score unsigned successfully', { scoreId });

      // P2-3: Invalidate score caches
      await this.invalidateScoreCaches(
        score!.categoryId,
        score!.judgeId,
        score!.contestantId
      );

      return unsignedScore;
    } catch (error) {
      this.handleError(error, { method: 'unsignScore', scoreId });
    }
  }

  /**
   * Get scores by judge
   */
  async getScoresByJudge(judgeId: string, tenantId: string): Promise<Score[]> {
    try {
      return await this.scoreRepository.findByJudge(judgeId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getScoresByJudge', judgeId });
    }
  }

  /**
   * Get scores by contestant
   */
  async getScoresByContestant(contestantId: string, tenantId: string): Promise<Score[]> {
    try {
      return await this.scoreRepository.findByContestant(contestantId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getScoresByContestant', contestantId });
    }
  }

  /**
   * Get scores by contest
   */
  async getScoresByContest(contestId: string, tenantId: string): Promise<Score[]> {
    try {
      return await this.scoreRepository.findByContest(contestId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getScoresByContest', contestId });
    }
  }

  /**
   * Calculate average score for contestant in category
   */
  async calculateAverageScore(contestantId: string, categoryId: string, tenantId: string): Promise<number> {
    try {
      return await this.scoreRepository.getAverageScoreForContestantInCategory(
        contestantId,
        categoryId,
        tenantId
      );
    } catch (error) {
      this.handleError(error, { method: 'calculateAverageScore', contestantId, categoryId });
    }
  }

  /**
   * Get contest score statistics
   */
  async getContestStats(contestId: string, tenantId: string): Promise<ContestStatsResult> {
    try {
      return await this.scoreRepository.getContestScoreStats(contestId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getContestStats', contestId });
    }
  }
}
