import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// Prisma payload types for complex includes
type EmceeScriptWithRelations = Prisma.EmceeScriptGetPayload<{
  include: {
    event: {
      select: {
        id: true;
        name: true;
        description: true;
        startDate: true;
        endDate: true;
      };
    };
    contest: {
      select: {
        id: true;
        name: true;
        description: true;
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
  };
}>;

type ContestantWithFullRelations = Prisma.ContestantGetPayload<{
  include: {
    users: {
      select: {
        id: true;
        name: true;
        preferredName: true;
        email: true;
        pronouns: true;
        gender: true;
        imagePath: true;
        phone: true;
        address: true;
        city: true;
        state: true;
        country: true;
        bio: true;
        contestantBio: true;
        contestantAge: true;
        contestantSchool: true;
      };
    };
    contestContestants: {
      include: {
        contest: {
          include: {
            event: {
              select: {
                id: true;
                name: true;
                description: true;
                startDate: true;
                endDate: true;
              };
            };
          };
        };
      };
    };
    categoryContestants: {
      include: {
        category: {
          select: {
            id: true;
            name: true;
            description: true;
            scoreCap: true;
          };
        };
      };
    };
  };
}>;

type ContestantWithBasicRelations = Prisma.ContestantGetPayload<{
  include: {
    users: {
      select: {
        id: true;
        name: true;
        preferredName: true;
        email: true;
        pronouns: true;
      };
    };
    contestContestants: {
      include: {
        contest: {
          include: {
            event: {
              select: {
                id: true;
                name: true;
                description: true;
                startDate: true;
                endDate: true;
              };
            };
          };
        };
      };
    };
    categoryContestants: {
      include: {
        category: {
          select: {
            id: true;
            name: true;
            description: true;
            scoreCap: true;
          };
        };
      };
    };
  };
}>;

type CategoryContestantWithContestant = Prisma.CategoryContestantGetPayload<{
  include: {
    contestant: {
      include: {
        users: {
          select: {
            id: true;
            name: true;
            preferredName: true;
            email: true;
            pronouns: true;
            gender: true;
            imagePath: true;
            phone: true;
            address: true;
            city: true;
            state: true;
            country: true;
            bio: true;
            contestantBio: true;
            contestantAge: true;
            contestantSchool: true;
          };
        };
        contestContestants: {
          include: {
            contest: {
              include: {
                event: {
                  select: {
                    id: true;
                    name: true;
                    description: true;
                    startDate: true;
                    endDate: true;
                  };
                };
              };
            };
          };
        };
        categoryContestants: {
          include: {
            category: {
              select: {
                id: true;
                name: true;
                description: true;
                scoreCap: true;
              };
            };
          };
        };
      };
    };
  };
}>;

type JudgeWithUser = Prisma.JudgeGetPayload<{
  include: {
    users: {
      select: { id: true };
    };
  };
}>;

type UserJudgeBio = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    preferredName: true;
    email: true;
    role: true;
    pronouns: true;
    gender: true;
    imagePath: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    country: true;
    judgeBio: true;
    judgeSpecialties: true;
    judgeCertifications: true;
    judge: {
      select: {
        id: true;
        bio: true;
        imagePath: true;
        isHeadJudge: true;
      };
    };
    createdAt: true;
  };
}>;

type EventWithContestsAndCategories = Prisma.EventGetPayload<{
  include: {
    contests: {
      include: {
        categories: {
          select: {
            id: true;
            name: true;
            description: true;
            scoreCap: true;
          };
        };
      };
    };
  };
}>;

type ContestWithEventAndCategories = Prisma.ContestGetPayload<{
  include: {
    event: {
      select: {
        id: true;
        name: true;
        description: true;
        startDate: true;
        endDate: true;
      };
    };
    categories: {
      select: {
        id: true;
        name: true;
        description: true;
        scoreCap: true;
      };
    };
  };
}>;

type EmceeScriptWithBasicRelations = Prisma.EmceeScriptGetPayload<{
  include: {
    event: true;
    contest: true;
    category: true;
  };
}>;

// Interface for pagination response
interface EmceeHistoryResponse {
  scripts: EmceeScriptWithBasicRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Interface for stats response
interface EmceeStatsResponse {
  totalScripts: number;
  totalEvents: number;
  totalContests: number;
  totalCategories: number;
}

/**
 * Service for managing emcee-related functionality
 * Handles scripts, contestant/judge bios, and event management
 */
@injectable()
export class EmceeService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }
  /**
   * Get emcee dashboard statistics
   */
  async getStats(): Promise<EmceeStatsResponse> {
    const stats: EmceeStatsResponse = {
      totalScripts: await this.prisma.emceeScript.count(),
      totalEvents: await this.prisma.event.count(),
      totalContests: await this.prisma.contest.count(),
      totalCategories: await this.prisma.category.count(),
    };

    return stats;
  }

  /**
   * Get scripts filtered by event/contest/category
   */
  async getScripts(filters: { eventId?: string; contestId?: string; categoryId?: string }): Promise<Prisma.EmceeScriptGetPayload<{}>[]> {
    const whereClause: Prisma.EmceeScriptWhereInput = {};

    if (filters.eventId) whereClause.eventId = filters.eventId;
    if (filters.contestId) whereClause.contestId = filters.contestId;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;

    const scripts = await this.prisma.emceeScript.findMany({
      where: whereClause,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return scripts;
  }

  /**
   * Get a specific script by ID with relations
   */
  async getScript(scriptId: string): Promise<EmceeScriptWithRelations> {
    const script = await this.prisma.emceeScript.findUnique({
      where: { id: scriptId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        contest: {
          select: {
            id: true,
            name: true,
            description: true,
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
      },
    });

    if (!script) {
      throw this.notFoundError('Script', scriptId);
    }

    return script;
  }

  /**
   * Get contestant bios filtered by event/contest/category
   */
  async getContestantBios(filters: { eventId?: string; contestId?: string; categoryId?: string }): Promise<ContestantWithFullRelations[] | ContestantWithBasicRelations[]> {
    // If categoryId is provided, use direct approach
    if (filters.categoryId) {
      const assignments = await this.prisma.categoryContestant.findMany({
        where: { categoryId: filters.categoryId },
        include: {
          contestant: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  preferredName: true,
                  email: true,
                  pronouns: true,
                  gender: true,
                  imagePath: true,
                  phone: true,
                  address: true,
                  city: true,
                  state: true,
                  country: true,
                  bio: true,
                  contestantBio: true,
                  contestantAge: true,
                  contestantSchool: true,
                },
              },
              contestContestants: {
                include: {
                  contest: {
                    include: {
                      event: {
                        select: {
                          id: true,
                          name: true,
                          description: true,
                          startDate: true,
                          endDate: true,
                        },
                      },
                    },
                  },
                },
              },
              categoryContestants: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      scoreCap: true,
                    },
                  },
                },
              },
            },
          },
        },
      }) as CategoryContestantWithContestant[];

      return assignments.map((a) => a.contestant);
    }

    // For eventId or contestId, get all categories first
    let categoryIds: string[] = [];

    if (filters.eventId) {
      const contests = await this.prisma.contest.findMany({
        where: { eventId: filters.eventId },
        select: { id: true },
      });

      const categories = await this.prisma.category.findMany({
        where: { contestId: { in: contests.map((c) => c.id) } },
        select: { id: true },
      });

      categoryIds = categories.map((c) => c.id);
    } else if (filters.contestId) {
      const categories = await this.prisma.category.findMany({
        where: { contestId: filters.contestId },
        select: { id: true },
      });

      categoryIds = categories.map((c) => c.id);
    }

    if (categoryIds.length === 0) {
      return [];
    }

    const assignments = await this.prisma.categoryContestant.findMany({
      where: { categoryId: { in: categoryIds } },
      include: {
        contestant: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                preferredName: true,
                email: true,
                pronouns: true,
              },
            },
            contestContestants: {
              include: {
                contest: {
                  include: {
                    event: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        startDate: true,
                        endDate: true,
                      },
                    },
                  },
                },
              },
            },
            categoryContestants: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    scoreCap: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as Prisma.CategoryContestantGetPayload<{
      include: {
        contestant: {
          include: {
            users: {
              select: {
                id: true;
                name: true;
                preferredName: true;
                email: true;
                pronouns: true;
              };
            };
            contestContestants: {
              include: {
                contest: {
                  include: {
                    event: {
                      select: {
                        id: true;
                        name: true;
                        description: true;
                        startDate: true;
                        endDate: true;
                      };
                    };
                  };
                };
              };
            };
            categoryContestants: {
              include: {
                category: {
                  select: {
                    id: true;
                    name: true;
                    description: true;
                    scoreCap: true;
                  };
                };
              };
            };
          };
        };
      };
    }>[];

    // Dedupe by contestant ID
    const seen = new Map<string, boolean>();
    const contestants: ContestantWithBasicRelations[] = [];
    for (const assignment of assignments) {
      if (!seen.has(assignment.contestant.id)) {
        seen.set(assignment.contestant.id, true);
        contestants.push(assignment.contestant);
      }
    }

    return contestants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  /**
   * Get judge bios filtered by event/contest/category
   */
  async getJudgeBios(filters: { eventId?: string; contestId?: string; categoryId?: string }): Promise<UserJudgeBio[]> {
    let userIds: string[] | null = null;

    if (filters.eventId || filters.contestId || filters.categoryId) {
      // If eventId is provided, get contests first, then assignments
      let contestIds: string[] = [];

      if (filters.eventId) {
        const contests = await this.prisma.contest.findMany({
          where: { eventId: filters.eventId },
          select: { id: true },
        });
        contestIds = contests.map((c) => c.id);
      } else if (filters.contestId) {
        contestIds = [filters.contestId];
      }

      // Build assignment filter
      const assignmentFilter: Prisma.AssignmentWhereInput = {};
      if (filters.categoryId) {
        assignmentFilter.categoryId = filters.categoryId;
      }
      if (contestIds.length > 0) {
        assignmentFilter.contestId = { in: contestIds };
      }

      const assignments = await this.prisma.assignment.findMany({
        where: assignmentFilter,
        select: { judgeId: true },
        distinct: ['judgeId'],
      });

      const judgeIds = assignments.map((a) => a.judgeId).filter(Boolean);

      if (judgeIds.length === 0) {
        return [];
      }

      const judges = await this.prisma.judge.findMany({
        where: { id: { in: judgeIds } },
        include: {
          users: {
            select: { id: true },
          },
        },
      }) as JudgeWithUser[];

      userIds = judges.flatMap((j) => (j.users || []).map((u) => u.id));

      if (userIds.length === 0) {
        return [];
      }
    }

    const whereClause: Prisma.UserWhereInput = {
      role: { in: ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'] },
      judgeId: { not: null },
    };

    if (userIds !== null) {
      whereClause.id = { in: userIds };
    }

    const judges = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        preferredName: true,
        email: true,
        role: true,
        pronouns: true,
        gender: true,
        imagePath: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        country: true,
        judgeBio: true,
        judgeSpecialties: true,
        judgeCertifications: true,
        judge: {
          select: {
            id: true,
            bio: true,
            imagePath: true,
            isHeadJudge: true,
          },
        },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    }) as UserJudgeBio[];

    return judges;
  }

  /**
   * Get all events with contests and categories
   */
  async getEvents(): Promise<EventWithContestsAndCategories[]> {
    const events = await this.prisma.event.findMany({
      include: {
        contests: {
          include: {
            categories: {
              select: {
                id: true,
                name: true,
                description: true,
                scoreCap: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    }) as EventWithContestsAndCategories[];

    return events;
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(eventId: string): Promise<EventWithContestsAndCategories> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: {
              select: {
                id: true,
                name: true,
                description: true,
                scoreCap: true,
              },
            },
          },
        },
      },
    }) as EventWithContestsAndCategories | null;

    if (!event) {
      throw this.notFoundError('Event', eventId);
    }

    return event;
  }

  /**
   * Get contests filtered by event
   */
  async getContests(eventId?: string): Promise<ContestWithEventAndCategories[]> {
    const whereClause: Prisma.ContestWhereInput = {};
    if (eventId) whereClause.eventId = eventId;

    const contests = await this.prisma.contest.findMany({
      where: whereClause,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            scoreCap: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    }) as ContestWithEventAndCategories[];

    return contests;
  }

  /**
   * Get a specific contest by ID
   */
  async getContest(contestId: string): Promise<ContestWithEventAndCategories> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            scoreCap: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    }) as ContestWithEventAndCategories | null;

    if (!contest) {
      throw this.notFoundError('Contest', contestId);
    }

    return contest;
  }

  /**
   * Get emcee history with pagination
   */
  async getEmceeHistory(page: number = 1, limit: number = 10): Promise<EmceeHistoryResponse> {
    const offset = (page - 1) * limit;

    const scripts = await this.prisma.emceeScript.findMany({
      include: {
        event: true,
        contest: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }) as EmceeScriptWithBasicRelations[];

    const total = await this.prisma.emceeScript.count();

    return {
      scripts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new emcee script
   */
  async uploadScript(data: {
    title: string;
    content?: string;
    filePath?: string | null;
    eventId?: string | null;
    contestId?: string | null;
    categoryId?: string | null;
    order?: number;
    tenantId?: string;
  }): Promise<Prisma.EmceeScriptGetPayload<{}>> {
    this.validateRequired(data as unknown as Record<string, unknown>, ['title', 'tenantId']);

    if (!data.content && !data.filePath) {
      throw this.validationError('Content or file is required');
    }

    const script = await this.prisma.emceeScript.create({
      data: {
        tenantId: data.tenantId!,
        title: data.title,
        content: data.content || `Script file: ${data.filePath}`,
        filePath: data.filePath || null,
        eventId: data.eventId || null,
        contestId: data.contestId || null,
        categoryId: data.categoryId || null,
        order: data.order || 0,
      },
    });

    return script;
  }

  /**
   * Update an existing script
   */
  async updateScript(
    id: string,
    data: {
      title?: string;
      content?: string;
      eventId?: string | null;
      contestId?: string | null;
      categoryId?: string | null;
      order?: number;
    }
  ): Promise<Prisma.EmceeScriptGetPayload<{}>> {
    const script = await this.prisma.emceeScript.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        eventId: data.eventId || null,
        contestId: data.contestId || null,
        categoryId: data.categoryId || null,
        order: data.order || 0,
      },
    });

    return script;
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string): Promise<void> {
    await this.prisma.emceeScript.delete({
      where: { id },
    });
  }

  /**
   * Get script file info
   */
  async getScriptFileInfo(scriptId: string): Promise<Prisma.EmceeScriptGetPayload<{}>> {
    const script = await this.prisma.emceeScript.findUnique({
      where: { id: scriptId },
    });

    if (!script || !script.filePath) {
      throw this.notFoundError('Script file', scriptId);
    }

    return script;
  }
}
