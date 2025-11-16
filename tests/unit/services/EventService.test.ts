/**
 * EventService Unit Tests
 * Tests all public methods with mocked dependencies
 */

import { EventService } from '../../../src/services/EventService';
import { EventRepository } from '../../../src/repositories/EventRepository';
import { CacheService } from '../../../src/services/CacheService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('EventService', () => {
  let eventService: EventService;
  let mockEventRepo: jest.Mocked<EventRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockEventRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findUpcomingEvents: jest.fn(),
      findOngoingEvents: jest.fn(),
      findPastEvents: jest.fn(),
      findActiveEvents: jest.fn(),
      findArchivedEvents: jest.fn(),
      findEventWithDetails: jest.fn(),
      findEventsByDateRange: jest.fn(),
      searchEvents: jest.fn(),
      getEventsRequiringAttention: jest.fn(),
      getEventStats: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      archiveEvent: jest.fn(),
      unarchiveEvent: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidatePattern: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn(),
      disconnect: jest.fn(),
      enabled: true,
    } as any;

    eventService = new EventService(mockEventRepo, mockCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvent', () => {
    it('should create event with valid data', async () => {
      const eventData = {
        name: 'Test Event',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-02'),
        location: 'Test Venue',
        description: 'Test Description',
      };
      const createdEvent = { id: '1', ...eventData };
      mockEventRepo.create.mockResolvedValue(createdEvent as any);

      const result = await eventService.createEvent(eventData);

      expect(result).toEqual(createdEvent);
      expect(mockEventRepo.create).toHaveBeenCalledWith(eventData);
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('events:list:*');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('events:stats:*');
    });

    it('should throw error if name is missing', async () => {
      const invalidData = {
        startDate: new Date(),
        endDate: new Date(),
      } as any;

      await expect(eventService.createEvent(invalidData)).rejects.toThrow();
    });

    it('should throw error if startDate is missing', async () => {
      const invalidData = {
        name: 'Test',
        endDate: new Date(),
      } as any;

      await expect(eventService.createEvent(invalidData)).rejects.toThrow();
    });

    it('should throw error if endDate is missing', async () => {
      const invalidData = {
        name: 'Test',
        startDate: new Date(),
      } as any;

      await expect(eventService.createEvent(invalidData)).rejects.toThrow();
    });

    it('should throw error if startDate is invalid', async () => {
      const invalidData = {
        name: 'Test',
        startDate: 'invalid-date',
        endDate: new Date('2025-12-02'),
      };

      await expect(eventService.createEvent(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw error if endDate is invalid', async () => {
      const invalidData = {
        name: 'Test',
        startDate: new Date('2025-12-01'),
        endDate: 'invalid-date',
      };

      await expect(eventService.createEvent(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw error if endDate is before startDate', async () => {
      const invalidData = {
        name: 'Test',
        startDate: new Date('2025-12-02'),
        endDate: new Date('2025-12-01'),
      };

      await expect(eventService.createEvent(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('getEventById', () => {
    it('should return cached event if available', async () => {
      const cachedEvent = {
        id: '1',
        name: 'Cached Event',
        startDate: new Date(),
        endDate: new Date(),
      };
      mockCacheService.get.mockResolvedValue(cachedEvent);

      const result = await eventService.getEventById('1');

      expect(result).toEqual(cachedEvent);
      expect(mockCacheService.get).toHaveBeenCalledWith('event:1');
      expect(mockEventRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbEvent = {
        id: '1',
        name: 'DB Event',
        startDate: new Date(),
        endDate: new Date(),
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(dbEvent as any);

      const result = await eventService.getEventById('1');

      expect(result).toEqual(dbEvent);
      expect(mockEventRepo.findById).toHaveBeenCalledWith('1');
      expect(mockCacheService.set).toHaveBeenCalledWith('event:1', dbEvent, 3600);
    });

    it('should throw NotFoundError if event not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(null);

      await expect(eventService.getEventById('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEventWithDetails', () => {
    it('should return cached detailed event if available', async () => {
      const cachedEvent = {
        id: '1',
        name: 'Event',
        contests: [],
        assignments: [],
      };
      mockCacheService.get.mockResolvedValue(cachedEvent);

      const result = await eventService.getEventWithDetails('1');

      expect(result).toEqual(cachedEvent);
      expect(mockCacheService.get).toHaveBeenCalledWith('event:details:1');
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbEvent = {
        id: '1',
        name: 'Event',
        contests: [],
        assignments: [],
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findEventWithDetails.mockResolvedValue(dbEvent as any);

      const result = await eventService.getEventWithDetails('1');

      expect(result).toEqual(dbEvent);
      expect(mockCacheService.set).toHaveBeenCalledWith('event:details:1', dbEvent, 1800);
    });

    it('should throw NotFoundError if not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findEventWithDetails.mockResolvedValue(null);

      await expect(eventService.getEventWithDetails('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllEvents', () => {
    it('should return all events', async () => {
      const events = [
        { id: '1', name: 'Event 1', startDate: new Date(), endDate: new Date() },
        { id: '2', name: 'Event 2', startDate: new Date(), endDate: new Date() },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findAll.mockResolvedValue(events as any);

      const result = await eventService.getAllEvents();

      expect(result).toEqual(events);
      expect(mockEventRepo.findAll).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached events if available', async () => {
      const events = [{ id: '1', name: 'Cached Event' }];
      mockCacheService.get.mockResolvedValue(events);

      const result = await eventService.getAllEvents();

      expect(result).toEqual(events);
      expect(mockEventRepo.findAll).not.toHaveBeenCalled();
    });

    it('should filter archived events', async () => {
      const events = [{ id: '1', name: 'Archived Event' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findArchivedEvents.mockResolvedValue(events as any);

      const result = await eventService.getAllEvents({ archived: true });

      expect(mockEventRepo.findArchivedEvents).toHaveBeenCalled();
      expect(result).toEqual(events);
    });

    it('should filter active events', async () => {
      const events = [{ id: '1', name: 'Active Event' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findActiveEvents.mockResolvedValue(events as any);

      const result = await eventService.getAllEvents({ archived: false });

      expect(mockEventRepo.findActiveEvents).toHaveBeenCalled();
      expect(result).toEqual(events);
    });

    it('should search events by query', async () => {
      const events = [{ id: '1', name: 'Search Result' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.searchEvents.mockResolvedValue(events as any);

      const result = await eventService.getAllEvents({ search: 'test' });

      expect(mockEventRepo.searchEvents).toHaveBeenCalledWith('test');
      expect(result).toEqual(events);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      const events = [
        { id: '1', name: 'Future Event', startDate: new Date('2025-12-01') },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findUpcomingEvents.mockResolvedValue(events as any);

      const result = await eventService.getUpcomingEvents();

      expect(result).toEqual(events);
      expect(mockEventRepo.findUpcomingEvents).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith('events:upcoming', events, 300);
    });

    it('should return cached upcoming events', async () => {
      const events = [{ id: '1', name: 'Cached Upcoming' }];
      mockCacheService.get.mockResolvedValue(events);

      const result = await eventService.getUpcomingEvents();

      expect(result).toEqual(events);
      expect(mockEventRepo.findUpcomingEvents).not.toHaveBeenCalled();
    });
  });

  describe('getOngoingEvents', () => {
    it('should return ongoing events', async () => {
      const events = [{ id: '1', name: 'Ongoing Event' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findOngoingEvents.mockResolvedValue(events as any);

      const result = await eventService.getOngoingEvents();

      expect(result).toEqual(events);
      expect(mockCacheService.set).toHaveBeenCalledWith('events:ongoing', events, 120);
    });
  });

  describe('getPastEvents', () => {
    it('should return past events', async () => {
      const events = [{ id: '1', name: 'Past Event' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findPastEvents.mockResolvedValue(events as any);

      const result = await eventService.getPastEvents();

      expect(result).toEqual(events);
      expect(mockCacheService.set).toHaveBeenCalledWith('events:past', events, 3600);
    });
  });

  describe('updateEvent', () => {
    it('should update event and invalidate cache', async () => {
      const existingEvent = {
        id: '1',
        name: 'Old Name',
        startDate: new Date(),
        endDate: new Date(),
      };
      const updateData = { name: 'New Name' };
      const updatedEvent = { ...existingEvent, ...updateData };

      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(existingEvent as any);
      mockEventRepo.update.mockResolvedValue(updatedEvent as any);

      const result = await eventService.updateEvent('1', updateData);

      expect(result).toEqual(updatedEvent);
      expect(mockCacheService.del).toHaveBeenCalledWith('event:1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('events:list:*');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('events:stats:*');
    });

    it('should validate dates when updating', async () => {
      const existingEvent = {
        id: '1',
        name: 'Event',
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-02'),
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(existingEvent as any);

      const invalidUpdate = {
        startDate: new Date('2025-12-03'),
        endDate: new Date('2025-12-01'),
      };

      await expect(eventService.updateEvent('1', invalidUpdate)).rejects.toThrow(ValidationError);
    });

    it('should throw error if startDate is invalid', async () => {
      const existingEvent = {
        id: '1',
        name: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(existingEvent as any);

      await expect(
        eventService.updateEvent('1', { startDate: 'invalid' as any })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('archiveEvent', () => {
    it('should archive event and invalidate cache', async () => {
      const archivedEvent = { id: '1', name: 'Event', archived: true };
      mockEventRepo.archiveEvent.mockResolvedValue(archivedEvent as any);

      const result = await eventService.archiveEvent('1');

      expect(result).toEqual(archivedEvent);
      expect(mockEventRepo.archiveEvent).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('event:1');
    });
  });

  describe('unarchiveEvent', () => {
    it('should unarchive event and invalidate cache', async () => {
      const unarchivedEvent = { id: '1', name: 'Event', archived: false };
      mockEventRepo.unarchiveEvent.mockResolvedValue(unarchivedEvent as any);

      const result = await eventService.unarchiveEvent('1');

      expect(result).toEqual(unarchivedEvent);
      expect(mockEventRepo.unarchiveEvent).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('event:1');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event and invalidate cache', async () => {
      const existingEvent = {
        id: '1',
        name: 'Event',
        startDate: new Date(),
        endDate: new Date(),
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(existingEvent as any);
      mockEventRepo.delete.mockResolvedValue(undefined);

      await eventService.deleteEvent('1');

      expect(mockEventRepo.delete).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('event:1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('events:list:*');
    });

    it('should throw error if event not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findById.mockResolvedValue(null);

      await expect(eventService.deleteEvent('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEventStats', () => {
    it('should return event statistics', async () => {
      const stats = {
        totalContests: 5,
        totalCategories: 10,
        totalContestants: 50,
        totalJudges: 15,
        totalScores: 200,
      };
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.getEventStats.mockResolvedValue(stats);

      const result = await eventService.getEventStats('1');

      expect(result).toEqual(stats);
      expect(mockCacheService.set).toHaveBeenCalledWith('events:stats:1', stats, 300);
    });

    it('should return cached stats', async () => {
      const stats = {
        totalContests: 5,
        totalCategories: 10,
        totalContestants: 50,
        totalJudges: 15,
        totalScores: 200,
      };
      mockCacheService.get.mockResolvedValue(stats);

      const result = await eventService.getEventStats('1');

      expect(result).toEqual(stats);
      expect(mockEventRepo.getEventStats).not.toHaveBeenCalled();
    });
  });

  describe('searchEvents', () => {
    it('should search events by query', async () => {
      const events = [{ id: '1', name: 'Found Event' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.searchEvents.mockResolvedValue(events as any);

      const result = await eventService.searchEvents('test query');

      expect(result).toEqual(events);
      expect(mockEventRepo.searchEvents).toHaveBeenCalledWith('test query');
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('getEventsByDateRange', () => {
    it('should return events in date range', async () => {
      const startDate = new Date('2025-12-01');
      const endDate = new Date('2025-12-31');
      const events = [{ id: '1', name: 'Event in Range' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.findEventsByDateRange.mockResolvedValue(events as any);

      const result = await eventService.getEventsByDateRange(startDate, endDate);

      expect(result).toEqual(events);
      expect(mockEventRepo.findEventsByDateRange).toHaveBeenCalledWith(startDate, endDate);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('getEventsRequiringAttention', () => {
    it('should return events requiring attention', async () => {
      const events = [{ id: '1', name: 'Event Needing Attention' }];
      mockCacheService.get.mockResolvedValue(null);
      mockEventRepo.getEventsRequiringAttention.mockResolvedValue(events as any);

      const result = await eventService.getEventsRequiringAttention();

      expect(result).toEqual(events);
      expect(mockCacheService.set).toHaveBeenCalledWith('events:attention', events, 3600);
    });
  });
});
