import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class JudgeUncertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async getUncertificationRequests(status?: string) {
    const where: any = {};
    if (status) where.status = status;

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
    });
  }

  async createUncertificationRequest(data: any) {
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
    });
  }

  async signRequest(id: string, data: any) {
    const { signatureName, userId, userRole } = data;

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

    const signedAt = new Date();
    const updateData: any = {};

    if (userRole === 'AUDITOR' && !request.auditorSignature) {
      updateData.auditorSignature = signatureName;
      updateData.auditorSignedAt = signedAt;
      updateData.auditorSignedBy = userId;
    } else if (userRole === 'TALLY_MASTER' && !request.tallySignature) {
      updateData.tallySignature = signatureName;
      updateData.tallySignedAt = signedAt;
      updateData.tallySignedBy = userId;
    } else if (userRole === 'BOARD' && !request.boardSignature) {
      updateData.boardSignature = signatureName;
      updateData.boardSignedAt = signedAt;
      updateData.boardSignedBy = userId;
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

  async executeUncertification(id: string) {
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
      data: { status: 'COMPLETED' }
    });

    return { message: 'Uncertification executed successfully' };
  }
}
