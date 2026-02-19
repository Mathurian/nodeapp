import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma, EmceeScript, RequestStatus } from '@prisma/client';
import { applyCertificationStage } from '../utils/certificationPipeline';

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

interface BoardCertificationRow {
  id: string;
  categoryId: string;
  categoryName: string;
  eventName: string;
  contestName: string;
  auditorId: string | null;
  auditorName: string;
  status: string;
  certifiedAt: Date | null;
  notes?: string;
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
  certificationId: string;
  categoryId: string;
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
  async getStats(tenantId: string): Promise<BoardStats> {
    const totalContests: number = await this.prisma.contest.count({ where: { tenantId, deletedAt: null } });
    const totalCategories: number = await this.prisma.category.count({ where: { tenantId, deletedAt: null } });
    const certified = await this.prisma.certification.count({
      where: { tenantId, boardApproved: true }
    });
    const pending = await this.prisma.certification.count({
      where: { tenantId, auditorCertified: true, boardApproved: false }
    });

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
  async getCertifications(tenantId: string): Promise<BoardCertificationRow[]> {
    const certifications = await this.prisma.certification.findMany({
      where: {
        tenantId,
        auditorCertified: true,
        boardApproved: false
      },
      orderBy: { createdAt: 'desc' },
    });

    const categoryIds = Array.from(new Set(certifications.map((cert) => cert.categoryId)));
    const contestIds = Array.from(new Set(certifications.map((cert) => cert.contestId)));
    const userIds = Array.from(new Set(certifications.map((cert) => cert.userId).filter((id): id is string => Boolean(id))));

    const [categories, contests, users] = await Promise.all([
      this.prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
      }),
      this.prisma.contest.findMany({
        where: { id: { in: contestIds } },
        select: {
          id: true,
          name: true,
          event: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true }
      })
    ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const contestById = new Map(contests.map((c) => [c.id, c]));
    const userById = new Map(users.map((u) => [u.id, u]));

    return certifications.map((cert) => ({
      id: cert.id,
      categoryId: cert.categoryId,
      categoryName: categoryById.get(cert.categoryId)?.name || 'Unknown Category',
      contestName: contestById.get(cert.contestId)?.name || 'Unknown Contest',
      eventName: contestById.get(cert.contestId)?.event?.name || 'Unknown Event',
      auditorId: cert.userId,
      auditorName: cert.userId ? (userById.get(cert.userId)?.name || userById.get(cert.userId)?.email || 'Unknown Auditor') : 'Unknown Auditor',
      status: cert.status,
      certifiedAt: cert.certifiedAt,
      notes: cert.comments || undefined
    }));
  }

  /**
   * Approve certification
   */
  async approveCertification(
    certificationId: string,
    userId: string,
    tenantId: string,
    signature?: { typedSignature?: string; drawnSignatureData?: string; signatureFilePath?: string; comments?: string }
  ): Promise<ApprovalResponse> {
    const certification = await this.prisma.certification.findFirst({
      where: {
        id: certificationId,
        tenantId
      }
    });

    if (!certification) {
      throw this.notFoundError('Certification', certificationId);
    }

    const actor = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { role: true, boardRole: true }
    });
    const boardRoleSnapshot = actor?.role === 'BOARD' ? (actor.boardRole || null) : null;

    await applyCertificationStage({
      prisma: this.prisma,
      tenantId,
      categoryId: certification.categoryId,
      role: 'BOARD',
      comments: signature?.comments || null,
      userId,
      certifiedBy: userId
    });

    await this.prisma.categoryCertification.upsert({
      where: {
        tenantId_categoryId_role: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'BOARD'
        }
      },
      create: {
        tenantId,
        categoryId: certification.categoryId,
        role: 'BOARD',
        userId,
        boardRoleSnapshot,
        signatureName: signature?.typedSignature || (signature?.drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: signature?.comments || null
      },
      update: {
        userId,
        boardRoleSnapshot,
        signatureName: signature?.typedSignature || (signature?.drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: signature?.comments || null,
        certifiedAt: new Date()
      }
    });

    return { message: 'Certification approved', certificationId, categoryId: certification.categoryId };
  }

  /**
   * Reject certification
   */
  async rejectCertification(certificationId: string, tenantId: string, reason?: string): Promise<ApprovalResponse> {
    const certification = await this.prisma.certification.findFirst({
      where: {
        id: certificationId,
        tenantId
      }
    });

    if (!certification) {
      throw this.notFoundError('Certification', certificationId);
    }

    await this.prisma.certification.update({
      where: { id: certificationId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || 'Rejected by Board'
      }
    });

    return { message: 'Certification rejected', certificationId, categoryId: certification.categoryId };
  }

  /**
   * Get certification status summary
   */
  async getCertificationStatus(tenantId: string): Promise<CertificationStatus> {
    const [total, pending, certified, approved] = await Promise.all([
      this.prisma.certification.count({ where: { tenantId } }),
      this.prisma.certification.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.certification.count({ where: { tenantId, status: 'CERTIFIED' } }),
      this.prisma.certification.count({ where: { tenantId, boardApproved: true } })
    ]);

    const status: CertificationStatus = {
      total,
      pending,
      certified,
      approved
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
    this.validateRequired(data as unknown as Record<string, unknown>, ['title', 'content', 'tenantId']);

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
  async approveScoreRemoval(requestId: string, userId: string, _reason?: string): Promise<Prisma.JudgeScoreRemovalRequestGetPayload<{}>> {
    const request: ScoreRemovalRequestWithScore | null = await this.prisma.judgeScoreRemovalRequest.findUnique({
      where: { id: requestId },
      include: { score: true },
    });

    if (!request) {
      throw this.notFoundError('Score removal request', requestId);
    }

    // Delete the score
    await this.prisma.score.delete({
      where: { id: request.scoreId ?? undefined },
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
  async rejectScoreRemoval(requestId: string, userId: string, _reason?: string): Promise<Prisma.JudgeScoreRemovalRequestGetPayload<{}>> {
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
