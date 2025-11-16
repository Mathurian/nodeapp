/**
 * EventBusService Unit Tests
 * Comprehensive tests for event bus service
 */

import 'reflect-metadata';
import { EventBusService, AppEventType, AppEvent } from '../../../src/services/EventBusService';
import QueueService from '../../../src/services/QueueService';

// Mock QueueService
jest.mock('../../../src/services/QueueService', () => ({
  __esModule: true,
  default: {
    addJob: jest.fn().mockResolvedValue({}),
    createWorker: jest.fn(),
    getQueueStats: jest.fn().mockResolvedValue({}),
  },
}));

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance for each test
    service = EventBusService.getInstance();
    // Clear handlers between tests
    service['handlers'].clear();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = EventBusService.getInstance();
      const instance2 = EventBusService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize worker on first instantiation', () => {
      expect(QueueService.createWorker).toHaveBeenCalledWith(
        'app-events',
        expect.any(Function),
        5
      );
    });
  });

  describe('publish', () => {
    it('should publish event to queue', async () => {
      await service.publish(AppEventType.USER_CREATED, { userId: 'user-1' }, { source: 'test' });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'user.created',
        expect.objectContaining({
          type: 'user.created',
          payload: { userId: 'user-1' },
          metadata: expect.objectContaining({
            source: 'test',
          }),
        }),
        expect.objectContaining({
          priority: expect.any(Number),
          attempts: 3,
        })
      );
    });

    it('should generate correlation ID when not provided', async () => {
      await service.publish(AppEventType.SCORE_SUBMITTED, { score: 100 });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'score.submitted',
        expect.objectContaining({
          metadata: expect.objectContaining({
            correlationId: expect.any(String),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should use provided correlation ID', async () => {
      await service.publish(AppEventType.CONTEST_CREATED, { contestId: 'contest-1' }, {
        correlationId: 'custom-id',
        source: 'test',
      });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'contest.created',
        expect.objectContaining({
          metadata: expect.objectContaining({
            correlationId: 'custom-id',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should set high priority for critical events', async () => {
      await service.publish(AppEventType.SCORES_FINALIZED, { contestId: 'contest-1' });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'scores.finalized',
        expect.any(Object),
        expect.objectContaining({
          priority: 10,
        })
      );
    });

    it('should set medium priority for standard events', async () => {
      await service.publish(AppEventType.USER_CREATED, { userId: 'user-1' });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'user.created',
        expect.any(Object),
        expect.objectContaining({
          priority: 5,
        })
      );
    });

    it('should set low priority for non-critical events', async () => {
      await service.publish(AppEventType.USER_UPDATED, { userId: 'user-1' });

      expect(QueueService.addJob).toHaveBeenCalledWith(
        'app-events',
        'user.updated',
        expect.any(Object),
        expect.objectContaining({
          priority: 1,
        })
      );
    });

    it('should include timestamp in metadata', async () => {
      const beforeTime = new Date();
      await service.publish(AppEventType.EVENT_CREATED, { eventId: 'event-1' });
      const afterTime = new Date();

      const call = (QueueService.addJob as jest.Mock).mock.calls[0];
      const event = call[2] as AppEvent;

      expect(event.metadata.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(event.metadata.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle queue errors', async () => {
      (QueueService.addJob as jest.Mock).mockRejectedValue(new Error('Queue full'));

      await expect(
        service.publish(AppEventType.USER_CREATED, { userId: 'user-1' })
      ).rejects.toThrow('Queue full');
    });
  });

  describe('subscribe', () => {
    it('should register event handler', () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler);

      expect(service['handlers'].get(AppEventType.USER_CREATED)).toContain(handler);
    });

    it('should return unsubscribe function', () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      const unsubscribe = service.subscribe(AppEventType.USER_CREATED, handler);

      expect(service['handlers'].get(AppEventType.USER_CREATED)).toContain(handler);

      unsubscribe();

      expect(service['handlers'].get(AppEventType.USER_CREATED)).not.toContain(handler);
    });

    it('should allow multiple handlers for same event', () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler1);
      service.subscribe(AppEventType.USER_CREATED, handler2);

      const handlers = service['handlers'].get(AppEventType.USER_CREATED);
      expect(handlers?.size).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should remove event handler', () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler);
      service.unsubscribe(AppEventType.USER_CREATED, handler);

      expect(service['handlers'].get(AppEventType.USER_CREATED)?.has(handler)).toBe(false);
    });

    it('should handle unsubscribe for non-existent handler', () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      expect(() => {
        service.unsubscribe(AppEventType.USER_CREATED, handler);
      }).not.toThrow();
    });
  });

  describe('processEvent', () => {
    it('should call all registered handlers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler1);
      service.subscribe(AppEventType.USER_CREATED, handler2);

      const event: AppEvent = {
        type: AppEventType.USER_CREATED,
        payload: { userId: 'user-1' },
        metadata: {
          timestamp: new Date(),
          source: 'test',
          correlationId: 'test-id',
        },
      };

      await service['processEvent'](event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
    });

    it('should handle no registered handlers', async () => {
      const event: AppEvent = {
        type: AppEventType.USER_CREATED,
        payload: { userId: 'user-1' },
        metadata: {
          timestamp: new Date(),
          source: 'test',
          correlationId: 'test-id',
        },
      };

      await expect(service['processEvent'](event)).resolves.not.toThrow();
    });

    it('should continue processing if handler fails', async () => {
      const handler1 = jest.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler1);
      service.subscribe(AppEventType.USER_CREATED, handler2);

      const event: AppEvent = {
        type: AppEventType.USER_CREATED,
        payload: { userId: 'user-1' },
        metadata: {
          timestamp: new Date(),
          source: 'test',
          correlationId: 'test-id',
        },
      };

      await service['processEvent'](event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should execute handlers in parallel', async () => {
      const handler1 = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      const handler2 = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      service.subscribe(AppEventType.USER_CREATED, handler1);
      service.subscribe(AppEventType.USER_CREATED, handler2);

      const event: AppEvent = {
        type: AppEventType.USER_CREATED,
        payload: { userId: 'user-1' },
        metadata: {
          timestamp: new Date(),
          source: 'test',
          correlationId: 'test-id',
        },
      };

      const startTime = Date.now();
      await service['processEvent'](event);
      const duration = Date.now() - startTime;

      // Should take ~50ms, not ~100ms if parallel
      expect(duration).toBeLessThan(100);
    });
  });

  describe('getEventPriority', () => {
    it('should return high priority for critical events', () => {
      const priority = service['getEventPriority'](AppEventType.SCORE_SUBMITTED);
      expect(priority).toBe(10);
    });

    it('should return medium priority for standard events', () => {
      const priority = service['getEventPriority'](AppEventType.USER_CREATED);
      expect(priority).toBe(5);
    });

    it('should return low priority for other events', () => {
      const priority = service['getEventPriority'](AppEventType.USER_UPDATED);
      expect(priority).toBe(1);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = service['generateCorrelationId']();
      const id2 = service['generateCorrelationId']();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('getEventStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = { waiting: 5, active: 2, completed: 100 };
      (QueueService.getQueueStats as jest.Mock).mockResolvedValue(mockStats);

      const stats = await service.getEventStats();

      expect(stats).toEqual(mockStats);
      expect(QueueService.getQueueStats).toHaveBeenCalledWith('app-events');
    });
  });

  describe('shutdown', () => {
    it('should clear all handlers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      service.subscribe(AppEventType.USER_CREATED, handler1);
      service.subscribe(AppEventType.CONTEST_CREATED, handler2);

      await service.shutdown();

      expect(service['handlers'].size).toBe(0);
    });

    it('should be idempotent', async () => {
      await service.shutdown();
      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('event types', () => {
    it('should support all user events', async () => {
      const userEvents = [
        AppEventType.USER_CREATED,
        AppEventType.USER_UPDATED,
        AppEventType.USER_DELETED,
        AppEventType.USER_LOGGED_IN,
        AppEventType.USER_LOGGED_OUT,
      ];

      for (const eventType of userEvents) {
        await service.publish(eventType, {});
        expect(QueueService.addJob).toHaveBeenCalledWith(
          'app-events',
          eventType,
          expect.any(Object),
          expect.any(Object)
        );
      }
    });

    it('should support all contest events', async () => {
      const contestEvents = [
        AppEventType.CONTEST_CREATED,
        AppEventType.CONTEST_UPDATED,
        AppEventType.CONTEST_DELETED,
        AppEventType.CONTEST_CERTIFIED,
      ];

      for (const eventType of contestEvents) {
        await service.publish(eventType, {});
        expect(QueueService.addJob).toHaveBeenCalled();
      }
    });

    it('should support all score events', async () => {
      const scoreEvents = [
        AppEventType.SCORE_SUBMITTED,
        AppEventType.SCORE_UPDATED,
        AppEventType.SCORE_DELETED,
        AppEventType.SCORES_FINALIZED,
      ];

      for (const eventType of scoreEvents) {
        await service.publish(eventType, {});
        expect(QueueService.addJob).toHaveBeenCalled();
      }
    });
  });
});
