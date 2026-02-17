/**
 * Event Service
 * Business logic layer for Event entity with caching support
 */

import { Event, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError, NotFoundError } from './BaseService';
import { EventRepository } from '../repositories/EventRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';
import { PaginationOptions, PaginatedResponse } from '../utils/pagination';
// S4-4: Import MetricsService for soft delete tracking
import { MetricsService } from './MetricsService';

// Proper type definitions for event responses
type EventWithDetails = Prisma.EventGetPayload<{
  include: {
    contests: {
      include: {
        categories: {
          include: {
            criteria: true;
            contestants: true;
          };
        };
      };
    };
  };
}>;

interface EventStats {
  totalContests: number;
  totalCategories: number;
  totalContestants: number;
  totalScores: number;
  completionPercentage: number;
  averageScoresPerContest: number;
}

interface CreateEventDto {
  tenantId?: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  location?: string;
  description?: string;
  maxContestants?: number;
  contestantNumberingMode?: 'MANUAL' | 'AUTO_INDEXED' | 'OPTIONAL';
  contestantViewRestricted?: boolean;
  contestantViewReleaseDate?: Date | string | null;
}

interface UpdateEventDto extends Partial<CreateEventDto> {}

interface EventFilters {
  archived?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  tenantId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@injectable()
export class EventService extends BaseService {
  constructor(
    @inject('EventRepository') private eventRepo: EventRepository,
    @inject('CacheService') private cacheService: CacheService,
    @inject(RestrictionService) private restrictionService: RestrictionService,
    @inject(MetricsService) private metricsService: MetricsService
  ) {
    super();
  }

  /**
   * Get cache key for event
   */
  private getCacheKey(id: string, tenantId?: string, isSuperAdmin: boolean = false): string {
    const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
    return `event:${scope}:${id}`;
  }

  /**
   * Get cache key for event list
   */
  private getListCacheKey(filters?: EventFilters): string {
    return `events:list:${JSON.stringify(filters || {})}`;
  }

  /**
   * Invalidate event cache
   */
  private async invalidateEventCache(id?: string): Promise<void> {
    if (id) {
      await this.cacheService.invalidatePattern(`event:*:${id}`);
      await this.cacheService.invalidatePattern(`event:details:*:${id}`);
      await this.cacheService.invalidatePattern(`events:stats:*:${id}`);
    }
    // Invalidate all event list caches
    await this.cacheService.invalidatePattern('events:list:*');
    await this.cacheService.invalidatePattern('events:stats:*');
  }

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventDto): Promise<Event> {
    try {
      // Validate required fields
      this.validateRequired(data as unknown as Record<string, unknown>, ['name', 'startDate', 'endDate']);
      if (!data.tenantId) {
        throw new ValidationError('Tenant context is required to create an event');
      }

      // Validate dates
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);

      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start date format');
      }

      if (isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid end date format');
      }

      if (endDate < startDate) {
        throw new ValidationError('End date must be after start date');
      }

      // Create event
      const event = await this.eventRepo.create({
        tenantId: data.tenantId,
        ...data,
        startDate,
        endDate,
        contestantViewReleaseDate: data.contestantViewReleaseDate
          ? new Date(data.contestantViewReleaseDate)
          : null,
      });

      // Invalidate list caches
      await this.invalidateEventCache();

      this.logInfo('Event created', { eventId: event.id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'createEvent', data });
    }
  }

  /**
   * Get event by ID with caching
   */
  async getEventById(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    try {
      // Try cache first
      const cacheKey = this.getCacheKey(id, tenantId, isSuperAdmin);
      const cached = await this.cacheService.get<Event>(cacheKey);

      if (cached) {
        this.logInfo('Event cache hit', { eventId: id });
        return cached;
      }

      // Fetch from database
      const event = await this.eventRepo.findByIdScoped(id, tenantId, isSuperAdmin);

      if (!event) {
        throw this.notFoundError('Event', id);
      }

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, event, 3600);

      this.logInfo('Event cache miss', { eventId: id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventById', id });
    }
  }

  /**
   * Get event with full details
   */
  async getEventWithDetails(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<EventWithDetails> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `event:details:${scope}:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as EventWithDetails;
      }

      const event = await this.eventRepo.findEventWithDetails(id, tenantId, isSuperAdmin);

      if (!event) {
        throw new NotFoundError(`Event ${id} not found`);
      }

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, event, 1800);

      return event as unknown as EventWithDetails;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventWithDetails', id });
    }
  }

  /**
   * Get all events with filters
   */
  async getAllEvents(filters?: EventFilters, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const cacheKey = this.getListCacheKey(filters);
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      let events: Event[];

      if (filters?.archived !== undefined) {
        events = filters.archived
          ? await this.eventRepo.findArchivedEvents(filters.tenantId, isSuperAdmin)
          : await this.eventRepo.findActiveEvents(filters.tenantId, isSuperAdmin);
      } else if (filters?.search) {
        events = await this.eventRepo.searchEvents(filters.search, filters.tenantId, isSuperAdmin);
      } else {
        events = await this.eventRepo.findActiveEvents(filters?.tenantId, isSuperAdmin);
      }

      events = events.filter((event) => !event.deletedAt);

      // CRITICAL: Filter by tenantId if provided (tenant isolation)
      if (filters?.tenantId) {
        events = events.filter(event => event.tenantId === filters.tenantId);
      }

      // Filter by created date range
      if (filters?.createdAfter) {
        events = events.filter(event => new Date(event.createdAt) >= filters.createdAfter!);
      }
      if (filters?.createdBefore) {
        events = events.filter(event => new Date(event.createdAt) <= filters.createdBefore!);
      }

      // Sort events
      if (filters?.sortBy) {
        const sortField = filters.sortBy as keyof Event;
        const sortDir = filters.sortDirection || 'desc';
        events.sort((a, b) => {
          const aVal = a[sortField];
          const bVal = b[sortField];

          if (aVal === null || aVal === undefined) return sortDir === 'asc' ? 1 : -1;
          if (bVal === null || bVal === undefined) return sortDir === 'asc' ? -1 : 1;

          if (aVal instanceof Date && bVal instanceof Date) {
            return sortDir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
          }

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
          }

          return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : (bVal < aVal ? -1 : 1);
        });
      }

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, events, 300);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getAllEvents', filters });
    }
  }

  /**
   * Get all events with pagination
   */
  async getAllEventsPaginated(
    filters?: EventFilters,
    paginationOptions?: PaginationOptions,
    isSuperAdmin: boolean = false
  ): Promise<PaginatedResponse<Event>> {
    try {
      // Build repository pagination options (use defaults from repository)
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const repoPaginationOptions = {
        page,
        limit,
        orderBy: { startDate: 'desc' as const }
      };

      let result;

      if (filters?.archived !== undefined) {
        result = filters.archived
          ? await this.eventRepo.findArchivedEventsPaginated(repoPaginationOptions, filters.tenantId, isSuperAdmin)
          : await this.eventRepo.findActiveEventsPaginated(repoPaginationOptions, filters.tenantId, isSuperAdmin);
      } else if (filters?.search) {
        result = await this.eventRepo.searchEventsPaginated(filters.search, repoPaginationOptions, filters.tenantId, isSuperAdmin);
      } else {
        result = await this.eventRepo.findAllPaginated(repoPaginationOptions, filters?.tenantId, isSuperAdmin);
      }

      // Convert repository PaginatedResult to service PaginatedResponse
      return {
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      return this.handleError(error, { operation: 'getAllEventsPaginated', filters, paginationOptions });
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:upcoming:${scope}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findUpcomingEvents(tenantId, isSuperAdmin);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, events, 300);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getUpcomingEvents' });
    }
  }

  /**
   * Get ongoing events
   */
  async getOngoingEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:ongoing:${scope}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findOngoingEvents(tenantId, isSuperAdmin);

      // Cache for 2 minutes (more frequent updates for ongoing events)
      await this.cacheService.set(cacheKey, events, 120);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getOngoingEvents' });
    }
  }

  /**
   * Get past events
   */
  async getPastEvents(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:past:${scope}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findPastEvents(tenantId, isSuperAdmin);

      // Cache for 1 hour (past events don't change)
      await this.cacheService.set(cacheKey, events, 3600);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getPastEvents' });
    }
  }

  /**
   * Update event
   */
  async updateEvent(id: string, data: UpdateEventDto, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    try {
      // Check if event is locked
      const isLocked = await this.restrictionService.isLocked(id);
      if (isLocked) {
        throw this.forbiddenError('Event is locked and cannot be edited. Please unlock it first.');
      }

      // Verify event exists
      await this.getEventById(id, tenantId, isSuperAdmin);

      // Validate dates if provided
      if (data.startDate || data.endDate) {
        const startDate = data.startDate ? new Date(data.startDate) : undefined;
        const endDate = data.endDate ? new Date(data.endDate) : undefined;

        if (startDate && isNaN(startDate.getTime())) {
          throw new ValidationError('Invalid start date format');
        }

        if (endDate && isNaN(endDate.getTime())) {
          throw new ValidationError('Invalid end date format');
        }

        if (startDate && endDate && endDate < startDate) {
          throw new ValidationError('End date must be after start date');
        }
      }

      // Update event
      const event = await this.eventRepo.update(id, {
        ...data,
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.contestantViewReleaseDate !== undefined
          ? {
              contestantViewReleaseDate: data.contestantViewReleaseDate
                ? new Date(data.contestantViewReleaseDate)
                : null
            }
          : {}),
      });

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event updated', { eventId: id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'updateEvent', id, data });
    }
  }

  /**
   * Archive event
   */
  async archiveEvent(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    try {
      await this.getEventById(id, tenantId, isSuperAdmin);
      const event = await this.eventRepo.archiveEvent(id, tenantId, isSuperAdmin);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event archived', { eventId: id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'archiveEvent', id });
    }
  }

  /**
   * Unarchive event
   */
  async unarchiveEvent(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    try {
      await this.getEventById(id, tenantId, isSuperAdmin);
      const event = await this.eventRepo.unarchiveEvent(id, tenantId, isSuperAdmin);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event unarchived', { eventId: id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'unarchiveEvent', id });
    }
  }

  /**
   * Delete event (soft delete)
   * S4-3: Soft delete with deletedBy tracking
   */
  async deleteEvent(id: string, deletedBy?: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<void> {
    try {
      // Check if event is locked
      const isLocked = await this.restrictionService.isLocked(id);
      if (isLocked) {
        throw this.forbiddenError('Event is locked and cannot be deleted. Please unlock it first.');
      }

      // Verify event exists and get tenant for metrics
      const event = await this.getEventById(id, tenantId, isSuperAdmin);

      // S4-3: Soft delete with deletedBy tracking
      await this.eventRepo.update(id, {
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
      });

      // S4-4: Record soft delete metrics
      this.metricsService.recordSoftDelete('Event', event.tenantId);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event soft deleted', { eventId: id, deletedBy });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteEvent', id });
    }
  }

  /**
   * Restore soft-deleted event
   * S4-3: Restore functionality
   */
  async restoreEvent(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event> {
    try {
      if (!isSuperAdmin && tenantId) {
        await this.getEventById(id, tenantId, isSuperAdmin);
      }
      // Update to restore (set deletedAt to null)
      const restoredEvent = await this.eventRepo.update(id, {
        deletedAt: null,
        deletedBy: null,
      });

      // S4-4: Record soft delete restore metrics
      this.metricsService.recordSoftDeleteRestore('Event', restoredEvent.tenantId);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event restored', { eventId: id });

      return restoredEvent;
    } catch (error) {
      return this.handleError(error, { operation: 'restoreEvent', id });
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(id: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<EventStats> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:stats:${scope}:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as EventStats;
      }

      const stats = await this.eventRepo.getEventStats(id, tenantId, isSuperAdmin);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, 300);

      return stats as unknown as EventStats;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventStats', id });
    }
  }

  /**
   * Search events
   */
  async searchEvents(query: string, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:search:${scope}:${query}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.searchEvents(query, tenantId, isSuperAdmin);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, events, 300);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'searchEvents', query });
    }
  }

  /**
   * Get events by date range
   */
  async getEventsByDateRange(startDate: Date, endDate: Date, tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:range:${scope}:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findEventsByDateRange(startDate, endDate, tenantId, isSuperAdmin);

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, events, 600);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventsByDateRange', startDate, endDate });
    }
  }

  /**
   * Get events requiring attention
   */
  async getEventsRequiringAttention(tenantId?: string, isSuperAdmin: boolean = false): Promise<Event[]> {
    try {
      const scope = isSuperAdmin ? 'superadmin' : (tenantId || 'tenant');
      const cacheKey = `events:attention:${scope}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.getEventsRequiringAttention(tenantId, isSuperAdmin);

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, events, 3600);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventsRequiringAttention' });
    }
  }
}
