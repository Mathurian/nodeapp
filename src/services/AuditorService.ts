import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// P2-4: Proper type definitions for auditor responses
type CategoryWithCertifications = Prisma.CategoryGetPayload<{
  include: {
    categoryCertifications: true;
  };
}>;

type CategoryWithContestAndCertifications = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      select: {
        id: true;
        eventId: true;
        name: true;
        description: true;
        createdAt: true;
        updatedAt: true;
        contestantNumberingMode: true;
        nextContestantNumber: true;
        event: true;
      };
    };
    categoryCertifications: true;
  };
}>;

type CategoryWithContestEvent = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      include: {
        event: true;
      };
    };
  };
}>;

type ScoreWithRelations = Prisma.ScoreGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
    contestant: {
      select: {
        id: true;
        name: true;
        email: true;
        contestantNumber: true;
      };
    };
    criterion: {
      select: {
        id: true;
        name: true;
        maxScore: true;
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

type ScoreWithJudgeContestantCriterion = Prisma.ScoreGetPayload<{
  include: {
    judge: true;
    contestant: true;
    criterion: true;
  };
}>;

type CategoryWithScoresAndCertifications = Prisma.CategoryGetPayload<{
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
        criterion: true;
      };
    };
    categoryCertifications: true;
  };
}>;

type CategoryWithScoresForReport = Prisma.CategoryGetPayload<{
  include: {
    contest: {
      include: {
        event: true;
      };
    };
    scores: {
      include: {
        judge: {
          select: {
            id: true;
            name: true;
            preferredName: true;
            email: true;
          };
        };
        contestant: {
          select: {
            id: true;
            name: true;
            preferredName: true;
            email: true;
            contestantNumber: true;
          };
        };
        criterion: {
          select: {
            id: true;
            name: true;
            description: true;
            maxScore: true;
          };
        };
      };
    };
    categoryCertifications: true;
  };
}>;

type ActivityLogWithUser = Prisma.ActivityLogGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        preferredName: true;
        email: true;
        role: true;
      };
    };
  };
}>;

interface AuditorStats {
  totalCategories: number;
  pendingAudits: number;
  completedAudits: number;
}

/**
 * Service for Auditor functionality
 * Handles score verification, final certification, and audit workflows
 */
@injectable()
export class AuditorService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }
  /**
   * Get auditor dashboard statistics (P2-4: Proper typing)
   */
  async getStats(): Promise<AuditorStats> {
    const totalCategories = await this.prisma.category.count();
    const categoriesWithCertifications = await this.prisma.category.findMany({
      include: {
        categoryCertifications: true,
      },
    }) as CategoryWithCertifications[];

    const pendingAudits = categoriesWithCertifications.filter(c => {
      const hasTally = c.categoryCertifications?.some(cert => cert.role === 'TALLY_MASTER');
      const hasAuditor = c.categoryCertifications?.some(cert => cert.role === 'AUDITOR');
      return hasTally && !hasAuditor;
    }).length;

    const completedAudits = categoriesWithCertifications.filter(c =>
      c.categoryCertifications?.some(cert => cert.role === 'AUDITOR')
    ).length;

    return {
      totalCategories,
      pendingAudits,
      completedAudits,
    };
  }

  /**
   * Get pending audits with pagination
   */
  async getPendingAudits(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const categories = await this.prisma.category.findMany({
      include: {
        contest: {
          select: {
            id: true,
            eventId: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            contestantNumberingMode: true,
            nextContestantNumber: true,
            event: true,
          },
        },
        categoryCertifications: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Filter for categories where tally master certified but auditor hasn't
    const pendingCategories = (categories as CategoryWithContestAndCertifications[]).filter((cat) => {
      const hasTally = cat.categoryCertifications?.some((cert) => cert.role === 'TALLY_MASTER');
      const hasAuditor = cat.categoryCertifications?.some((cert) => cert.role === 'AUDITOR');
      return hasTally && !hasAuditor;
    });

    return {
      categories: pendingCategories,
      pagination: {
        page,
        limit,
        total: pendingCategories.length,
        pages: Math.ceil(pendingCategories.length / limit),
      },
    };
  }

  /**
   * Get completed audits with pagination
   */
  async getCompletedAudits(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const categories = await this.prisma.category.findMany({
      include: {
        contest: {
          select: {
            id: true,
            eventId: true,
            name: true,
            description: true,
            createdAt: true,
            updatedAt: true,
            contestantNumberingMode: true,
            nextContestantNumber: true,
            event: true,
          },
        },
        categoryCertifications: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Filter for completed audits
    const completedCategories = (categories as CategoryWithContestAndCertifications[]).filter((cat) =>
      cat.categoryCertifications?.some((cert) => cert.role === 'AUDITOR')
    );

    return {
      categories: completedCategories,
      pagination: {
        page,
        limit,
        total: completedCategories.length,
        pages: Math.ceil(completedCategories.length / limit),
      },
    };
  }

  /**
   * Final certification for a category
   */
  async finalCertification(categoryId: string, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    }) as CategoryWithContestEvent | null;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Create auditor category certification
    const certification = await this.prisma.categoryCertification.create({
      data: {
        tenantId: category.tenantId,
        categoryId,
        userId,
        role: 'AUDITOR',
        comments: 'Auditor category certification (final for audit)',
      },
    });

    return { message: 'Final certification completed', certification };
  }

  /**
   * Reject an audit
   */
  async rejectAudit(categoryId: string, userId: string, reason: string) {
    // Record rejection as activity log
    const activityLog = await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'AUDIT_REJECTED',
        resourceType: 'CATEGORY',
        resourceId: categoryId,
        details: { reason: reason || 'No reason provided' },
      },
    });

    return { message: 'Audit rejected', activityLog };
  }

  /**
   * Get score verification data for a category
   */
  async getScoreVerification(categoryId: string, contestantId?: string) {
    const categoryExists = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      throw this.notFoundError('Category', categoryId);
    }

    const scores = await this.prisma.score.findMany({
      where: {
        categoryId,
        ...(contestantId && { contestantId }),
      },
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        contestant: {
          select: {
            id: true,
            name: true,
            email: true,
            contestantNumber: true,
          },
        },
        criterion: {
          select: {
            id: true,
            name: true,
            maxScore: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ contestantId: 'asc' }, { criterionId: 'asc' }],
    }) as ScoreWithRelations[];

    // Group scores by contestant
    const groupedScores = scores.reduce((acc: Record<string, {
      contestant: ScoreWithRelations['contestant'];
      scores: ScoreWithRelations[];
      totalScore: number;
      averageScore: number;
    }>, score) => {
      const key = score.contestantId;
      if (!acc[key]) {
        acc[key] = {
          contestant: score.contestant,
          scores: [],
          totalScore: 0,
          averageScore: 0,
        };
      }
      acc[key].scores.push(score);
      acc[key].totalScore += score.score ?? 0;
      return acc;
    }, {});

    // Calculate averages
    Object.values(groupedScores).forEach((group) => {
      group.averageScore = group.scores.length > 0 ? group.totalScore / group.scores.length : 0;
    });

    return {
      categoryId,
      scores: Object.values(groupedScores),
      totalScores: scores.length,
      uniqueContestants: Object.keys(groupedScores).length,
    };
  }

  /**
   * Verify a score
   */
  async verifyScore(
    scoreId: string,
    userId: string,
    data: {
      verified: boolean;
      comments?: string;
      issues?: string;
    }
  ) {
    const score = await this.prisma.score.findUnique({
      where: { id: scoreId },
      include: {
        judge: true,
        contestant: true,
        criterion: true,
        category: true,
      },
    }) as ScoreWithJudgeContestantCriterion | null;

    if (!score) {
      throw this.notFoundError('Score', scoreId);
    }

    // Note: verification fields don't exist in Score schema
    // Score has isCertified, certifiedBy, certifiedAt instead
    const updatedScore = await this.prisma.score.update({
      where: { id: scoreId },
      data: {
        isCertified: data.verified,
        certifiedBy: userId,
        certifiedAt: new Date(),
      },
    });

    return updatedScore;
  }

  /**
   * Get tally master status for a category
   */
  async getTallyMasterStatus(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
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
            criterion: true,
          },
        },
        categoryCertifications: true,
      },
    }) as CategoryWithScoresAndCertifications | null;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    const totalScores = category.scores.length;
    const verifiedScores = category.scores.filter((s) => 'verified' in s && s.verified).length;
    const pendingVerification = totalScores - verifiedScores;

    // Check certification status
    const tallyMasterCert = category.categoryCertifications?.some((c) => c.role === 'TALLY_MASTER');
    const auditorCert = category.categoryCertifications?.some((c) => c.role === 'AUDITOR');
    const finalCert = category.categoryCertifications?.some((c) => c.role === 'FINAL');

    return {
      categoryId: category.id,
      categoryName: category.name,
      totalScores,
      verifiedScores,
      pendingVerification,
      verificationProgress: totalScores > 0 ? ((verifiedScores / totalScores) * 100).toFixed(2) : 0,
      tallyMasterCertified: tallyMasterCert || false,
      auditorCertified: auditorCert || false,
      finalCertified: finalCert || false,
    };
  }

  /**
   * Get certification workflow for a category
   */
  async getCertificationWorkflow(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
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
            criterion: true,
          },
        },
        categoryCertifications: true,
      },
    }) as CategoryWithScoresAndCertifications | null;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Check certification status
    const tallyMasterCert = category.categoryCertifications?.find((c) => c.role === 'TALLY_MASTER');
    const auditorCert = category.categoryCertifications?.find((c) => c.role === 'AUDITOR');
    const finalCert = category.categoryCertifications?.find((c) => c.role === 'FINAL');

    const workflow = {
      categoryId: category.id,
      categoryName: category.name,
      contestName: category.contest.name,
      eventName: category.contest.event.name,
      steps: [
        {
          name: 'Judge Scoring',
          status: category.scores.length > 0 ? 'COMPLETED' : 'PENDING',
          completedAt: category.scores.length > 0 ? category.scores[0]?.createdAt : null,
          details: `${category.scores.length} scores submitted`,
        },
        {
          name: 'Tally Master Review',
          status: tallyMasterCert ? 'COMPLETED' : 'PENDING',
          completedAt: tallyMasterCert?.certifiedAt || null,
          details: tallyMasterCert ? 'Totals certified' : 'Pending tally review',
        },
        {
          name: 'Auditor Verification',
          status: auditorCert ? 'COMPLETED' : 'PENDING',
          completedAt: auditorCert?.certifiedAt || null,
          details: auditorCert ? 'Final certification completed' : 'Pending auditor review',
        },
        {
          name: 'Board Approval',
          status: finalCert ? 'COMPLETED' : 'PENDING',
          completedAt: finalCert?.certifiedAt || null,
          details: finalCert ? 'Board approved' : 'Pending board approval',
        },
      ],
      currentStep: finalCert ? 4 : auditorCert ? 3 : tallyMasterCert ? 2 : 1,
      overallStatus: finalCert
        ? 'APPROVED'
        : auditorCert
        ? 'AUDITOR_CERTIFIED'
        : tallyMasterCert
        ? 'TALLY_CERTIFIED'
        : 'PENDING',
    };

    return workflow;
  }

  /**
   * Generate summary report for a category
   */
  async generateSummaryReport(categoryId: string, userId: string, includeDetails: boolean = false) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            contestant: {
              select: {
                id: true,
                name: true,
                email: true,
                contestantNumber: true,
              },
            },
            criterion: {
              select: {
                id: true,
                name: true,
                maxScore: true,
              },
            },
          },
        },
        categoryCertifications: true,
      },
    }) as CategoryWithScoresForReport | null;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Calculate summary statistics
    const totalScores = category.scores.length;
    const uniqueContestants = new Set(category.scores.map((s) => s.contestantId)).size;
    const uniqueJudges = new Set(category.scores.map((s) => s.judgeId)).size;
    const averageScore =
      totalScores > 0 ? category.scores.reduce((sum, s) => sum + (s.score ?? 0), 0) / totalScores : 0;
    const maxScore = Math.max(...category.scores.map((s) => s.score ?? 0), 0);
    const minScore = Math.min(...category.scores.map((s) => s.score ?? 0), 0);

    // Group by contestant for rankings
    const contestantScores = category.scores.reduce((acc: Record<string, {
      contestant: CategoryWithScoresForReport['scores'][0]['contestant'];
      scores: CategoryWithScoresForReport['scores'];
      totalScore: number;
      averageScore: number;
      rank?: number;
    }>, score) => {
      const key = score.contestantId;
      if (!acc[key]) {
        acc[key] = {
          contestant: score.contestant,
          scores: [],
          totalScore: 0,
          averageScore: 0,
        };
      }
      acc[key].scores.push(score);
      acc[key].totalScore += score.score ?? 0;
      return acc;
    }, {});

    // Calculate averages and rankings
    const rankings = Object.values(contestantScores)
      .map((group) => {
        group.averageScore = group.scores.length > 0 ? group.totalScore / group.scores.length : 0;
        return group;
      })
      .sort((a, b) => b.averageScore - a.averageScore);

    // Add rank to each contestant
    rankings.forEach((contestant, index) => {
      contestant.rank = index + 1;
    });

    const summaryReport = {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        scoreCap: category.scoreCap,
      },
      contest: {
        id: category.contest.id,
        name: category.contest.name,
        eventName: category.contest.event.name,
      },
      statistics: {
        totalScores,
        uniqueContestants,
        uniqueJudges,
        averageScore: parseFloat(averageScore.toFixed(2)),
        maxScore,
        minScore,
        scoreRange: maxScore - minScore,
      },
      rankings: includeDetails
        ? rankings
        : rankings.map((r) => ({
            rank: r.rank,
            contestant: r.contestant,
            totalScore: r.totalScore,
            averageScore: parseFloat(r.averageScore.toFixed(2)),
            scoreCount: r.scores.length,
          })),
      certification: {
        tallyMasterCertified: category.categoryCertifications?.some((c) => c.role === 'TALLY_MASTER') || false,
        auditorCertified: category.categoryCertifications?.some((c) => c.role === 'AUDITOR') || false,
        finalCertified: category.categoryCertifications?.some((c) => c.role === 'FINAL') || false,
        certifications: category.categoryCertifications || [],
      },
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
    };

    return summaryReport;
  }

  /**
   * Get audit history
   */
  async getAuditHistory(categoryId?: string, page: number = 1, limit: number = 20) {
    const whereClause: Prisma.ActivityLogWhereInput = {
      ...(categoryId && { categoryId }),
      resourceType: 'CATEGORY',
    };

    const auditLogs = await this.prisma.activityLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }) as unknown as ActivityLogWithUser[];

    const total = await this.prisma.activityLog.count({
      where: whereClause,
    });

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
