/**
 * Audit Event Handler
 * Logs all events to the audit log
 */

import prisma from '../../config/database';
import { PrismaClient } from '@prisma/client';
import { AppEvent } from '../../services/EventBusService';
import { createLogger } from '../../utils/logger';
import { resolveEventTenantId } from '../../utils/tenantContext';
import { withTenantDbRlsContext } from '../../utils/prismaRlsContext';

const logger = createLogger('AuditEventHandler');

export class AuditEventHandler {
  static async handle(event: AppEvent): Promise<void> {
    try {
      const tenantId = resolveEventTenantId(event);
      if (!tenantId) {
        logger.warn(`Skipping event audit log due to missing tenant context: ${event.type}`);
        return;
      }
      const userId = event.metadata?.userId || event.payload?.userId;

      await withTenantDbRlsContext(
        prisma as PrismaClient,
        { tenantId, isSuperAdmin: false },
        async tx =>
          tx.eventLog.create({
            data: {
              tenantId,
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
          })
      );

      logger.debug(`Logged event to audit log: ${event.type}`);
    } catch (error) {
      logger.error('Error handling audit event:', error);
      throw error;
    }
  }
}
