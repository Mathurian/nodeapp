import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';
import { withMutationTimeoutTx } from '../utils/dbMutationTimeout';
import { QUERY_TIMEOUTS } from '../config/queryTimeouts';
import {
  buildCommentaryReadWhere,
  buildJudgeCommentReadWhere,
  CommentaryViewerContext,
  isPrivilegedCommentaryRole,
} from '../utils/commentaryAccess';

// P2-4: Proper type definitions for commentary responses
type ScoreCommentWithJudge = Prisma.ScoreCommentGetPayload<{
  include: {
    judge: {
      select: {
        name: true;
        email: true;
      };
    };
  };
}>;

type ScoreCommentWithDetails = Prisma.ScoreCommentGetPayload<{
  include: {
    judge: {
      select: {
        name: true;
        email: true;
      };
    };
    criterion: {
      select: {
        name: true;
      };
    };
  };
}>;

type ScoreCommentWithFullDetails = Prisma.ScoreCommentGetPayload<{
  include: {
    judge: {
      select: {
        name: true;
        email: true;
      };
    };
    criterion: {
      select: {
        name: true;
        maxScore: true;
      };
    };
    score: {
      include: {
        category: {
          include: {
            contest: {
              include: {
                event: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type JudgeCommentWithJudge = Prisma.JudgeCommentGetPayload<{
  include: {
    judge: {
      select: {
        name: true;
        email: true;
      };
    };
  };
}>;

interface CreateCommentDto {
  scoreId: string;
  criterionId: string;
  contestantId: string;
  judgeId: string;
  comment: string;
  isPrivate?: boolean;
}

interface UpdateCommentDto {
  comment?: string;
  isPrivate?: boolean;
}

interface UpsertJudgeCommentDto {
  tenantId: string;
  categoryId: string;
  contestantId: string;
  judgeId: string;
  comment: string;
}

@injectable()
export class CommentaryService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private resolveJudgeCommentJudgeId(
    viewer: CommentaryViewerContext,
    requestedJudgeId?: string,
  ): string {
    if (viewer.role === 'JUDGE' && viewer.judgeId) {
      return viewer.judgeId;
    }

    if (isPrivilegedCommentaryRole(viewer.role) && requestedJudgeId) {
      return requestedJudgeId;
    }

    throw this.forbiddenError('Judge context is required to access category commentary');
  }

  async create(
    data: CreateCommentDto,
    timeoutMs: number = QUERY_TIMEOUTS.standard,
  ): Promise<ScoreCommentWithJudge> {
    if (!data.scoreId || !data.criterionId || !data.contestantId || !data.comment) {
      throw this.badRequestError('Score ID, criterion ID, contestant ID, and comment are required');
    }

    // Fetch score to get tenantId
    const score = await this.prisma.score.findUnique({
      where: { id: data.scoreId },
      select: { tenantId: true },
    });

    if (!score) {
      throw this.notFoundError('Score', data.scoreId);
    }

    try {
      return await withMutationTimeoutTx(
        async (tx) =>
          await tx.scoreComment.create({
            data: {
              tenantId: score.tenantId,
              scoreId: data.scoreId,
              criterionId: data.criterionId,
              contestantId: data.contestantId,
              judgeId: data.judgeId,
              comment: data.comment,
              isPrivate: data.isPrivate || false
            },
            include: {
              judge: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }),
        timeoutMs,
        this.prisma,
      );
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'P2002') {
        throw this.conflictError('Commentary already exists for this score, criterion, contestant, and judge');
      }
      if (code === 'P2003') {
        throw this.badRequestError('Commentary references an invalid score, criterion, contestant, or judge');
      }
      this.handleError(error, {
        method: 'create',
        scoreId: data.scoreId,
        criterionId: data.criterionId,
        contestantId: data.contestantId,
        judgeId: data.judgeId,
      });
    }
  }

  async getCommentsForScore(
    scoreId: string,
    viewer: CommentaryViewerContext,
  ): Promise<ScoreCommentWithDetails[]> {
    const whereClause: Prisma.ScoreCommentWhereInput = {
      scoreId,
      ...buildCommentaryReadWhere(viewer),
    };

    return await this.prisma.scoreComment.findMany({
      where: whereClause,
      include: {
        judge: {
          select: {
            name: true,
            email: true
          }
        },
        criterion: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getCommentsByContestant(
    contestantId: string,
    viewer: CommentaryViewerContext,
  ): Promise<ScoreCommentWithFullDetails[]> {
    const whereClause: Prisma.ScoreCommentWhereInput = {
      contestantId,
      ...buildCommentaryReadWhere(viewer),
    };

    return await this.prisma.scoreComment.findMany({
      where: whereClause,
      include: {
        judge: {
          select: {
            name: true,
            email: true
          }
        },
        criterion: {
          select: {
            name: true,
            maxScore: true
          }
        },
        score: {
          include: {
            category: {
              include: {
                contest: {
                  include: {
                    event: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { scoreId: 'desc' },
        { createdAt: 'asc' }
      ]
    }) as ScoreCommentWithFullDetails[];
  }

  async getCategoryComment(
    categoryId: string,
    contestantId: string,
    viewer: CommentaryViewerContext,
    requestedJudgeId?: string,
  ): Promise<JudgeCommentWithJudge | null> {
    const judgeId = this.resolveJudgeCommentJudgeId(viewer, requestedJudgeId);

    const whereClause: Prisma.JudgeCommentWhereInput = {
      categoryId,
      contestantId,
      judgeId,
      ...buildJudgeCommentReadWhere(viewer),
    };

    return await this.prisma.judgeComment.findFirst({
      where: whereClause,
      include: {
        judge: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async upsertCategoryComment(
    data: UpsertJudgeCommentDto,
    timeoutMs: number = QUERY_TIMEOUTS.standard,
  ): Promise<JudgeCommentWithJudge | null> {
    const [category, contestant, judge] = await Promise.all([
      this.prisma.category.findFirst({
        where: { id: data.categoryId, tenantId: data.tenantId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.contestant.findFirst({
        where: { id: data.contestantId, tenantId: data.tenantId },
        select: { id: true },
      }),
      this.prisma.judge.findFirst({
        where: { id: data.judgeId, tenantId: data.tenantId },
        select: { id: true },
      }),
    ]);

    if (!category) {
      throw this.notFoundError('Category', data.categoryId);
    }
    if (!contestant) {
      throw this.notFoundError('Contestant', data.contestantId);
    }
    if (!judge) {
      throw this.notFoundError('Judge', data.judgeId);
    }

    const normalizedComment = data.comment.trim();
    const uniqueWhere = {
      tenantId_categoryId_contestantId_judgeId: {
        tenantId: data.tenantId,
        categoryId: data.categoryId,
        contestantId: data.contestantId,
        judgeId: data.judgeId,
      },
    };

    return await withMutationTimeoutTx(
      async (tx) => {
        if (!normalizedComment) {
          await tx.judgeComment.deleteMany({
            where: uniqueWhere.tenantId_categoryId_contestantId_judgeId,
          });
          return null;
        }

        return await tx.judgeComment.upsert({
          where: uniqueWhere,
          create: {
            tenantId: data.tenantId,
            categoryId: data.categoryId,
            contestantId: data.contestantId,
            judgeId: data.judgeId,
            comment: normalizedComment,
          },
          update: {
            comment: normalizedComment,
          },
          include: {
            judge: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        });
      },
      timeoutMs,
      this.prisma,
    );
  }

  async update(
    id: string,
    data: UpdateCommentDto,
    userId: string,
    userRole: string,
    timeoutMs: number = QUERY_TIMEOUTS.standard,
  ): Promise<ScoreCommentWithJudge> {
    const existingComment = await this.prisma.scoreComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      throw this.notFoundError('Comment', id);
    }

    if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw this.forbiddenError('Insufficient permissions to update this comment');
    }

    return await withMutationTimeoutTx(
      async (tx) =>
        await tx.scoreComment.update({
          where: { id },
          data: {
            ...(data.comment !== undefined && { comment: data.comment }),
            ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate })
          },
          include: {
            judge: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }),
      timeoutMs,
      this.prisma,
    );
  }

  async delete(
    id: string,
    userId: string,
    userRole: string,
    timeoutMs: number = QUERY_TIMEOUTS.standard,
  ): Promise<void> {
    const existingComment = await this.prisma.scoreComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      throw this.notFoundError('Comment', id);
    }

    if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw this.forbiddenError('Insufficient permissions to delete this comment');
    }

    await withMutationTimeoutTx(
      async (tx) => {
        await tx.scoreComment.delete({
          where: { id }
        });
      },
      timeoutMs,
      this.prisma,
    );
  }
}
