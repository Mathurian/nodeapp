import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { AssignmentStatus, Prisma, PrismaClient, UserRole } from '@prisma/client';
import { resolveBioFromCandidates } from '../utils/bioResolver';

interface BioQueryFilters {
  eventId?: string;
  contestId?: string;
  categoryId?: string;
}

interface UpdateBioDto {
  bio?: string;
  imagePath?: string;
}

interface DirectoryContest {
  id: string;
  name: string;
  eventId: string;
  eventName: string | null;
}

interface DirectoryEvent {
  id: string;
  name: string;
}

interface DirectoryContestant {
  id: string;
  name: string;
  contestantNumber: number | null;
  gender: string | null;
  pronouns: string | null;
  imagePath: string | null;
  bio: string | null;
  bioFilePath: string | null;
  contests: Array<{ id: string; name: string }>;
}

interface DirectoryJudge {
  id: string;
  name: string;
  gender: string | null;
  pronouns: string | null;
  isHeadJudge: boolean;
  imagePath: string | null;
  bio: string | null;
  bioFilePath: string | null;
  contests: Array<{ id: string; name: string }>;
}

interface DirectoryUser {
  id: string;
  name: string;
  role: string;
  gender: string | null;
  pronouns: string | null;
  imagePath: string | null;
  bio: string | null;
  bioFilePath: string | null;
  contests: Array<{ id: string; name: string }>;
}

interface BioDirectoryResponse {
  events: DirectoryEvent[];
  contests: DirectoryContest[];
  contestants: DirectoryContestant[];
  judges: DirectoryJudge[];
  allUsers: DirectoryUser[];
}

@injectable()
export class BioService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private normalizeContestant(row: any): DirectoryContestant {
    const firstUser = Array.isArray(row.users) ? row.users[0] : null;
    const resolved = resolveBioFromCandidates([
      firstUser?.contestantBio,
      firstUser?.bio,
      row.bio,
    ]);

    return {
      id: row.id,
      name: row.name,
      contestantNumber: row.contestantNumber ?? null,
      gender: row.gender ?? null,
      pronouns: row.pronouns ?? null,
      imagePath: row.imagePath || firstUser?.imagePath || null,
      bio: resolved.bio,
      bioFilePath: resolved.bioFilePath,
      contests: Array.isArray(row.contestContestants)
        ? row.contestContestants.map((cc: any) => ({
            id: cc.contest.id,
            name: cc.contest.name,
          }))
        : [],
    };
  }

  private normalizeJudge(row: any): DirectoryJudge {
    const firstUser = Array.isArray(row.users) ? row.users[0] : null;
    const resolved = resolveBioFromCandidates([
      firstUser?.judgeBio,
      firstUser?.bio,
      row.bio,
    ]);

    return {
      id: row.id,
      name: row.name,
      gender: row.gender ?? null,
      pronouns: row.pronouns ?? null,
      isHeadJudge: Boolean(row.isHeadJudge),
      imagePath: row.imagePath || firstUser?.imagePath || null,
      bio: resolved.bio,
      bioFilePath: resolved.bioFilePath,
      contests: Array.isArray(row.assignments)
        ? row.assignments
            .map((a: any) => a.contest)
            .filter(Boolean)
            .map((contest: any) => ({ id: contest.id, name: contest.name }))
        : [],
    };
  }

  private normalizeDirectoryUser(row: any): DirectoryUser {
    const role = String(row.role || '').toUpperCase();
    const linkedJudge = row.judge || null;
    const linkedContestant = row.contestant || null;
    const resolved =
      role === 'CONTESTANT'
        ? resolveBioFromCandidates([
            row.contestantBio,
            row.bio,
            linkedContestant?.bio,
          ])
        : role === 'JUDGE'
          ? resolveBioFromCandidates([
              row.judgeBio,
              row.bio,
              linkedJudge?.bio,
            ])
          : resolveBioFromCandidates([row.bio]);

    const contestMap = new Map<string, { id: string; name: string }>();
    if (Array.isArray(linkedJudge?.assignments)) {
      for (const assignment of linkedJudge.assignments) {
        const contest = assignment?.contest;
        if (contest?.id && !contestMap.has(contest.id)) {
          contestMap.set(contest.id, { id: contest.id, name: contest.name });
        }
      }
    }
    if (Array.isArray(linkedContestant?.contestContestants)) {
      for (const cc of linkedContestant.contestContestants) {
        const contest = cc?.contest;
        if (contest?.id && !contestMap.has(contest.id)) {
          contestMap.set(contest.id, { id: contest.id, name: contest.name });
        }
      }
    }

    return {
      id: row.id,
      name: row.name,
      role,
      gender: row.gender ?? null,
      pronouns: row.pronouns ?? null,
      imagePath: row.imagePath || linkedJudge?.imagePath || linkedContestant?.imagePath || null,
      bio: resolved.bio,
      bioFilePath: resolved.bioFilePath,
      contests: [...contestMap.values()],
    };
  }

  private async getJudgeScope(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { judgeId: true },
    });

    if (!user?.judgeId) {
      return { judgeId: null, contestIds: [] as string[], categoryIds: [] as string[] };
    }

    const assignments = await this.prisma.assignment.findMany({
      where: {
        tenantId,
        judgeId: user.judgeId,
        status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
      },
      select: {
        contestId: true,
        categoryId: true,
      },
    });

    const contestIds = new Set<string>();
    const categoryIds = new Set<string>();
    for (const assignment of assignments) {
      if (assignment.categoryId) {
        categoryIds.add(assignment.categoryId);
      } else {
        contestIds.add(assignment.contestId);
      }
    }

    return {
      judgeId: user.judgeId,
      contestIds: [...contestIds],
      categoryIds: [...categoryIds],
    };
  }

  private async getContestantScope(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { contestantId: true },
    });

    if (!user?.contestantId) {
      return { contestantId: null, contestIds: [] as string[], categoryIds: [] as string[] };
    }

    const [contestLinks, categoryLinks] = await Promise.all([
      this.prisma.contestContestant.findMany({
        where: {
          tenantId,
          contestantId: user.contestantId,
        },
        select: { contestId: true },
      }),
      this.prisma.categoryContestant.findMany({
        where: {
          tenantId,
          contestantId: user.contestantId,
        },
        select: { categoryId: true },
      }),
    ]);

    const contestIds = new Set(contestLinks.map((c) => c.contestId));
    const categoryIds = new Set(categoryLinks.map((c) => c.categoryId));

    if (categoryIds.size > 0) {
      const categoryContests = await this.prisma.category.findMany({
        where: {
          tenantId,
          deletedAt: null,
          id: { in: [...categoryIds] },
        },
        select: { contestId: true },
      });
      for (const category of categoryContests) {
        contestIds.add(category.contestId);
      }
    }

    return {
      contestantId: user.contestantId,
      contestIds: [...contestIds],
      categoryIds: [...categoryIds],
    };
  }

  async getBioDirectory(
    userId: string,
    role: UserRole,
    tenantId: string,
    contestId?: string,
    eventId?: string
  ): Promise<BioDirectoryResponse> {
    const normalizedRole = String(role || '').toUpperCase();
    const isJudge = normalizedRole === 'JUDGE';
    const isContestant = normalizedRole === 'CONTESTANT';
    const canSeeJudges = [
      'EMCEE',
      'CONTESTANT',
      'ORGANIZER',
      'BOARD',
      'ADMIN',
      'SUPER_ADMIN',
      'TALLY_MASTER',
      'AUDITOR',
    ].includes(normalizedRole);
    const canSeeAllUsers = [
      'EMCEE',
      'ORGANIZER',
      'BOARD',
      'ADMIN',
      'SUPER_ADMIN',
      'TALLY_MASTER',
      'AUDITOR',
    ].includes(normalizedRole);

    const contestWhere: Prisma.ContestWhereInput = {
      tenantId,
      deletedAt: null,
    };
    const availableContestWhere: Prisma.ContestWhereInput = {
      tenantId,
      deletedAt: null,
    };

    const contestantWhere: Prisma.ContestantWhereInput = {
      tenantId,
    };

    const judgeWhere: Prisma.JudgeWhereInput = {
      tenantId,
    };

    if (isJudge) {
      const scope = await this.getJudgeScope(userId, tenantId);
      if (!scope.judgeId) {
        return { events: [], contests: [], contestants: [], judges: [], allUsers: [] };
      }

      availableContestWhere.id = { in: scope.contestIds };

      let scopedContestIds = [...scope.contestIds];
      if (eventId) {
        const contestsInEvent = await this.prisma.contest.findMany({
          where: {
            tenantId,
            deletedAt: null,
            eventId,
            id: { in: scopedContestIds },
          },
          select: { id: true },
        });
        scopedContestIds = contestsInEvent.map((contest) => contest.id);
      }
      if (contestId) {
        scopedContestIds = scopedContestIds.filter((id) => id === contestId);
      }

      let scopedCategoryIds = [...scope.categoryIds];
      if (scopedCategoryIds.length > 0 && (eventId || contestId)) {
        const filteredCategories = await this.prisma.category.findMany({
          where: {
            tenantId,
            deletedAt: null,
            id: { in: scopedCategoryIds },
            ...(contestId ? { contestId } : {}),
            ...(eventId ? { contest: { eventId } } : {}),
          },
          select: { id: true },
        });
        scopedCategoryIds = filteredCategories.map((category) => category.id);
      }

      contestantWhere.OR = [];
      if (scopedContestIds.length > 0) {
        contestantWhere.OR.push({
          contestContestants: {
            some: {
              tenantId,
              contestId: { in: scopedContestIds },
            },
          },
        });
      }
      if (scopedCategoryIds.length > 0) {
        contestantWhere.OR.push({
          categoryContestants: {
            some: {
              tenantId,
              categoryId: { in: scopedCategoryIds },
            },
          },
        });
      }

      if (!contestantWhere.OR || contestantWhere.OR.length === 0) {
        return { events: [], contests: [], contestants: [], judges: [], allUsers: [] };
      }

      contestWhere.id = { in: scopedContestIds };
    } else if (isContestant) {
      const scope = await this.getContestantScope(userId, tenantId);
      if (!scope.contestantId) {
        return { events: [], contests: [], contestants: [], judges: [], allUsers: [] };
      }

      availableContestWhere.id = { in: scope.contestIds };

      let scopedContestIds = [...scope.contestIds];
      if (eventId) {
        const contestsInEvent = await this.prisma.contest.findMany({
          where: {
            tenantId,
            deletedAt: null,
            eventId,
            id: { in: scopedContestIds },
          },
          select: { id: true },
        });
        scopedContestIds = contestsInEvent.map((contest) => contest.id);
      }
      if (contestId) {
        scopedContestIds = scopedContestIds.filter((id) => id === contestId);
      }

      let scopedCategoryIds = [...scope.categoryIds];
      if ((contestId || eventId) && scopedCategoryIds.length > 0) {
        const categoriesInContest = await this.prisma.category.findMany({
          where: {
            tenantId,
            deletedAt: null,
            ...(contestId ? { contestId } : {}),
            ...(eventId ? { contest: { eventId } } : {}),
            id: { in: scopedCategoryIds },
          },
          select: { id: true },
        });
        const allowed = new Set(categoriesInContest.map((c) => c.id));
        scopedCategoryIds = scopedCategoryIds.filter((id) => allowed.has(id));
      }

      contestantWhere.OR = [];
      if (scopedContestIds.length > 0) {
        contestantWhere.OR.push({
          contestContestants: {
            some: {
              tenantId,
              contestId: { in: scopedContestIds },
            },
          },
        });
      }
      if (scopedCategoryIds.length > 0) {
        contestantWhere.OR.push({
          categoryContestants: {
            some: {
              tenantId,
              categoryId: { in: scopedCategoryIds },
            },
          },
        });
      }

      if (!contestantWhere.OR || contestantWhere.OR.length === 0) {
        return { events: [], contests: [], contestants: [], judges: [], allUsers: [] };
      }

      judgeWhere.OR = [];
      if (scopedContestIds.length > 0) {
        judgeWhere.OR.push({
          assignments: {
            some: {
              tenantId,
              contestId: { in: scopedContestIds },
              status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
            },
          },
        });
      }
      if (scopedCategoryIds.length > 0) {
        judgeWhere.OR.push({
          assignments: {
            some: {
              tenantId,
              categoryId: { in: scopedCategoryIds },
              status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
            },
          },
        });
      }

      contestWhere.id = { in: scopedContestIds };
    } else {
      if (eventId) {
        contestWhere.eventId = eventId;
        contestantWhere.contestContestants = {
          some: {
            tenantId,
            contest: {
              eventId,
            },
          },
        };
        judgeWhere.assignments = {
          some: {
            tenantId,
            eventId,
            status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
          },
        };
      }

      if (contestId) {
        contestantWhere.contestContestants = {
          some: {
            tenantId,
            contestId,
          },
        };
        judgeWhere.assignments = {
          some: {
            tenantId,
            contestId,
            status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
          },
        };
        contestWhere.id = contestId;
      }
    }

    const contestRelationWhere = contestId
      ? { contestId }
      : eventId
        ? {
            contest: {
              eventId,
            },
          }
        : undefined;

    const assignmentRelationWhere = {
      tenantId,
      ...(contestId ? { contestId } : {}),
      ...(eventId ? { eventId } : {}),
      status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
    };
    const broadRoleFilter = {
      role: { in: ['ADMIN', 'SUPER_ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'] as UserRole[] },
    };
    const allUsersScopeFilter = eventId
      ? {
          OR: [
            {
              contestant: {
                contestContestants: {
                  some: {
                    tenantId,
                    contest: {
                      eventId,
                    },
                  },
                },
              },
            },
            {
              judge: {
                assignments: {
                  some: {
                    tenantId,
                    eventId,
                    status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
                  },
                },
              },
            },
            broadRoleFilter,
          ],
        }
      : contestId
        ? {
            OR: [
              {
                contestant: {
                  contestContestants: {
                    some: { tenantId, contestId },
                  },
                },
              },
              {
                judge: {
                  assignments: {
                    some: {
                      tenantId,
                      contestId,
                      status: { in: [AssignmentStatus.PENDING, AssignmentStatus.ACTIVE, AssignmentStatus.COMPLETED] },
                    },
                  },
                },
              },
              broadRoleFilter,
            ],
          }
        : {};

    const [availableContests, contests, contestants, judges, allUsers] = await Promise.all([
      this.prisma.contest.findMany({
        where: availableContestWhere,
        select: {
          id: true,
          name: true,
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ eventId: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.contest.findMany({
        where: contestWhere,
        select: {
          id: true,
          name: true,
          eventId: true,
          event: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.contestant.findMany({
        where: contestantWhere,
        select: {
          id: true,
          name: true,
          contestantNumber: true,
          gender: true,
          pronouns: true,
          bio: true,
          imagePath: true,
          users: {
            select: {
              bio: true,
              contestantBio: true,
              imagePath: true,
            },
          },
          contestContestants: {
            where: contestRelationWhere,
            select: {
              contest: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [{ contestantNumber: 'asc' }, { name: 'asc' }],
      }),
      canSeeJudges
        ? this.prisma.judge.findMany({
            where: judgeWhere,
            select: {
              id: true,
              name: true,
              gender: true,
              pronouns: true,
              bio: true,
              imagePath: true,
              isHeadJudge: true,
              users: {
                select: {
                  bio: true,
                  judgeBio: true,
                  imagePath: true,
                },
              },
              assignments: {
                where: assignmentRelationWhere,
                select: {
                  contest: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: { name: 'asc' },
          })
        : Promise.resolve([] as any[]),
      canSeeAllUsers
        ? this.prisma.user.findMany({
            where: {
              tenantId,
              isActive: true,
              ...allUsersScopeFilter,
            },
            select: {
              id: true,
              name: true,
              role: true,
              gender: true,
              pronouns: true,
              imagePath: true,
              bio: true,
              judgeBio: true,
              contestantBio: true,
              judge: {
                select: {
                  bio: true,
                  imagePath: true,
                  assignments: {
                    where: assignmentRelationWhere,
                    select: {
                      contest: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
              contestant: {
                select: {
                  bio: true,
                  imagePath: true,
                  contestContestants: {
                    where: {
                      tenantId,
                      ...(contestId ? { contestId } : {}),
                      ...(eventId
                        ? {
                            contest: {
                              eventId,
                            },
                          }
                        : {}),
                    },
                    select: {
                      contest: {
                        select: { id: true, name: true },
                      },
                    },
                  },
                },
              },
            },
            orderBy: [{ role: 'asc' }, { name: 'asc' }],
          })
        : Promise.resolve([] as any[]),
    ]);

    const eventsMap = new Map<string, DirectoryEvent>();
    for (const contest of availableContests) {
      if (contest.event?.id && !eventsMap.has(contest.event.id)) {
        eventsMap.set(contest.event.id, {
          id: contest.event.id,
          name: contest.event.name,
        });
      }
    }

    return {
      events: [...eventsMap.values()],
      contests: contests.map((contest) => ({
        id: contest.id,
        name: contest.name,
        eventId: contest.eventId,
        eventName: contest.event?.name || null,
      })),
      contestants: contestants.map((contestant) => this.normalizeContestant(contestant)),
      judges: judges.map((judge) => this.normalizeJudge(judge)),
      allUsers: allUsers.map((entry) => this.normalizeDirectoryUser(entry)),
    };
  }

  /**
   * Get contestant bios with filters
   */
  async getContestantBios(filters: BioQueryFilters, tenantId: string): Promise<DirectoryContestant[]> {
    const where: Prisma.ContestantWhereInput = { tenantId };

    if (filters.eventId) {
      where.contestContestants = {
        some: {
          tenantId,
          contest: {
            eventId: filters.eventId,
          },
        },
      };
    }

    if (filters.contestId) {
      where.contestContestants = {
        some: {
          tenantId,
          contestId: filters.contestId,
        },
      };
    }

    if (filters.categoryId) {
      where.categoryContestants = {
        some: {
          tenantId,
          categoryId: filters.categoryId,
        },
      };
    }

    const contestants = await this.prisma.contestant.findMany({
      where,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true,
        gender: true,
        pronouns: true,
        contestantNumber: true,
        users: {
          select: {
            bio: true,
            contestantBio: true,
            imagePath: true,
          },
        },
        contestContestants: {
          select: {
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ contestantNumber: 'asc' }, { name: 'asc' }],
    });

    return contestants.map((contestant) => this.normalizeContestant(contestant));
  }

  /**
   * Get judge bios with filters
   */
  async getJudgeBios(filters: BioQueryFilters, tenantId: string): Promise<DirectoryJudge[]> {
    const where: Prisma.JudgeWhereInput = { tenantId };

    if (filters.eventId) {
      where.assignments = {
        some: {
          tenantId,
          eventId: filters.eventId,
        },
      };
    }

    if (filters.contestId) {
      where.assignments = {
        some: {
          tenantId,
          contestId: filters.contestId,
        },
      };
    }

    if (filters.categoryId) {
      where.assignments = {
        some: {
          tenantId,
          categoryId: filters.categoryId,
        },
      };
    }

    const judges = await this.prisma.judge.findMany({
      where,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true,
        gender: true,
        pronouns: true,
        isHeadJudge: true,
        users: {
          select: {
            bio: true,
            judgeBio: true,
            imagePath: true,
          },
        },
        assignments: {
          where: { tenantId },
          select: {
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return judges.map((judge) => this.normalizeJudge(judge));
  }

  /**
   * Update contestant bio and image
   */
  async updateContestantBio(contestantId: string, data: UpdateBioDto) {
    const updateData: Prisma.ContestantUpdateInput = {};
    const userUpdateData: Prisma.UserUpdateManyMutationInput = {};

    if (data.bio !== undefined) {
      updateData.bio = data.bio;
      userUpdateData.contestantBio = data.bio;
      userUpdateData.bio = data.bio;
    }

    if (data.imagePath !== undefined) {
      updateData.imagePath = data.imagePath;
      userUpdateData.imagePath = data.imagePath;
    }

    const contestant = await this.prisma.contestant.findUnique({
      where: { id: contestantId },
    });

    if (!contestant) {
      throw this.notFoundError('Contestant', contestantId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedContestant = await tx.contestant.update({
        where: { id: contestantId },
        data: updateData,
        select: {
          id: true,
          name: true,
          bio: true,
          imagePath: true,
        },
      });

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.updateMany({
          where: {
            contestantId,
            tenantId: contestant.tenantId,
          },
          data: userUpdateData,
        });
      }

      return updatedContestant;
    });
  }

  /**
   * Update judge bio and image
   */
  async updateJudgeBio(judgeId: string, data: UpdateBioDto) {
    const updateData: Prisma.JudgeUpdateInput = {};
    const userUpdateData: Prisma.UserUpdateManyMutationInput = {};

    if (data.bio !== undefined) {
      updateData.bio = data.bio;
      userUpdateData.judgeBio = data.bio;
      userUpdateData.bio = data.bio;
    }

    if (data.imagePath !== undefined) {
      updateData.imagePath = data.imagePath;
      userUpdateData.imagePath = data.imagePath;
    }

    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId },
    });

    if (!judge) {
      throw this.notFoundError('Judge', judgeId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedJudge = await tx.judge.update({
        where: { id: judgeId },
        data: updateData,
        select: {
          id: true,
          name: true,
          bio: true,
          imagePath: true,
        },
      });

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.updateMany({
          where: {
            judgeId,
            tenantId: judge.tenantId,
          },
          data: userUpdateData,
        });
      }

      return updatedJudge;
    });
  }
}
