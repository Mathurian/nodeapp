import { injectable, inject } from 'tsyringe';
import { PrismaClient, AssignmentStatus, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import { CacheService } from './CacheService';
import { PaginationOptions, PaginatedResponse } from '../utils/pagination';

// P2-4: Proper type definitions for assignment responses
type AssignmentWithRelations = Prisma.AssignmentGetPayload<{
  include: {
    judge: {
      select: {
        id: true;
        name: true;
        email: true;
        bio: true;
        isHeadJudge: true;
      };
    };
    assignedByUser: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
      };
    };
    category: {
      select: {
        id: true;
        name: true;
        description: true;
        scoreCap: true;
      };
    };
    contest: {
      select: {
        id: true;
        name: true;
        description: true;
      };
    };
    event: {
      select: {
        id: true;
        name: true;
        startDate: true;
        endDate: true;
      };
    };
  };
}>;

type JudgeWithPagination = Prisma.JudgeGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    bio: true;
    isHeadJudge: true;
  };
}>;

export interface CreateAssignmentInput {
  judgeId: string;
  categoryId?: string;
  contestId?: string;
  eventId?: string;
  notes?: string;
  priority?: number;
}

export interface UpdateAssignmentInput {
  status?: AssignmentStatus;
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

interface CreateJudgeInput {
  tenantId: string;
  name: string;
  email?: string | null;
  bio?: string | null;
  isHeadJudge?: boolean;
  gender?: string | null;
  pronouns?: string | null;
}

interface UpdateJudgeInput {
  name?: string;
  email?: string | null;
  bio?: string | null;
  isHeadJudge?: boolean;
  gender?: string | null;
  pronouns?: string | null;
}

interface CreateContestantInput {
  tenantId: string;
  name: string;
  email?: string | null;
  contestantNumber?: string | null;
  bio?: string | null;
  gender?: string | null;
  pronouns?: string | null;
}

interface UpdateContestantInput {
  name?: string;
  email?: string | null;
  contestantNumber?: string | null;
  bio?: string | null;
  gender?: string | null;
  pronouns?: string | null;
}

@injectable()
export class AssignmentService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  /**
   * P2-3: Invalidate assignment caches
   */
  private async invalidateAssignmentCaches(judgeId?: string, categoryId?: string): Promise<void> {
    await this.cacheService.invalidatePattern('assignments:list:*');
    if (judgeId) {
      await this.cacheService.del(`assignments:judge:${judgeId}`);
    }
    if (categoryId) {
      await this.cacheService.del(`assignments:category:${categoryId}`);
    }
  }

  /**
   * Get all assignments with optional filters (P2-4: Proper typing)
   * Includes both Assignment records and CategoryJudge relationships
   */
  async getAllAssignments(filters: AssignmentFilters): Promise<AssignmentWithRelations[]> {
    // P2-3: Check cache
    const cacheKey = `assignments:list:${JSON.stringify(filters)}`;
    const cached = await this.cacheService.get<AssignmentWithRelations[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get Assignment records
    const assignments = await this.prisma.assignment.findMany({
      where: {
        ...(filters.status && { status: filters.status as AssignmentStatus }),
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
      },
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });

    // Also get CategoryJudge relationships and convert them to assignment-like objects
    const categoryJudgeWhere: Prisma.CategoryJudgeWhereInput = {};
    if (filters.judgeId) {
      categoryJudgeWhere.judgeId = filters.judgeId;
    }
    if (filters.categoryId) {
      categoryJudgeWhere.categoryId = filters.categoryId;
    }

    const categoryJudges = await this.prisma.categoryJudge.findMany({
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
      },
    });

    // Convert CategoryJudge entries to assignment-like objects
    // Type based on the actual Prisma query result
    type CategoryJudgeWithRelations = {
      judgeId: string;
      categoryId: string;
      category?: {
        id: string;
        name: string;
        description: string | null;
        scoreCap: number | null;
        contest?: {
          id: string;
          name: string;
          description: string | null;
          event?: {
            id: string;
            name: string;
            startDate: Date;
            endDate: Date;
          } | null;
        } | null;
      } | null;
      judge?: {
        id: string;
        name: string;
        email: string;
        bio: string | null;
        isHeadJudge: boolean;
      } | null;
    };
    const categoryJudgeAssignments = (categoryJudges as unknown as CategoryJudgeWithRelations[])
      .map((cj): Partial<AssignmentWithRelations> & { _source: string } | null => {
        const contest = cj.category?.contest;
        if (!contest) return null;
        const event = contest?.event;
        if (!event) return null;

        // Apply filters
        if (filters.contestId && contest.id !== filters.contestId) return null;
        if (filters.eventId && event.id !== filters.eventId) return null;

        if (!cj.category || !cj.judge || !event.startDate || !event.endDate) return null;

        return {
          id: `categoryJudge_${cj.categoryId}_${cj.judgeId}`, // Synthetic ID
          judgeId: cj.judgeId,
          categoryId: cj.categoryId,
          contestId: contest.id,
          eventId: event.id,
          status: 'ACTIVE' as AssignmentStatus, // Default status for CategoryJudge entries
          assignedAt: new Date(), // Use current date as fallback
          assignedBy: undefined,
          notes: undefined,
          priority: 0,
          judge: {
            id: cj.judge.id,
            name: cj.judge.name,
            email: cj.judge.email,
            bio: cj.judge.bio,
            isHeadJudge: cj.judge.isHeadJudge,
          },
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
          assignedByUser: undefined,
          _source: 'categoryJudge', // Mark as coming from CategoryJudge
        };
      })
      .filter((item): item is Partial<AssignmentWithRelations> & { _source: string } => item !== null); // Remove null entries

    // Combine and deduplicate (prefer Assignment records over CategoryJudge if both exist)
    const assignmentMap = new Map();
    
    // First add CategoryJudge entries
    categoryJudgeAssignments.forEach((assignment) => {
      if (!assignment) return;
      const key = `${assignment.judgeId}_${assignment.categoryId}`;
      assignmentMap.set(key, assignment);
    });

    // Then add Assignment records (these will overwrite CategoryJudge entries if they exist)
    assignments.forEach((assignment) => {
      const key = `${assignment.judgeId}_${assignment.categoryId}`;
      assignmentMap.set(key, assignment);
    });

    const result = Array.from(assignmentMap.values());

    // P2-3: Cache result (TTL: 15 min)
    await this.cacheService.set(cacheKey, result, 900);

    return result;
  }

  /**
   * Create new assignment
   */
  async createAssignment(
    data: CreateAssignmentInput,
    userId: string
  ): Promise<AssignmentWithRelations> {
    this.validateRequired(data as unknown as Record<string, unknown>, ['judgeId']);

    if (!data.categoryId && !data.contestId) {
      throw this.createBadRequestError(
        'Either categoryId or contestId is required'
      );
    }

    let finalContestId = data.contestId;
    let finalEventId = data.eventId;
    let tenantId: string;

    // If categoryId provided, fetch to get contestId and eventId
    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
        include: {
          contest: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!category) {
        throw this.createNotFoundError('Category not found');
      }

      tenantId = category.tenantId;
      finalContestId = category.contestId;
      finalEventId = category.contest.eventId;

      // Check if assignment already exists
      const existingAssignment = await this.prisma.assignment.findUnique({
        where: {
          tenantId_judgeId_categoryId: {
            tenantId: category.tenantId,
            judgeId: data.judgeId,
            categoryId: data.categoryId
          },
        },
      });

      if (existingAssignment) {
        throw this.conflictError('Assignment already exists for this judge and category');
      }
    } else if (data.contestId && !data.eventId) {
      // If contestId provided without categoryId, fetch contest to get eventId
      const contest = await this.prisma.contest.findUnique({
        where: { id: data.contestId },
        include: { event: true },
      });

      if (!contest) {
        throw this.createNotFoundError('Contest not found');
      }

      tenantId = contest.tenantId;
      finalEventId = contest.eventId;
    } else {
      // Fetch judge to get tenantId
      const judge = await this.prisma.judge.findUnique({
        where: { id: data.judgeId },
      });
      if (!judge) {
        throw this.createNotFoundError('Judge not found');
      }
      tenantId = judge.tenantId;
    }

    const assignmentData = {
      tenantId,
      judgeId: data.judgeId,
      priority: data.priority ?? 0,
      status: 'PENDING' as AssignmentStatus,
      assignedBy: userId,
      assignedAt: new Date(),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(finalContestId && { contestId: finalContestId }),
      ...(finalEventId && { eventId: finalEventId }),
      ...(data.notes && { notes: data.notes }),
    };

    const assignment = await this.prisma.assignment.create({
      data: assignmentData as Prisma.AssignmentUncheckedCreateInput,
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
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // P2-3: Invalidate assignment caches
    await this.invalidateAssignmentCaches(data.judgeId, data.categoryId);

    return assignment as AssignmentWithRelations;
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: string): Promise<AssignmentWithRelations | null> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        judge: true,
        category: true,
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
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!assignment) {
      throw this.createNotFoundError('Assignment not found');
    }

    return assignment as AssignmentWithRelations;
  }

  /**
   * Update assignment
   */
  async updateAssignment(
    id: string,
    data: UpdateAssignmentInput
  ): Promise<AssignmentWithRelations> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw this.createNotFoundError('Assignment not found');
    }

    const updated = await this.prisma.assignment.update({
      where: { id },
      data,
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
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // P2-3: Invalidate assignment caches
    await this.invalidateAssignmentCaches(assignment.judgeId, assignment.categoryId ?? undefined);

    return updated as AssignmentWithRelations;
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

    // P2-3: Invalidate assignment caches
    await this.invalidateAssignmentCaches(assignment.judgeId, assignment.categoryId ?? undefined);
  }

  /**
   * Get assignments for a judge
   */
  async getAssignmentsForJudge(judgeId: string): Promise<AssignmentWithRelations[]> {
    // P2-3: Check cache
    const cacheKey = `assignments:judge:${judgeId}`;
    const cached = await this.cacheService.get<AssignmentWithRelations[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { judgeId },
      include: {
        category: true,
        contest: true,
        event: true,
      } ,
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });

    // P2-3: Cache result (TTL: 15 min)
    await this.cacheService.set(cacheKey, assignments, 900);

    return assignments as unknown as AssignmentWithRelations[];
  }

  /**
   * Get assignments for a category
   */
  async getAssignmentsForCategory(categoryId: string): Promise<AssignmentWithRelations[]> {
    // P2-3: Check cache
    const cacheKey = `assignments:category:${categoryId}`;
    const cached = await this.cacheService.get<AssignmentWithRelations[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { categoryId },
      include: {
        judge: true,
        assignedByUser: true,
      } ,
      orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }],
    });

    // P2-3: Cache result (TTL: 15 min)
    await this.cacheService.set(cacheKey, assignments, 900);

    return assignments as unknown as AssignmentWithRelations[];
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
          },
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
          tenantId_judgeId_categoryId: {
            tenantId: category.tenantId,
            judgeId,
            categoryId
          },
        },
      });

      if (!existingAssignment) {
        await this.prisma.assignment.create({
          data: {
            tenantId: category.tenantId,
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

    // P2-3: Invalidate assignment caches for all affected judges and category
    await this.cacheService.invalidatePattern('assignments:list:*');
    await this.cacheService.del(`assignments:category:${categoryId}`);
    for (const judgeId of judgeIds) {
      await this.cacheService.del(`assignments:judge:${judgeId}`);
    }

    return assignedCount;
  }

  /**
   * Get all judges (P2-1: Add pagination, P2-4: Proper typing)
   */
  async getJudges(options?: PaginationOptions): Promise<PaginatedResponse<JudgeWithPagination>> {
    const { skip, take } = this.getPaginationParams(options);

    const [judges, total] = await Promise.all([
      this.prisma.judge.findMany({
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
        skip,
        take,
      }),
      this.prisma.judge.count(),
    ]);

    return this.createPaginatedResponse(judges, total, options);
  }

  /**
   * Get all contestants
   * Returns contestants from Contestant table, joined with User table to get user email if different
   */
  async getContestants(): Promise<Array<{
    id: string;
    name: string;
    email: string | null;
    contestantNumber: string | null;
    bio: string | null;
  }>> {
    const contestants = await (this.prisma.contestant.findMany as any)({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Map contestants to include user email if available, otherwise use contestant email
    type ContestantWithUsers = {
      id: string;
      name: string;
      email: string | null;
      contestantNumber: number | null;
      bio: string | null;
      users?: Array<{ role: string; email: string }>;
    };
    return contestants.map((contestant: ContestantWithUsers) => ({
      id: contestant.id,
      name: contestant.name,
      email: contestant.users && contestant.users.length > 0
        ? contestant.users.find((u: { role: string; email: string }) => u.role === 'CONTESTANT')?.email || contestant.users[0]?.email || contestant.email || null
        : contestant.email || null,
      contestantNumber: contestant.contestantNumber,
      bio: contestant.bio,
    }));
  }

  /**
   * Get all categories
   * Excludes categories from archived events
   */
  async getCategories(): Promise<Array<{
    id: string;
    name: string;
    description: string | null;
    scoreCap: number | null;
    contest: {
      id: string;
      name: string;
      event: {
        id: string;
        name: string;
      };
    };
  }>> {
    // Note: Can't filter by nested contest.event.archived in Prisma where clause
    // Fetching all and filtering in memory
    const categories = await this.prisma.category.findMany({
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
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filter out categories from archived events
    return categories.filter((cat) => !(cat.contest as { event?: { archived?: boolean } })?.event?.archived);
  }

  /**
   * Get all contestant assignments
   */
  async getAllContestantAssignments(filters?: { categoryId?: string; contestId?: string }): Promise<Prisma.CategoryContestantGetPayload<{
    include: {
      contestant: {
        select: {
          id: true;
          name: true;
          email: true;
          contestantNumber: true;
        };
      };
      category: {
        include: {
          contest: {
            include: {
              event: {
                select: {
                  id: true;
                  name: true;
                };
              };
            };
          };
        };
      };
    };
  }>[]> {
    const where: Prisma.CategoryContestantWhereInput = {};
    
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    
    if (filters?.contestId) {
      where.category = {
        contestId: filters.contestId,
      };
    }

    const result = await this.prisma.categoryContestant.findMany({
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
        contestantId: 'asc',
      },
    });

    return result as any;
  }

  /**
   * Get contestants for a specific category
   */
  async getCategoryContestants(categoryId: string): Promise<Prisma.CategoryContestantGetPayload<{
    include: {
      contestant: {
        select: {
          id: true;
          name: true;
          email: true;
          contestantNumber: true;
          bio: true;
        };
      };
    };
  }>[]> {
    const contestants = await this.prisma.categoryContestant.findMany({
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
      },
      orderBy: {
        contestantId: 'asc',
      },
    });

    return contestants;
  }

  /**
   * Assign contestant to category
   */
  async assignContestantToCategory(categoryId: string, contestantId: string): Promise<Prisma.CategoryContestantGetPayload<{
    include: {
      contestant: {
        select: {
          id: true;
          name: true;
          email: true;
          contestantNumber: true;
        };
      };
      category: {
        include: {
          contest: {
            include: {
              event: {
                select: {
                  id: true;
                  name: true;
                };
              };
            };
          };
        };
      };
    };
  }>> {
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

    const result = await this.prisma.categoryContestant.create({
      data: {
        tenantId: category.tenantId,
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
              },
            },
          },
        },
      },
    });

    return result;
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
  async createJudge(data: CreateJudgeInput): Promise<Prisma.JudgeGetPayload<{}>> {
    this.validateRequired(data as unknown as Record<string, unknown>, ['name']);

    return await this.prisma.judge.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email ?? undefined,
        bio: data.bio ?? undefined,
        isHeadJudge: data.isHeadJudge ?? false,
        gender: data.gender ?? undefined,
        pronouns: data.pronouns ?? undefined,
      },
    });
  }

  /**
   * Update a judge
   */
  async updateJudge(id: string, data: UpdateJudgeInput): Promise<Prisma.JudgeGetPayload<{}>> {
    return await this.prisma.judge.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email ?? undefined }),
        ...(data.bio !== undefined && { bio: data.bio ?? undefined }),
        ...(data.isHeadJudge !== undefined && { isHeadJudge: data.isHeadJudge }),
        ...(data.gender !== undefined && { gender: data.gender ?? undefined }),
        ...(data.pronouns !== undefined && { pronouns: data.pronouns ?? undefined }),
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
  async createContestant(data: CreateContestantInput): Promise<Prisma.ContestantGetPayload<{}>> {
    this.validateRequired(data as unknown as Record<string, unknown>, ['name']);

    return await this.prisma.contestant.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        email: data.email ?? undefined,
        contestantNumber: data.contestantNumber ? parseInt(data.contestantNumber, 10) : undefined,
        bio: data.bio ?? undefined,
        gender: data.gender ?? undefined,
        pronouns: data.pronouns ?? undefined,
      },
    });
  }

  /**
   * Update a contestant
   */
  async updateContestant(id: string, data: UpdateContestantInput): Promise<Prisma.ContestantGetPayload<{}>> {
    const updateData: Prisma.ContestantUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.email !== undefined && { email: data.email ?? undefined }),
      ...(data.contestantNumber !== undefined && { contestantNumber: data.contestantNumber ? parseInt(data.contestantNumber, 10) : undefined }),
      ...(data.bio !== undefined && { bio: data.bio ?? undefined }),
      ...(data.gender !== undefined && { gender: data.gender ?? undefined }),
      ...(data.pronouns !== undefined && { pronouns: data.pronouns ?? undefined }),
    };

    return await this.prisma.contestant.update({
      where: { id },
      data: updateData,
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

  /**
   * Get tally master assignments with optional filters
   */
  async getTallyMasterAssignments(filters?: {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
  }): Promise<unknown[]> {
    const where: Prisma.TallyMasterAssignmentWhereInput = {};

    if (filters?.eventId) {
      where.eventId = filters.eventId;
    }
    if (filters?.contestId) {
      where.contestId = filters.contestId;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    return await this.prisma.tallyMasterAssignment.findMany({
      where,
      include: {
        user: {
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
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  /**
   * Create tally master assignment
   */
  async createTallyMasterAssignment(data: {
    userId: string;
    eventId: string;
    contestId?: string;
    categoryId?: string;
    notes?: string;
    assignedBy: string;
  }): Promise<any> {
    // Get event to determine tenantId
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw this.createNotFoundError('Event not found');
    }

    // Check if assignment already exists for this user/category combination
    if (data.categoryId) {
      const existing = await this.prisma.tallyMasterAssignment.findUnique({
        where: {
          tenantId_userId_categoryId: {
            tenantId: event.tenantId,
            userId: data.userId,
            categoryId: data.categoryId,
          },
        },
      });

      if (existing) {
        throw this.conflictError('Tally master is already assigned to this category');
      }
    }

    return await this.prisma.tallyMasterAssignment.create({
      data: {
        tenantId: event.tenantId,
        userId: data.userId,
        eventId: data.eventId,
        contestId: data.contestId,
        categoryId: data.categoryId,
        notes: data.notes,
        assignedBy: data.assignedBy,
      },
      include: {
        user: {
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
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Remove tally master assignment
   */
  async removeTallyMasterAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.prisma.tallyMasterAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw this.createNotFoundError('Tally master assignment not found');
    }

    await this.prisma.tallyMasterAssignment.delete({
      where: { id: assignmentId },
    });
  }

  /**
   * Get auditor assignments with optional filters
   */
  async getAuditorAssignments(filters?: {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
  }): Promise<unknown[]> {
    const where: Prisma.AuditorAssignmentWhereInput = {};

    if (filters?.eventId) {
      where.eventId = filters.eventId;
    }
    if (filters?.contestId) {
      where.contestId = filters.contestId;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    return await this.prisma.auditorAssignment.findMany({
      where,
      include: {
        user: {
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
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });
  }

  /**
   * Create auditor assignment
   */
  async createAuditorAssignment(data: {
    userId: string;
    eventId: string;
    contestId?: string;
    categoryId?: string;
    notes?: string;
    assignedBy: string;
  }): Promise<any> {
    // Get event to determine tenantId
    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) {
      throw this.createNotFoundError('Event not found');
    }

    // Check if assignment already exists for this user/category combination
    if (data.categoryId) {
      const existing = await this.prisma.auditorAssignment.findUnique({
        where: {
          tenantId_userId_categoryId: {
            tenantId: event.tenantId,
            userId: data.userId,
            categoryId: data.categoryId,
          },
        },
      });

      if (existing) {
        throw this.conflictError('Auditor is already assigned to this category');
      }
    }

    return await this.prisma.auditorAssignment.create({
      data: {
        tenantId: event.tenantId,
        userId: data.userId,
        eventId: data.eventId,
        contestId: data.contestId,
        categoryId: data.categoryId,
        notes: data.notes,
        assignedBy: data.assignedBy,
      },
      include: {
        user: {
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
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Remove auditor assignment
   */
  async removeAuditorAssignment(assignmentId: string): Promise<void> {
    const assignment = await this.prisma.auditorAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw this.createNotFoundError('Auditor assignment not found');
    }

    await this.prisma.auditorAssignment.delete({
      where: { id: assignmentId },
    });
  }
}
