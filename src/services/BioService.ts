import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// Prisma payload types
type ContestantWithRelations = Prisma.ContestantGetPayload<{
  select: {
    id: true;
    name: true;
    bio: true;
    imagePath: true;
    gender: true;
    pronouns: true;
    contestantNumber: true;
    contestContestants: {
      select: {
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
      };
    };
    categoryContestants: {
      select: {
        category: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

type JudgeWithRelations = Prisma.JudgeGetPayload<{
  select: {
    id: true;
    name: true;
    bio: true;
    imagePath: true;
    gender: true;
    pronouns: true;
    isHeadJudge: true;
    contestJudges: {
      select: {
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
      };
    };
    categoryJudges: {
      select: {
        category: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

type ContestantBasic = Prisma.ContestantGetPayload<{
  select: {
    id: true;
    name: true;
    bio: true;
    imagePath: true;
  };
}>;

type JudgeBasic = Prisma.JudgeGetPayload<{
  select: {
    id: true;
    name: true;
    bio: true;
    imagePath: true;
  };
}>;

interface BioQueryFilters {
  eventId?: string;
  contestId?: string;
  categoryId?: string;
}

interface UpdateBioDto {
  bio?: string;
  imagePath?: string;
}

@injectable()
export class BioService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Get contestant bios with filters
   */
  async getContestantBios(filters: BioQueryFilters): Promise<ContestantWithRelations[]> {
    const where: Prisma.ContestantWhereInput = {};

    if (filters.eventId) {
      where.contestContestants = {
        some: {
          contest: {
            eventId: filters.eventId
          }
        }
      };
    }

    if (filters.contestId) {
      where.contestContestants = {
        some: {
          contestId: filters.contestId
        }
      };
    }

    if (filters.categoryId) {
      where.categoryContestants = {
        some: {
          categoryId: filters.categoryId
        }
      };
    }

    return await this.prisma.contestant.findMany({
      where,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true,
        gender: true,
        pronouns: true,
        contestantNumber: true,
        contestContestants: {
          select: {
            contest: {
              select: {
                id: true,
                name: true,
                event: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        categoryContestants: {
          select: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { contestantNumber: 'asc' }
    });
  }

  /**
   * Get judge bios with filters
   */
  async getJudgeBios(filters: BioQueryFilters): Promise<JudgeWithRelations[]> {
    const where: Prisma.JudgeWhereInput = {};

    if (filters.eventId) {
      where.contestJudges = {
        some: {
          contest: {
            eventId: filters.eventId
          }
        }
      };
    }

    if (filters.contestId) {
      where.contestJudges = {
        some: {
          contestId: filters.contestId
        }
      };
    }

    if (filters.categoryId) {
      where.categoryJudges = {
        some: {
          categoryId: filters.categoryId
        }
      };
    }

    return await this.prisma.judge.findMany({
      where,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true,
        gender: true,
        pronouns: true,
        isHeadJudge: true,
        contestJudges: {
          select: {
            contest: {
              select: {
                id: true,
                name: true,
                event: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        categoryJudges: {
          select: {
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Update contestant bio and image
   */
  async updateContestantBio(contestantId: string, data: UpdateBioDto): Promise<ContestantBasic> {
    const updateData: Prisma.ContestantUpdateInput = {};

    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }

    if (data.imagePath !== undefined) {
      updateData.imagePath = data.imagePath;
    }

    // Verify contestant exists
    const contestant = await this.prisma.contestant.findUnique({
      where: { id: contestantId }
    });

    if (!contestant) {
      throw this.notFoundError('Contestant', contestantId);
    }

    return await this.prisma.contestant.update({
      where: { id: contestantId },
      data: updateData,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true
      }
    });
  }

  /**
   * Update judge bio and image
   */
  async updateJudgeBio(judgeId: string, data: UpdateBioDto): Promise<JudgeBasic> {
    const updateData: Prisma.JudgeUpdateInput = {};

    if (data.bio !== undefined) {
      updateData.bio = data.bio;
    }

    if (data.imagePath !== undefined) {
      updateData.imagePath = data.imagePath;
    }

    // Verify judge exists
    const judge = await this.prisma.judge.findUnique({
      where: { id: judgeId }
    });

    if (!judge) {
      throw this.notFoundError('Judge', judgeId);
    }

    return await this.prisma.judge.update({
      where: { id: judgeId },
      data: updateData,
      select: {
        id: true,
        name: true,
        bio: true,
        imagePath: true
      }
    });
  }
}
