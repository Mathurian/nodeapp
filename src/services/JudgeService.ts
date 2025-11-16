import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

interface SubmitScoreData {
  categoryId: string;
  contestantId: string;
  criterionId?: string;
  score?: number;
  comment?: string;
}

@injectable()
export class JudgeService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Get Judge ID from User ID
   */
  async getJudgeIdFromUser(userId: string): Promise<string | null> {
    const userWithJudge = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { judge: true },
    });

    if (!userWithJudge || !userWithJudge.judge) {
      return null;
    }

    return userWithJudge.judge.id;
  }

  /**
   * Get judge dashboard statistics
   */
  async getStats(userId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const [
      totalAssignments,
      pendingAssignments,
      activeAssignments,
      completedAssignments,
      totalScores,
    ] = await Promise.all([
      this.prisma.assignment.count({ where: { judgeId } }),
      this.prisma.assignment.count({ where: { judgeId, status: 'PENDING' } }),
      this.prisma.assignment.count({ where: { judgeId, status: 'ACTIVE' } }),
      this.prisma.assignment.count({ where: { judgeId, status: 'COMPLETED' } }),
      this.prisma.score.count({ where: { judgeId } }),
    ]);

    return {
      totalAssignments,
      pendingAssignments,
      activeAssignments,
      completedAssignments,
      totalScores,
    };
  }

  /**
   * Get assignments for a judge (or all for admin/organizer)
   */
  async getAssignments(userId: string, userRole: string) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    // For JUDGE role, they must be linked to a Judge record
    if (userRole === 'JUDGE' && !judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Build where clause - JUDGE sees only their assignments, ADMIN/ORGANIZER see all
    const whereClause: Prisma.AssignmentWhereInput =
      userRole === 'JUDGE' && judgeId ? { judgeId } : {};

    const assignments = await this.prisma.assignment.findMany({
      where: whereClause,
      orderBy: { assignedAt: 'desc' },
    });

    return assignments;
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: string,
    status: string,
    userId: string,
    userRole: string
  ) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    // For JUDGE role, verify they are linked and own this assignment
    if (userRole === 'JUDGE') {
      if (!judgeId) {
        throw this.forbiddenError('User is not linked to a Judge record');
      }

      const assignment = await this.prisma.assignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment || assignment.judgeId !== judgeId) {
        throw this.forbiddenError('Not authorized to update this assignment');
      }
    }

    const updatedAssignment = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: status as any },
    });

    return updatedAssignment;
  }

  /**
   * Get scoring interface for a category
   */
  async getScoringInterface(categoryId: string, userId: string) {
    // Get the Judge record linked to this User
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { judge: true },
    });

    if (!user || !user.judge) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const judgeId = user.judge.id;

    // Check if judge is assigned to this category
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    }) as any;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get additional related data separately
    const [criteria, categoryContestants, scores] = await Promise.all([
      this.prisma.criterion.findMany({
        where: { categoryId },
      }) as any,
      this.prisma.categoryContestant.findMany({
        where: { categoryId },
        include: {
          contestant: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true,
                  email: true,
                },
              },
            },
          },
        },
      }) as any,
      this.prisma.score.findMany({
        where: { judgeId, categoryId },
        include: {
          criterion: true,
          contestant: true,
        },
      }) as any,
    ]);

    const contestants = categoryContestants.map((cc: any) => cc.contestant);

    return {
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
      criteria,
      contestants,
      scores,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
      },
    };
  }

  /**
   * Submit a score for a contestant
   */
  async submitScore(data: SubmitScoreData, userId: string) {
    const { categoryId, contestantId, criterionId, score, comment } = data;
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    // If criterionId provided, validate the criterion
    let criterion = null;
    if (criterionId) {
      criterion = await this.prisma.criterion.findUnique({
        where: { id: criterionId },
      });

      if (!criterion) {
        throw this.notFoundError('Criterion', criterionId);
      }

      // Validate score is within criterion range
      if (score !== undefined && (score < 0 || score > criterion.maxScore)) {
        throw this.validationError(
          `Score must be between 0 and ${criterion.maxScore}`
        );
      }
    }

    // For categories without criteria, just store comment if no score provided
    const finalScore = score !== undefined ? score : null;

    // Create or update score (using simplified approach)
    const existingScore = await this.prisma.score.findFirst({
      where: {
        judgeId,
        categoryId,
        contestantId,
        ...(criterionId && { criterionId }),
      },
    });

    let scoreRecord;
    if (existingScore) {
      scoreRecord = await this.prisma.score.update({
        where: { id: existingScore.id },
        data: {
          score: finalScore,
          ...(comment !== undefined && { comment }),
        },
        include: {
          criterion: true,
          contestant: true,
        },
      });
    } else {
      scoreRecord = await this.prisma.score.create({
        data: {
          judgeId,
          categoryId,
          contestantId,
          criterionId: criterionId || null,
          score: finalScore,
          comment: comment || null,
        },
        include: {
          criterion: true,
          contestant: true,
        },
      });
    }

    return scoreRecord;
  }

  /**
   * Get certification workflow for a category
   */
  async getCertificationWorkflow(categoryId: string, userId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          },
        },
      },
    }) as any;

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    // Get certifications separately (if the model exists)
    let certifications: any[] = [];
    try {
      certifications = await (this.prisma as any).categoryCertification?.findMany({
        where: { categoryId },
        orderBy: { certifiedAt: 'desc' },
      }) || [];
    } catch (error) {
      // Model may not exist
      certifications = [];
    }

    return {
      category,
      assignment,
      certifications,
    };
  }

  /**
   * Get contestant bios for a category
   */
  async getContestantBios(categoryId: string, userId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const categoryContestants = await this.prisma.categoryContestant.findMany({
      where: { categoryId },
      include: {
        contestant: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                email: true,
                bio: true,
              },
            },
          },
        },
      },
    }) as any;

    const contestants = categoryContestants.map((cc: any) => cc.contestant);
    return contestants;
  }

  /**
   * Get a single contestant bio
   */
  async getContestantBio(contestantId: string, userId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const contestant = await this.prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            email: true,
            bio: true,
          },
        },
      },
    }) as any;

    if (!contestant) {
      throw this.notFoundError('Contestant', contestantId);
    }

    // Find which category this contestant is in via CategoryContestant join table
    const categoryContestant = await this.prisma.categoryContestant.findFirst({
      where: {
        contestantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }) as any;

    if (!categoryContestant) {
      throw this.notFoundError('Category assignment for contestant', contestantId);
    }

    // Verify judge is assigned to this category
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId: categoryContestant.categoryId,
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    return {
      ...contestant,
      category: categoryContestant.category,
    };
  }

  /**
   * Get judge scoring history
   */
  async getJudgeHistory(userId: string, query: any = {}) {
    const judgeId = await this.getJudgeIdFromUser(userId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const { page = 1, limit = 50, categoryId, eventId } = query;

    const whereClause: Prisma.ScoreWhereInput = {
      judgeId,
      ...(categoryId && { categoryId }),
      ...(eventId && {
        category: {
          contest: {
            eventId,
          },
        },
      }),
    };

    const [scores, total] = await Promise.all([
      this.prisma.score.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          contestant: true,
          criterion: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      this.prisma.score.count({ where: whereClause }),
    ]);

    return {
      scores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }
}
