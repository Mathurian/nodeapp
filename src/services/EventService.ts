/**
 * Event Service
 * Business logic layer for Event entity with caching support
 */

import { Event } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError, NotFoundError } from './BaseService';
import { EventRepository } from '../repositories/EventRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';

interface CreateEventDto {
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  location?: string;
  description?: string;
  maxContestants?: number;
  contestantNumberingMode?: 'MANUAL' | 'AUTO';
}

interface UpdateEventDto extends Partial<CreateEventDto> {}

interface EventFilters {
  archived?: boolean;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

@injectable()
export class EventService extends BaseService {
  constructor(
    @inject('EventRepository') private eventRepo: EventRepository,
    @inject('CacheService') private cacheService: CacheService,
    @inject(RestrictionService) private restrictionService: RestrictionService
  ) {
    super();
  }

  /**
   * Get cache key for event
   */
  private getCacheKey(id: string): string {
    return `event:${id}`;
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
      await this.cacheService.del(this.getCacheKey(id));
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
      this.validateRequired(data, ['name', 'startDate', 'endDate']);

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
        ...data,
        startDate,
        endDate,
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
  async getEventById(id: string): Promise<Event> {
    try {
      // Try cache first
      const cacheKey = this.getCacheKey(id);
      const cached = await this.cacheService.get<Event>(cacheKey);

      if (cached) {
        this.logInfo('Event cache hit', { eventId: id });
        return cached;
      }

      // Fetch from database
      const event = await this.eventRepo.findById(id);

      if (!event) {
        throw new NotFoundError('Event', id);
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
  async getEventWithDetails(id: string): Promise<any> {
    try {
      const cacheKey = `event:details:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached;
      }

      const event = await this.eventRepo.findEventWithDetails(id);

      if (!event) {
        throw new NotFoundError('Event', id);
      }

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, event, 1800);

      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventWithDetails', id });
    }
  }

  /**
   * Get all events with filters
   */
  async getAllEvents(filters?: EventFilters): Promise<Event[]> {
    try {
      const cacheKey = this.getListCacheKey(filters);
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      let events: Event[];

      if (filters?.archived !== undefined) {
        events = filters.archived
          ? await this.eventRepo.findArchivedEvents()
          : await this.eventRepo.findActiveEvents();
      } else if (filters?.search) {
        events = await this.eventRepo.searchEvents(filters.search);
      } else {
        events = await this.eventRepo.findAll();
      }

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, events, 300);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getAllEvents', filters });
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(): Promise<Event[]> {
    try {
      const cacheKey = 'events:upcoming';
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findUpcomingEvents();

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
  async getOngoingEvents(): Promise<Event[]> {
    try {
      const cacheKey = 'events:ongoing';
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findOngoingEvents();

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
  async getPastEvents(): Promise<Event[]> {
    try {
      const cacheKey = 'events:past';
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findPastEvents();

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
  async updateEvent(id: string, data: UpdateEventDto): Promise<Event> {
    try {
      // Check if event is locked
      const isLocked = await this.restrictionService.isLocked(id);
      if (isLocked) {
        throw this.forbiddenError('Event is locked and cannot be edited. Please unlock it first.');
      }

      // Verify event exists
      await this.getEventById(id);

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
      const event = await this.eventRepo.update(id, data);

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
  async archiveEvent(id: string): Promise<Event> {
    try {
      const event = await this.eventRepo.archiveEvent(id);

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
  async unarchiveEvent(id: string): Promise<Event> {
    try {
      const event = await this.eventRepo.unarchiveEvent(id);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event unarchived', { eventId: id });
      return event;
    } catch (error) {
      return this.handleError(error, { operation: 'unarchiveEvent', id });
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      // Check if event is locked
      const isLocked = await this.restrictionService.isLocked(id);
      if (isLocked) {
        throw this.forbiddenError('Event is locked and cannot be deleted. Please unlock it first.');
      }

      // Verify event exists
      await this.getEventById(id);

      // Delete event
      await this.eventRepo.delete(id);

      // Invalidate caches
      await this.invalidateEventCache(id);

      this.logInfo('Event deleted', { eventId: id });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteEvent', id });
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(id: string): Promise<any> {
    try {
      const cacheKey = `events:stats:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached;
      }

      const stats = await this.eventRepo.getEventStats(id);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventStats', id });
    }
  }

  /**
   * Search events
   */
  async searchEvents(query: string): Promise<Event[]> {
    try {
      const cacheKey = `events:search:${query}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.searchEvents(query);

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
  async getEventsByDateRange(startDate: Date, endDate: Date): Promise<Event[]> {
    try {
      const cacheKey = `events:range:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.findEventsByDateRange(startDate, endDate);

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
  async getEventsRequiringAttention(): Promise<Event[]> {
    try {
      const cacheKey = 'events:attention';
      const cached = await this.cacheService.get<Event[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const events = await this.eventRepo.getEventsRequiringAttention();

      // Cache for 1 hour
      await this.cacheService.set(cacheKey, events, 3600);

      return events;
    } catch (error) {
      return this.handleError(error, { operation: 'getEventsRequiringAttention' });
    }
  }
}
