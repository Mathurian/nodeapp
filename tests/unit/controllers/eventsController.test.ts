/**
 * EventsController Unit Tests
 * Comprehensive test coverage for event management controller
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { EventsController } from '../../../src/controllers/eventsController';
import { EventService } from '../../../src/services/EventService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

// Mock the container
jest.mock('tsyringe', () => ({
  container: {
    resolve: jest.fn(),
  },
  injectable: () => jest.fn(),
  inject: () => jest.fn(),
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createRequestLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock response helpers
const mockSendSuccess = jest.fn((res, data, message, status) => {
  const statusCode = status || 200;
  return res.status(statusCode).json({ success: true, data, message });
});

jest.mock('../../../src/utils/responseHelpers', () => ({
  sendSuccess: (...args: any[]) => mockSendSuccess(...args),
}));

describe('EventsController', () => {
  let controller: EventsController;
  let mockEventService: DeepMockProxy<EventService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockEventService = mockDeep<EventService>();

    // Mock container.resolve to return our mock service
    const { container } = require('tsyringe');
    container.resolve.mockImplementation((token: any) => {
      if (token === EventService) return mockEventService;
      return null;
    });

    controller = new EventsController();

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 'admin-1', role: 'ADMIN' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
    mockSendSuccess.mockClear();
  });

  afterEach(() => {
    mockReset(mockEventService);
  });

  describe('GET /api/events - getAllEvents', () => {
    it('should return all events with computed status', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Event 1',
          startDate: new Date('2025-12-01'),
          endDate: new Date('2025-12-31'),
          archived: false,
        },
        {
          id: 'event-2',
          name: 'Event 2',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          archived: false,
        },
      ];

      mockEventService.getAllEvents.mockResolvedValue(mockEvents as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getAllEvents).toHaveBeenCalledWith({});
      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({ id: 'event-1', status: expect.any(String) }),
          expect.objectContaining({ id: 'event-2', status: expect.any(String) }),
        ])
      );
    });

    it('should filter events by archived status', async () => {
      mockReq.query = { archived: 'true' };
      mockEventService.getAllEvents.mockResolvedValue([] as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getAllEvents).toHaveBeenCalledWith({ archived: true });
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, []);
    });

    it('should filter events by search query', async () => {
      mockReq.query = { search: 'competition' };
      mockEventService.getAllEvents.mockResolvedValue([] as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getAllEvents).toHaveBeenCalledWith({ search: 'competition' });
    });

    it('should compute ACTIVE status for ongoing events', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const tomorrow = new Date(now.getTime() + 86400000);

      const mockEvents = [
        {
          id: 'event-1',
          name: 'Active Event',
          startDate: yesterday,
          endDate: tomorrow,
          archived: false,
        },
      ];

      mockEventService.getAllEvents.mockResolvedValue(mockEvents as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({ status: 'ACTIVE' }),
        ])
      );
    });

    it('should compute COMPLETED status for past events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Past Event',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2020-01-31'),
          archived: false,
        },
      ];

      mockEventService.getAllEvents.mockResolvedValue(mockEvents as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({ status: 'COMPLETED' }),
        ])
      );
    });

    it('should compute ARCHIVED status for archived events', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          name: 'Archived Event',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          archived: true,
        },
      ];

      mockEventService.getAllEvents.mockResolvedValue(mockEvents as any);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.arrayContaining([
          expect.objectContaining({ status: 'ARCHIVED' }),
        ])
      );
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockEventService.getAllEvents.mockRejectedValue(error);

      await controller.getAllEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/:id - getEventById', () => {
    it('should return event by ID successfully', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        description: 'Test Description',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      mockReq.params = { id: 'event-1' };
      mockEventService.getEventById.mockResolvedValue(mockEvent as any);

      await controller.getEventById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getEventById).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvent);
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.getEventById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.getEventById.mockRejectedValue(error);

      await controller.getEventById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/:id/details - getEventWithDetails', () => {
    it('should return event with full details', async () => {
      const mockEvent = {
        id: 'event-1',
        name: 'Test Event',
        contests: [{ id: 'contest-1', name: 'Contest 1' }],
        categories: [{ id: 'cat-1', name: 'Category 1' }],
      };

      mockReq.params = { id: 'event-1' };
      mockEventService.getEventWithDetails.mockResolvedValue(mockEvent as any);

      await controller.getEventWithDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getEventWithDetails).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvent);
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.getEventWithDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.getEventWithDetails.mockRejectedValue(error);

      await controller.getEventWithDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/upcoming - getUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'Future Event 1', startDate: new Date('2026-01-01') },
        { id: 'event-2', name: 'Future Event 2', startDate: new Date('2026-06-01') },
      ];

      mockEventService.getUpcomingEvents.mockResolvedValue(mockEvents as any);

      await controller.getUpcomingEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getUpcomingEvents).toHaveBeenCalled();
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvents);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockEventService.getUpcomingEvents.mockRejectedValue(error);

      await controller.getUpcomingEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/ongoing - getOngoingEvents', () => {
    it('should return ongoing events', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'Current Event', startDate: new Date() },
      ];

      mockEventService.getOngoingEvents.mockResolvedValue(mockEvents as any);

      await controller.getOngoingEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getOngoingEvents).toHaveBeenCalled();
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvents);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockEventService.getOngoingEvents.mockRejectedValue(error);

      await controller.getOngoingEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/past - getPastEvents', () => {
    it('should return past events', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'Past Event', endDate: new Date('2020-01-31') },
      ];

      mockEventService.getPastEvents.mockResolvedValue(mockEvents as any);

      await controller.getPastEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getPastEvents).toHaveBeenCalled();
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvents);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockEventService.getPastEvents.mockRejectedValue(error);

      await controller.getPastEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/events - createEvent', () => {
    const validEventData = {
      name: 'New Event',
      description: 'Event Description',
      startDate: '2025-06-01',
      endDate: '2025-06-30',
      location: 'Convention Center',
    };

    it('should create event successfully', async () => {
      const createdEvent = { id: 'event-1', ...validEventData };
      mockReq.body = validEventData;
      mockEventService.createEvent.mockResolvedValue(createdEvent as any);

      await controller.createEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.createEvent).toHaveBeenCalledWith(validEventData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Event created successfully',
          data: createdEvent,
        })
      );
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.body = validEventData;
      mockEventService.createEvent.mockRejectedValue(error);

      await controller.createEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('PUT /api/events/:id - updateEvent', () => {
    const updateData = {
      name: 'Updated Event Name',
      description: 'Updated Description',
    };

    it('should update event successfully', async () => {
      const updatedEvent = { id: 'event-1', ...updateData };
      mockReq.params = { id: 'event-1' };
      mockReq.body = updateData;
      mockEventService.updateEvent.mockResolvedValue(updatedEvent as any);

      await controller.updateEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.updateEvent).toHaveBeenCalledWith('event-1', updateData);
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, updatedEvent, 'Event updated successfully');
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = updateData;

      await controller.updateEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockReq.body = updateData;
      mockEventService.updateEvent.mockRejectedValue(error);

      await controller.updateEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('DELETE /api/events/:id - deleteEvent', () => {
    it('should delete event successfully', async () => {
      mockReq.params = { id: 'event-1' };
      mockEventService.deleteEvent.mockResolvedValue(undefined);

      await controller.deleteEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.deleteEvent).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event deleted successfully', 204);
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.deleteEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.deleteEvent.mockRejectedValue(error);

      await controller.deleteEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/events/:id/archive - archiveEvent', () => {
    it('should archive event successfully', async () => {
      const archivedEvent = { id: 'event-1', archived: true };
      mockReq.params = { id: 'event-1' };
      mockEventService.archiveEvent.mockResolvedValue(archivedEvent as any);

      await controller.archiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.archiveEvent).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, archivedEvent, 'Event archived successfully');
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.archiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.archiveEvent.mockRejectedValue(error);

      await controller.archiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('POST /api/events/:id/unarchive - unarchiveEvent', () => {
    it('should unarchive event successfully', async () => {
      const unarchivedEvent = { id: 'event-1', archived: false };
      mockReq.params = { id: 'event-1' };
      mockEventService.unarchiveEvent.mockResolvedValue(unarchivedEvent as any);

      await controller.unarchiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.unarchiveEvent).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, unarchivedEvent, 'Event unarchived successfully');
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.unarchiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.unarchiveEvent.mockRejectedValue(error);

      await controller.unarchiveEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/:id/statistics - getEventStats', () => {
    it('should return event statistics successfully', async () => {
      const mockStats = {
        totalContests: 10,
        totalCategories: 25,
        totalParticipants: 150,
        totalJudges: 30,
        completionRate: 75,
      };

      mockReq.params = { id: 'event-1' };
      mockEventService.getEventStats.mockResolvedValue(mockStats as any);

      await controller.getEventStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.getEventStats).toHaveBeenCalledWith('event-1');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockStats);
    });

    it('should return 400 if event ID is missing', async () => {
      mockReq.params = {};

      await controller.getEventStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, null, 'Event ID is required', 400);
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'event-1' };
      mockEventService.getEventStats.mockRejectedValue(error);

      await controller.getEventStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('GET /api/events/search - searchEvents', () => {
    it('should search events successfully', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'Competition 2025' },
        { id: 'event-2', name: 'National Competition' },
      ];

      mockReq.query = { q: 'competition' };
      mockEventService.searchEvents.mockResolvedValue(mockEvents as any);

      await controller.searchEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEventService.searchEvents).toHaveBeenCalledWith('competition');
      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, mockEvents);
    });

    it('should return empty array if search query is missing', async () => {
      mockReq.query = {};

      await controller.searchEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, []);
      expect(mockEventService.searchEvents).not.toHaveBeenCalled();
    });

    it('should return empty array if search query is not a string', async () => {
      mockReq.query = { q: ['array'] };

      await controller.searchEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockSendSuccess).toHaveBeenCalledWith(mockRes, []);
      expect(mockEventService.searchEvents).not.toHaveBeenCalled();
    });

    it('should handle errors and call next', async () => {
      const error = new Error('Database error');
      mockReq.query = { q: 'test' };
      mockEventService.searchEvents.mockRejectedValue(error);

      await controller.searchEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
