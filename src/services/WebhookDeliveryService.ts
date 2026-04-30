/**
 * Webhook Delivery Service
 * Handles HTTP delivery of webhook events with retry logic
 * S4-1: Circuit breaker protection for webhook endpoints
 */

import axios from 'axios';
import * as crypto from 'crypto';
import prisma from '../config/database';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { AppEvent, AppEventType } from './EventBusService';
// S4-1: Circuit breaker for webhook delivery resilience
import { CircuitBreaker, CircuitBreakerRegistry } from '../utils/circuitBreaker';
// S4-2: Correlation ID for request tracing
import { getRequestContext } from '../middleware/correlationId';
import { resolveEventTenantId } from '../utils/tenantContext';
import { withTenantDbRlsContext } from '../utils/prismaRlsContext';

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
  private static async withDbContext<T>(
    options: { tenantId?: string | null; isSuperAdmin?: boolean },
    operation: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    const tenantId = options.tenantId || null;
    const isSuperAdmin = options.isSuperAdmin ?? !tenantId;

    return withTenantDbRlsContext(
      prisma as PrismaClient,
      { tenantId, isSuperAdmin },
      async tx => operation(tx)
    );
  }

  private static async withTenantDbContext<T>(
    tenantId: string,
    operation: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    return this.withDbContext({ tenantId, isSuperAdmin: false }, operation);
  }

  // S4-1: Circuit breaker for webhook endpoints (per-webhook URL)
  private static circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker for a webhook URL
   */
  private static getCircuitBreaker(webhookId: string, webhookName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(webhookId)) {
      const breaker = CircuitBreakerRegistry.get(`webhook-${webhookId}`, {
        failureThreshold: 10,      // More tolerant for external endpoints
        successThreshold: 2,       // Close after 2 successes
        timeout: 300000,           // 5min before retry (long recovery for external)
        windowSize: 120000,        // 2min sliding window
        volumeThreshold: 5,        // Minimum 5 requests
      });

      // Monitor state changes
      breaker.onUnique('open', 'webhook-delivery-service:log-open', () => {
        logger.error(`Webhook circuit breaker OPENED for ${webhookName} (${webhookId})`);
      });

      breaker.onUnique('close', 'webhook-delivery-service:log-close', () => {
        logger.info(`Webhook circuit breaker CLOSED for ${webhookName} (${webhookId}) - endpoint recovered`);
      });

      this.circuitBreakers.set(webhookId, breaker);
    }

    return this.circuitBreakers.get(webhookId)!;
  }

  /**
   * Deliver webhook to configured URL
   */
  static async deliver(
    webhook: WebhookConfig,
    event: AppEvent
  ): Promise<WebhookDeliveryResult> {
    try {
      logger.info(`Delivering webhook ${webhook.name} for event ${event.type}`);
      const tenantId = resolveEventTenantId(event, (webhook as any).tenantId);
      if (!tenantId) {
        logger.warn('Skipping webhook delivery due to missing tenant context', {
          webhookId: webhook.id,
          webhookName: webhook.name,
          eventType: event.type
        });
        return {
          success: false,
          deliveryId: 'not-created',
          attemptCount: 0,
          error: 'Tenant context is required for webhook delivery'
        };
      }

      // Create webhook delivery record
      const delivery = await this.withTenantDbContext(tenantId, async db =>
        db.webhookDelivery.create({
          data: {
            tenantId,
            webhookId: webhook.id,
            eventId: event.metadata.correlationId || event.type || 'unknown',
            status: 'pending',
            attemptCount: 0
          }
        })
      );

      // Attempt delivery with retries
      const result = await this.deliverWithRetry(webhook, event, delivery.id);

      // Update delivery record
      await this.withTenantDbContext(tenantId, async db =>
        db.webhookDelivery.update({
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
        })
      );

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

    // S4-1: Get circuit breaker for this webhook
    const circuitBreaker = this.getCircuitBreaker(webhook.id, webhook.name);

    for (attemptCount = 1; attemptCount <= maxAttempts; attemptCount++) {
      try {
        logger.debug(`Webhook delivery attempt ${attemptCount}/${maxAttempts} for ${webhook.name}`);

        // S4-1: Execute webhook delivery through circuit breaker
        const result = await circuitBreaker.execute(async () => {
          return await this.sendWebhook(webhook, event);
        });

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

        // S4-1: If circuit breaker is open, fail fast without retrying
        if (errorMessage.includes('Circuit breaker')) {
          logger.error(`Webhook circuit breaker is OPEN for ${webhook.name} - failing fast`);

          return {
            success: false,
            deliveryId,
            attemptCount,
            error: `Webhook endpoint temporarily unavailable (circuit breaker OPEN)`
          };
        }

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
   *
   * Security: Outgoing webhooks are signed with HMAC-SHA256 for verification.
   * The signature format is: sha256=<hex-encoded-hmac>
   * The signature is computed over: timestamp + '.' + JSON.stringify(payload)
   * This binds the timestamp to the payload to prevent replay attacks.
   *
   * Recipients should:
   * 1. Extract the timestamp from X-Webhook-Timestamp header
   * 2. Verify the timestamp is within acceptable tolerance (recommended: 5 minutes)
   * 3. Reconstruct the signed payload: timestamp + '.' + rawBody
   * 4. Compute HMAC-SHA256 with the shared secret
   * 5. Compare signatures using constant-time comparison
   */
  private static async sendWebhook(
    webhook: WebhookConfig,
    event: AppEvent
  ): Promise<{ responseStatus: number; responseBody: string }> {
    // S4-2: Get correlation context for tracing
    const context = getRequestContext();

    // Use Unix timestamp in milliseconds for replay attack prevention
    const timestamp = Date.now().toString();

    // Prepare payload
    const payload = {
      event: event.type,
      timestamp: new Date(parseInt(timestamp)).toISOString(),
      data: event.payload,
      metadata: event.metadata
    };

    // Serialize payload once for consistent signing
    const payloadString = JSON.stringify(payload);

    // Calculate signature with timestamp binding to prevent replay attacks
    // Format: sha256=<hex-encoded-hmac>
    const signature = this.calculateSignature(payloadString, timestamp, webhook.secret || '');

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-Event': event.type,
      'User-Agent': 'EventManager-Webhook/1.0',
      // S4-2: Add correlation IDs for end-to-end tracing
      ...(context?.requestId && { 'X-Request-ID': context.requestId }),
      ...(context?.correlationId && { 'X-Correlation-ID': context.correlationId }),
      ...(webhook.headers || {})
    };

    try {
      // Send HTTP POST request with pre-serialized payload
      const response = await axios.post(webhook.url, payloadString, {
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
   *
   * The signature is computed over: timestamp + '.' + payloadString
   * This binds the timestamp to the payload to prevent replay attacks where
   * an attacker captures a valid webhook and resends it later.
   *
   * @param payloadString - The JSON-serialized payload
   * @param timestamp - Unix timestamp in milliseconds as string
   * @param secret - The shared secret for HMAC computation
   * @returns Signature in format: sha256=<hex-encoded-hmac>
   */
  private static calculateSignature(payloadString: string, timestamp: string, secret: string): string {
    // Bind timestamp to payload to prevent replay attacks
    const signedPayload = `${timestamp}.${payloadString}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Sign a webhook payload for outgoing webhooks (public utility method)
   *
   * This method can be used by external code that needs to sign webhook payloads
   * using the same algorithm as the delivery service.
   *
   * @param payload - The payload object to sign
   * @param timestamp - Unix timestamp in milliseconds as string
   * @param secret - The shared secret for HMAC computation
   * @returns Signature in format: sha256=<hex-encoded-hmac>
   */
  static signPayload(payload: object | string, timestamp: string, secret: string): string {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return this.calculateSignature(payloadString, timestamp, secret);
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
    limit: number = 50,
    tenantId?: string
  ): Promise<any[]> {
    try {
      return await this.withDbContext({ tenantId, isSuperAdmin: !tenantId }, async db =>
        db.webhookDelivery.findMany({
          where: {
            webhookId,
            ...(tenantId && { tenantId })
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        })
      );
    } catch (error) {
      logger.error('Error getting webhook delivery history:', error);
      throw error;
    }
  }

  /**
   * Get webhook statistics
   */
  static async getWebhookStats(webhookId: string, days: number = 7, tenantId?: string): Promise<any> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const deliveries = await this.withDbContext({ tenantId, isSuperAdmin: !tenantId }, async db =>
        db.webhookDelivery.findMany({
          where: {
            webhookId,
            ...(tenantId && { tenantId }),
            createdAt: { gte: since }
          }
        })
      );

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
  static async retryDelivery(deliveryId: string, tenantId?: string): Promise<WebhookDeliveryResult> {
    try {
      return await this.withDbContext({ tenantId, isSuperAdmin: !tenantId }, async db => {
        const delivery = await db.webhookDelivery.findUnique({
          where: { id: deliveryId },
          // include removed - no webhook relation
        });

        if (!delivery) {
          throw new Error(`Webhook delivery ${deliveryId} not found`);
        }

        if (tenantId && delivery.tenantId !== tenantId) {
          throw new Error(`Webhook delivery ${deliveryId} not found`);
        }

        if (delivery.status === 'success') {
          throw new Error('Cannot retry successful delivery');
        }

        // Get the webhook config
        const webhook = await db.webhookConfig.findUnique({
          where: { id: delivery.webhookId },
        });

        if (!webhook || (tenantId && webhook.tenantId !== tenantId)) {
          throw new Error(`Webhook config ${delivery.webhookId} not found`);
        }

        // Get event from EventLog
        const eventLog = await db.eventLog.findFirst({
          where: {
            id: delivery.eventId,
            ...(tenantId && { tenantId })
          }
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
        // Cast webhook from Prisma to WebhookConfig
        const webhookConfig: WebhookConfig = {
          id: webhook.id,
          name: webhook.name,
          url: webhook.url,
          events: Array.isArray(webhook.events) ? webhook.events as string[] : [],
          enabled: webhook.enabled,
          secret: webhook.secret || undefined,
          headers: webhook.headers as Record<string, string> | undefined,
          retryAttempts: webhook.retryAttempts,
          timeout: webhook.timeout
        };
        return this.deliver(webhookConfig, event);
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error retrying webhook delivery ${deliveryId}:`, { error: errorMessage });
      throw error;
    }
  }

  /**
   * Verify webhook signature for incoming webhook verification
   *
   * Security considerations:
   * - Uses crypto.timingSafeEqual to prevent timing attacks
   * - Validates timestamp to prevent replay attacks
   * - Signature format must be: sha256=<hex-encoded-hmac>
   *
   * @param payload - The raw payload string (must match exactly what was signed)
   * @param signature - The signature from X-Webhook-Signature header
   * @param timestamp - The timestamp from X-Webhook-Timestamp header
   * @param secret - The shared secret for HMAC computation
   * @param toleranceMs - Maximum age of timestamp in milliseconds (default: 5 minutes)
   * @returns Object with valid flag and optional error message
   */
  static verifySignature(
    payload: string,
    signature: string,
    timestamp: string,
    secret: string,
    toleranceMs: number = 300000 // 5 minutes default
  ): { valid: boolean; error?: string } {
    // Validate signature format
    if (!signature || !signature.startsWith('sha256=')) {
      return { valid: false, error: 'Invalid signature format: must start with sha256=' };
    }

    // Validate timestamp format
    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    // Check timestamp tolerance to prevent replay attacks
    const age = Math.abs(Date.now() - timestampNum);
    if (age > toleranceMs) {
      return {
        valid: false,
        error: `Timestamp expired: age ${Math.round(age / 1000)}s exceeds tolerance ${Math.round(toleranceMs / 1000)}s`
      };
    }

    // Calculate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = this.calculateSignature(payloadString, timestamp, secret);

    // Extract the hash part from the provided signature
    const providedHash = signature.substring(7); // Remove 'sha256=' prefix
    const expectedHash = expectedSignature.substring(7);

    if (!/^[a-fA-F0-9]{64}$/.test(providedHash)) {
      return { valid: false, error: 'Invalid signature encoding' };
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
      const providedBuffer = Buffer.from(providedHash, 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      // Buffers must be same length for timingSafeEqual
      if (providedBuffer.length !== expectedBuffer.length) {
        return { valid: false, error: 'Signature length mismatch' };
      }

      const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
      if (!isValid) {
        return { valid: false, error: 'Signature mismatch' };
      }

      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid signature encoding' };
    }
  }

  /**
   * Simple signature verification (legacy compatibility)
   * @deprecated Use verifySignature with timestamp for replay attack prevention
   */
  static verifySignatureSimple(payload: string, signature: string, secret: string): boolean {
    const result = this.verifySignature(payload, signature, Date.now().toString(), secret, Infinity);
    return result.valid;
  }
}

export default WebhookDeliveryService;
