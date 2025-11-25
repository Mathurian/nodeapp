/**
 * Query Performance Monitoring Middleware
 * Logs slow Prisma queries for performance analysis
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('query-monitoring');

/**
 * Slow query threshold in milliseconds
 * Queries taking longer than this will be logged
 */
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

/**
 * Setup query monitoring middleware for Prisma
 * This will log slow queries and provide performance insights
 */
export function setupQueryMonitoring(prisma: PrismaClient): void {
  prisma.$use(async (params, next) => {
    const startTime = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn('Slow query detected', {
          model: params.model,
          action: params.action,
          duration,
          args: JSON.stringify(params.args).substring(0, 500), // Limit log size
        });
      }

      // Log very slow queries (5 seconds) as errors
      if (duration > 5000) {
        logger.error('Very slow query detected', {
          model: params.model,
          action: params.action,
          duration,
          args: JSON.stringify(params.args).substring(0, 500),
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Query error', {
        model: params.model,
        action: params.action,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });
}

/**
 * Get query statistics
 * This can be used to track query performance over time
 */
export interface QueryStats {
  totalQueries: number;
  slowQueries: number;
  averageDuration: number;
  maxDuration: number;
}

// In-memory query statistics (could be moved to Redis for production)
const queryStats = new Map<string, QueryStats>();

/**
 * Track query statistics
 */
export function trackQueryStats(
  model: string,
  action: string,
  duration: number
): void {
  const key = `${model}.${action}`;
  const stats = queryStats.get(key) || {
    totalQueries: 0,
    slowQueries: 0,
    averageDuration: 0,
    maxDuration: 0,
  };

  stats.totalQueries++;
  if (duration > SLOW_QUERY_THRESHOLD) {
    stats.slowQueries++;
  }
  stats.averageDuration = (stats.averageDuration * (stats.totalQueries - 1) + duration) / stats.totalQueries;
  stats.maxDuration = Math.max(stats.maxDuration, duration);

  queryStats.set(key, stats);
}

/**
 * Get all query statistics
 */
export function getQueryStats(): Map<string, QueryStats> {
  return new Map(queryStats);
}

/**
 * Reset query statistics
 */
export function resetQueryStats(): void {
  queryStats.clear();
}
