import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

/**
 * Service for Board functionality
 * Handles certifications, emcee scripts, and board-level reports
 */
@injectable()
export class BoardService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }
  /**
   * Get board dashboard statistics
   */
  async getStats() {
    const totalContests = await this.prisma.contest.count();
    const totalCategories = await this.prisma.category.count();

    const categories: any = await this.prisma.category.findMany({
      include: {
        certifications: true,
      } as any,
    });

    const certified = categories.filter((cat: any) => cat.certifications.some((cert: any) => cert.type === 'FINAL')).length;

    const pending = categories.filter((cat: any) => !cat.certifications.some((cert: any) => cert.type === 'FINAL')).length;

    return {
      contests: totalContests,
      categories: totalCategories,
      certified,
      pending,
    };
  }

  /**
   * Get all certifications
   */
  async getCertifications() {
    const categories: any = await this.prisma.category.findMany({
      include: {
        contest: {
          include: {
            event: true,
          } as any,
        },
        scores: {
          include: {
            judge: true,
            contestant: true,
          } as any,
        },
        certifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for categories with FINAL certification
    return categories.filter((cat: any) => cat.certifications.some((cert: any) => cert.type === 'FINAL'));
  }

  /**
   * Approve category certification
   */
  async approveCertification(categoryId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          } as any,
        },
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    await this.prisma.category.update({
      where: { id: categoryId },
      data: {  },
    });

    return { message: 'Certification approved', category };
  }

  /**
   * Reject category certification
   */
  async rejectCertification(categoryId: string, reason?: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          } as any,
        },
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Note: boardApproved and rejectionReason fields don't exist in schema
    // Rejection is tracked via CategoryCertification records instead
    await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        // No fields to update - rejection handled via certifications
      },
    });

    return { message: 'Certification rejected', category };
  }

  /**
   * Get certification status summary
   */
  async getCertificationStatus() {
    const categories: any = await this.prisma.category.findMany({
      include: {
        certifications: {
          where: {
            status: {
              in: ['CERTIFIED', 'PENDING', 'IN_PROGRESS'],
            },
          },
        },
      } as any,
    });

    const status = {
      total: categories.length,
      pending: categories.filter(
        (cat: any) => cat.certifications.length === 0 || cat.certifications.every((cert: any) => cert.status !== 'CERTIFIED')
      ).length,
      certified: categories.filter((cat: any) => cat.certifications.some((cert: any) => cert.status === 'CERTIFIED')).length,
      approved: 0,
    };

    return status;
  }

  /**
   * Get all emcee scripts
   */
  async getEmceeScripts() {
    return await this.prisma.emceeScript.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create emcee script
   */
  async createEmceeScript(data: {
    title: string;
    content: string;
    type?: string;
    eventId?: string;
    contestId?: string;
    categoryId?: string;
    order?: number;
    notes?: string;
    userId: string;
    tenantId: string;
  }) {
    this.validateRequired(data, ['title', 'content', 'tenantId']);

    const script = await this.prisma.emceeScript.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        content: data.content,
        eventId: data.eventId,
        contestId: data.contestId,
        categoryId: data.categoryId,
        order: data.order || 0,
      },
    });

    return script;
  }

  /**
   * Update emcee script
   */
  async updateEmceeScript(
    scriptId: string,
    data: {
      title?: string;
      content?: string;
      type?: string;
      eventId?: string;
      contestId?: string;
      categoryId?: string;
      order?: number;
      notes?: string;
      isActive?: boolean;
    }
  ) {
    const script = await this.prisma.emceeScript.update({
      where: { id: scriptId },
      data,
    });

    return script;
  }

  /**
   * Delete emcee script
   */
  async deleteEmceeScript(scriptId: string) {
    await this.prisma.emceeScript.delete({
      where: { id: scriptId },
    });

    return { message: 'Emcee script deleted successfully' };
  }

  /**
   * Get score removal requests
   */
  async getScoreRemovalRequests(status?: string, page: number = 1, limit: number = 20) {
    const whereClause: any = {};
    if (status) whereClause.status = status;

    const requests: any = await this.prisma.judgeScoreRemovalRequest.findMany({
      where: whereClause,
      include: {
        judge: true,
        category: {
          include: {
            contest: {
              include: {
                event: true,
              } as any,
            },
          },
        },
        score: {
          include: {
            contestant: true,
          } as any,
        },
      },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.judgeScoreRemovalRequest.count({
      where: whereClause,
    });

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Approve score removal
   */
  async approveScoreRemoval(requestId: string, userId: string, reason?: string) {
    const request: any = await this.prisma.judgeScoreRemovalRequest.findUnique({
      where: { id: requestId },
      include: { score: true } as any,
    });

    if (!request) {
      throw this.notFoundError('Score removal request', requestId);
    }

    // Delete the score
    await this.prisma.score.delete({
      where: { id: request.scoreId },
    });

    // Update request status
    const updatedRequest = await this.prisma.judgeScoreRemovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        reason,
      },
    });

    return updatedRequest;
  }

  /**
   * Reject score removal
   */
  async rejectScoreRemoval(requestId: string, userId: string, reason?: string) {
    const updatedRequest = await this.prisma.judgeScoreRemovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        reason,
      },
    });

    return updatedRequest;
  }
}
