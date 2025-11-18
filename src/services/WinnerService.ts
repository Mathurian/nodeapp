import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import * as crypto from 'crypto';

// TODO: Use this interface when implementing full winner calculation
// interface WinnerCalculation {
//   contestant: any;
//   totalScore: number;
//   totalPossibleScore: number;
//   scores: any[];
//   judgesScored: Set<string>;
// }

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
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
        criteria: {
          select: {
            id: true,
            maxScore: true,
          },
        },
      } as any,
    } as any);

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get all scores for this category
    const scores: any = await this.prisma.score.findMany({
      where: {
        categoryId,
        score: { not: null },
      },
      include: {
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
      } as any,
    } as any);

    // Get overall deductions for this category
    const deductions = await this.prisma.overallDeduction.findMany({
      where: { categoryId },
    });

    // Calculate total possible score (sum of all criteria max scores)
    const totalPossibleScore = category.criteria?.reduce(
      (sum: number, criterion: any) => sum + (criterion.maxScore || 0),
      0
    ) || 0;

    // Group scores by contestant and calculate totals
    const contestantTotals = new Map<string, {
      contestant: any;
      totalScore: number;
      scores: any[];
      judgesScored: Set<string>;
    }>();

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
      where: { categoryId }
      // include removed - no user relation in schema
    });

    const judgeCertifications = await this.prisma.judgeCertification.findMany({
      where: { categoryId },
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
    const contest: any = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: true,
        categories: {
          include: {
            criteria: {
              select: {
                id: true,
                maxScore: true,
              },
            },
          },
        },
      } as any,
    } as any);

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    const categories = contest.categories || [];
    const categoryWinners: any[] = [];

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
    const contestantTotals = new Map<string, {
      contestant: any;
      totalScore: number;
      totalPossibleScore: number;
      categoriesParticipated: number;
    }>();

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
   * TODO: Implement full signature and certification logic
   */
  async signWinners(
    categoryId: string,
    userId: string,
    userRole: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
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

    // TODO: Store signature and create certification record

    return {
      message: 'Winners signed successfully (placeholder)',
      signature,
      categoryId,
    };
  }

  /**
   * Get signature status for a category
   */
  async getSignatureStatus(categoryId: string, userId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // TODO: Check if user has signed this category
    const signed = false;
    const signature = null;

    return {
      categoryId,
      userId,
      signed,
      signature,
    };
  }

  /**
   * Get certification progress for a category
   */
  async getCertificationProgress(categoryId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // TODO: Calculate certification progress
    // - Check which roles have certified
    // - Calculate percentage complete

    return {
      categoryId,
      totalsCertified: false,
      certificationProgress: 0,
      rolesCertified: [] as string[],
      rolesRemaining: [] as string[],
    };
  }

  /**
   * Get role-specific certification status
   */
  async getRoleCertificationStatus(categoryId: string, role: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // TODO: Check role-specific certification status

    return {
      categoryId,
      role,
      certified: false,
      certifiedBy: null,
      certifiedAt: null,
    };
  }

  /**
   * Certify scores for a category
   */
  async certifyScores(
    categoryId: string,
    userId: string,
    userRole: string
  ) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // TODO: Implement score certification
    // - Verify role permissions
    // - Create certification record
    // - Update category status

    return {
      message: 'Scores certified successfully (placeholder)',
      categoryId,
      certifiedBy: userId,
      role: userRole,
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
      const event: any = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: {
          contests: {
            include: {
              categories: {
                include: {
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
        } as any,
      } as any);

      if (!event) {
        throw this.notFoundError('Event', eventId);
      }

      const contestWinners: any[] = [];

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
