/**
 * Audit Event Handler
 * Logs all events to the audit log
 */

import prisma from '../../config/database';
import { AppEvent } from '../../services/EventBusService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuditEventHandler');

export class AuditEventHandler {
  static async handle(event: AppEvent): Promise<void> {
    try {
      // Extract tenant and user from payload
      const tenantId = event.payload?.tenantId || event.metadata?.tenantId;
      const userId = event.metadata?.userId || event.payload?.userId;

      await prisma.eventLog.create({
        data: {
          tenantId: tenantId || null,
          eventType: event.type,
          entityType: event.payload?.entityType,
          entityId: event.payload?.entityId,
          payload: event.payload,
          userId: userId || null,
          source: event.metadata.source,
          correlationId: event.metadata.correlationId,
          timestamp: event.metadata.timestamp,
          processed: true
        }
      });

      logger.debug(`Logged event to audit log: ${event.type}`);
    } catch (error) {
      logger.error('Error handling audit event:', error);
      throw error;
    }
  }
}
