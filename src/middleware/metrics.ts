/**
 * Metrics Middleware
 * Records HTTP request metrics
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { MetricsService } from '../services/MetricsService';
import { createLogger } from '../utils/logger';
// S4-4: Import correlation ID helper
import { getRequestContext } from './correlationId';

const logger = createLogger('Metrics');

let metricsService: MetricsService | null = null;

/**
 * Initialize metrics service
 */
export const initMetrics = (): void => {
  try {
    metricsService = container.resolve(MetricsService);
  } catch (error) {
    logger.warn('Metrics service not available', { error });
  }
};

/**
 * Middleware to record HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!metricsService) {
    return next();
  }

  const startTime = Date.now();

  // S4-4: Record correlation ID tracking
  const context = getRequestContext();
  const hasCorrelationId = !!(context?.correlationId);
  metricsService.recordCorrelationId(hasCorrelationId);

  // Record response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metricsService!.recordHttpRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      duration
    );

    // Record errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      metricsService!.recordHttpError(
        req.method,
        req.route?.path || req.path,
        errorType
      );
    }
  });

  next();
};

/**
 * Middleware to expose metrics endpoint
 */
export const metricsEndpoint = async (_req: Request, res: Response): Promise<void> => {
  if (!metricsService) {
    res.status(503).json({ error: 'Metrics service not available' });
    return;
  }

  try {
    const metrics = await metricsService.getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: errorMessage });
  }
};

export default { initMetrics, metricsMiddleware, metricsEndpoint };

