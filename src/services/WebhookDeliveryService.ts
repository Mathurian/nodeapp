/**
 * Webhook Delivery Service
 * Handles HTTP delivery of webhook events with retry logic
 */

import axios from 'axios';
import * as crypto from 'crypto';
import prisma from '../config/database';
import { createLogger } from '../utils/logger';
import { AppEvent, AppEventType } from './EventBusService';

const logger = createLogger('WebhookDeliveryService');

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryAttempts: number;
  timeout: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  deliveryId: string;
  attemptCount: number;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
}

/**
 * Webhook Delivery Service
 */
export class WebhookDeliveryService {
  /**
   * Deliver webhook to configured URL
   */
  static async deliver(
    webhook: WebhookConfig,
    event: AppEvent
  ): Promise<WebhookDeliveryResult> {
    try {
      logger.info(`Delivering webhook ${webhook.name} for event ${event.type}`);

      // Create webhook delivery record
      const delivery = await prisma.webhookDelivery.create({
        data: {
          tenantId: (webhook as any).tenantId || 'default_tenant',
          webhookId: webhook.id,
          eventId: event.metadata.correlationId || event.type || 'unknown',
          status: 'pending',
          attemptCount: 0
        }
      });

      // Attempt delivery with retries
      const result = await this.deliverWithRetry(webhook, event, delivery.id);

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: result.success ? 'success' : 'failed',
          attemptCount: result.attemptCount,
          lastAttemptAt: new Date(),
          responseStatus: result.responseStatus,
          responseBody: result.responseBody
            ? result.responseBody.substring(0, 1000)
            : null
        }
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error delivering webhook ${webhook.id}:`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Deliver webhook with exponential backoff retry
   */
  private static async deliverWithRetry(
    webhook: WebhookConfig,
    event: AppEvent,
    deliveryId: string
  ): Promise<WebhookDeliveryResult> {
    const maxAttempts = webhook.retryAttempts || 3;
    let attemptCount = 0;
    let lastError: string | undefined;

    for (attemptCount = 1; attemptCount <= maxAttempts; attemptCount++) {
      try {
        logger.debug(`Webhook delivery attempt ${attemptCount}/${maxAttempts} for ${webhook.name}`);

        const result = await this.sendWebhook(webhook, event);

        logger.info(
          `Webhook delivered successfully to ${webhook.name} (attempt ${attemptCount}, status ${result.responseStatus})`
        );

        return {
          success: true,
          deliveryId,
          attemptCount,
          responseStatus: result.responseStatus,
          responseBody: result.responseBody
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = errorMessage;

        logger.warn(
          `Webhook delivery attempt ${attemptCount}/${maxAttempts} failed for ${webhook.name}: ${errorMessage}`
        );

        // If not the last attempt, wait before retrying (exponential backoff)
        if (attemptCount < maxAttempts) {
          const backoffMs = Math.pow(2, attemptCount) * 1000; // 2s, 4s, 8s, 16s, 32s
          logger.debug(`Waiting ${backoffMs}ms before retry...`);
          await this.sleep(backoffMs);
        }
      }
    }

    // All attempts failed
    logger.error(`All webhook delivery attempts failed for ${webhook.name}: ${lastError}`);

    return {
      success: false,
      deliveryId,
      attemptCount,
      error: lastError
    };
  }

  /**
   * Send webhook HTTP request
   */
  private static async sendWebhook(
    webhook: WebhookConfig,
    event: AppEvent
  ): Promise<{ responseStatus: number; responseBody: string }> {
    // Prepare payload
    const timestamp = new Date().toISOString();
    const payload = {
      event: event.type,
      timestamp,
      data: event.payload,
      metadata: event.metadata
    };

    // Calculate signature
    const signature = this.calculateSignature(payload, webhook.secret || '');

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': event.type,
      'User-Agent': 'EventManager-Webhook/1.0',
      ...(webhook.headers || {})
    };

    try {
      // Send HTTP POST request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: (webhook.timeout || 30) * 1000,
        validateStatus: (status) => status >= 200 && status < 300
      });

      return {
        responseStatus: response.status,
        responseBody: JSON.stringify(response.data)
      };
    } catch (error: unknown) {
      // Check if it's an axios error
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; statusText?: string } };
        if (axiosError.response && axiosError.response.status) {
          // Server responded with error status
          throw new Error(
            `HTTP ${axiosError.response.status}: ${axiosError.response.statusText || 'Unknown error'}`
          );
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        // Request made but no response
        const axiosError = error as { message?: string };
        const errorMessage = axiosError.message || 'Unknown error';
        throw new Error(`No response from webhook URL: ${errorMessage}`);
      }
      // Error setting up request or unknown error type
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Request setup error: ${errorMessage}`);
    }
  }

  /**
   * Calculate HMAC-SHA256 signature for webhook verification
   */
  private static calculateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return hmac.digest('hex');
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get webhook delivery history
   */
  static async getDeliveryHistory(
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await prisma.webhookDelivery.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('Error getting webhook delivery history:', error);
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(webhookId: string, days: number = 7): Promise<any> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const deliveries = await prisma.webhookDelivery.findMany({
        where: {
          webhookId,
          createdAt: { gte: since }
        }
      });

      const total = deliveries.length;
      const successful = deliveries.filter((d) => d.status === 'success').length;
      const failed = deliveries.filter((d) => d.status === 'failed').length;
      const pending = deliveries.filter((d) => d.status === 'pending').length;

      const successRate = total > 0 ? (successful / total) * 100 : 0;

      const avgAttempts =
        successful > 0
          ? deliveries
              .filter((d) => d.status === 'success')
              .reduce((sum, d) => sum + d.attemptCount, 0) / successful
          : 0;

      return {
        total,
        successful,
        failed,
        pending,
        successRate,
        avgAttempts: Math.round(avgAttempts * 10) / 10,
        recentDeliveries: deliveries.slice(0, 10)
      };
    } catch (error) {
      logger.error('Error getting webhook stats:', error);
      throw error;
    }
  }

  /**
   * Retry failed webhook delivery
   */
  static async retryDelivery(deliveryId: string): Promise<WebhookDeliveryResult> {
    try {
      const delivery = await prisma.webhookDelivery.findUnique({
        where: { id: deliveryId },
        // include removed - no webhook relation
      });

      if (!delivery) {
        throw new Error(`Webhook delivery ${deliveryId} not found`);
      }

      if (delivery.status === 'success') {
        throw new Error('Cannot retry successful delivery');
      }

      // Get the webhook config
      const webhook = await prisma.webhookConfig.findUnique({
        where: { id: delivery.webhookId }
      });

      if (!webhook) {
        throw new Error(`Webhook config ${delivery.webhookId} not found`);
      }

      // Get event from EventLog
      const eventLog = await prisma.eventLog.findFirst({
        where: { id: delivery.eventId }
      });

      if (!eventLog) {
        throw new Error(`Event log ${delivery.eventId} not found`);
      }

      // Reconstruct event
      const event: AppEvent = {
        type: eventLog.eventType as AppEventType,
        payload: eventLog.payload as any,
        metadata: {
          source: eventLog.source,
          correlationId: eventLog.correlationId || undefined,
          ...(eventLog.metadata as any)
        }
      };

      // Retry delivery
      logger.info(`Retrying webhook delivery ${deliveryId}`);
      return await this.deliver(webhook as any, event);
    } catch (error: any) {
      logger.error(`Error retrying webhook delivery ${deliveryId}:`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (for incoming webhook verification)
   */
  static verifySignature(payload: any, signature: string, secret: string): boolean {
    const calculatedSignature = this.calculateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  }
}

export default WebhookDeliveryService;
