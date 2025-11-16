/**
 * Event Handlers Initialization
 *
 * Registers all event handlers with the EventBus
 */

import EventBusService, { AppEventType } from '../EventBusService';
import { AuditLogHandler } from './AuditLogHandler';
import { NotificationHandler } from './NotificationHandler';
import { CacheInvalidationHandler } from './CacheInvalidationHandler';
import { StatisticsHandler } from './StatisticsHandler';
import { createLogger } from '../../utils/logger';

const logger = createLogger('EventHandlers');

/**
 * Initialize all event handlers
 */
export function initializeEventHandlers(): void {
  const eventBus = EventBusService;

  logger.info('Initializing event handlers...');

  // Register Audit Log Handler for all events
  const auditableEvents = [
    AppEventType.USER_CREATED,
    AppEventType.USER_UPDATED,
    AppEventType.USER_DELETED,
    AppEventType.EVENT_CREATED,
    AppEventType.EVENT_UPDATED,
    AppEventType.EVENT_DELETED,
    AppEventType.CONTEST_CREATED,
    AppEventType.CONTEST_UPDATED,
    AppEventType.CONTEST_DELETED,
    AppEventType.CONTEST_CERTIFIED,
    AppEventType.CATEGORY_CERTIFIED,
    AppEventType.SCORE_SUBMITTED,
    AppEventType.SCORE_UPDATED,
    AppEventType.SCORE_DELETED,
    AppEventType.SCORES_FINALIZED,
    AppEventType.CERTIFICATION_APPROVED,
    AppEventType.CERTIFICATION_REJECTED,
  ];

  auditableEvents.forEach((eventType) => {
    eventBus.subscribe(eventType, AuditLogHandler.handler);
  });

  logger.info('Audit log handler registered', { eventCount: auditableEvents.length });

  // Register Notification Handler for notification-worthy events
  const notificationEvents = [
    AppEventType.ASSIGNMENT_CREATED,
    AppEventType.SCORE_SUBMITTED,
    AppEventType.SCORES_FINALIZED,
    AppEventType.CERTIFICATION_APPROVED,
    AppEventType.CERTIFICATION_REJECTED,
    AppEventType.CONTEST_CERTIFIED,
  ];

  notificationEvents.forEach((eventType) => {
    eventBus.subscribe(eventType, NotificationHandler.handler);
  });

  logger.info('Notification handler registered', { eventCount: notificationEvents.length });

  // Register Cache Invalidation Handler for cache-affecting events
  const cacheEvents = [
    AppEventType.USER_CREATED,
    AppEventType.USER_UPDATED,
    AppEventType.USER_DELETED,
    AppEventType.EVENT_CREATED,
    AppEventType.EVENT_UPDATED,
    AppEventType.EVENT_DELETED,
    AppEventType.CONTEST_CREATED,
    AppEventType.CONTEST_UPDATED,
    AppEventType.CONTEST_DELETED,
    AppEventType.CONTEST_CERTIFIED,
    AppEventType.CATEGORY_CREATED,
    AppEventType.CATEGORY_UPDATED,
    AppEventType.CATEGORY_DELETED,
    AppEventType.CATEGORY_CERTIFIED,
    AppEventType.SCORE_SUBMITTED,
    AppEventType.SCORE_UPDATED,
    AppEventType.SCORE_DELETED,
    AppEventType.SCORES_FINALIZED,
    AppEventType.ASSIGNMENT_CREATED,
    AppEventType.ASSIGNMENT_UPDATED,
    AppEventType.ASSIGNMENT_DELETED,
  ];

  cacheEvents.forEach((eventType) => {
    eventBus.subscribe(eventType, CacheInvalidationHandler.handler);
  });

  logger.info('Cache invalidation handler registered', { eventCount: cacheEvents.length });

  // Register Statistics Handler for trackable events
  const statisticsEvents = [
    AppEventType.USER_LOGGED_IN,
    AppEventType.SCORE_SUBMITTED,
    AppEventType.EVENT_CREATED,
    AppEventType.CONTEST_CERTIFIED,
  ];

  statisticsEvents.forEach((eventType) => {
    eventBus.subscribe(eventType, StatisticsHandler.handler);
  });

  logger.info('Statistics handler registered', { eventCount: statisticsEvents.length });

  logger.info('All event handlers initialized successfully');
}

/**
 * Shutdown event handlers (cleanup)
 */
export async function shutdownEventHandlers(): Promise<void> {
  logger.info('Shutting down event handlers...');
  await EventBusService.shutdown();
  logger.info('Event handlers shutdown complete');
}
