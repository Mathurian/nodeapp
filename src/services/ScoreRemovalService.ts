// @ts-nocheck - FIXME: Schema mismatches need to be resolved
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

interface CreateScoreRemovalRequestDto {
  judgeId: string;
  categoryId: string;
  reason: string;
  requestedBy: string;
  userRole: string;
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

  async createRequest(data: CreateScoreRemovalRequestDto) {
    if (!data.judgeId || !data.categoryId || !data.reason) {
      throw this.badRequestError('Judge ID, category ID, and reason are required');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: data.categoryId }
    });
    if (!category) throw this.notFoundError('Category', data.categoryId);

    const judge = await this.prisma.judge.findUnique({
      where: { id: data.judgeId }
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
        status: 'PENDING'
      },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } }
      }
    });
  }

  async getAll(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return await this.prisma.scoreRemovalRequest.findMany({
      where,
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: {
          include: {
            contest: { select: { id: true, name: true } }
          }
        },
        requestedByUser: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(id: string) {
    const request = await this.prisma.scoreRemovalRequest.findUnique({
      where: { id },
      include: {
        judge: { select: { id: true, name: true, email: true } },
        category: {
          include: {
            contest: { select: { id: true, name: true } }
          }
        },
        requestedByUser: { select: { id: true, name: true } }
      }
    });

    if (!request) throw this.notFoundError('Score removal request', id);
    return request;
  }

  async signRequest(id: string, data: SignRequestDto) {
    if (!data.signatureName) {
      throw this.badRequestError('Signature name is required');
    }

    const request = await this.prisma.scoreRemovalRequest.findUnique({
      where: { id }
    });

    if (!request) throw this.notFoundError('Score removal request', id);

    if (request.status === 'APPROVED') {
      throw this.badRequestError('Request has already been approved');
    }

    const signedAt = new Date();
    const updateData: any = {};

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
          }
        }
      }
    });

    return {
      request: updatedRequest,
      allSigned: updateData.status === 'APPROVED'
    };
  }

  async executeRemoval(id: string) {
    const request = await this.prisma.scoreRemovalRequest.findUnique({
      where: { id },
      include: {
        judge: { select: { id: true } },
        category: { select: { id: true } }
      }
    });

    if (!request) throw this.notFoundError('Score removal request', id);

    if (request.status !== 'APPROVED') {
      throw this.badRequestError('Request must be approved before execution');
    }

    const deletedScores = await this.prisma.score.deleteMany({
      where: {
        categoryId: request.categoryId,
        judgeId: request.judgeId
      }
    });

    await this.prisma.scoreRemovalRequest.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    return {
      deletedCount: deletedScores.count
    };
  }
}
