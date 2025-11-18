
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, UserRole } from '@prisma/client';

/**
 * Service for Tally Master functionality
 * Handles score review, bias checking, and certification workflow
 */
@injectable()
export class TallyMasterService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }
  /**
   * Get tally master dashboard statistics
   */
  async getStats() {
    const stats = {
      totalCategories: await this.prisma.category.count(),
      pendingTotals: await this.prisma.category.count({
        where: { totalsCertified: false },
      }),
      certifiedTotals: await this.prisma.category.count({
        where: { totalsCertified: true },
      }),
    };

    return stats;
  }

  /**
   * Get certified categories with pagination
   */
  async getCertifications(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const categories: any = await this.prisma.category.findMany({
      where: { totalsCertified: true },
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
      } as any,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    } as any);

    const total = await this.prisma.category.count({
      where: { totalsCertified: true },
    });

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get certification queue (categories ready for tally master review)
   */
  async getCertificationQueue(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const allCategories: any = await this.prisma.category.findMany({
      where: { totalsCertified: false },
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
        scores: {
          include: {
            judge: true,
            contestant: true,
          },
        },
        categoryCertifications: {
          where: {
            role: 'TALLY_MASTER',
          },
        },
      } as any,
      orderBy: { createdAt: 'desc' },
    } as any);

    // Filter categories where all judges have certified but tally master hasn't
    const pendingItems = await Promise.all(
      allCategories.map(async (category: any) => {
        const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
          where: { categoryId: category.id },
        });
        const hasTallyCert = category.categoryCertifications.length > 0;
        const allJudgesCertified =
          category.scores.length === 0 || category.scores.every((s: any) => s.isCertified === true);
        return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
          ? category
          : null;
      })
    );

    const categories = pendingItems.filter(Boolean);
    const total = categories.length;

    const paginatedCategories = categories.slice(offset, offset + limit);

    return {
      categories: paginatedCategories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pending certifications with status
   */
  async getPendingCertifications(page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const allCategories: any = await this.prisma.category.findMany({
      where: { totalsCertified: false },
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
        scores: {
          include: {
            judge: true,
            contestant: true,
          },
        },
        categoryCertifications: {
          where: {
            role: 'TALLY_MASTER',
          },
        },
      } as any,
      orderBy: { createdAt: 'desc' },
    } as any);

    const pendingItems = await Promise.all(
      allCategories.map(async (category: any) => {
        const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
          where: { categoryId: category.id },
        });
        const hasTallyCert = category.categoryCertifications.length > 0;
        const allJudgesCertified =
          category.scores.length === 0 || category.scores.every((s: any) => s.isCertified === true);
        return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
          ? category
          : null;
      })
    );

    const filteredCategories = pendingItems.filter(Boolean) as any[];
    const total = filteredCategories.length;

    const categories = filteredCategories.slice(offset, offset + limit);

    // Add dynamic certification status
    const categoriesWithStatus = categories.map((category: any) => {
      const allJudgesCertified =
        category.scores.length > 0 && category.scores.every((s: any) => s.isCertified === true);
      const judgeStatus = allJudgesCertified ? 'COMPLETED' : 'PENDING';

      let currentStep = 1;
      const totalSteps = 4;
      let statusLabel = 'Waiting for Judges';
      let statusColor = 'warning';

      if (allJudgesCertified && !category.totalsCertified) {
        currentStep = 2;
        statusLabel = 'Ready for Tally Master';
        statusColor = 'success';
      } else if (category.totalsCertified && !category.tallyMasterCertified) {
        currentStep = 3;
        statusLabel = 'Ready for Tally Master Review';
        statusColor = 'info';
      } else if (category.tallyMasterCertified && !category.auditorCertified) {
        currentStep = 4;
        statusLabel = 'Ready for Auditor';
        statusColor = 'info';
      } else if (category.auditorCertified && !category.boardApproved) {
        currentStep = 5;
        statusLabel = 'Ready for Board';
        statusColor = 'success';
      } else if (category.boardApproved) {
        currentStep = 6;
        statusLabel = 'Fully Certified';
        statusColor = 'success';
      }

      return {
        ...category,
        certificationStatus: {
          currentStep,
          totalSteps,
          statusLabel,
          statusColor,
          allJudgesCertified,
        },
      };
    });

    return {
      categories: categoriesWithStatus,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Certify category totals
   */
  async certifyTotals(categoryId: string, userId: string, userRole: UserRole) {
    this.validateRequired({ categoryId }, ['categoryId']);

    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      } as any,
    } as any);

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        totalsCertified: true,
      },
    });

    return updatedCategory;
  }

  /**
   * Get score review for a category
   */
  async getScoreReview(categoryId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        description: true,
        scoreCap: true,
        contest: {
          select: {
            id: true,
            name: true,
            event: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        scores: {
          select: {
            id: true,
            score: true,
            comment: true,
            createdAt: true,
            contestantId: true,
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
          orderBy: [{ contestant: { name: 'asc' } }],
        },
      },
    } as any);

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Group scores by contestant
    const contestantScores = category.scores.reduce((acc: any, score: any) => {
      const key = score.contestantId;
      if (!acc[key]) {
        acc[key] = {
          contestant: score.contestant,
          scores: [],
          totalScore: 0,
          averageScore: 0,
          scoreCount: 0,
        };
      }
      acc[key].scores.push(score);
      acc[key].totalScore += score.score;
      acc[key].scoreCount += 1;
      return acc;
    }, {});

    // Calculate averages
    Object.values(contestantScores).forEach((group: any) => {
      group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
    });

    const sortedContestants = Object.values(contestantScores).sort(
      (a: any, b: any) => b.averageScore - a.averageScore
    );

    return {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        scoreCap: category.scoreCap,
        maxScore: category.scoreCap,
      },
      contest: {
        id: category.contest.id,
        name: category.contest.name,
        eventName: category.contest.event.name,
      },
      contestants: sortedContestants,
      totalScores: category.scores.length,
      uniqueContestants: Object.keys(contestantScores).length,
    };
  }

  /**
   * Get bias checking tools analysis for a category
   */
  async getBiasCheckingTools(categoryId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                email: true,
                role: true,
              },
            },
            contestant: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                email: true,
                contestantNumber: true,
              },
            },
            criterion: {
              select: {
                id: true,
                name: true,
                description: true,
                maxScore: true,
              },
            },
          },
        },
      } as any,
    } as any);

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Analyze scores by judge
    const judgeScores = category.scores.reduce((acc: any, score: any) => {
      const key = score.judgeId;
      if (!acc[key]) {
        acc[key] = {
          judge: score.judge,
          scores: [],
          totalScore: 0,
          averageScore: 0,
          scoreCount: 0,
        };
      }
      acc[key].scores.push(score);
      acc[key].totalScore += score.score;
      acc[key].scoreCount += 1;
      return acc;
    }, {});

    // Calculate judge averages
    Object.values(judgeScores).forEach((group: any) => {
      group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
    });

    // Calculate overall average
    const overallAverage =
      category.scores.length > 0
        ? category.scores.reduce((sum: any, s: any) => sum + s.score, 0) / category.scores.length
        : 0;

    // Identify potential bias
    const biasAnalysis = Object.values(judgeScores)
      .map((judge: any) => {
        const deviation = Math.abs(judge.averageScore - overallAverage);
        const deviationPercentage = overallAverage > 0 ? (deviation / overallAverage) * 100 : 0;

        return {
          judge: judge.judge,
          averageScore: parseFloat(judge.averageScore.toFixed(2)),
          scoreCount: judge.scoreCount,
          deviation: parseFloat(deviation.toFixed(2)),
          deviationPercentage: parseFloat(deviationPercentage.toFixed(2)),
          potentialBias: deviationPercentage > 20,
        };
      })
      .sort((a, b) => b.deviationPercentage - a.deviationPercentage);

    return {
      category: {
        id: category.id,
        name: category.name,
        description: category.description,
        maxScore: category.maxScore,
      },
      overallAverage: parseFloat(overallAverage.toFixed(2)),
      totalScores: category.scores.length,
      uniqueJudges: Object.keys(judgeScores).length,
      biasAnalysis,
      recommendations: biasAnalysis
        .filter((j) => j.potentialBias)
        .map((j) => `Judge ${j.judge.name} shows potential bias with ${j.deviationPercentage}% deviation from average`),
    };
  }

  /**
   * Get tally master history
   */
  async getTallyMasterHistory(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const categories: any = await this.prisma.category.findMany({
      where: {
        tallyMasterCertified: true,
      },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      } as any,
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
    } as any);

    const total = await this.prisma.category.count();

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get contest score review
   */
  async getContestScoreReview(contestId: string) {
    const contest: any = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: true,
        categories: {
          include: {
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
          },
        } as any,
      } as any,
    } as any);

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    // Group by judge
    const judgeBreakdown: any = {};
    contest.categories.forEach((category: any) => {
      category.scores.forEach((score: any) => {
        const judgeId = score.judgeId;
        if (!judgeBreakdown[judgeId]) {
          judgeBreakdown[judgeId] = {
            judge: score.judge,
            categories: new Set(),
            contestants: new Set(),
            scores: [],
            totalScore: 0,
          };
        }
        judgeBreakdown[judgeId].scores.push({ ...score, categoryId: category.id, categoryName: category.name });
        judgeBreakdown[judgeId].categories.add(category.id);
        judgeBreakdown[judgeId].contestants.add(score.contestantId);
        if (score.score) {
          judgeBreakdown[judgeId].totalScore += score.score;
        }
      });
    });

    // Convert Sets to arrays
    Object.values(judgeBreakdown).forEach((judge: any) => {
      judge.categories = Array.from(judge.categories);
      judge.contestants = Array.from(judge.contestants);
    });

    // Group by contestant
    const contestantBreakdown: any = {};
    contest.categories.forEach((category: any) => {
      category.scores.forEach((score: any) => {
        const contestantId = score.contestantId;
        if (!contestantBreakdown[contestantId]) {
          contestantBreakdown[contestantId] = {
            contestant: score.contestant,
            categories: new Set(),
            judges: new Set(),
            scores: [],
            totalScore: 0,
          };
        }
        contestantBreakdown[contestantId].scores.push({ ...score, categoryId: category.id, categoryName: category.name });
        contestantBreakdown[contestantId].categories.add(category.id);
        contestantBreakdown[contestantId].judges.add(score.judgeId);
        if (score.score) {
          contestantBreakdown[contestantId].totalScore += score.score;
        }
      });
    });

    // Convert Sets to arrays
    Object.values(contestantBreakdown).forEach((contestant: any) => {
      contestant.categories = Array.from(contestant.categories);
      contestant.judges = Array.from(contestant.judges);
    });

    return {
      contest: {
        id: contest.id,
        name: contest.name,
        event: contest.event,
      },
      summary: {
        totalCategories: contest.categories.length,
        uniqueJudges: Object.keys(judgeBreakdown).length,
        uniqueContestants: Object.keys(contestantBreakdown).length,
        totalScores: contest.categories.reduce((sum: any, cat: any) => sum + cat.scores.length, 0),
      },
      judgeBreakdown: Object.values(judgeBreakdown),
      contestantBreakdown: Object.values(contestantBreakdown),
    };
  }

  /**
   * Get judges for a category
   */
  async getCategoryJudges(categoryId: string) {
    const category: any = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        scores: {
          include: {
            judge: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    } as any);

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get unique judges
    const uniqueJudgesMap = new Map();
    category.scores.forEach((score: any) => {
      if (score.judge && !uniqueJudgesMap.has(score.judge.id)) {
        uniqueJudgesMap.set(score.judge.id, score.judge);
      }
    });

    return Array.from(uniqueJudgesMap.values());
  }

  /**
   * Get contest certifications
   */
  async getContestCertifications(contestId: string) {
    const contest: any = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: {
          select: {
            id: true,
            name: true
          }
        },
        categories: {
          include: {
            criteria: {
              select: {
                id: true,
                name: true,
                maxScore: true
              }
            },
            scores: {
              include: {
                judge: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                contestant: {
                  select: {
                    id: true,
                    contestantNumber: true,
                    users: {
                      select: {
                        id: true,
                        name: true
                      },
                      take: 1
                    }
                  }
                }
              }
            },
            categoryJudges: {
              include: {
                judge: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true
                      },
                      take: 1
                    }
                  } as any
                }
              }
            },
            categoryContestants: {
              include: {
                contestant: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true
                      },
                      take: 1
                    }
                  }
                }
              }
            }
          } as any
        }
      } as any
    } as any);

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    // Calculate certification status for each category
    const categoriesWithStatus = await Promise.all(
      contest.categories.map(async (category: any) => {
        // Access judges and contestants through the correct relations (categoryJudges and categoryContestants)
        const totalJudges = Array.isArray(category.categoryJudges) ? category.categoryJudges.length : 0;
        const totalContestants = Array.isArray(category.categoryContestants) ? category.categoryContestants.length : 0;
        const criteriaCount = Array.isArray(category.criteria) ? category.criteria.length : 0;
        const expectedScores = totalJudges * totalContestants * criteriaCount;
        const actualScores = Array.isArray(category.scores) ? category.scores.length : 0;
        
        // Get certifications for this category
        const certifications = await this.prisma.judgeContestantCertification.findMany({
          where: { categoryId: category.id }
        });

        const expectedCertifications = totalJudges * totalContestants;
        const completedCertifications = Array.isArray(certifications) ? certifications.length : 0;

        return {
          categoryId: category.id,
          categoryName: category.name,
          totalJudges,
          totalContestants,
          expectedScores,
          actualScores,
          scoringCompletion: expectedScores > 0 ? Math.round((actualScores / expectedScores) * 100) : 0,
          expectedCertifications,
          completedCertifications,
          certificationCompletion: expectedCertifications > 0 
            ? Math.round((completedCertifications / expectedCertifications) * 100) 
            : 0
        };
      })
    );

    return {
      contestId: contest.id,
      contestName: contest.name,
      event: contest.event,
      categories: categoriesWithStatus,
      totalCategories: categoriesWithStatus.length,
      averageScoringCompletion: categoriesWithStatus.length > 0
        ? Math.round(categoriesWithStatus.reduce((sum, cat) => sum + cat.scoringCompletion, 0) / categoriesWithStatus.length)
        : 0,
      averageCertificationCompletion: categoriesWithStatus.length > 0
        ? Math.round(categoriesWithStatus.reduce((sum, cat) => sum + cat.certificationCompletion, 0) / categoriesWithStatus.length)
        : 0
    };
  }

  /**
   * Get score removal requests
   */
  async getScoreRemovalRequests(
    page: number = 1,
    limit: number = 20,
    status?: string,
    categoryId?: string,
    contestId?: string
  ) {
    const offset = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    if (contestId) {
      // If contestId is provided, get all categories for that contest first
      const categories = await this.prisma.category.findMany({
        where: { contestId },
        select: { id: true }
      });
      whereClause.categoryId = { in: categories.map(c => c.id) };
    }

    const requests: any = await this.prisma.judgeScoreRemovalRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Fetch related data separately since there are no explicit relations
    const requestsWithDetails = await Promise.all(
      requests.map(async (req: any) => {
        const [category, contestant, judge] = await Promise.all([
          this.prisma.category.findUnique({
            where: { id: req.categoryId },
            select: {
              id: true,
              name: true,
              contest: {
                select: {
                  id: true,
                  name: true,
                  event: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          } as any) as any,
          this.prisma.contestant.findUnique({
            where: { id: req.contestantId },
            select: {
              id: true,
              contestantNumber: true,
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
                take: 1,
              },
            },
          } as any) as any,
          this.prisma.judge.findUnique({
            where: { id: req.judgeId },
            select: {
              id: true,
              name: true,
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
                take: 1,
              },
            },
          } as any) as any,
        ]);

        return {
          id: req.id,
          categoryId: req.categoryId,
          contestantId: req.contestantId,
          judgeId: req.judgeId,
          reason: req.reason,
          status: req.status,
          requestedAt: req.requestedAt,
          reviewedAt: req.reviewedAt,
          reviewedById: req.reviewedById,
          category: category,
          contestant: contestant
            ? {
                id: contestant.id,
                contestantNumber: contestant.contestantNumber,
                user: contestant.users?.[0] || null,
              }
            : null,
          judge: judge
            ? {
                id: judge.id,
                name: judge.name,
                user: judge.users?.[0] || null,
              }
            : null,
        };
      })
    );

    const total = await this.prisma.judgeScoreRemovalRequest.count({
      where: whereClause,
    });

    return {
      requests: requestsWithDetails,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
