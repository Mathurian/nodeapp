/**
 * Event Handler Registry
 * Registers all event handlers with the Event Bus
 */

import EventBusService, { AppEventType } from '../services/EventBusService';
import { AuditEventHandler } from './handlers/AuditEventHandler';
import { WebhookEventHandler } from './handlers/WebhookEventHandler';
import { createLogger } from '../utils/logger';

const logger = createLogger('EventHandlerRegistry');

export class EventHandlerRegistry {
  private static registered = false;

  /**
   * Register all event handlers
   */
  static registerAll(): void {
    if (this.registered) {
      logger.warn('Event handlers already registered');
      return;
    }

    logger.info('Registering event handlers...');

    // Register audit handler for ALL events
    Object.values(AppEventType).forEach(eventType => {
      EventBusService.subscribe(eventType, AuditEventHandler.handle.bind(AuditEventHandler));
    });

    // Register webhook handler for ALL events
    Object.values(AppEventType).forEach(eventType => {
      EventBusService.subscribe(eventType, WebhookEventHandler.handle.bind(WebhookEventHandler));
    });

    this.registered = true;
    logger.info('Event handlers registered successfully');
  }
}

export default EventHandlerRegistry;
