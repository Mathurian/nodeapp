import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma, RequestStatus } from '@prisma/client';
import { applyCertificationStage, refreshRoleStages, upsertCategoryRoleCertification } from '../utils/certificationPipeline';

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
  auditorIds: string[];
  auditorSignedCount: number;
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

/**
 * Service for Board functionality
 * Handles certifications and board-level reports
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

    if (certifications.length === 0) {
      return [];
    }

    const categoryIds = Array.from(new Set(certifications.map((cert) => cert.categoryId)));
    const contestIds = Array.from(new Set(certifications.map((cert) => cert.contestId)));
    const auditorSignatures = await this.prisma.categoryCertification.findMany({
      where: {
        tenantId,
        categoryId: { in: categoryIds },
        role: 'AUDITOR'
      },
      orderBy: [
        { categoryId: 'asc' },
        { certifiedAt: 'asc' }
      ],
      select: {
        categoryId: true,
        userId: true,
        certifiedAt: true
      }
    });

    const fallbackSignerIds = certifications
      .flatMap((cert) => [cert.certifiedBy, cert.userId])
      .filter((value): value is string => Boolean(value));
    const signerIds = Array.from(
      new Set([
        ...auditorSignatures.map((signature) => signature.userId),
        ...fallbackSignerIds
      ])
    );
    const signerUsers = signerIds.length > 0
      ? await this.prisma.user.findMany({
          where: {
            tenantId,
            id: { in: signerIds }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })
      : [];
    const signerNameById = new Map(
      signerUsers.map((user) => [user.id, user.name || user.email || 'Unknown Auditor'])
    );

    const [categories, contests] = await Promise.all([
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
      })
    ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const contestById = new Map(contests.map((c) => [c.id, c]));
    const auditorsByCategory = new Map<string, Array<{
      userId: string;
      name: string;
      certifiedAt: Date;
    }>>();
    for (const row of auditorSignatures) {
      const list = auditorsByCategory.get(row.categoryId) || [];
      const fallbackName = row.userId
        ? `Unknown Auditor (${row.userId.slice(0, 8)})`
        : 'Unknown Auditor';
      list.push({
        userId: row.userId,
        name: signerNameById.get(row.userId) || fallbackName,
        certifiedAt: row.certifiedAt
      });
      auditorsByCategory.set(row.categoryId, list);
    }

    return certifications.map((cert) => ({
      ...(function buildAuditorData() {
        const raw = auditorsByCategory.get(cert.categoryId) || [];
        const byUserId = new Map<string, { name: string; certifiedAt: Date }>();
        for (const row of raw) {
          if (!byUserId.has(row.userId)) {
            byUserId.set(row.userId, { name: row.name, certifiedAt: row.certifiedAt });
          }
        }
        const uniqueRows = Array.from(byUserId.entries()).map(([userId, value]) => ({
          userId,
          name: value.name,
          certifiedAt: value.certifiedAt
        }));
        const fallbackAuditorId = cert.certifiedBy || cert.userId || null;
        const fallbackAuditorName = fallbackAuditorId
          ? (signerNameById.get(fallbackAuditorId) || `Unknown Auditor (${fallbackAuditorId.slice(0, 8)})`)
          : 'Unknown Auditor';
        const resolvedRows = uniqueRows.length > 0
          ? uniqueRows
          : fallbackAuditorId
            ? [{
                userId: fallbackAuditorId,
                name: fallbackAuditorName,
                certifiedAt: cert.certifiedAt || cert.updatedAt || cert.createdAt
              }]
            : [];
        const latestCertifiedAt = resolvedRows.length > 0
          ? resolvedRows
              .map((row) => row.certifiedAt)
              .sort((a, b) => b.getTime() - a.getTime())[0] || null
          : null;
        return {
          auditorId: resolvedRows[0]?.userId || null,
          auditorIds: resolvedRows.map((row) => row.userId),
          auditorSignedCount: resolvedRows.length,
          auditorName: resolvedRows.length > 0 ? resolvedRows.map((row) => row.name).join(', ') : 'Unknown Auditor',
          certifiedAt: cert.certifiedAt || latestCertifiedAt || cert.updatedAt || cert.createdAt
        };
      })(),
      id: cert.id,
      categoryId: cert.categoryId,
      categoryName: categoryById.get(cert.categoryId)?.name || 'Unknown Category',
      contestName: contestById.get(cert.contestId)?.name || 'Unknown Contest',
      eventName: contestById.get(cert.contestId)?.event?.name || 'Unknown Event',
      status: cert.status,
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

    const synced = await refreshRoleStages(this.prisma, tenantId, certification.categoryId, userId);
    if (!synced.auditorCertified) {
      throw this.badRequestError('Auditor certification must be completed first');
    }
    if (synced.boardApproved) {
      throw this.conflictError('Board approval already completed for this category');
    }

    await upsertCategoryRoleCertification({
      prisma: this.prisma,
      tenantId,
      categoryId: certification.categoryId,
      role: 'BOARD',
      userId,
      boardRoleSnapshot,
      signatureName: signature?.typedSignature || (signature?.drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
      comments: signature?.comments || null
    });

    await applyCertificationStage({
      prisma: this.prisma,
      tenantId,
      categoryId: certification.categoryId,
      role: 'BOARD',
      comments: signature?.comments || null,
      userId,
      certifiedBy: userId
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
