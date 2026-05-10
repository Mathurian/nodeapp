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

const emceeScriptRelations = {
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
} as const;

/**
 * Service for managing emcee-related functionality
 * Handles scripts, contestant/judge bios, and event management
 */
@injectable()
export class EmceeService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private normalizeScriptContent(content?: string | null, filePath?: string | null): string {
    const normalizedContent = String(content || '').trim();
    if (!normalizedContent) {
      return '';
    }

    const normalizedFilePath = String(filePath || '').trim();
    if (normalizedFilePath && normalizedContent === `Script file: ${normalizedFilePath}`) {
      return '';
    }

    return normalizedContent;
  }

  private normalizeScriptRecord<T extends { content: string; filePath?: string | null }>(script: T): T {
    return {
      ...script,
      content: this.normalizeScriptContent(script.content, script.filePath),
    };
  }

  private async resolveValidatedScriptScope(input: {
    eventId?: string | null;
    contestId?: string | null;
    categoryId?: string | null;
    tenantId?: string;
  }): Promise<{
    eventId: string | null;
    contestId: string | null;
    categoryId: string | null;
  }> {
    let eventId = input.eventId || null;
    let contestId = input.contestId || null;
    let categoryId = input.categoryId || null;

    const tenantClause = input.tenantId ? { tenantId: input.tenantId } : {};

    if (eventId) {
      const event = await this.prisma.event.findFirst({
        where: {
          id: eventId,
          ...tenantClause,
        },
        select: { id: true },
      });
      if (!event) {
        throw this.notFoundError('Event', eventId);
      }
    }

    let contest:
      | {
          id: string;
          eventId: string;
        }
      | null = null;
    if (contestId) {
      contest = await this.prisma.contest.findFirst({
        where: {
          id: contestId,
          ...tenantClause,
        },
        select: {
          id: true,
          eventId: true,
        },
      });
      if (!contest) {
        throw this.notFoundError('Contest', contestId);
      }
      if (eventId && contest.eventId !== eventId) {
        throw this.validationError('Selected contest does not belong to the selected event');
      }
      if (!eventId) {
        eventId = contest.eventId;
      }
    }

    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          ...tenantClause,
        },
        select: {
          id: true,
          contestId: true,
          contest: {
            select: {
              eventId: true,
            },
          },
        },
      });
      if (!category) {
        throw this.notFoundError('Category', categoryId);
      }
      if (contestId && category.contestId !== contestId) {
        throw this.validationError('Selected category does not belong to the selected contest');
      }
      if (!contestId) {
        contestId = category.contestId;
      }
      if (eventId && category.contest.eventId !== eventId) {
        throw this.validationError('Selected category does not belong to the selected event');
      }
      if (!eventId) {
        eventId = category.contest.eventId;
      }
    }

    return {
      eventId,
      contestId,
      categoryId,
    };
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
  async getScripts(filters: {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
    tenantId?: string;
  }): Promise<EmceeScriptWithRelations[]> {
    const whereClause: Prisma.EmceeScriptWhereInput = {};

    if (filters.eventId) whereClause.eventId = filters.eventId;
    if (filters.contestId) whereClause.contestId = filters.contestId;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;
    if (filters.tenantId) whereClause.tenantId = filters.tenantId;

    const scripts = await this.prisma.emceeScript.findMany({
      where: whereClause,
      include: emceeScriptRelations,
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    }) as EmceeScriptWithRelations[];

    return scripts.map((script) => this.normalizeScriptRecord(script));
  }

  /**
   * Get a specific script by ID with relations
   */
  async getScript(
    scriptId: string,
    options?: { tenantId?: string }
  ): Promise<EmceeScriptWithRelations> {
    const whereClause: Prisma.EmceeScriptWhereInput = { id: scriptId };

    if (options?.tenantId) whereClause.tenantId = options.tenantId;

    const script = await this.prisma.emceeScript.findFirst({
      where: whereClause,
      include: emceeScriptRelations,
    });

    if (!script) {
      throw this.notFoundError('Script', scriptId);
    }

    return this.normalizeScriptRecord(script);
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
      scripts: scripts.map((script) => this.normalizeScriptRecord(script)),
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

    const normalizedContent = this.normalizeScriptContent(data.content, data.filePath);

    if (!normalizedContent && !data.filePath) {
      throw this.validationError('Content or file is required');
    }

    const scope = await this.resolveValidatedScriptScope({
      eventId: data.eventId,
      contestId: data.contestId,
      categoryId: data.categoryId,
      tenantId: data.tenantId,
    });

    const script = await this.prisma.emceeScript.create({
      data: {
        tenantId: data.tenantId!,
        title: data.title,
        content: normalizedContent,
        filePath: data.filePath || null,
        eventId: scope.eventId,
        contestId: scope.contestId,
        categoryId: scope.categoryId,
        order: data.order || 0,
      },
    });

    return this.normalizeScriptRecord(script);
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
    },
    tenantId?: string
  ): Promise<Prisma.EmceeScriptGetPayload<{}>> {
    const existingScript = await this.getScript(id, tenantId ? { tenantId } : undefined);

    const scopeWasProvided =
      Object.prototype.hasOwnProperty.call(data, 'eventId') ||
      Object.prototype.hasOwnProperty.call(data, 'contestId') ||
      Object.prototype.hasOwnProperty.call(data, 'categoryId');

    const resolvedScope = scopeWasProvided
      ? await this.resolveValidatedScriptScope({
          eventId: Object.prototype.hasOwnProperty.call(data, 'eventId') ? data.eventId ?? null : existingScript.eventId,
          contestId: Object.prototype.hasOwnProperty.call(data, 'contestId') ? data.contestId ?? null : existingScript.contestId,
          categoryId: Object.prototype.hasOwnProperty.call(data, 'categoryId') ? data.categoryId ?? null : existingScript.categoryId,
          tenantId,
        })
      : {
          eventId: existingScript.eventId,
          contestId: existingScript.contestId,
          categoryId: existingScript.categoryId,
        };

    const updateData: Prisma.EmceeScriptUncheckedUpdateInput = {};
    if (data.title !== undefined) {
      updateData.title = data.title;
    }
    if (data.content !== undefined) {
      updateData.content = this.normalizeScriptContent(data.content, existingScript.filePath);
    }
    if (scopeWasProvided) {
      updateData.eventId = resolvedScope.eventId;
      updateData.contestId = resolvedScope.contestId;
      updateData.categoryId = resolvedScope.categoryId;
    }
    if (data.order !== undefined) {
      updateData.order = data.order;
    }

    const script = await this.prisma.emceeScript.update({
      where: { id },
      data: updateData,
    });

    return this.normalizeScriptRecord(script);
  }

  /**
   * Delete a script
   */
  async deleteScript(id: string, tenantId?: string): Promise<void> {
    if (tenantId) {
      await this.getScript(id, { tenantId });
    }

    await this.prisma.emceeScript.delete({
      where: { id },
    });
  }

  /**
   * Get script file info
   */
  async getScriptFileInfo(
    scriptId: string,
    options?: { tenantId?: string }
  ): Promise<Prisma.EmceeScriptGetPayload<{}>> {
    const whereClause: Prisma.EmceeScriptWhereInput = { id: scriptId };

    if (options?.tenantId) whereClause.tenantId = options.tenantId;

    const script = await this.prisma.emceeScript.findFirst({
      where: whereClause,
    });

    if (!script || !script.filePath) {
      throw this.notFoundError('Script file', scriptId);
    }

    return script;
  }
}
