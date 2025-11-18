import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';

@injectable()
export class AdvancedReportingService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  async generateScoreReport(eventId?: string, contestId?: string, categoryId?: string) {
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    else if (contestId) where.category = { contestId };
    else if (eventId) where.category = { contest: { eventId } };

    // P2-2 OPTIMIZATION: Selective field loading
    const scores: any = await this.prisma.score.findMany({
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
      } as any
    } as any);

    return { scores, total: scores.length };
  }

  async generateSummaryReport(eventId: string) {
    // P2-2 OPTIMIZATION: Selective field loading
    const event: any = await this.prisma.event.findUnique({
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
      } as any
    } as any);

    if (!event) throw this.notFoundError('Event', eventId);

    return {
      event: event.name,
      contests: event.contests.length,
      categories: event.contests.reduce((sum, c) => sum + c.categories.length, 0),
      totalScores: event.contests.reduce((sum, c) =>
        sum + c.categories.reduce((s, cat) => s + cat.scores.length, 0), 0
      )
    };
  }
}
