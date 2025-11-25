import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

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

@injectable()
export class CommentaryService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async create(data: CreateCommentDto): Promise<ScoreCommentWithJudge> {
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

    return await this.prisma.scoreComment.create({
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
    });
  }

  async getCommentsForScore(scoreId: string, userRole: string): Promise<ScoreCommentWithDetails[]> {
    const whereClause: Prisma.ScoreCommentWhereInput = { scoreId };

    if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      whereClause.isPrivate = false;
    }

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

  async getCommentsByContestant(contestantId: string, userRole: string): Promise<ScoreCommentWithFullDetails[]> {
    const whereClause: Prisma.ScoreCommentWhereInput = { contestantId };

    if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      whereClause.isPrivate = false;
    }

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

  async update(id: string, data: UpdateCommentDto, userId: string, userRole: string): Promise<ScoreCommentWithJudge> {
    const existingComment = await this.prisma.scoreComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      throw this.notFoundError('Comment', id);
    }

    if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw this.forbiddenError('Insufficient permissions to update this comment');
    }

    return await this.prisma.scoreComment.update({
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
    });
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const existingComment = await this.prisma.scoreComment.findUnique({
      where: { id }
    });

    if (!existingComment) {
      throw this.notFoundError('Comment', id);
    }

    if (existingComment.judgeId !== userId && !['ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw this.forbiddenError('Insufficient permissions to delete this comment');
    }

    await this.prisma.scoreComment.delete({
      where: { id }
    });
  }
}
