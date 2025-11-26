/**
 * Correlation ID Middleware
 * Sprint 4 - Epic 2: Request Correlation IDs
 *
 * Generates unique request IDs and propagates correlation IDs across the entire
 * request chain for end-to-end tracing.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request Context - Available in all async operations via AsyncLocalStorage
 */
export interface RequestContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  tenantId?: string;
  userEmail?: string;
  userName?: string;
}

/**
 * AsyncLocalStorage for request context
 * Provides thread-safe context propagation across async operations
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Extend Express Request type to include correlation IDs
 * Note: Request.id is already defined in @types/express-serve-static-core
 * We're adding correlationId here
 */
declare global {
  namespace Express {
    interface Request {
      correlationId: string; // Propagated across requests
    }
  }
}

/**
 * Request ID Middleware
 * Generates or extracts request ID and correlation ID from headers
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate or use existing request ID
  // Accept from X-Request-ID header (standard) or x-request-id (lowercase)
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  // Correlation ID for tracing across services
  // Accept from X-Correlation-ID header or default to request ID
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    requestId;

  // Attach to request object
  req.id = requestId;
  req.correlationId = correlationId;

  // Add to response headers for client visibility
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};

/**
 * Context Middleware
 * Establishes AsyncLocalStorage context for request tracking
 *
 * IMPORTANT: This must be registered AFTER authentication middleware
 * so that req.user and req.tenantId are available
 */
export const contextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  // Build context from request
  const context: RequestContext = {
    requestId: req.id || uuidv4(),
    correlationId: req.correlationId || req.id || uuidv4(),
    userId: (req as any).user?.id,
    tenantId: (req as any).tenantId,
    userEmail: (req as any).user?.email,
    userName: (req as any).user?.name,
  };

  // Run rest of request chain in this context
  requestContext.run(context, () => {
    next();
  });
};

/**
 * Get current request context
 * Safe to call from anywhere in async call chain
 *
 * @returns RequestContext or undefined if outside request context
 */
export const getRequestContext = (): RequestContext | undefined => {
  return requestContext.getStore();
};

/**
 * Get correlation ID from context
 * Returns 'unknown' if not in request context
 *
 * @returns Correlation ID or 'unknown'
 */
export const getCorrelationId = (): string => {
  const context = requestContext.getStore();
  return context?.correlationId || 'unknown';
};

/**
 * Get request ID from context
 * Returns 'unknown' if not in request context
 *
 * @returns Request ID or 'unknown'
 */
export const getRequestId = (): string => {
  const context = requestContext.getStore();
  return context?.requestId || 'unknown';
};

/**
 * Run a function with a specific request context
 * Useful for background jobs, event handlers, etc.
 *
 * @example
 * ```typescript
 * // In background job processor
 * await runWithContext({
 *   requestId: job.data.requestId,
 *   correlationId: job.data.correlationId,
 * }, async () => {
 *   await processJob(job);
 * });
 * ```
 */
export const runWithContext = async <T>(
  context: Partial<RequestContext>,
  fn: () => Promise<T>
): Promise<T> => {
  const fullContext: RequestContext = {
    requestId: context.requestId || uuidv4(),
    correlationId: context.correlationId || context.requestId || uuidv4(),
    userId: context.userId,
    tenantId: context.tenantId,
    userEmail: context.userEmail,
    userName: context.userName,
  };

  return requestContext.run(fullContext, fn);
};

export default {
  correlationIdMiddleware,
  contextMiddleware,
  getRequestContext,
  getCorrelationId,
  getRequestId,
  runWithContext,
};
