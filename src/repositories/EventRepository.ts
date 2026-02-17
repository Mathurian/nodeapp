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

  private withTenantScope(
    where: Record<string, unknown>,
    tenantId?: string,
    isSuperAdmin: boolean = false
  ): Record<string, unknown> {
    if (isSuperAdmin || !tenantId) {
      return where;
    }
    return { ...where, tenantId };
  }

  /**
   * Find event by ID with optional tenant scoping.
   */
  async findByIdScoped(eventId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event | null> {
    return this.prisma.event.findFirst({
      where: this.withTenantScope({ id: eventId }, tenantId, isSuperAdmin)
    });
  }

  /**
   * Find active (non-archived) events
   */
  async findActiveEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    return this.findMany(
      this.withTenantScope({ archived: false, deletedAt: null }, tenantId, isSuperAdmin),
      { orderBy: { startDate: 'desc' } }
    );
  }

  /**
   * Find archived events
   */
  async findArchivedEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    return this.findMany(
      this.withTenantScope({ archived: true, deletedAt: null }, tenantId, isSuperAdmin),
      { orderBy: { startDate: 'desc' } }
    );
  }

  /**
   * Find upcoming events
   */
  async findUpcomingEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    const now = new Date();
    return this.findMany(
      this.withTenantScope({
        archived: false,
        deletedAt: null,
        startDate: { gte: now }
      }, tenantId, isSuperAdmin),
      { orderBy: { startDate: 'asc' } }
    );
  }

  /**
   * Find ongoing events
   */
  async findOngoingEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    const now = new Date();
    return this.findMany(this.withTenantScope({
      archived: false,
      deletedAt: null,
      startDate: { lte: now },
      endDate: { gte: now }
    }, tenantId, isSuperAdmin));
  }

  /**
   * Find past events
   */
  async findPastEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    const now = new Date();
    return this.findMany(
      this.withTenantScope({
        archived: false,
        deletedAt: null,
        endDate: { lt: now }
      }, tenantId, isSuperAdmin),
      { orderBy: { endDate: 'desc' } }
    );
  }

  /**
   * Find event with full details
   */
  async findEventWithDetails(eventId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<EventWithRelations | null> {
    return this.prisma.event.findFirst({
      where: this.withTenantScope({ id: eventId }, tenantId, isSuperAdmin),
      include: {
        contests: {
          include: {
            categories: true,
            contestContestants: {
              include: {
                contestant: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            },
            contestJudges: {
              include: {
                judge: {
                  include: {
                    users: {
                      select: {
                        id: true,
                        name: true,
                        email: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        assignments: {
          include: {
            assignedByUser: {
              select: {
                id: true,
                name: true,
                email: true
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
  async findEventsByDateRange(startDate: Date, endDate: Date, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    return this.findMany(this.withTenantScope({
      deletedAt: null,
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
    }, tenantId, isSuperAdmin));
  }

  /**
   * Search events by name
   */
  async searchEvents(query: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    return this.findMany(this.withTenantScope({
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    }, tenantId, isSuperAdmin));
  }

  /**
   * Archive an event
   */
  async archiveEvent(eventId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    if (!isSuperAdmin && tenantId) {
      const found = await this.findByIdScoped(eventId, tenantId, false);
      if (!found) {
        throw new Error(`Event ${eventId} not found`);
      }
    }
    return this.update(eventId, { archived: true });
  }

  /**
   * Unarchive an event
   */
  async unarchiveEvent(eventId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    if (!isSuperAdmin && tenantId) {
      const found = await this.findByIdScoped(eventId, tenantId, false);
      if (!found) {
        throw new Error(`Event ${eventId} not found`);
      }
    }
    return this.update(eventId, { archived: false });
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<{
    totalContests: number;
    totalCategories: number;
    totalContestants: number;
    totalJudges: number;
    totalScores: number;
  }> {
    const event = await this.prisma.event.findFirst({
      where: this.withTenantScope({ id: eventId }, tenantId, isSuperAdmin),
      include: {
        contests: {
          include: {
            categories: true,
            contestContestants: true,
            contestJudges: true,
            _count: {
              select: {
                categories: true
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

    type EventWithContests = {
      contests: Array<{
        categories: Array<unknown>;
        contestContestants: Array<{ contestantId: string }>;
        contestJudges: Array<{ judgeId: string }>;
        _count: { categories: number };
      }>;
    };
    const eventWithContests = event as unknown as EventWithContests;
    
    type ContestWithCounts = {
      categories: Array<unknown>;
      contestContestants: Array<{ contestantId: string }>;
      contestJudges: Array<{ judgeId: string }>;
      _count: { categories: number };
    };
    const totalCategories = eventWithContests.contests.reduce((sum: number, contest: ContestWithCounts) =>
      sum + contest.categories.length, 0
    );

    const contestantIds = new Set<string>();
    const judgeIds = new Set<string>();
    // Total scores would need to be calculated from the scores table separately
    const totalScores = 0;

    eventWithContests.contests.forEach((contest: ContestWithCounts) => {
      contest.contestContestants.forEach((c) => contestantIds.add(c.contestantId));
      contest.contestJudges.forEach((j) => judgeIds.add(j.judgeId));
    });

    return {
      totalContests: eventWithContests.contests.length,
      totalCategories,
      totalContestants: contestantIds.size,
      totalJudges: judgeIds.size,
      totalScores
    };
  }

  /**
   * Get events requiring attention (starting soon, no contests, etc.)
   */
  async getEventsRequiringAttention(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return this.prisma.event.findMany({
      where: this.withTenantScope({
        archived: false,
        startDate: {
          lte: threeDaysFromNow,
          gte: new Date()
        },
        contests: {
          none: {}
        }
      }, tenantId, isSuperAdmin)
    });
  }

  /**
   * Find all events with pagination
   */
  async findAllPaginated(options: PaginationOptions, tenantId?: string, isSuperAdmin: boolean = false): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated(this.withTenantScope({}, tenantId, isSuperAdmin), options);
  }

  /**
   * Find active events with pagination
   */
  async findActiveEventsPaginated(options: PaginationOptions, tenantId?: string, isSuperAdmin: boolean = false): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated(
      this.withTenantScope({ archived: false }, tenantId, isSuperAdmin),
      { ...options, orderBy: options.orderBy || { startDate: 'desc' } }
    );
  }

  /**
   * Find archived events with pagination
   */
  async findArchivedEventsPaginated(options: PaginationOptions, tenantId?: string, isSuperAdmin: boolean = false): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated(
      this.withTenantScope({ archived: true }, tenantId, isSuperAdmin),
      { ...options, orderBy: options.orderBy || { startDate: 'desc' } }
    );
  }

  /**
   * Search events with pagination
   */
  async searchEventsPaginated(
    query: string,
    options: PaginationOptions,
    tenantId?: string,
    isSuperAdmin: boolean = false
  ): Promise<PaginatedResult<Event>> {
    return this.findManyPaginated({
      ...this.withTenantScope({}, tenantId, isSuperAdmin),
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } }
      ]
    }, options);
  }
}
