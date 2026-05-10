import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { CommentaryScope, PrismaClient, Prisma } from '@prisma/client';
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

interface ResolvedJudgeCommentScope {
  scope: CommentaryScope;
  scopeKey: string;
  categoryId: string | null;
  contestId: string | null;
  eventId: string | null;
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

  private async resolveJudgeCommentScope(
    categoryId: string,
    tenantId: string,
  ): Promise<ResolvedJudgeCommentScope> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
        deletedAt: null,
        contest: {
          deletedAt: null,
          event: {
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        contestId: true,
        commentaryScope: true,
        contest: {
          select: {
            eventId: true,
          },
        },
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    switch (category.commentaryScope) {
      case 'EVENT':
        return {
          scope: 'EVENT',
          scopeKey: `event:${category.contest.eventId}`,
          categoryId: null,
          contestId: category.contestId,
          eventId: category.contest.eventId,
        };
      case 'CONTEST':
        return {
          scope: 'CONTEST',
          scopeKey: `contest:${category.contestId}`,
          categoryId: null,
          contestId: category.contestId,
          eventId: category.contest.eventId,
        };
      case 'CATEGORY':
      default:
        return {
          scope: 'CATEGORY',
          scopeKey: `category:${category.id}`,
          categoryId: category.id,
          contestId: category.contestId,
          eventId: category.contest.eventId,
        };
    }
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
    const scopeContext = await this.resolveJudgeCommentScope(categoryId, viewer.tenantId);

    const whereClause: Prisma.JudgeCommentWhereInput = {
      tenantId: viewer.tenantId,
      scope: scopeContext.scope,
      scopeKey: scopeContext.scopeKey,
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
    const [scopeContext, contestant, judge] = await Promise.all([
      this.resolveJudgeCommentScope(data.categoryId, data.tenantId),
      this.prisma.contestant.findFirst({
        where: { id: data.contestantId, tenantId: data.tenantId },
        select: { id: true },
      }),
      this.prisma.judge.findFirst({
        where: { id: data.judgeId, tenantId: data.tenantId },
        select: { id: true },
      }),
    ]);

    if (!contestant) {
      throw this.notFoundError('Contestant', data.contestantId);
    }
    if (!judge) {
      throw this.notFoundError('Judge', data.judgeId);
    }

    const normalizedComment = data.comment.trim();
    const uniqueWhere = {
      tenantId_scope_scopeKey_contestantId_judgeId: {
        tenantId: data.tenantId,
        scope: scopeContext.scope,
        scopeKey: scopeContext.scopeKey,
        contestantId: data.contestantId,
        judgeId: data.judgeId,
      },
    };

    return await withMutationTimeoutTx(
      async (tx) => {
        if (!normalizedComment) {
          await tx.judgeComment.deleteMany({
            where: uniqueWhere.tenantId_scope_scopeKey_contestantId_judgeId,
          });
          return null;
        }

        return await tx.judgeComment.upsert({
          where: uniqueWhere,
          create: {
            tenantId: data.tenantId,
            scope: scopeContext.scope,
            scopeKey: scopeContext.scopeKey,
            categoryId: scopeContext.categoryId,
            contestId: scopeContext.contestId,
            eventId: scopeContext.eventId,
            contestantId: data.contestantId,
            judgeId: data.judgeId,
            comment: normalizedComment,
          },
          update: {
            comment: normalizedComment,
            categoryId: scopeContext.categoryId,
            contestId: scopeContext.contestId,
            eventId: scopeContext.eventId,
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
