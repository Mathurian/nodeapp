/**
 * Event Repository
 * Data access layer for Event entity
 */

import { Event } from '@prisma/client';
import { injectable } from 'tsyringe';
import { BaseRepository, PaginationOptions, PaginatedResult } from './BaseRepository';

// Type for Event with common relations
export type EventWithRelations = Event & {
  contests?: Array<{
    categories: Array<{ [key: string]: unknown }>;
    contestants: Array<{ userId: string; [key: string]: unknown }>;
    judges: Array<{ userId: string; [key: string]: unknown }>;
    _count: { scores: number };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

@injectable()
export class EventRepository extends BaseRepository<Event> {
  protected getModelName(): string {
    return 'event';
  }

  /**
   * Find active (non-archived) events
   */
  async findActiveEvents(): Promise<Event[]> {
    return this.findMany(
      { archived: false },
      { orderBy: { startDate: 'desc' } }
    );
  }

  /**
   * Find archived events
   */
  async findArchivedEvents(): Promise<Event[]> {
    return this.findMany(
      { archived: true },
      { orderBy: { startDate: 'desc' } }
    );
  }

  /**
   * Find upcoming events
   */
  async findUpcomingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.findMany(
      {
        archived: false,
        startDate: { gte: now }
      },
      { orderBy: { startDate: 'asc' } }
    );
  }

  /**
   * Find ongoing events
   */
  async findOngoingEvents(): Promise<Event[]> {
    const now = new Date();
    return this.findMany({
      archived: false,
      startDate: { lte: now },
      endDate: { gte: now }
    });
  }

  /**
   * Find past events
   */
  async findPastEvents(): Promise<Event[]> {
    const now = new Date();
    return this.findMany(
      {
        archived: false,
        endDate: { lt: now }
      },
      { orderBy: { endDate: 'desc' } }
    );
  }

  /**
   * Find event with full details
   */
  async findEventWithDetails(eventId: string): Promise<EventWithRelations | null> {
    return (this.getModel() as any).findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: true,
            contestants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            },
            judges: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    }) as Promise<EventWithRelations | null>;
  }

  /**
   * Find events by date range
   */
  async findEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    return this.findMany({
      OR: [
        {
          startDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          endDate: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          AND: [
            { startDate: { lte: startDate } },
            { endDate: { gte: endDate } }
          ]
        }
      ]
    });
  }

  /**
   * Search events by name
   */
  async searchEvents(query: string): Promise<Event[]> {
    return this.findMany({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    });
  }

  /**
   * Archive an event
   */
  async archiveEvent(eventId: string): Promise<Event> {
    return this.update(eventId, { archived: true });
  }

  /**
   * Unarchive an event
   */
  async unarchiveEvent(eventId: string): Promise<Event> {
    return this.update(eventId, { archived: false });
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string): Promise<{
    totalContests: number;
    totalCategories: number;
    totalContestants: number;
    totalJudges: number;
    totalScores: number;
  }> {
    const event = await (this.getModel() as any).findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: true,
            contestants: true,
            judges: true,
            _count: {
              select: {
                scores: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return {
        totalContests: 0,
        totalCategories: 0,
        totalContestants: 0,
        totalJudges: 0,
        totalScores: 0
      };
    }

    const totalCategories = event.contests.reduce((sum: number, contest: any) =>
      sum + contest.categories.length, 0
    );

    const contestantIds = new Set<string>();
    const judgeIds = new Set<string>();
    let totalScores = 0;

    event.contests.forEach((contest: any) => {
      contest.contestants.forEach((c: any) => contestantIds.add(c.userId));
      contest.judges.forEach((j: any) => judgeIds.add(j.userId));
      totalScores += contest._count.scores;
    });

    return {
      totalContests: event.contests.length,
      totalCategories,
      totalContestants: contestantIds.size,
      totalJudges: judgeIds.size,
      totalScores
    };
  }

  /**
   * Get events requiring attention (starting soon, no contests, etc.)
   */
  async getEventsRequiringAttention(): Promise<Event[]> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return (this.getModel() as any).findMany({
      where: {
        archived: false,
        startDate: {
          lte: threeDaysFromNow,
          gte: new Date()
        },
        contests: {
          none: {}
        }
      }
    });
  }

  /**
   * Find all events with pagination
   */
  async findAllPaginated(options: PaginationOptions): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated({}, options);
  }

  /**
   * Find active events with pagination
   */
  async findActiveEventsPaginated(options: PaginationOptions): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated(
      { archived: false },
      { ...options, orderBy: options.orderBy || { startDate: 'desc' } }
    );
  }

  /**
   * Find archived events with pagination
   */
  async findArchivedEventsPaginated(options: PaginationOptions): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated(
      { archived: true },
      { ...options, orderBy: options.orderBy || { startDate: 'desc' } }
    );
  }

  /**
   * Search events with pagination
   */
  async searchEventsPaginated(query: string, options: PaginationOptions): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    }, options);
  }
}
