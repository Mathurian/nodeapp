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
 * Automatically cancels queries that exceed configured timeout
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

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const duration = Date.now() - startTime;
        logger.error('Query timeout exceeded', {
          model: params.model,
          action: params.action,
          timeout,
          duration,
        });
        reject(new Error(`Query timeout: ${params.model}.${params.action} exceeded ${timeout}ms`));
      }, timeout);
    });

    // Race between query and timeout
    try {
      const result = await Promise.race([
        next(params),
        timeoutPromise,
      ]);

      const duration = Date.now() - startTime;

      // Log slow queries (>50% of timeout)
      if (duration > timeout * 0.5) {
        logger.warn('Slow query detected', {
          model: params.model,
          action: params.action,
          duration,
          timeout,
          percentOfTimeout: Math.round((duration / timeout) * 100),
        });
      }

      return result;
    } catch (error) {
      // Log and re-throw
      logger.error('Query error', {
        model: params.model,
        action: params.action,
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
