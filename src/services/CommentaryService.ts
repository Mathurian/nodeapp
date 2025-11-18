import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

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

  async create(data: CreateCommentDto) {
    if (!data.scoreId || !data.criterionId || !data.contestantId || !data.comment) {
      throw this.badRequestError('Score ID, criterion ID, contestant ID, and comment are required');
    }

    // Fetch score to get tenantId
    const score: any = await this.prisma.score.findUnique({
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
      } as any
    });
  }

  async getCommentsForScore(scoreId: string, userRole: string) {
    const whereClause: any = { scoreId };

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
            description: true
          }
        }
      } as any,
      orderBy: { createdAt: 'asc' }
    });
  }

  async getCommentsByContestant(contestantId: string, userRole: string) {
    const whereClause: any = { contestantId };

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
                  } as any
                }
              }
            }
          }
        }
      },
      orderBy: [
        { scoreId: 'desc' as any },
        { createdAt: 'asc' }
      ]
    });
  }

  async update(id: string, data: UpdateCommentDto, userId: string, userRole: string) {
    const existingComment: any = await this.prisma.scoreComment.findUnique({
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
      } as any
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const existingComment: any = await this.prisma.scoreComment.findUnique({
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
