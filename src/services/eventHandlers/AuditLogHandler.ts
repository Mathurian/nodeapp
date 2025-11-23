import prisma from '../../config/database';
import { AppEvent, AppEventType, EventHandler } from '../EventBusService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuditLogHandler');

/**
 * Audit Log Handler
 *
 * Automatically creates audit log entries for important events
 */
export class AuditLogHandler {
  /**
   * Handle events and create audit logs
   */
  static readonly handler: EventHandler = async (event: AppEvent) => {
    try {
      // Only log certain event types
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

      if (!auditableEvents.includes(event.type)) {
        return; // Skip non-auditable events
      }

      // Create audit log entry
      await prisma.auditLog.create({
        data: {
          tenantId: (event.metadata as any)?.tenantId || (event.payload as any)?.tenantId || 'default_tenant',
          userId: event.metadata.userId || 'system',
          action: event.type,
          entityType: extractEntityType(event.type),
          entityId: extractEntityId(event.payload) || 'unknown',
          changes: JSON.stringify(event.payload),
          ipAddress: event.metadata.source,
          userAgent: null, // Would need to pass from request if available
          timestamp: event.metadata.timestamp,
        },
      });

      logger.debug('Audit log created', { type: event.type });
    } catch (error) {
      logger.error('Failed to create audit log', { error, event: event.type });
      // Don't throw - audit logging shouldn't break the application
    }
  };
}

/**
 * Extract entity type from event type
 */
function extractEntityType(eventType: AppEventType): string {
  const parts = eventType.split('.');
  return parts[0] ?? ''; // e.g., 'user' from 'user.created'
}

/**
 * Extract entity ID from event payload
 */
function extractEntityId(payload: any): string | null {
  return payload?.id || payload?.entityId || null;
}
