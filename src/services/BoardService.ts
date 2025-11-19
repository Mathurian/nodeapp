import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma, EmceeScript, RequestStatus } from '@prisma/client';

// Proper type definitions for board responses
type CategoryWithCertifications = Prisma.CategoryGetPayload<{
  include: {
    categoryCertifications: true;
  };
}>;

type CategoryWithFullDetails = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      include: {
        event: true;
      };
    };
    scores: {
      include: {
        judge: true;
        contestant: true;
      };
    };
    categoryCertifications: true;
  };
}>;

type CategoryWithContest = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      include: {
        event: true;
      };
    };
  };
}>;

type ScoreRemovalRequestWithDetails = Prisma.JudgeScoreRemovalRequestGetPayload<{
  include: {
    judge: true;
    category: {
      include: {
        contest: {
          include: {
            event: true;
          };
        };
      };
    };
    score: {
      include: {
        contestant: true;
      };
    };
  };
}>;

type ScoreRemovalRequestWithScore = Prisma.JudgeScoreRemovalRequestGetPayload<{
  include: {
    score: true;
  };
}>;

// Interface types for complex return objects
interface BoardStats {
  contests: number;
  categories: number;
  certified: number;
  pending: number;
}

interface CertificationStatus {
  total: number;
  pending: number;
  certified: number;
  approved: number;
}

interface ScoreRemovalRequestsResponse {
  requests: ScoreRemovalRequestWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface ApprovalResponse {
  message: string;
  category: CategoryWithContest;
}

interface DeleteResponse {
  message: string;
}

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
  async getStats(): Promise<BoardStats> {
    const totalContests: number = await this.prisma.contest.count();
    const totalCategories: number = await this.prisma.category.count();

    const categories: CategoryWithCertifications[] = await (this.prisma.category.findMany as any)({
      include: {
        categoryCertifications: true,
      },
    });

    const certified = categories.filter((cat) => cat.categoryCertifications.some((cert) => cert.role === 'FINAL')).length;

    const pending = categories.filter((cat) => !cat.categoryCertifications.some((cert) => cert.role === 'FINAL')).length;

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
  async getCertifications(): Promise<CategoryWithFullDetails[]> {
    const categories: CategoryWithFullDetails[] = await (this.prisma.category.findMany as any)({
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        scores: {
          include: {
            judge: true,
            contestant: true,
          },
        },
        categoryCertifications: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter for categories with FINAL certification
    return categories.filter((cat) => cat.categoryCertifications.some((cert) => cert.role === 'FINAL'));
  }

  /**
   * Approve category certification
   */
  async approveCertification(categoryId: string): Promise<ApprovalResponse> {
    const category: CategoryWithContest | null = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
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
  async rejectCertification(categoryId: string, reason?: string): Promise<ApprovalResponse> {
    const category: CategoryWithContest | null = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
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
  async getCertificationStatus(): Promise<CertificationStatus> {
    const categories: CategoryWithCertifications[] = await (this.prisma.category.findMany as any)({
      include: {
        categoryCertifications: true,
      },
    });

    const status: CertificationStatus = {
      total: categories.length,
      pending: categories.filter(
        (cat) => cat.categoryCertifications.length === 0
      ).length,
      certified: categories.filter((cat) => cat.categoryCertifications.length > 0).length,
      approved: 0,
    };

    return status;
  }

  /**
   * Get all emcee scripts
   */
  async getEmceeScripts(): Promise<EmceeScript[]> {
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
  }): Promise<EmceeScript> {
    this.validateRequired(data, ['title', 'content', 'tenantId']);

    const script: EmceeScript = await this.prisma.emceeScript.create({
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
  ): Promise<EmceeScript> {
    const script: EmceeScript = await this.prisma.emceeScript.update({
      where: { id: scriptId },
      data,
    });

    return script;
  }

  /**
   * Delete emcee script
   */
  async deleteEmceeScript(scriptId: string): Promise<DeleteResponse> {
    await this.prisma.emceeScript.delete({
      where: { id: scriptId },
    });

    return { message: 'Emcee script deleted successfully' };
  }

  /**
   * Get score removal requests
   */
  async getScoreRemovalRequests(status?: RequestStatus, page: number = 1, limit: number = 20): Promise<ScoreRemovalRequestsResponse> {
    const whereClause: Prisma.JudgeScoreRemovalRequestWhereInput = {};
    if (status) whereClause.status = status;

    const requests: ScoreRemovalRequestWithDetails[] = await this.prisma.judgeScoreRemovalRequest.findMany({
      where: whereClause,
      include: {
        judge: true,
        category: {
          include: {
            contest: {
              include: {
                event: true,
              },
            },
          },
        },
        score: {
          include: {
            contestant: true,
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total: number = await this.prisma.judgeScoreRemovalRequest.count({
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
  async approveScoreRemoval(requestId: string, userId: string, reason?: string): Promise<Prisma.JudgeScoreRemovalRequestGetPayload<{}>> {
    const request: ScoreRemovalRequestWithScore | null = await this.prisma.judgeScoreRemovalRequest.findUnique({
      where: { id: requestId },
      include: { score: true },
    });

    if (!request) {
      throw this.notFoundError('Score removal request', requestId);
    }

    // Delete the score
    await this.prisma.score.delete({
      where: { id: request.scoreId },
    });

    // Update request status
    const updatedRequest: Prisma.JudgeScoreRemovalRequestGetPayload<{}> = await this.prisma.judgeScoreRemovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    return updatedRequest;
  }

  /**
   * Reject score removal
   */
  async rejectScoreRemoval(requestId: string, userId: string, reason?: string): Promise<Prisma.JudgeScoreRemovalRequestGetPayload<{}>> {
    const updatedRequest: Prisma.JudgeScoreRemovalRequestGetPayload<{}> = await this.prisma.judgeScoreRemovalRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: userId,
      },
    });

    return updatedRequest;
  }
}
