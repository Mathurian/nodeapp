/**
 * Webhook Verification Middleware
 *
 * Provides HMAC-SHA256 signature verification for incoming webhooks.
 * Protects against:
 * - Forged webhooks (signature validation)
 * - Replay attacks (timestamp validation)
 * - Timing attacks (constant-time comparison)
 *
 * Usage:
 * ```typescript
 * import { verifyWebhook, createWebhookVerifier } from './middleware/webhookVerification';
 *
 * // Option 1: Static secret
 * router.post('/webhook', verifyWebhook('your-secret'), handler);
 *
 * // Option 2: Dynamic secret lookup
 * router.post('/webhook/:id', createWebhookVerifier(async (req) => {
 *   const webhook = await getWebhookConfig(req.params.id);
 *   return webhook?.secret;
 * }), handler);
 * ```
 *
 * Expected headers from webhook sender:
 * - X-Webhook-Signature: sha256=<hex-encoded-hmac>
 * - X-Webhook-Timestamp: <unix-timestamp-ms>
 *
 * The signature is computed over: timestamp + '.' + rawBody
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebhookVerification');

/**
 * Configuration options for webhook verification
 */
export interface WebhookVerificationOptions {
  /**
   * Maximum age of webhook timestamp in milliseconds
   * Default: 300000 (5 minutes)
   */
  toleranceMs?: number;

  /**
   * Header name for the signature
   * Default: 'x-webhook-signature'
   */
  signatureHeader?: string;

  /**
   * Header name for the timestamp
   * Default: 'x-webhook-timestamp'
   */
  timestampHeader?: string;

  /**
   * Whether to log verification failures
   * Default: true
   */
  logFailures?: boolean;

  /**
   * Custom error response handler
   */
  onError?: (res: Response, error: string) => void;
}

const defaultOptions: Required<Omit<WebhookVerificationOptions, 'onError'>> = {
  toleranceMs: 300000, // 5 minutes
  signatureHeader: 'x-webhook-signature',
  timestampHeader: 'x-webhook-timestamp',
  logFailures: true,
};

/**
 * Calculate HMAC-SHA256 signature
 *
 * @param payload - The raw payload string
 * @param timestamp - Unix timestamp in milliseconds as string
 * @param secret - The shared secret
 * @returns Signature in format: sha256=<hex-encoded-hmac>
 */
export function calculateWebhookSignature(
  payload: string,
  timestamp: string,
  secret: string
): string {
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(signedPayload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature with timing-safe comparison
 *
 * @param payload - The raw payload string
 * @param signature - The signature from header (format: sha256=<hex>)
 * @param timestamp - The timestamp from header
 * @param secret - The shared secret
 * @param toleranceMs - Maximum age of timestamp in milliseconds
 * @returns Verification result with valid flag and optional error
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string,
  toleranceMs: number = 300000
): { valid: boolean; error?: string } {
  // Validate inputs
  if (!signature) {
    return { valid: false, error: 'Missing signature' };
  }

  if (!timestamp) {
    return { valid: false, error: 'Missing timestamp' };
  }

  if (!secret) {
    return { valid: false, error: 'Missing secret' };
  }

  // Validate signature format
  if (!signature.startsWith('sha256=')) {
    return { valid: false, error: 'Invalid signature format: must start with sha256=' };
  }

  // Validate timestamp format
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || timestampNum <= 0) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  // Check timestamp tolerance to prevent replay attacks
  const now = Date.now();
  const age = Math.abs(now - timestampNum);
  if (age > toleranceMs) {
    return {
      valid: false,
      error: `Timestamp expired: age ${Math.round(age / 1000)}s exceeds tolerance ${Math.round(toleranceMs / 1000)}s`
    };
  }

  // Calculate expected signature
  const expectedSignature = calculateWebhookSignature(payload, timestamp, secret);

  // Extract hash portions for comparison
  const providedHash = signature.substring(7); // Remove 'sha256=' prefix
  const expectedHash = expectedSignature.substring(7);

  // Use timing-safe comparison to prevent timing attacks
  try {
    // Convert hex strings to buffers for comparison
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
 * Express middleware for webhook signature verification with static secret
 *
 * @param secret - The shared secret for HMAC computation
 * @param options - Optional verification options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * router.post('/webhook', verifyWebhook('my-secret'), (req, res) => {
 *   // Request is verified
 *   res.json({ received: true });
 * });
 * ```
 */
export function verifyWebhook(
  secret: string,
  options?: WebhookVerificationOptions
): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers[opts.signatureHeader] as string | undefined;
    const timestamp = req.headers[opts.timestampHeader] as string | undefined;

    // Get raw body - requires express.json() with verify option or express.raw()
    // The body should be the raw string for signature verification
    let rawBody: string;
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else if (Buffer.isBuffer(req.body)) {
      rawBody = req.body.toString('utf8');
    } else if (req.body && typeof req.body === 'object') {
      // Body was already parsed as JSON, reconstruct
      // Note: This may not match the original byte-for-byte if formatting differs
      rawBody = JSON.stringify(req.body);
    } else {
      rawBody = '';
    }

    // Validate required headers
    if (!signature) {
      if (opts.logFailures) {
        logger.warn('Webhook verification failed: missing signature header', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
      }
      sendError(res, 'Missing webhook signature', 401, opts.onError);
      return;
    }

    if (!timestamp) {
      if (opts.logFailures) {
        logger.warn('Webhook verification failed: missing timestamp header', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
      }
      sendError(res, 'Missing webhook timestamp', 401, opts.onError);
      return;
    }

    // Verify the signature
    const result = verifyWebhookSignature(rawBody, signature, timestamp, secret, opts.toleranceMs);

    if (!result.valid) {
      if (opts.logFailures) {
        logger.warn('Webhook verification failed', {
          error: result.error,
          path: req.path,
          method: req.method,
          ip: req.ip,
          timestamp,
          age: timestamp ? `${Math.round(Math.abs(Date.now() - parseInt(timestamp)) / 1000)}s` : 'N/A'
        });
      }
      sendError(res, result.error || 'Invalid webhook signature', 401, opts.onError);
      return;
    }

    // Verification successful
    logger.debug('Webhook signature verified successfully', {
      path: req.path,
      method: req.method
    });

    next();
  };
}

/**
 * Create a webhook verification middleware with dynamic secret lookup
 *
 * Use this when the secret needs to be looked up based on request parameters,
 * such as when different webhooks have different secrets.
 *
 * @param secretGetter - Async function that returns the secret for the request
 * @param options - Optional verification options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * const getSecret = async (req: Request) => {
 *   const webhook = await prisma.webhookConfig.findUnique({
 *     where: { id: req.params.webhookId }
 *   });
 *   return webhook?.secret;
 * };
 *
 * router.post('/webhook/:webhookId', createWebhookVerifier(getSecret), handler);
 * ```
 */
export function createWebhookVerifier(
  secretGetter: (req: Request) => Promise<string | undefined | null> | string | undefined | null,
  options?: WebhookVerificationOptions
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const opts = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get the secret for this request
      const secret = await Promise.resolve(secretGetter(req));

      if (!secret) {
        if (opts.logFailures) {
          logger.warn('Webhook verification failed: no secret configured', {
            path: req.path,
            method: req.method,
            ip: req.ip
          });
        }
        sendError(res, 'Webhook not configured', 404, opts.onError);
        return;
      }

      // Delegate to the standard verification
      const middleware = verifyWebhook(secret, options);
      middleware(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Webhook verification error', {
        error: errorMessage,
        path: req.path,
        method: req.method
      });
      sendError(res, 'Webhook verification error', 500, opts.onError);
    }
  };
}

/**
 * Helper to send error responses
 */
function sendError(
  res: Response,
  error: string,
  status: number,
  customHandler?: (res: Response, error: string) => void
): void {
  if (customHandler) {
    customHandler(res, error);
  } else {
    res.status(status).json({
      success: false,
      error: 'Webhook verification failed',
      message: error
    });
  }
}

/**
 * Utility function to sign a payload for testing purposes
 *
 * @param payload - The payload to sign (object or string)
 * @param secret - The shared secret
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Object with signature and timestamp headers
 *
 * @example
 * ```typescript
 * const { signature, timestamp } = signWebhookPayload({ event: 'test' }, 'secret');
 * // Use in test:
 * await request(app)
 *   .post('/webhook')
 *   .set('X-Webhook-Signature', signature)
 *   .set('X-Webhook-Timestamp', timestamp)
 *   .send({ event: 'test' });
 * ```
 */
export function signWebhookPayload(
  payload: object | string,
  secret: string,
  timestamp?: string
): { signature: string; timestamp: string } {
  const ts = timestamp || Date.now().toString();
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = calculateWebhookSignature(payloadString, ts, secret);

  return { signature, timestamp: ts };
}

export default verifyWebhook;
