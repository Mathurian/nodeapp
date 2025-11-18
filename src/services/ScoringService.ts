/**
 * Scoring Service
 * Business logic for score management
 */

import { Score, PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, NotFoundError, ValidationError, ForbiddenError, ConflictError } from './BaseService';
import { ScoreRepository } from '../repositories/ScoreRepository';
import { CacheService } from './CacheService';

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
            comments: true,
            createdAt: true,
            updatedAt: true,
            tenantId: true,
            // Only select essential fields from relations
            contestant: {
              select: {
                id: true,
                contestantNumber: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    preferredName: true
                  }
                }
              }
            },
            judge: {
              select: {
                id: true,
                judgeNumber: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    preferredName: true
                  }
                }
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
        } as any)) as any;
      }

      return await this.scoreRepository.findByCategory(categoryId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getScoresByCategory', categoryId, contestantId });
    }
  }

  /**
   * Submit a score
   */
  async submitScore(data: SubmitScoreDTO, userId: string, tenantId: string): Promise<Score> {
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
      const category: any = (await this.prisma.category.findUnique({
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
        } as any
      } as any)) as any;

      if (!category) {
        throw new NotFoundError('Category', categoryId);
      }

      // Get the Judge record from the User
      // P2-2 OPTIMIZATION: Selective field loading
      const userWithJudge: any = (await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          judge: {
            select: {
              id: true
            }
          }
        } as any
      } as any)) as any;

      if (!userWithJudge?.judge) {
        throw new ValidationError('User is not linked to a Judge record');
      }

      const judgeId = userWithJudge.judge.id;
      this.logDebug('Judge ID retrieved', { judgeId });

      // Validate judge assignment to this category
      const assignment: any = await this.prisma.assignment.findFirst({
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
      const existingScore: any = await this.prisma.score.findFirst({
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
      const newScore: any = await this.prisma.score.create({
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
          comments: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          contestant: {
            select: {
              id: true,
              contestantNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          judge: {
            select: {
              id: true,
              judgeNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        } as any
      } as any);

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
  async updateScore(scoreId: string, data: UpdateScoreDTO, tenantId: string): Promise<Score> {
    try {
      const existingScore = await this.scoreRepository.findById(scoreId);
      this.assertExists(existingScore, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const updatedScore: any = await this.prisma.score.update({
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
          comments: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          contestant: {
            select: {
              id: true,
              contestantNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          judge: {
            select: {
              id: true,
              judgeNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        } as any
      } as any);

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
  async deleteScore(scoreId: string, tenantId: string): Promise<void> {
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
  async certifyScore(scoreId: string, certifiedBy: string, tenantId: string): Promise<Score> {
    try {
      const score = await this.scoreRepository.findById(scoreId);
      this.assertExists(score, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const certifiedScore: any = await this.prisma.score.update({
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
          comments: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          contestant: {
            select: {
              id: true,
              contestantNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          judge: {
            select: {
              id: true,
              judgeNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        } as any
      } as any);

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
  async certifyScores(categoryId: string, certifiedBy: string, tenantId: string): Promise<{ certified: number }> {
    try {
      const result: any = await this.prisma.score.updateMany({
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
  async unsignScore(scoreId: string, tenantId: string): Promise<Score> {
    try {
      const score = await this.scoreRepository.findById(scoreId);
      this.assertExists(score, 'Score', scoreId);

      // P2-2 OPTIMIZATION: Selective field loading
      const unsignedScore: any = await this.prisma.score.update({
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
          comments: true,
          certifiedAt: true,
          certifiedBy: true,
          createdAt: true,
          updatedAt: true,
          tenantId: true,
          contestant: {
            select: {
              id: true,
              contestantNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          judge: {
            select: {
              id: true,
              judgeNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        } as any
      } as any);

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
  async getContestStats(contestId: string, tenantId: string): Promise<any> {
    try {
      return await this.scoreRepository.getContestScoreStats(contestId, tenantId);
    } catch (error) {
      this.handleError(error, { method: 'getContestStats', contestId });
    }
  }
}
