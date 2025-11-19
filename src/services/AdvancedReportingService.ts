import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma } from '@prisma/client';

// P2-4: Proper type definitions for score report responses
type ScoreWithRelations = Prisma.ScoreGetPayload<{
  select: {
    id: true;
    score: true;
    contestantId: true;
    judgeId: true;
    categoryId: true;
    judge: {
      select: {
        name: true;
      };
    };
    contestant: {
      select: {
        name: true;
      };
    };
    category: {
      select: {
        name: true;
        contest: {
          select: {
            name: true;
          };
        };
      };
    };
  };
}>;

type EventWithCounts = Prisma.EventGetPayload<{
  select: {
    id: true;
    name: true;
    contests: {
      select: {
        id: true;
        name: true;
        categories: {
          select: {
            id: true;
            name: true;
            scores: {
              select: {
                id: true;
              };
            };
            contestants: {
              select: {
                id: true;
              };
            };
            judges: {
              select: {
                id: true;
              };
            };
          };
        };
      };
    };
  };
}>;

@injectable()
export class AdvancedReportingService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async generateScoreReport(eventId?: string, contestId?: string, categoryId?: string) {
    const where: Prisma.ScoreWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    else if (contestId) where.category = { contestId };
    else if (eventId) where.category = { contest: { eventId } };

    // P2-2 OPTIMIZATION: Selective field loading
    const scores = await (this.prisma.score.findMany as any)({
      where,
      select: {
        id: true,
        score: true,
        contestantId: true,
        judgeId: true,
        categoryId: true,
        judge: {
          select: {
            name: true
          }
        },
        contestant: {
          select: {
            name: true
          }
        },
        category: {
          select: {
            name: true,
            contest: {
              select: {
                name: true
              }
            }
          }
        }
      }
    }) as ScoreWithRelations[];

    return { scores, total: scores.length };
  }

  async generateSummaryReport(eventId: string) {
    // P2-2 OPTIMIZATION: Selective field loading
    const event = await (this.prisma.event.findUnique as any)({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        contests: {
          select: {
            id: true,
            name: true,
            categories: {
              select: {
                id: true,
                name: true,
                scores: {
                  select: {
                    id: true
                  }
                },
                contestants: {
                  select: {
                    id: true
                  }
                },
                judges: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    }) as EventWithCounts | null;

    if (!event) throw this.notFoundError('Event', eventId);

    return {
      event: event.name,
      contests: event.contests.length,
      categories: event.contests.reduce((sum: number, c) => sum + c.categories.length, 0),
      totalScores: event.contests.reduce((sum: number, c) =>
        sum + c.categories.reduce((s: number, cat) => s + cat.scores.length, 0), 0
      )
    };
  }
}
