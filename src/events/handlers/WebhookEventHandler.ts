/**
 * Webhook Event Handler
 * Triggers webhooks for configured events
 */

import prisma from '../../config/database';
import { PrismaClient } from '@prisma/client';
import { AppEvent } from '../../services/EventBusService';
import { createLogger } from '../../utils/logger';
import WebhookDeliveryService from '../../services/WebhookDeliveryService';
import { resolveEventTenantId } from '../../utils/tenantContext';
import { withTenantDbRlsContext } from '../../utils/prismaRlsContext';

const logger = createLogger('WebhookEventHandler');

export class WebhookEventHandler {
  static async handle(event: AppEvent): Promise<void> {
    try {
      const tenantId = resolveEventTenantId(event);
      if (!tenantId) return;

      // Find webhooks configured for this event type
      const webhooks = await withTenantDbRlsContext(
        prisma as PrismaClient,
        { tenantId, isSuperAdmin: false },
        async tx =>
          tx.webhookConfig.findMany({
            where: {
              tenantId,
              enabled: true
            }
          })
      );

      for (const webhook of webhooks) {
        const events = webhook.events as string[];
        if (events.includes(event.type)) {
          // Trigger webhook delivery asynchronously
          this.triggerWebhook(webhook, event).catch((error) => {
            logger.error(`Failed to trigger webhook ${webhook.id}:`, error);
          });
        }
      }
    } catch (error) {
      logger.error('Error handling webhook event:', error);
    }
  }

  private static async triggerWebhook(webhook: any, event: AppEvent): Promise<void> {
    try {
      logger.info(`Triggering webhook ${webhook.name} for event ${event.type}`);

      // Deliver webhook using WebhookDeliveryService
      const result = await WebhookDeliveryService.deliver(webhook, event);

      if (result.success) {
        logger.info(
          `Webhook ${webhook.name} delivered successfully (${result.attemptCount} attempts)`
        );
      } else {
        logger.warn(
          `Webhook ${webhook.name} delivery failed after ${result.attemptCount} attempts: ${result.error}`
        );
      }
    } catch (error) {
      logger.error(`Error triggering webhook ${webhook.id}:`, error);
    }
  }
}
