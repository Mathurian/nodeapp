import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CreateAssignmentInput {
  judgeId: string;
  categoryId?: string;
  contestId?: string;
  eventId?: string;
  notes?: string;
  priority?: number;
}

export interface UpdateAssignmentInput {
  status?: string;
  notes?: string;
  priority?: number;
}

export interface AssignmentFilters {
  status?: string;
  judgeId?: string;
  categoryId?: string;
  contestId?: string;
  eventId?: string;
}

@injectable()
export class AssignmentService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Get all assignments with optional filters
   * Includes both Assignment records and CategoryJudge relationships
   */
  async getAllAssignments(filters: AssignmentFilters): Promise<any[]> {
    // Get Assignment records
    const assignments = await this.prisma.assignment.findMany({
      where: {
        ...(filters.status && { status: filters.status as any }),
        ...(filters.judgeId && { judgeId: filters.judgeId }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.contestId && { contestId: filters.contestId }),
        ...(filters.eventId && { eventId: filters.eventId }),
      },
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            isHeadJudge: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            scoreCap: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        },
      } as any,
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });

    // Also get CategoryJudge relationships and convert them to assignment-like objects
    const categoryJudgeWhere: any = {};
    if (filters.judgeId) {
      categoryJudgeWhere.judgeId = filters.judgeId;
    }
    if (filters.categoryId) {
      categoryJudgeWhere.categoryId = filters.categoryId;
    }

    const categoryJudges: any = await this.prisma.categoryJudge.findMany({
      where: categoryJudgeWhere,
      include: {
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            isHeadJudge: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            scoreCap: true,
            contest: {
              select: {
                id: true,
                name: true,
                description: true,
                event: {
                  select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                  },
                },
              },
            },
          },
        },
      } as any,
    });

    // Convert CategoryJudge entries to assignment-like objects
    const categoryJudgeAssignments = categoryJudges
      .map((cj) => {
        const contest = cj.category.contest;
        const event = contest.event;

        // Apply filters
        if (filters.contestId && contest.id !== filters.contestId) return null;
        if (filters.eventId && event.id !== filters.eventId) return null;

        return {
          id: `categoryJudge_${cj.categoryId}_${cj.judgeId}`, // Synthetic ID
          judgeId: cj.judgeId,
          categoryId: cj.categoryId,
          contestId: contest.id,
          eventId: event.id,
          status: 'ACTIVE' as any, // Default status for CategoryJudge entries
          assignedAt: new Date(), // Use current date as fallback
          assignedBy: null,
          notes: null,
          priority: 0,
          judge: cj.judge,
          category: {
            id: cj.category.id,
            name: cj.category.name,
            description: cj.category.description,
            scoreCap: cj.category.scoreCap,
          },
          contest: {
            id: contest.id,
            name: contest.name,
            description: contest.description,
          },
          event: {
            id: event.id,
            name: event.name,
            startDate: event.startDate,
            endDate: event.endDate,
          },
          assignedByUser: null,
          _source: 'categoryJudge', // Mark as coming from CategoryJudge
        };
      })
      .filter(Boolean); // Remove null entries

    // Combine and deduplicate (prefer Assignment records over CategoryJudge if both exist)
    const assignmentMap = new Map();
    
    // First add CategoryJudge entries
    categoryJudgeAssignments.forEach((assignment) => {
      const key = `${assignment.judgeId}_${assignment.categoryId}`;
      assignmentMap.set(key, assignment);
    });

    // Then add Assignment records (these will overwrite CategoryJudge entries if they exist)
    assignments.forEach((assignment) => {
      const key = `${assignment.judgeId}_${assignment.categoryId}`;
      assignmentMap.set(key, assignment);
    });

    return Array.from(assignmentMap.values());
  }

  /**
   * Create new assignment
   */
  async createAssignment(
    data: CreateAssignmentInput,
    userId: string
  ): Promise<any> {
    this.validateRequired(data, ['judgeId']);

    if (!data.categoryId && !data.contestId) {
      throw this.createBadRequestError(
        'Either categoryId or contestId is required'
      );
    }

    let finalContestId = data.contestId;
    let finalEventId = data.eventId;

    // If categoryId provided, fetch to get contestId and eventId
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
        include: {
          contest: {
            include: {
              event: true,
            } as any,
          },
        },
      });

      if (!category) {
        throw this.createNotFoundError('Category not found');
      }

      finalContestId = category.contestId;
      finalEventId = category.contest.eventId;

      // Check if assignment already exists
      const existingAssignment = await this.prisma.assignment.findUnique({
        where: {
          judgeId_categoryId: { judgeId: data.judgeId, categoryId: data.categoryId },
        },
      });

      if (existingAssignment) {
        throw this.conflictError('Assignment already exists for this judge and category');
      }
    } else if (data.contestId && !data.eventId) {
      // If contestId provided without categoryId, fetch contest to get eventId
      const contest = await this.prisma.contest.findUnique({
        where: { id: data.contestId },
        include: { event: true } as any,
      });

      if (!contest) {
        throw this.createNotFoundError('Contest not found');
      }

      finalEventId = contest.eventId;
    }

    return await this.prisma.assignment.create({
      data: {
        judgeId: data.judgeId,
        categoryId: data.categoryId || null,
        contestId: finalContestId || null,
        eventId: finalEventId || null,
        notes: data.notes || null,
        priority: data.priority || 0,
        status: 'PENDING',
        assignedBy: userId,
        assignedAt: new Date(),
      },
      include: {
        judge: true,
        category: true,
        contest: true,
        event: true,
        assignedByUser: true,
      } as any,
    });
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: string): Promise<any> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        judge: true,
        category: true,
        contest: true,
        event: true,
        assignedByUser: true,
      } as any,
    });

    if (!assignment) {
      throw this.createNotFoundError('Assignment not found');
    }

    return assignment;
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    id: string,
    data: UpdateAssignmentInput
  ): Promise<any> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw this.createNotFoundError('Assignment not found');
    }

    return await this.prisma.assignment.update({
      where: { id },
      data,
      include: {
        judge: true,
        category: true,
        contest: true,
        event: true,
        assignedByUser: true,
      } as any,
    });
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw this.createNotFoundError('Assignment not found');
    }

    await this.prisma.assignment.delete({
      where: { id },
    });
  }

  /**
   * Get assignments for a judge
   */
  async getAssignmentsForJudge(judgeId: string): Promise<any[]> {
    return await this.prisma.assignment.findMany({
      where: { judgeId },
      include: {
        category: true,
        contest: true,
        event: true,
      } as any,
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });
  }

  /**
   * Get assignments for a category
   */
  async getAssignmentsForCategory(categoryId: string): Promise<any[]> {
    return await this.prisma.assignment.findMany({
      where: { categoryId },
      include: {
        judge: true,
        assignedByUser: true,
      } as any,
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });
  }

  /**
   * Bulk assign judges to category
   */
  async bulkAssignJudges(
    categoryId: string,
    judgeIds: string[],
    userId: string
  ): Promise<number> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true,
          } as any,
        },
      },
    });

    if (!category) {
      throw this.createNotFoundError('Category not found');
    }

    let assignedCount = 0;

    for (const judgeId of judgeIds) {
      // Check if assignment already exists
      const existingAssignment = await this.prisma.assignment.findUnique({
        where: {
          judgeId_categoryId: { judgeId, categoryId },
        },
      });

      if (!existingAssignment) {
        await this.prisma.assignment.create({
          data: {
            judgeId,
            categoryId,
            contestId: category.contestId,
            eventId: category.contest.eventId,
            status: 'PENDING',
            assignedBy: userId,
            assignedAt: new Date(),
          },
        });

        assignedCount++;
      }
    }

    return assignedCount;
  }

  /**
   * Get all judges
   */
  async getJudges(): Promise<any[]> {
    return await this.prisma.judge.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        isHeadJudge: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get all contestants
   * Returns contestants from Contestant table, joined with User table to get user email if different
   */
  async getContestants(): Promise<any[]> {
    const contestants: any = await this.prisma.contestant.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      } as any,
      orderBy: {
        name: 'asc',
      },
    });

    // Map contestants to include user email if available, otherwise use contestant email
    return contestants.map(contestant => ({
      id: contestant.id,
      name: contestant.name,
      email: contestant.users && contestant.users.length > 0 
        ? contestant.users.find(u => u.role === 'CONTESTANT')?.email || contestant.users[0].email || contestant.email
        : contestant.email,
      contestantNumber: contestant.contestantNumber,
      bio: contestant.bio,
    }));
  }

  /**
   * Get all categories
   * Excludes categories from archived events
   */
  async getCategories(): Promise<any[]> {
    return await this.prisma.category.findMany({
      where: {
        contest: {
          event: {
            archived: false
          }
        }
      },
      include: {
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
      } as any,
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Get all contestant assignments
   */
  async getAllContestantAssignments(filters?: { categoryId?: string; contestId?: string }): Promise<any[]> {
    const where: any = {};
    
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    
    if (filters?.contestId) {
      where.category = {
        contestId: filters.contestId,
      };
    }

    return await this.prisma.categoryContestant.findMany({
      where,
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            email: true,
            contestantNumber: true,
          },
        },
        category: {
          include: {
            contest: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              } as any,
            },
          },
        },
      },
      orderBy: {
        contestant: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Get contestants for a specific category
   */
  async getCategoryContestants(categoryId: string): Promise<any[]> {
    return await this.prisma.categoryContestant.findMany({
      where: { categoryId },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            email: true,
            contestantNumber: true,
            bio: true,
          },
        },
      } as any,
      orderBy: {
        contestant: {
          name: 'asc',
        },
      },
    });
  }

  /**
   * Assign contestant to category
   */
  async assignContestantToCategory(categoryId: string, contestantId: string): Promise<any> {
    // First verify the category exists (even if from archived event, we should allow assignment)
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        contest: {
          include: {
            event: true
          } as any
        }
      }
    });

    if (!category) {
      throw this.createNotFoundError('Category not found');
    }

    // Check if assignment already exists
    const existing = await this.prisma.categoryContestant.findUnique({
      where: {
        categoryId_contestantId: {
          categoryId,
          contestantId,
        },
      },
    });

    if (existing) {
      throw this.conflictError('Contestant is already assigned to this category');
    }

    return await this.prisma.categoryContestant.create({
      data: {
        categoryId,
        contestantId,
      },
      include: {
        contestant: {
          select: {
            id: true,
            name: true,
            email: true,
            contestantNumber: true,
          },
        },
        category: {
          include: {
            contest: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              } as any,
            },
          },
        },
      },
    });
  }

  /**
   * Remove contestant from category
   */
  async removeContestantFromCategory(categoryId: string, contestantId: string): Promise<void> {
    await this.prisma.categoryContestant.delete({
      where: {
        categoryId_contestantId: {
          categoryId,
          contestantId,
        },
      },
    });
  }

  /**
   * Create a new judge
   */
  async createJudge(data: Partial<any>): Promise<any> {
    this.validateRequired(data, ['name']);
    
    return await this.prisma.judge.create({
      data: {
        name: data.name,
        email: data.email || null,
        bio: data.bio || null,
        isHeadJudge: data.isHeadJudge || false,
        gender: data.gender || null,
        pronouns: data.pronouns || null,
      },
    });
  }

  /**
   * Update a judge
   */
  async updateJudge(id: string, data: Partial<any>): Promise<any> {
    return await this.prisma.judge.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.isHeadJudge !== undefined && { isHeadJudge: data.isHeadJudge }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.pronouns !== undefined && { pronouns: data.pronouns || null }),
      },
    });
  }

  /**
   * Delete a judge
   */
  async deleteJudge(id: string): Promise<void> {
    await this.prisma.judge.delete({
      where: { id },
    });
  }

  /**
   * Create a new contestant
   */
  async createContestant(data: Partial<any>): Promise<any> {
    this.validateRequired(data, ['name']);
    
    return await this.prisma.contestant.create({
      data: {
        name: data.name,
        email: data.email || null,
        contestantNumber: data.contestantNumber || null,
        bio: data.bio || null,
        gender: data.gender || null,
        pronouns: data.pronouns || null,
      },
    });
  }

  /**
   * Update a contestant
   */
  async updateContestant(id: string, data: Partial<any>): Promise<any> {
    return await this.prisma.contestant.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.contestantNumber !== undefined && { contestantNumber: data.contestantNumber || null }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.pronouns !== undefined && { pronouns: data.pronouns || null }),
      },
    });
  }

  /**
   * Delete a contestant
   */
  async deleteContestant(id: string): Promise<void> {
    await this.prisma.contestant.delete({
      where: { id },
    });
  }

  /**
   * Bulk delete judges
   */
  async bulkDeleteJudges(judgeIds: string[]): Promise<{ deletedCount: number }> {
    if (!judgeIds || judgeIds.length === 0) {
      throw this.validationError('No judge IDs provided');
    }

    const result = await this.prisma.judge.deleteMany({
      where: {
        id: {
          in: judgeIds,
        },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Bulk delete contestants
   */
  async bulkDeleteContestants(contestantIds: string[]): Promise<{ deletedCount: number }> {
    if (!contestantIds || contestantIds.length === 0) {
      throw this.validationError('No contestant IDs provided');
    }

    const result = await this.prisma.contestant.deleteMany({
      where: {
        id: {
          in: contestantIds,
        },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Remove all assignments for a category
   */
  async removeAllAssignmentsForCategory(categoryId: string): Promise<number> {
    const result = await this.prisma.assignment.deleteMany({
      where: { categoryId },
    });

    return result.count;
  }
}
