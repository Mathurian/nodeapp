import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// P2-4: Proper type definitions for score removal responses
type ScoreRemovalRequestWithRelations = Prisma.ScoreRemovalRequestGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    category: {
      include: {
        contest: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    requestedByUser: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

type ScoreRemovalRequestWithJudgeCategory = Prisma.ScoreRemovalRequestGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
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

type ScoreRemovalRequestWithJudgeCategoryContest = Prisma.ScoreRemovalRequestGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    category: {
      include: {
        contest: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

interface CreateScoreRemovalRequestDto {
  judgeId: string;
  categoryId: string;
  reason: string;
  requestedBy: string;
  userRole: string;
  tenantId: string;
}

interface SignRequestDto {
  signatureName: string;
  userId: string;
  userRole: string;
}

@injectable()
export class ScoreRemovalService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async createRequest(data: CreateScoreRemovalRequestDto): Promise<ScoreRemovalRequestWithJudgeCategory> {
    if (!data.judgeId || !data.categoryId || !data.reason || !data.tenantId) {
      throw this.badRequestError('Judge ID, category ID, reason, and tenant ID are required');
    }

    const category = await this.prisma.category.findFirst({
      where: { id: data.categoryId, tenantId: data.tenantId }
    });
    if (!category) throw this.notFoundError('Category', data.categoryId);

    const judge = await this.prisma.judge.findFirst({
      where: { id: data.judgeId, tenantId: data.tenantId }
    });
    if (!judge) throw this.notFoundError('Judge', data.judgeId);

    if (data.userRole !== 'BOARD' && data.userRole !== 'ADMIN') {
      throw this.forbiddenError('Only Board and Admin can initiate score removal requests');
    }

    return await this.prisma.scoreRemovalRequest.create({
      data: {
        judgeId: data.judgeId,
        categoryId: data.categoryId,
        reason: data.reason.trim(),
        requestedBy: data.requestedBy,
        tenantId: data.tenantId,
        status: 'PENDING'
      },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } }
      } as any
    }) as unknown as ScoreRemovalRequestWithJudgeCategory;
  }

  async getAll(tenantId: string, status?: string): Promise<ScoreRemovalRequestWithRelations[]> {
    const where: Prisma.ScoreRemovalRequestWhereInput = { tenantId };
    if (status) where.status = status as any;

    return await this.prisma.scoreRemovalRequest.findMany({
      where,
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: {
          include: {
            contest: { select: { id: true, name: true } }
          } as any
        },
        requestedByUser: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    }) as unknown as ScoreRemovalRequestWithRelations[];
  }

  async getById(id: string, tenantId: string): Promise<ScoreRemovalRequestWithRelations> {
    const request = await this.prisma.scoreRemovalRequest.findFirst({
      where: { id, tenantId },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: {
          include: {
            contest: { select: { id: true, name: true } }
          } as any
        },
        requestedByUser: { select: { id: true, name: true } }
      }
    }) as ScoreRemovalRequestWithRelations | null;

    if (!request) throw this.notFoundError('Score removal request', id);
    return request;
  }

  async signRequest(id: string, tenantId: string, data: SignRequestDto) {
    if (!data.signatureName) {
      throw this.badRequestError('Signature name is required');
    }

    const request = await this.prisma.scoreRemovalRequest.findFirst({
      where: { id, tenantId }
    });

    if (!request) throw this.notFoundError('Score removal request', id);

    if (request.status === 'APPROVED') {
      throw this.badRequestError('Request has already been approved');
    }

    const signedAt = new Date();
    const updateData: Prisma.ScoreRemovalRequestUpdateInput = {};

    if (data.userRole === 'AUDITOR' && !request.auditorSignature) {
      updateData.auditorSignature = data.signatureName;
      updateData.auditorSignedAt = signedAt;
      updateData.auditorSignedBy = data.userId;
    } else if (data.userRole === 'TALLY_MASTER' && !request.tallySignature) {
      updateData.tallySignature = data.signatureName;
      updateData.tallySignedAt = signedAt;
      updateData.tallySignedBy = data.userId;
    } else if (data.userRole === 'BOARD' && !request.boardSignature) {
      updateData.boardSignature = data.signatureName;
      updateData.boardSignedAt = signedAt;
      updateData.boardSignedBy = data.userId;
    } else {
      throw this.badRequestError('You have already signed this request or your signature is not required');
    }

    const hasAuditorSignature = request.auditorSignature || updateData.auditorSignature;
    const hasTallySignature = request.tallySignature || updateData.tallySignature;
    const hasBoardSignature = request.boardSignature || updateData.boardSignature;

    if (hasAuditorSignature && hasTallySignature && hasBoardSignature) {
      updateData.status = 'APPROVED';
      updateData.updatedAt = signedAt;
    }

    const updatedRequest = await this.prisma.scoreRemovalRequest.update({
      where: { id },
      data: updateData,
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: {
          include: {
            contest: { select: { id: true, name: true } }
          } as any
        }
      }
    }) as unknown as ScoreRemovalRequestWithJudgeCategoryContest;

    return {
      request: updatedRequest,
      allSigned: updateData.status === 'APPROVED'
    };
  }

  async executeRemoval(id: string, tenantId: string): Promise<{ deletedCount: number }> {
    const request = await this.prisma.scoreRemovalRequest.findFirst({
      where: { id, tenantId },
      include: {
        judge: { select: { id: true } },
        category: { select: { id: true } }
      } as any
    });

    if (!request) throw this.notFoundError('Score removal request', id);

    if (request.status !== 'APPROVED') {
      throw this.badRequestError('Request must be approved before execution');
    }

    const deletedScores = await this.prisma.score.deleteMany({
      where: {
        categoryId: request.categoryId,
        judgeId: request.judgeId,
        tenantId
      }
    });

    await this.prisma.scoreRemovalRequest.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    return {
      deletedCount: deletedScores.count
    };
  }
}
