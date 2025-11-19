import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import * as crypto from 'crypto';

// Proper type definitions for winner responses
type CategoryWithDetails = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    contestId: true;
    contest: {
      select: {
        id: true;
        name: true;
        eventId: true;
        event: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    criteria: {
      select: {
        id: true;
        maxScore: true;
      };
    };
  };
}>;

type ScoreWithRelations = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    contestantId: true;
    judgeId: true;
    score: true;
    contestant: {
      select: {
        id: true;
        name: true;
        contestantNumber: true;
      };
    };
    judge: {
      select: {
        id: true;
        name: true;
      };
    };
    criterion: {
      select: {
        id: true;
        maxScore: true;
      };
    };
  };
}>;

type ContestWithDetails = Prisma.ContestGetPayload<{
  select: {
    id: true;
    name: true;
    eventId: true;
    event: {
      select: {
        id: true;
        name: true;
      };
    };
    categories: {
      select: {
        id: true;
        name: true;
        criteria: {
          select: {
            id: true;
            maxScore: true;
          };
        };
      };
    };
  };
}>;

interface ContestantTotals {
  contestant: {
    id: string;
    name: string;
    contestantNumber: number;
  };
  totalScore: number;
  scores: ScoreWithRelations[];
  judgesScored: Set<string>;
}

interface CategoryWinner {
  contestant: {
    id: string;
    name: string;
    contestantNumber: number;
  };
  totalScore: number;
  totalPossibleScore: number;
  scores: ScoreWithRelations[];
  judgesScored: string[];
}

interface ContestWinner {
  contestant: {
    id: string;
    name: string;
    contestantNumber: number;
  };
  totalScore: number;
  totalPossibleScore: number;
  categoriesParticipated: number;
}

@injectable()
export class WinnerService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Generate signature for winner verification
   */
  generateSignature(
    userId: string,
    categoryId: string,
    userRole: string,
    ipAddress?: string,
    userAgent?: string
  ): string {
    const timestamp = new Date().toISOString();
    const data = `${userId}-${categoryId}-${userRole}-${timestamp}-${ipAddress || ''}-${userAgent || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get winners by category
   */
  async getWinnersByCategory(categoryId: string, _userRole: string) {
    // P2-2 OPTIMIZATION: Selective field loading
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        contestId: true,
        contest: {
          select: {
            id: true,
            name: true,
            eventId: true,
            event: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        criteria: {
          select: {
            id: true,
            maxScore: true,
          },
        },
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get all scores for this category
    // P2-2 OPTIMIZATION: Selective field loading
    const scores = await this.prisma.score.findMany({
      where: {
        categoryId,
        score: { not: null },
      },
      select: {
        id: true,
        contestantId: true,
        judgeId: true,
        score: true,
        contestant: {
          select: {
            id: true,
            name: true,
            contestantNumber: true,
          },
        },
        judge: {
          select: {
            id: true,
            name: true,
          },
        },
        criterion: {
          select: {
            id: true,
            maxScore: true,
          },
        },
      },
    });

    // Get overall deductions for this category
    const deductions = await this.prisma.overallDeduction.findMany({
      where: { categoryId },
      select: {
        contestantId: true,
        deduction: true,
      },
    });

    // Calculate total possible score (sum of all criteria max scores)
    const totalPossibleScore = category.criteria?.reduce(
      (sum: number, criterion) => sum + (criterion.maxScore || 0),
      0
    ) || 0;

    // Group scores by contestant and calculate totals
    const contestantTotals = new Map<string, ContestantTotals>();

    for (const score of scores) {
      if (!score.contestantId || score.score === null) continue;
      
      const contestant = score.contestant;
      if (!contestant) continue;

      if (!contestantTotals.has(score.contestantId)) {
        contestantTotals.set(score.contestantId, {
          contestant: contestant,
          totalScore: 0,
          scores: [],
          judgesScored: new Set(),
        });
      }

      const contestantData = contestantTotals.get(score.contestantId)!;
      contestantData.totalScore += score.score || 0;
      contestantData.scores.push(score);
      contestantData.judgesScored.add(score.judgeId);
    }

    // Apply deductions
    for (const deduction of deductions) {
      if (contestantTotals.has(deduction.contestantId)) {
        const contestantData = contestantTotals.get(deduction.contestantId)!;
        contestantData.totalScore -= deduction.deduction;
      }
    }

    // Convert to array and sort by total score (descending)
    const winners = Array.from(contestantTotals.values())
      .map((data) => ({
        contestant: data.contestant,
        totalScore: Math.max(0, data.totalScore), // Ensure non-negative
        totalPossibleScore: totalPossibleScore > 0 ? totalPossibleScore : null,
        scores: data.scores,
        judgesScored: Array.from(data.judgesScored),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    // Get certification status
    const categoryCertifications = await this.prisma.categoryCertification.findMany({
      where: { categoryId },
      select: {
        userId: true,
        role: true,
        certifiedAt: true,
      },
      // include removed - no user relation in schema
    });

    const judgeCertifications = await this.prisma.judgeCertification.findMany({
      where: { categoryId },
      select: {
        judgeId: true,
        certifiedAt: true,
        signatureName: true,
      },
    });

    const allSigned = judgeCertifications.length > 0;
    const boardSigned = categoryCertifications.some((c) => c.role === 'BOARD');
    const canShowWinners = boardSigned || _userRole === 'ADMIN' || _userRole === 'BOARD';

    return {
      category,
      contestants: winners,
      totalPossibleScore: totalPossibleScore > 0 ? totalPossibleScore : null,
      allSigned,
      boardSigned,
      canShowWinners,
      signatures: categoryCertifications.map((c) => ({
        userId: c.userId, // Use userId instead of user relation
        role: c.role,
        certifiedAt: c.certifiedAt,
      })),
      message: 'Winners calculated successfully',
    };
  }

  /**
   * Get winners by contest
   */
  async getWinnersByContest(
    contestId: string,
    _userRole: string,
    includeCategoryBreakdown = true
  ) {
    // P2-2 OPTIMIZATION: Selective field loading
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      select: {
        id: true,
        name: true,
        eventId: true,
        event: {
          select: {
            id: true,
            name: true
          }
        },
        categories: {
          select: {
            id: true,
            name: true,
            criteria: {
              select: {
                id: true,
                maxScore: true,
              },
            },
          },
        },
      },
    });

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    const categories = contest.categories || [];
    const categoryWinners: Array<{
      category: CategoryWithDetails;
      contestants: CategoryWinner[];
      totalPossibleScore: number;
      allSigned: boolean;
      boardSigned: boolean;
      canShowWinners: boolean;
    }> = [];

    // Get winners for each category
    for (const category of categories) {
      try {
        const categoryResult = await this.getWinnersByCategory(category.id, _userRole);
        categoryWinners.push({
          category: categoryResult.category,
          contestants: categoryResult.contestants,
          totalPossibleScore: categoryResult.totalPossibleScore,
          allSigned: categoryResult.allSigned,
          boardSigned: categoryResult.boardSigned,
          canShowWinners: categoryResult.canShowWinners,
        });
      } catch (error) {
        // Skip categories that fail (e.g., no scores yet)
        console.error(`Error getting winners for category ${category.id}:`, error);
      }
    }

    // Calculate overall contest winners (sum across all categories)
    const contestantTotals = new Map<string, ContestWinner>();

    for (const categoryData of categoryWinners) {
      if (!categoryData.canShowWinners && _userRole !== 'ADMIN' && _userRole !== 'BOARD') {
        continue; // Skip uncertified categories for non-admins
      }

      for (const contestantData of categoryData.contestants || []) {
        const contestantId = contestantData.contestant?.id;
        if (!contestantId) continue;

        if (!contestantTotals.has(contestantId)) {
          contestantTotals.set(contestantId, {
            contestant: contestantData.contestant,
            totalScore: 0,
            totalPossibleScore: 0,
            categoriesParticipated: 0,
          });
        }

        const totals = contestantTotals.get(contestantId)!;
        totals.totalScore += contestantData.totalScore || 0;
        totals.totalPossibleScore += contestantData.totalPossibleScore || 0;
        totals.categoriesParticipated += 1;
      }
    }

    // Sort overall winners by total score
    const overallWinners = Array.from(contestantTotals.values())
      .sort((a, b) => b.totalScore - a.totalScore);

    return {
      contest,
      categories: includeCategoryBreakdown ? categoryWinners : undefined,
      contestants: overallWinners,
      message: 'Contest winners calculated successfully',
    };
  }

  /**
   * Sign winners for a category
   */
  async signWinners(
    categoryId: string,
    userId: string,
    userRole: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        contestId: true,
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    const signature = this.generateSignature(
      userId,
      categoryId,
      userRole,
      ipAddress,
      userAgent
    );

    // Check if already signed
    const existingCertification = await this.prisma.categoryCertification.findFirst({
      where: {
        categoryId,
        userId,
        role: userRole,
        tenantId,
      },
    });

    if (existingCertification) {
      throw this.conflictError('User has already signed this category');
    }

    // Get user details for signature name
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create certification record
    const certification = await this.prisma.categoryCertification.create({
      data: {
        categoryId,
        userId,
        role: userRole,
        signatureName: user?.name || 'Unknown User',
        tenantId,
        comments: `Signed from IP: ${ipAddress || 'unknown'}, User-Agent: ${userAgent || 'unknown'}`,
      },
    });

    return {
      message: 'Winners signed successfully',
      signature,
      categoryId,
      certificationId: certification.id,
      certifiedAt: certification.certifiedAt,
    };
  }

  /**
   * Get signature status for a category
   */
  async getSignatureStatus(categoryId: string, userId: string, tenantId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Check if user has signed this category
    const certification = await this.prisma.categoryCertification.findFirst({
      where: {
        categoryId,
        userId,
        tenantId,
      },
    });

    const signed = !!certification;
    const signature = certification
      ? this.generateSignature(userId, categoryId, certification.role)
      : null;

    return {
      categoryId,
      userId,
      signed,
      signature,
      certifiedAt: certification?.certifiedAt || null,
      role: certification?.role || null,
      signatureName: certification?.signatureName || null,
    };
  }

  /**
   * Get certification progress for a category
   */
  async getCertificationProgress(categoryId: string, tenantId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Required roles for full certification
    const requiredRoles = ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'];

    // Get all certifications for this category
    const categoryCertifications = await this.prisma.categoryCertification.findMany({
      where: { categoryId, tenantId },
      select: { role: true, userId: true, certifiedAt: true, signatureName: true },
    });

    const judgeCertifications = await this.prisma.judgeCertification.findMany({
      where: { categoryId, tenantId },
      select: { judgeId: true, certifiedAt: true, signatureName: true },
    });

    // Track which roles have certified
    const rolesCertified = new Set<string>();

    // Check category certifications
    for (const cert of categoryCertifications) {
      rolesCertified.add(cert.role);
    }

    // If there are judge certifications, mark JUDGE role as certified
    if (judgeCertifications.length > 0) {
      rolesCertified.add('JUDGE');
    }

    const rolesCertifiedArray = Array.from(rolesCertified);
    const rolesRemaining = requiredRoles.filter(role => !rolesCertified.has(role));

    // Calculate progress
    const certificationProgress = Math.round(
      (rolesCertifiedArray.length / requiredRoles.length) * 100
    );

    // All roles must be certified for full certification
    const totalsCertified = rolesRemaining.length === 0;

    return {
      categoryId,
      totalsCertified,
      certificationProgress,
      rolesCertified: rolesCertifiedArray,
      rolesRemaining,
      requiredRoles,
      judgeCount: judgeCertifications.length,
      categoryCertificationCount: categoryCertifications.length,
    };
  }

  /**
   * Get role-specific certification status
   */
  async getRoleCertificationStatus(categoryId: string, role: string, tenantId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Check role-specific certification status
    if (role === 'JUDGE') {
      // For judges, check if any judge has certified
      // P2-2 OPTIMIZATION: Selective field loading
      const judgeCertifications = await this.prisma.judgeCertification.findMany({
        where: { categoryId, tenantId },
        select: {
          judgeId: true,
          signatureName: true,
          certifiedAt: true
        }
      });

      const certified = judgeCertifications.length > 0;
      const lastCertification = judgeCertifications[judgeCertifications.length - 1];

      return {
        categoryId,
        role,
        certified,
        certifiedBy: lastCertification?.signatureName || null,
        certifiedAt: lastCertification?.certifiedAt || null,
        count: judgeCertifications.length,
        certifications: judgeCertifications.map(cert => ({
          judgeId: cert.judgeId,
          judgeName: null, // Judge relation not available in schema
          signatureName: cert.signatureName,
          certifiedAt: cert.certifiedAt,
        })),
      };
    } else {
      // For other roles, check category certifications
      // P2-2 OPTIMIZATION: Selective field loading
      const certification = await this.prisma.categoryCertification.findFirst({
        where: { categoryId, role, tenantId },
        select: {
          userId: true,
          signatureName: true,
          certifiedAt: true,
          comments: true,
          category: {
            select: {
              name: true
            }
          }
        }
      });

      return {
        categoryId,
        role,
        certified: !!certification,
        certifiedBy: certification?.signatureName || null,
        certifiedAt: certification?.certifiedAt || null,
        userId: certification?.userId || null,
        comments: certification?.comments || null,
      };
    }
  }

  /**
   * Certify scores for a category
   */
  async certifyScores(
    categoryId: string,
    userId: string,
    userRole: string,
    tenantId: string,
    comments?: string
  ) {
    // P2-2 OPTIMIZATION: Selective field loading
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        contestId: true,
        contest: {
          select: {
            id: true,
            name: true,
            eventId: true,
            event: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Verify role permissions
    const allowedRoles = ['ADMIN', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'];
    if (!allowedRoles.includes(userRole)) {
      throw this.forbiddenError(
        `Role ${userRole} is not authorized to certify scores. Allowed roles: ${allowedRoles.join(', ')}`
      );
    }

    // Check if this role has already certified
    const existingCertification = await this.prisma.categoryCertification.findFirst({
      where: {
        categoryId,
        role: userRole,
        tenantId,
      },
    });

    if (existingCertification) {
      throw this.conflictError(
        `Role ${userRole} has already certified this category on ${existingCertification.certifiedAt.toISOString()}`
      );
    }

    // Get user details
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Verify there are scores to certify
    const scoreCount = await this.prisma.score.count({
      where: {
        categoryId,
        score: { not: null },
      },
    });

    if (scoreCount === 0) {
      throw this.badRequestError('Cannot certify category with no scores');
    }

    // Create certification record
    const certification = await this.prisma.categoryCertification.create({
      data: {
        categoryId,
        userId,
        role: userRole,
        signatureName: user?.name || 'Unknown User',
        tenantId,
        comments: comments || `Certified by ${userRole}`,
      },
    });

    // Update the Certification workflow if it exists
    const certificationWorkflow = await this.prisma.certification.findFirst({
      where: {
        categoryId,
        tenantId,
      },
    });

    if (certificationWorkflow) {
      // Update workflow based on role
      const updates: {
        tallyCertified?: boolean;
        auditorCertified?: boolean;
        boardApproved?: boolean;
        currentStep?: number;
        status?: string;
      } = {};

      if (userRole === 'TALLY_MASTER') {
        updates.tallyCertified = true;
        updates.currentStep = Math.max(certificationWorkflow.currentStep, 2);
      } else if (userRole === 'AUDITOR') {
        updates.auditorCertified = true;
        updates.currentStep = Math.max(certificationWorkflow.currentStep, 3);
      } else if (userRole === 'BOARD') {
        updates.boardApproved = true;
        updates.currentStep = Math.max(certificationWorkflow.currentStep, 4);
      }

      // Check if all required roles have certified
      const allCertified =
        (updates.tallyCertified ?? certificationWorkflow.tallyCertified) &&
        (updates.auditorCertified ?? certificationWorkflow.auditorCertified) &&
        (updates.boardApproved ?? certificationWorkflow.boardApproved);

      if (allCertified) {
        (updates as any).status = 'CERTIFIED';
      } else if ((certificationWorkflow as any).status === 'PENDING') {
        (updates as any).status = 'IN_PROGRESS';
      }

      await this.prisma.certification.update({
        where: { id: certificationWorkflow.id },
        data: updates,
      });
    }

    // Get updated progress
    const progress = await this.getCertificationProgress(categoryId, tenantId);

    return {
      message: 'Scores certified successfully',
      categoryId,
      certifiedBy: userId,
      certifiedByName: user?.name,
      role: userRole,
      certificationId: certification.id,
      certifiedAt: certification.certifiedAt,
      progress: progress.certificationProgress,
      totalsCertified: progress.totalsCertified,
      rolesRemaining: progress.rolesRemaining,
    };
  }

  /**
   * Get all winners (general query)
   */
  async getWinners(eventId?: string, contestId?: string) {
    if (contestId) {
      return this.getWinnersByContest(contestId, 'ADMIN');
    }

    if (eventId) {
      // P2-2 OPTIMIZATION: Selective field loading
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          name: true,
          contests: {
            select: {
              id: true,
              name: true,
              categories: {
                select: {
                  id: true,
                  name: true,
                  criteria: {
                    select: {
                      id: true,
                      maxScore: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw this.notFoundError('Event', eventId);
      }

      const contestWinners: Array<{
        contest: ContestWithDetails;
        contestants: ContestWinner[];
        categories?: Array<{
          category: CategoryWithDetails;
          contestants: CategoryWinner[];
          totalPossibleScore: number;
          allSigned: boolean;
          boardSigned: boolean;
          canShowWinners: boolean;
        }>;
      }> = [];

      // Get winners for each contest
      for (const contest of event.contests || []) {
        try {
          const contestResult = await this.getWinnersByContest(contest.id, 'ADMIN', true);
          contestWinners.push({
            contest: contestResult.contest,
            contestants: contestResult.contestants,
            categories: contestResult.categories,
          });
        } catch (error) {
          console.error(`Error getting winners for contest ${contest.id}:`, error);
        }
      }

      return {
        event,
        contests: contestWinners,
        message: 'Event winners retrieved successfully',
      };
    }

    // Return empty result if no filters
    return {
      winners: [],
      message: 'No filters provided',
    };
  }
}
