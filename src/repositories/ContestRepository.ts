/**
 * Contest Repository
 * Data access layer for Contest entity
 */

import { Contest, PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseRepository } from './BaseRepository';

// Type for Contest with common relations
export type ContestWithRelations = Contest & {
  [key: string]: unknown;
};

@injectable()
export class ContestRepository extends BaseRepository<Contest> {
  constructor(@inject('PrismaClient') prisma: PrismaClient) {
    super(prisma);
  }

  protected getModelName(): string {
    return 'contest';
  }

  /**
   * Find contests by event ID
   * Excludes contests from archived events unless explicitly requested
   */
  async findByEventId(eventId: string, includeArchivedEvents: boolean = false): Promise<Contest[]> {
    const where: Record<string, unknown> = { eventId };
    
    if (!includeArchivedEvents) {
      where['event'] = {
        archived: false
      };
    }
    
    return this.findMany(
      where,
      { orderBy: { createdAt: 'asc' } }
    );
  }

  /**
   * Find contests by event ID including archived contests
   * Used when viewing contests for a specific event (allows archived contests even if event is archived)
   */
  async findByEventIdWithArchived(eventId: string, includeArchivedContests: boolean = false): Promise<Contest[]> {
    const where: Record<string, unknown> = { eventId };
    
    if (!includeArchivedContests) {
      where['archived'] = false;
    }
    
    return this.findMany(
      where,
      { orderBy: { createdAt: 'asc' } }
    );
  }

  /**
   * Find active contests by event
   * Excludes contests from archived events
   */
  async findActiveByEventId(eventId: string): Promise<Contest[]> {
    return this.findMany(
      {
        eventId,
        archived: false,
        event: {
          archived: false
        }
      },
      { orderBy: { createdAt: 'asc' } }
    );
  }

  /**
   * Find archived contests
   */
  async findArchivedContests(): Promise<Contest[]> {
    return this.findMany(
      { archived: true },
      { orderBy: { createdAt: 'desc' } }
    );
  }

  /**
   * Find all active contests (excluding archived contests and contests from archived events)
   */
  async findAllActive(): Promise<Contest[]> {
    return this.findMany(
      {
        archived: false,
        event: {
          archived: false
        }
      },
      { orderBy: { createdAt: 'desc' } }
    );
  }

  /**
   * Find contest with full details
   */
  async findContestWithDetails(contestId: string): Promise<ContestWithRelations | null> {
    return this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        event: true,
        categories: {
          include: {
            criteria: true,
            categoryJudges: {
              include: {
                judge: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        preferredName: true,
                      },
                    },
                  },
                },
              },
            },
            categoryContestants: {
              include: {
                contestant: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        preferredName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        contestContestants: {
          include: {
            contestant: {
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    preferredName: true,
                    contestantNumber: true,
                  },
                },
              },
            },
          },
        },
        contestJudges: {
          include: {
            judge: {
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    preferredName: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as Promise<ContestWithRelations | null>;
  }

  /**
   * Find contests with scores
   */
  async findContestWithScores(contestId: string): Promise<ContestWithRelations | null> {
    return this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        categories: {
          include: {
            criteria: true,
            categoryContestants: {
              include: {
                contestant: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true,
                        preferredName: true,
                        contestantNumber: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Search contests by name
   */
  async searchContests(query: string): Promise<Contest[]> {
    return this.findMany({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    });
  }

  /**
   * Archive a contest
   */
  async archiveContest(contestId: string): Promise<Contest> {
    return this.update(contestId, { archived: true });
  }

  /**
   * Unarchive a contest
   */
  async unarchiveContest(contestId: string): Promise<Contest> {
    return this.update(contestId, { archived: false });
  }

  /**
   * Get contest statistics
   */
  async getContestStats(contestId: string): Promise<{
    totalCategories: number;
    totalContestants: number;
    totalJudges: number;
    totalScores: number;
  }> {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        categories: {
          include: {
            _count: {
              select: {
                categoryContestants: true,
                categoryJudges: true,
              },
            },
          },
        },
        _count: {
          select: {
            contestContestants: true,
            contestJudges: true,
          },
        },
      },
    });

    if (!contest) {
      return {
        totalCategories: 0,
        totalContestants: 0,
        totalJudges: 0,
        totalScores: 0,
      };
    }

    type ContestWithCounts = {
      categories: Array<unknown>;
      _count: {
        contestContestants: number;
        contestJudges: number;
      };
    };
    const contestWithCounts = contest as unknown as ContestWithCounts;
    
    return {
      totalCategories: contestWithCounts.categories.length,
      totalContestants: contestWithCounts._count?.contestContestants ?? 0,
      totalJudges: contestWithCounts._count?.contestJudges ?? 0,
      totalScores: 0, // Would need to count from scores table
    };
  }

  /**
   * Get next contestant number for contest
   */
  async getNextContestantNumber(contestId: string): Promise<number> {
    const contest = await this.findById(contestId);
    return contest?.nextContestantNumber || 1;
  }

  /**
   * Increment contestant number
   */
  async incrementContestantNumber(contestId: string): Promise<Contest> {
    const contest = await this.findById(contestId);
    if (!contest) {
      throw new Error('Contest not found');
    }

    const nextNumber = (contest.nextContestantNumber || 1) + 1;
    return this.update(contestId, { nextContestantNumber: nextNumber });
  }
}
