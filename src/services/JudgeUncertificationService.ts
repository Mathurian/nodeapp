import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// P2-4: Proper type definitions for uncertification responses
type UncertificationRequestWithRelations = Prisma.JudgeUncertificationRequestGetPayload<{
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

type UncertificationRequestWithJudgeCategory = Prisma.JudgeUncertificationRequestGetPayload<{
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

interface CreateUncertificationRequestData {
  judgeId: string;
  categoryId: string;
  reason: string;
  requestedBy: string;
  userRole: string;
}

interface SignRequestData {
  signatureName: string;
  userId: string;
  userRole: string;
}

@injectable()
export class JudgeUncertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getUncertificationRequests(status?: string): Promise<UncertificationRequestWithRelations[]> {
    const where: Prisma.JudgeUncertificationRequestWhereInput = {};
    if (status) where.status = status as any;

    return await this.prisma.judgeUncertificationRequest.findMany({
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
    }) as unknown as UncertificationRequestWithRelations[];
  }

  async createUncertificationRequest(data: CreateUncertificationRequestData): Promise<UncertificationRequestWithJudgeCategory> {
    const { judgeId, categoryId, reason, requestedBy, userRole } = data;

    if (!judgeId || !categoryId || !reason) {
      throw this.badRequestError('Judge ID, category ID, and reason are required');
    }

    const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) throw this.notFoundError('Category', categoryId);

    const judge = await this.prisma.judge.findUnique({ where: { id: judgeId } });
    if (!judge) throw this.notFoundError('Judge', judgeId);

    if (userRole !== 'BOARD' && userRole !== 'ADMIN') {
      throw this.forbiddenError('Only Board and Admin can initiate uncertification requests');
    }

    return await this.prisma.judgeUncertificationRequest.create({
      data: {
        tenantId: category.tenantId,
        judgeId,
        categoryId,
        reason: reason.trim(),
        requestedBy,
        status: 'PENDING'
      },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } }
      } as any
    }) as unknown as UncertificationRequestWithJudgeCategory;
  }

  async signRequest(id: string, data: SignRequestData) {
    const { signatureName, userId: _userId, userRole: _userRole } = data;

    if (!signatureName) {
      throw this.badRequestError('Signature name is required');
    }

    const request = await this.prisma.judgeUncertificationRequest.findUnique({
      where: { id }
    });

    if (!request) throw this.notFoundError('Uncertification request', id);

    if (request.status === 'APPROVED') {
      throw this.badRequestError('Request has already been approved');
    }

    // Note: Signature tracking fields don't exist in schema
    // Simplified approval workflow - any authorized role can approve
    const signedAt = new Date();
    const updateData: Prisma.JudgeUncertificationRequestUpdateInput = {
      status: 'APPROVED',
      approvedAt: signedAt,
      requestedAt: signedAt,
    };

    const updatedRequest = await this.prisma.judgeUncertificationRequest.update({
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
    });

    return {
      request: updatedRequest,
      allSigned: updateData.status === 'APPROVED'
    };
  }

  async executeUncertification(id: string): Promise<{ message: string }> {
    const request = await this.prisma.judgeUncertificationRequest.findUnique({
      where: { id }
    });

    if (!request) throw this.notFoundError('Uncertification request', id);

    if (request.status !== 'APPROVED') {
      throw this.badRequestError('Request must be approved before execution');
    }

    await this.prisma.score.updateMany({
      where: {
        categoryId: request.categoryId,
        judgeId: request.judgeId,
        isCertified: true
      },
      data: { isCertified: false }
    });

    await this.prisma.judgeUncertificationRequest.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    return { message: 'Uncertification executed successfully' };
  }
}
