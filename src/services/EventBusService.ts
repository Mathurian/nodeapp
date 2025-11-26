import { createLogger as loggerFactory } from '../utils/logger';
import QueueService from './QueueService';
// S4-2: Import correlation ID for request tracing
import { getRequestContext, runWithContext } from '../middleware/correlationId';

const logger = loggerFactory('EventBusService');

/**
 * Application Event Types
 */
export enum AppEventType {
  // User Events
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',

  // Event Events
  EVENT_CREATED = 'event.created',
  EVENT_UPDATED = 'event.updated',
  EVENT_DELETED = 'event.deleted',
  EVENT_PUBLISHED = 'event.published',

  // Contest Events
  CONTEST_CREATED = 'contest.created',
  CONTEST_UPDATED = 'contest.updated',
  CONTEST_DELETED = 'contest.deleted',
  CONTEST_CERTIFIED = 'contest.certified',

  // Category Events
  CATEGORY_CREATED = 'category.created',
  CATEGORY_UPDATED = 'category.updated',
  CATEGORY_DELETED = 'category.deleted',
  CATEGORY_CERTIFIED = 'category.certified',

  // Score Events
  SCORE_SUBMITTED = 'score.submitted',
  SCORE_UPDATED = 'score.updated',
  SCORE_DELETED = 'score.deleted',
  SCORES_FINALIZED = 'scores.finalized',

  // Assignment Events
  ASSIGNMENT_CREATED = 'assignment.created',
  ASSIGNMENT_UPDATED = 'assignment.updated',
  ASSIGNMENT_DELETED = 'assignment.deleted',

  // Certification Events
  CERTIFICATION_REQUESTED = 'certification.requested',
  CERTIFICATION_APPROVED = 'certification.approved',
  CERTIFICATION_REJECTED = 'certification.rejected',

  // Notification Events
  NOTIFICATION_SENT = 'notification.sent',
  EMAIL_SENT = 'email.sent',
  SMS_SENT = 'sms.sent',

  // System Events
  CACHE_INVALIDATED = 'cache.invalidated',
  BACKUP_COMPLETED = 'backup.completed',
  MAINTENANCE_STARTED = 'maintenance.started',
  MAINTENANCE_COMPLETED = 'maintenance.completed',
}

/**
 * Base Application Event Interface
 */
export interface AppEvent<T = any> {
  type: AppEventType;
  payload: T;
  metadata: {
    userId?: string;
    tenantId?: string;
    timestamp: Date;
    source: string;
    correlationId?: string;
  };
}

/**
 * Event Handler Type
 */
export type EventHandler<T = any> = (event: AppEvent<T>) => Promise<void>;

/**
 * Event Bus Service
 *
 * Provides publish/subscribe pattern for application events.
 * Uses BullMQ for reliable event processing.
 */
export class EventBusService {
  private static instance: EventBusService;
  private queueService: typeof QueueService;
  private handlers: Map<AppEventType, Set<EventHandler>>;
  private readonly EVENTS_QUEUE = 'app-events';

  private constructor() {
    this.queueService = QueueService;
    this.handlers = new Map();
    this.initializeWorker();
  }

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService();
    }
    return EventBusService.instance;
  }

  /**
   * Initialize worker to process events
   */
  private initializeWorker(): void {
    this.queueService.createWorker(
      this.EVENTS_QUEUE,
      async (job) => {
        const event = job.data as AppEvent;
        await this.processEvent(event);
      },
      5 // Process up to 5 events concurrently
    );

    logger.info('Event bus worker initialized');
  }

  /**
   * Publish an event to the bus
   */
  async publish<T = any>(
    type: AppEventType,
    payload: T,
    metadata: Partial<AppEvent['metadata']> = {}
  ): Promise<void> {
    try {
      // S4-2: Get current request context for correlation tracking
      const context = getRequestContext();

      const event: AppEvent<T> = {
        type,
        payload,
        metadata: {
          timestamp: new Date(),
          source: metadata.source || 'unknown',
          userId: metadata.userId || context?.userId,
          tenantId: metadata.tenantId || context?.tenantId,
          // S4-2: Use correlation ID from context if available
          correlationId: metadata.correlationId || context?.correlationId || this.generateCorrelationId(),
        },
      };

      // Add event to queue for processing
      await this.queueService.addJob(
        this.EVENTS_QUEUE,
        type,
        event,
        {
          priority: this.getEventPriority(type),
          attempts: 3,
        }
      );

      logger.debug('Event published', { type, correlationId: event.metadata.correlationId });
    } catch (error) {
      logger.error('Failed to publish event', { error, type });
      throw error;
    }
  }

  /**
   * Subscribe to an event type
   */
  subscribe<T = any>(type: AppEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler as EventHandler);

    logger.debug('Event handler subscribed', { type });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(type, handler);
    };
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe<T = any>(type: AppEventType, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler as EventHandler);
      logger.debug('Event handler unsubscribed', { type });
    }
  }

  /**
   * Process an event by calling all registered handlers
   */
  private async processEvent(event: AppEvent): Promise<void> {
    const handlers = this.handlers.get(event.type);

    if (!handlers || handlers.size === 0) {
      logger.debug('No handlers registered for event', { type: event.type });
      return;
    }

    // S4-2: Re-establish request context from event metadata for proper tracing
    await runWithContext({
      correlationId: event.metadata.correlationId,
      userId: event.metadata.userId,
      tenantId: event.metadata.tenantId,
    }, async () => {
      logger.debug('Processing event', {
        type: event.type,
        handlerCount: handlers.size,
        correlationId: event.metadata.correlationId,
      });

      // Execute all handlers in parallel
      const results = await Promise.allSettled(
        Array.from(handlers).map((handler) => handler(event))
      );

      // Log any handler failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Event handler failed', {
            type: event.type,
            handlerIndex: index,
            error: result.reason,
            correlationId: event.metadata.correlationId,
          });
        }
      });
    });
  }

  /**
   * Get event priority for queue processing
   */
  private getEventPriority(type: AppEventType): number {
    // Higher number = higher priority
    const highPriority = [
      AppEventType.USER_LOGGED_IN,
      AppEventType.SCORE_SUBMITTED,
      AppEventType.SCORES_FINALIZED,
      AppEventType.CERTIFICATION_APPROVED,
      AppEventType.CERTIFICATION_REJECTED,
    ];

    const mediumPriority = [
      AppEventType.USER_CREATED,
      AppEventType.EVENT_CREATED,
      AppEventType.CONTEST_CREATED,
      AppEventType.ASSIGNMENT_CREATED,
    ];

    if (highPriority.includes(type)) {
      return 10;
    } else if (mediumPriority.includes(type)) {
      return 5;
    } else {
      return 1;
    }
  }

  /**
   * Generate correlation ID for tracking events
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get event statistics
   */
  async getEventStats() {
    return await this.queueService.getQueueStats(this.EVENTS_QUEUE);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down event bus...');
    // Handlers will be cleared automatically when workers shut down
    this.handlers.clear();
    logger.info('Event bus shutdown complete');
  }
}

// Export singleton instance
export default EventBusService.getInstance();
