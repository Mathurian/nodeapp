/**
 * Query Timeout Configuration
 * P2-3: Enforces maximum query execution times to prevent long-running queries
 */

import { Prisma } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('query-timeouts');

export const QUERY_TIMEOUTS = {
  simple: 1000,      // 1 second - Simple lookups (findUnique, findFirst)
  standard: 5000,    // 5 seconds - Standard queries with joins
  complex: 15000,    // 15 seconds - Complex aggregations
  report: 30000,     // 30 seconds - Report generation
};

/**
 * Query timeout middleware
 * Observability-only timing middleware.
 * Real write cancellation should be enforced with transaction-scoped
 * statement_timeout helpers rather than Promise.race timeouts.
 */
export function createQueryTimeoutMiddleware(defaultTimeout = QUERY_TIMEOUTS.standard): Prisma.Middleware {
  return async (params, next) => {
    const startTime = Date.now();

    // Determine timeout based on operation
    let timeout = defaultTimeout;

    // Use longer timeout for aggregations and counts
    if (params.action === 'aggregate' || params.action === 'groupBy') {
      timeout = QUERY_TIMEOUTS.complex;
    } else if (params.action === 'count') {
      timeout = QUERY_TIMEOUTS.simple;
    } else if (params.action === 'findUnique' || params.action === 'findFirst') {
      timeout = QUERY_TIMEOUTS.simple;
    }

    try {
      const result = await next(params);

      const duration = Date.now() - startTime;

      if (duration > timeout * 0.5) {
        logger.warn('Slow query detected', {
          model: params.model,
          action: params.action,
          duration,
          timeout,
          percentOfTimeout: Math.round((duration / timeout) * 100),
        });
      }

      if (duration > timeout) {
        logger.error('Query duration exceeded configured threshold', {
          model: params.model,
          action: params.action,
          timeout,
          duration,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query error', {
        model: params.model,
        action: params.action,
        timeout,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

export default {
  QUERY_TIMEOUTS,
  createQueryTimeoutMiddleware,
};
