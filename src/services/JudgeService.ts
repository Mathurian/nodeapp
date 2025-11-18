import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

interface SubmitScoreData {
  categoryId: string;
  contestantId: string;
  criterionId?: string;
  score?: number;
  comment?: string;
  tenantId: string;
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
  async getJudgeIdFromUser(userId: string, tenantId: string): Promise<string | null> {
    const userWithJudge: any = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { judge: true },
    } as any);

    if (!userWithJudge || !userWithJudge.judge) {
      return null;
    }

    return userWithJudge.judge.id;
  }

  /**
   * Get judge dashboard statistics
   */
  async getStats(userId: string, tenantId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

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
      this.prisma.assignment.count({ where: { judgeId, tenantId } }),
      this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'PENDING' } }),
      this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'ACTIVE' } }),
      this.prisma.assignment.count({ where: { judgeId, tenantId, status: 'COMPLETED' } }),
      this.prisma.score.count({ where: { judgeId, tenantId } }),
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
  async getAssignments(userId: string, userRole: string, tenantId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    // For JUDGE role, they must be linked to a Judge record
    if (userRole === 'JUDGE' && !judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Build where clause - JUDGE sees only their assignments, ADMIN/ORGANIZER see all
    const whereClause: Prisma.AssignmentWhereInput =
      userRole === 'JUDGE' && judgeId ? { judgeId, tenantId } : { tenantId };

    const assignments: any = await this.prisma.assignment.findMany({
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
    userRole: string,
    tenantId: string
  ) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    // For JUDGE role, verify they are linked and own this assignment
    if (userRole === 'JUDGE') {
      if (!judgeId) {
        throw this.forbiddenError('User is not linked to a Judge record');
      }

      const assignment: any = await this.prisma.assignment.findFirst({
        where: { id: assignmentId, tenantId },
      });

      if (!assignment || assignment.judgeId !== judgeId) {
        throw this.forbiddenError('Not authorized to update this assignment');
      }
    }

    const updatedAssignment: any = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: status as any },
    });

    return updatedAssignment;
  }

  /**
   * Get scoring interface for a category
   */
  async getScoringInterface(categoryId: string, userId: string, tenantId: string) {
    // Get the Judge record linked to this User
    const user: any = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { judge: true },
    } as any);

    if (!user || !user.judge) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const judgeId = user.judge.id;

    // Check if judge is assigned to this category
    const assignment: any = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        tenantId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const category: any = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId },
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

    // Get additional related data separately
    const [criteria, categoryContestants, scores] = await Promise.all([
      this.prisma.criterion.findMany({
        where: { categoryId, tenantId },
      }) as any,
      this.prisma.categoryContestant.findMany({
        where: { categoryId, tenantId },
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
        } as any,
      } as any) as any,
      this.prisma.score.findMany({
        where: { judgeId, categoryId, tenantId },
        include: {
          criterion: true,
          contestant: true,
        } as any,
      } as any) as any,
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
    const { categoryId, contestantId, criterionId, score, comment, tenantId } = data;
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment: any = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        tenantId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    // If criterionId provided, validate the criterion
    let criterion = null;
    if (criterionId) {
      criterion = await this.prisma.criterion.findFirst({
        where: { id: criterionId, tenantId },
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
    const existingScore: any = await this.prisma.score.findFirst({
      where: {
        judgeId,
        categoryId,
        contestantId,
        tenantId,
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
        } as any,
      } as any);
    } else {
      scoreRecord = await this.prisma.score.create({
        data: {
          judgeId,
          categoryId,
          contestantId,
          tenantId,
          criterionId: criterionId || null,
          score: finalScore,
          comment: comment || null,
        },
        include: {
          criterion: true,
          contestant: true,
        } as any,
      } as any);
    }

    return scoreRecord;
  }

  /**
   * Get certification workflow for a category
   */
  async getCertificationWorkflow(categoryId: string, userId: string, tenantId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment: any = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        tenantId,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const category: any = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId },
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

    // Get certifications separately (if the model exists)
    let certifications: any[] = [];
    try {
      certifications = await (this.prisma as any).categoryCertification?.findMany({
        where: { categoryId, tenantId },
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
  async getContestantBios(categoryId: string, userId: string, tenantId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    // Check if judge is assigned to this category
    const assignment: any = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId,
        tenantId,
      },
    });

    if (!assignment) {
      throw this.forbiddenError('Not assigned to this category');
    }

    const categoryContestants: any = await this.prisma.categoryContestant.findMany({
      where: { categoryId, tenantId },
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
      } as any,
    } as any) as any;

    const contestants = categoryContestants.map((cc: any) => cc.contestant);
    return contestants;
  }

  /**
   * Get a single contestant bio
   */
  async getContestantBio(contestantId: string, userId: string, tenantId: string) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const contestant: any = await this.prisma.contestant.findFirst({
      where: { id: contestantId, tenantId },
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
      } as any,
    } as any) as any;

    if (!contestant) {
      throw this.notFoundError('Contestant', contestantId);
    }

    // Find which category this contestant is in via CategoryContestant join table
    const categoryContestant: any = await this.prisma.categoryContestant.findFirst({
      where: {
        contestantId,
        tenantId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      } as any,
    } as any) as any;

    if (!categoryContestant) {
      throw this.notFoundError('Category assignment for contestant', contestantId);
    }

    // Verify judge is assigned to this category
    const assignment: any = await this.prisma.assignment.findFirst({
      where: {
        judgeId,
        categoryId: categoryContestant.categoryId,
        tenantId,
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
  async getJudgeHistory(userId: string, tenantId: string, query: any = {}) {
    const judgeId = await this.getJudgeIdFromUser(userId, tenantId);

    if (!judgeId) {
      throw this.forbiddenError('User is not linked to a Judge record');
    }

    const { page = 1, limit = 50, categoryId, eventId } = query;

    const whereClause: Prisma.ScoreWhereInput = {
      judgeId,
      tenantId,
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
        } as any,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      } as any),
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
