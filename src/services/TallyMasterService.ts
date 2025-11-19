
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, UserRole, Prisma } from '@prisma/client';

// P2-4: Comprehensive type definitions for Tally Master service
type CategoryWithScoresAndContest = Prisma.CategoryGetPayload<{
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
  };
}>;

type CategoryWithCertifications = Prisma.CategoryGetPayload<{
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
    scores: {
      include: {
        judge: true;
        contestant: true;
      };
    };
    categoryCertifications: true;
  };
}>;

type CategoryWithScoreDetails = Prisma.CategoryGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    scoreCap: true;
    contest: {
      select: {
        id: true;
        name: true;
        event: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
    scores: {
      select: {
        id: true;
        score: true;
        comment: true;
        createdAt: true;
        contestantId: true;
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
      };
    };
  };
}>;

type CategoryWithBiasData = Prisma.CategoryGetPayload<{
  include: {
    scores: {
      include: {
        judge: {
          select: {
            id: true;
            name: true;
            preferredName: true;
            email: true;
            role: true;
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
  };
}>;

type ContestWithDetails = Prisma.ContestGetPayload<{
  include: {
    event: true;
    categories: {
      include: {
        scores: {
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
          };
        };
      };
    };
  };
}>;

type CategoryWithJudges = Prisma.CategoryGetPayload<{
  include: {
    scores: {
      include: {
        judge: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

type ContestWithCertificationData = Prisma.ContestGetPayload<{
  include: {
    event: {
      select: {
        id: true;
        name: true;
      };
    };
    categories: {
      include: {
        criteria: {
          select: {
            id: true;
            name: true;
            maxScore: true;
          };
        };
        scores: {
          include: {
            judge: {
              select: {
                id: true;
                name: true;
              };
            };
            contestant: {
              select: {
                id: true;
                contestantNumber: true;
                users: {
                  select: {
                    id: true;
                    name: true;
                  };
                  take: 1;
                };
              };
            };
          };
        };
        categoryJudges: {
          include: {
            judge: {
              include: {
                users: {
                  select: {
                    id: true;
                    name: true;
                  };
                  take: 1;
                };
              };
            };
          };
        };
        categoryContestants: {
          include: {
            contestant: {
              include: {
                users: {
                  select: {
                    id: true;
                    name: true;
                  };
                  take: 1;
                };
              };
            };
          };
        };
      };
    };
  };
}>;

interface TallyMasterStats {
  totalCategories: number;
  pendingTotals: number;
  certifiedTotals: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ContestantScoreGroup {
  contestant: {
    id: string;
    name: string;
    contestantNumber: string;
  };
  scores: Array<{
    id: string;
    score: number;
    comment: string;
    createdAt: Date;
    contestantId: string;
    judge: {
      id: string;
      name: string;
      email: string;
    };
    contestant: {
      id: string;
      name: string;
      contestantNumber: string;
    };
    criterion: {
      id: string;
      name: string;
      maxScore: number;
    } | null;
  }>;
  totalScore: number;
  averageScore: number;
  scoreCount: number;
}

interface JudgeScoreGroup {
  judge: {
    id: string;
    name: string;
    preferredName: string;
    email: string;
    role: UserRole;
  };
  scores: Array<{
    id: string;
    score: number;
  }>;
  totalScore: number;
  averageScore: number;
  scoreCount: number;
}

interface BiasAnalysisResult {
  judge: {
    id: string;
    name: string;
    preferredName: string;
    email: string;
    role: UserRole;
  };
  averageScore: number;
  scoreCount: number;
  deviation: number;
  deviationPercentage: number;
  potentialBias: boolean;
}

interface JudgeBreakdown {
  judge: {
    id: string;
    name: string;
    email: string;
  };
  categories: string[];
  contestants: string[];
  scores: Array<{
    id: string;
    score: number;
    categoryId: string;
    categoryName: string;
  }>;
  totalScore: number;
}

interface ContestantBreakdown {
  contestant: {
    id: string;
    name: string;
    contestantNumber: string;
  };
  categories: string[];
  judges: string[];
  scores: Array<{
    id: string;
    score: number;
    categoryId: string;
    categoryName: string;
  }>;
  totalScore: number;
}

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
  async getStats(): Promise<TallyMasterStats> {
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
  async getCertifications(page: number = 1, limit: number = 20): Promise<{
    categories: CategoryWithScoresAndContest[];
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    const categories = await this.prisma.category.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }) as CategoryWithScoresAndContest[];

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
  async getCertificationQueue(page: number = 1, limit: number = 20): Promise<{
    categories: CategoryWithCertifications[];
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    const allCategories = await this.prisma.category.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    }) as CategoryWithCertifications[];

    // Filter categories where all judges have certified but tally master hasn't
    const pendingItems = await Promise.all(
      allCategories.map(async (category) => {
        const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
          where: { categoryId: category.id },
        });
        const hasTallyCert = category.categoryCertifications.length > 0;
        const allJudgesCertified =
          category.scores.length === 0 || category.scores.every((s) => s.isCertified === true);
        return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
          ? category
          : null;
      })
    );

    const categories = pendingItems.filter(Boolean) as CategoryWithCertifications[];
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
  async getPendingCertifications(page: number = 1, limit: number = 20): Promise<{
    categories: Array<CategoryWithCertifications & {
      certificationStatus: {
        currentStep: number;
        totalSteps: number;
        statusLabel: string;
        statusColor: string;
        allJudgesCertified: boolean;
      };
    }>;
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    const allCategories = await this.prisma.category.findMany({
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
      },
      orderBy: { createdAt: 'desc' },
    }) as CategoryWithCertifications[];

    const pendingItems = await Promise.all(
      allCategories.map(async (category) => {
        const hasJudgeCategoryCert = await this.prisma.judgeCertification.findFirst({
          where: { categoryId: category.id },
        });
        const hasTallyCert = category.categoryCertifications.length > 0;
        const allJudgesCertified =
          category.scores.length === 0 || category.scores.every((s) => s.isCertified === true);
        return hasJudgeCategoryCert && !hasTallyCert && allJudgesCertified && category.scores.length > 0
          ? category
          : null;
      })
    );

    const filteredCategories = pendingItems.filter((item): item is CategoryWithCertifications => item !== null);
    const total = filteredCategories.length;

    const categories = filteredCategories.slice(offset, offset + limit);

    // Add dynamic certification status
    const categoriesWithStatus = categories.map((category) => {
      const allJudgesCertified =
        category.scores.length > 0 && category.scores.every((s: any) => s.isCertified === true);
      const categoryAny = category as any;

      let currentStep = 1;
      const totalSteps = 4;
      let statusLabel = 'Waiting for Judges';
      let statusColor = 'warning';

      if (allJudgesCertified && !category.totalsCertified) {
        currentStep = 2;
        statusLabel = 'Ready for Tally Master';
        statusColor = 'success';
      } else if (category.totalsCertified && !categoryAny.tallyMasterCertified) {
        currentStep = 3;
        statusLabel = 'Ready for Tally Master Review';
        statusColor = 'info';
      } else if (categoryAny.tallyMasterCertified && !categoryAny.auditorCertified) {
        currentStep = 4;
        statusLabel = 'Ready for Auditor';
        statusColor = 'info';
      } else if (categoryAny.auditorCertified && !categoryAny.boardApproved) {
        currentStep = 5;
        statusLabel = 'Ready for Board';
        statusColor = 'success';
      } else if (categoryAny.boardApproved) {
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
  async certifyTotals(categoryId: string, _userId: string, _userRole: UserRole): Promise<Prisma.CategoryGetPayload<{
    include: {
      contest: {
        include: {
          event: true;
        };
      };
    };
  }>> {
    this.validateRequired({ categoryId } as unknown as Record<string, unknown>, ['categoryId']);

    const category = await this.prisma.category.findUnique({
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
  async getScoreReview(categoryId: string): Promise<{
    category: {
      id: string;
      name: string;
      description: string;
      scoreCap: number;
      maxScore: number;
    };
    contest: {
      id: string;
      name: string;
      eventName: string;
    };
    contestants: ContestantScoreGroup[];
    totalScores: number;
    uniqueContestants: number;
  }> {
    const category = await this.prisma.category.findUnique({
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
    }) as CategoryWithScoreDetails;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Group scores by contestant
    const contestantScores = category.scores.reduce((acc: Record<string, ContestantScoreGroup>, score) => {
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
      acc[key]!.scores.push(score);
      acc[key]!.totalScore += score.score;
      acc[key]!.scoreCount += 1;
      return acc;
    }, {} as Record<string, ContestantScoreGroup>);

    // Calculate averages
    Object.values(contestantScores).forEach((group) => {
      group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
    });

    const sortedContestants = Object.values(contestantScores).sort(
      (a, b) => b.averageScore - a.averageScore
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
  async getBiasCheckingTools(categoryId: string): Promise<{
    category: {
      id: string;
      name: string;
      description: string;
      maxScore: number;
    };
    overallAverage: number;
    totalScores: number;
    uniqueJudges: number;
    biasAnalysis: BiasAnalysisResult[];
    recommendations: string[];
  }> {
    const category = await this.prisma.category.findUnique({
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
      },
    }) as CategoryWithBiasData;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Analyze scores by judge
    const judgeScores = category.scores.reduce((acc: Record<string, JudgeScoreGroup>, score) => {
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
      acc[key]!.scores.push({ id: score.id, score: score.score });
      acc[key]!.totalScore += score.score;
      acc[key]!.scoreCount += 1;
      return acc;
    }, {} as Record<string, JudgeScoreGroup>);

    // Calculate judge averages
    Object.values(judgeScores).forEach((group) => {
      group.averageScore = group.scoreCount > 0 ? group.totalScore / group.scoreCount : 0;
    });

    // Calculate overall average
    const overallAverage =
      category.scores.length > 0
        ? category.scores.reduce((sum, s) => sum + s.score, 0) / category.scores.length
        : 0;

    // Identify potential bias
    const biasAnalysis = Object.values(judgeScores)
      .map((judge): BiasAnalysisResult => {
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
        maxScore: (category as any).maxScore,
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
  async getTallyMasterHistory(page: number = 1, limit: number = 10): Promise<{
    categories: Array<Prisma.CategoryGetPayload<{
      include: {
        contest: {
          include: {
            event: true;
          };
        };
      };
    }>>;
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    const categories = await this.prisma.category.findMany({
      where: {
        totalsCertified: true,
      },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: offset,
      take: limit,
    });

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
  async getContestScoreReview(contestId: string): Promise<{
    contest: {
      id: string;
      name: string;
      event: Prisma.EventGetPayload<{}>;
    };
    summary: {
      totalCategories: number;
      uniqueJudges: number;
      uniqueContestants: number;
      totalScores: number;
    };
    judgeBreakdown: JudgeBreakdown[];
    contestantBreakdown: ContestantBreakdown[];
  }> {
    const contest = await this.prisma.contest.findUnique({
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
        },
      },
    }) as ContestWithDetails;

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    // Group by judge
    const judgeBreakdown: Record<string, {
      judge: {
        id: string;
        name: string;
        email: string;
      };
      categories: Set<string>;
      contestants: Set<string>;
      scores: Array<{
        id: string;
        score: number;
        categoryId: string;
        categoryName: string;
      }>;
      totalScore: number;
    }> = {};

    contest.categories.forEach((category) => {
      category.scores.forEach((score) => {
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
        judgeBreakdown[judgeId]!.scores.push({
          id: score.id,
          score: score.score,
          categoryId: category.id,
          categoryName: category.name
        });
        judgeBreakdown[judgeId]!.categories.add(category.id);
        judgeBreakdown[judgeId]!.contestants.add(score.contestantId);
        if (score.score) {
          judgeBreakdown[judgeId]!.totalScore += score.score;
        }
      });
    });

    // Convert Sets to arrays
    const judgeBreakdownArray: JudgeBreakdown[] = Object.values(judgeBreakdown).map((judge) => ({
      judge: judge.judge,
      categories: Array.from(judge.categories),
      contestants: Array.from(judge.contestants),
      scores: judge.scores,
      totalScore: judge.totalScore,
    }));

    // Group by contestant
    const contestantBreakdown: Record<string, {
      contestant: {
        id: string;
        name: string;
        contestantNumber: string;
      };
      categories: Set<string>;
      judges: Set<string>;
      scores: Array<{
        id: string;
        score: number;
        categoryId: string;
        categoryName: string;
      }>;
      totalScore: number;
    }> = {};

    contest.categories.forEach((category) => {
      category.scores.forEach((score) => {
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
        contestantBreakdown[contestantId]!.scores.push({
          id: score.id,
          score: score.score,
          categoryId: category.id,
          categoryName: category.name
        });
        contestantBreakdown[contestantId]!.categories.add(category.id);
        contestantBreakdown[contestantId]!.judges.add(score.judgeId);
        if (score.score) {
          contestantBreakdown[contestantId]!.totalScore += score.score;
        }
      });
    });

    // Convert Sets to arrays
    const contestantBreakdownArray: ContestantBreakdown[] = Object.values(contestantBreakdown).map((contestant) => ({
      contestant: contestant.contestant,
      categories: Array.from(contestant.categories),
      judges: Array.from(contestant.judges),
      scores: contestant.scores,
      totalScore: contestant.totalScore,
    }));

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
        totalScores: contest.categories.reduce((sum, cat) => sum + cat.scores.length, 0),
      },
      judgeBreakdown: judgeBreakdownArray,
      contestantBreakdown: contestantBreakdownArray,
    };
  }

  /**
   * Get judges for a category
   */
  async getCategoryJudges(categoryId: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
  }>> {
    const category = await this.prisma.category.findUnique({
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
    }) as CategoryWithJudges;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get unique judges
    const uniqueJudgesMap = new Map<string, {
      id: string;
      name: string;
      email: string;
    }>();
    category.scores.forEach((score) => {
      if (score.judge && !uniqueJudgesMap.has(score.judge.id)) {
        uniqueJudgesMap.set(score.judge.id, score.judge);
      }
    });

    return Array.from(uniqueJudgesMap.values());
  }

  /**
   * Get contest certifications
   */
  async getContestCertifications(contestId: string): Promise<{
    contestId: string;
    contestName: string;
    event: {
      id: string;
      name: string;
    };
    categories: Array<{
      categoryId: string;
      categoryName: string;
      totalJudges: number;
      totalContestants: number;
      expectedScores: number;
      actualScores: number;
      scoringCompletion: number;
      expectedCertifications: number;
      completedCertifications: number;
      certificationCompletion: number;
    }>;
    totalCategories: number;
    averageScoringCompletion: number;
    averageCertificationCompletion: number;
  }> {
    const contest = await this.prisma.contest.findUnique({
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
                  }
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
          }
        }
      }
    }) as ContestWithCertificationData;

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    // Calculate certification status for each category
    const categoriesWithStatus = await Promise.all(
      contest.categories.map(async (category) => {
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
  ): Promise<{
    requests: Array<{
      id: string;
      categoryId: string;
      contestantId: string;
      judgeId: string;
      reason: string;
      status: string;
      requestedAt: Date;
      reviewedAt: Date | null;
      reviewedById: string;
      category: {
        id: string;
        name: string;
        contest: {
          id: string;
          name: string;
          event: {
            id: string;
            name: string;
          };
        };
      } | null;
      contestant: {
        id: string;
        contestantNumber: string;
        user: {
          id: string;
          name: string;
          email: string;
        } | null;
      } | null;
      judge: {
        id: string;
        name: string;
        user: {
          id: string;
          name: string;
          email: string;
        } | null;
      } | null;
    }>;
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    const whereClause: Prisma.JudgeScoreRemovalRequestWhereInput = {};
    if (status) {
      (whereClause as any).status = status;
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

    const requests = await this.prisma.judgeScoreRemovalRequest.findMany({
      where: whereClause,
      orderBy: { requestedAt: 'desc' },
      skip: offset,
      take: limit,
    });

    // Fetch related data separately since there are no explicit relations
    const requestsWithDetails = await Promise.all(
      requests.map(async (req) => {
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
          }),
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
          }),
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
          }),
        ]);

        return {
          id: req.id,
          categoryId: req.categoryId,
          contestantId: req.contestantId,
          judgeId: req.judgeId,
          reason: req.reason,
          status: (req as any).status,
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
