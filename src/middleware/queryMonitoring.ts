import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';

const queryLogger = new Logger('QueryMonitoring');

/**
 * Query Monitoring Middleware
 *
 * Tracks query performance and logs slow queries
 * Helps identify database bottlenecks
 */

// Slow query threshold in milliseconds (configurable via env)
// Note: SLOW_QUERY_THRESHOLD not in env.ts yet, using direct access with fallback
// TODO: Add SLOW_QUERY_THRESHOLD to env.ts configuration
const SLOW_QUERY_THRESHOLD = parseInt(process.env['SLOW_QUERY_THRESHOLD'] || '100', 10);

// Extend Prisma Client with query logging
// NOTE: This function should use the singleton instead of creating new instances
// However, if monitoring is needed, wrap the singleton with event handlers
export const createMonitoredPrismaClient = () => {
  // Import singleton instead of creating new instance
  const prisma = require('../config/database').default;
  
  // Note: The singleton already has logging configured in database.ts
  // If custom event handlers are needed, they should be added to the singleton

  // Track query execution time
  prisma.$on('query' as never, async (e: { duration: string; query: string; params: string; target: string }) => {
    const duration = parseFloat(e.duration);

    if (duration > SLOW_QUERY_THRESHOLD) {
      queryLogger.warn('Slow Query Detected', {
        query: e.query,
        params: e.params,
        duration: `${duration}ms`,
        target: e.target,
        timestamp: new Date().toISOString(),
      });

      // Optionally store in database for analysis
      try {
        await prisma.performanceLog.create({
          data: {
            endpoint: 'database-query',
            method: e.target || 'UNKNOWN',
            responseTime: Math.round(duration),
            statusCode: 200,
            createdAt: new Date(),
          },
        });
      } catch (error) {
        // Silently fail to avoid infinite loops
      }
    }
  });

  // Log errors
  prisma.$on('error' as never, (e: { message: string; target: string }) => {
    queryLogger.error('Prisma Error', {
      message: e.message,
      target: e.target,
      timestamp: new Date().toISOString(),
    });
  });

  // Log warnings
  prisma.$on('warn' as never, (e: { message: string; target: string }) => {
    queryLogger.warn('Prisma Warning', {
      message: e.message,
      target: e.target,
      timestamp: new Date().toISOString(),
    });
  });

  return prisma;
};

/**
 * Query Performance Metrics
 *
 * Tracks database query statistics
 */
export class QueryMetrics {
  private static metrics: Map<string, {
    count: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
    avgDuration: number;
  }> = new Map();

  static recordQuery(operation: string, duration: number) {
    const existing = this.metrics.get(operation);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.minDuration = Math.min(existing.minDuration, duration);
      existing.maxDuration = Math.max(existing.maxDuration, duration);
      existing.avgDuration = existing.totalDuration / existing.count;
    } else {
      this.metrics.set(operation, {
        count: 1,
        totalDuration: duration,
        minDuration: duration,
        maxDuration: duration,
        avgDuration: duration,
      });
    }
  }

  static getMetrics() {
    const metrics: Array<{
      operation: string;
      count: number;
      totalDuration: number;
      minDuration: number;
      maxDuration: number;
      avgDuration: number;
    }> = [];

    this.metrics.forEach((value, key) => {
      metrics.push({
        operation: key,
        ...value,
      });
    });

    return metrics.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  static reset() {
    this.metrics.clear();
  }

  static getSlowQueries(threshold: number = SLOW_QUERY_THRESHOLD) {
    return this.getMetrics().filter(m => m.avgDuration > threshold);
  }
}

/**
 * Connection Pool Monitoring
 */
export class ConnectionPoolMonitor {
  private static prisma: typeof import('../config/database').default;

  static initialize(prisma: typeof import('../config/database').default) {
    this.prisma = prisma;
  }

  static async getPoolStats() {
    try {
      // Get active connections
      const result = await this.prisma.$queryRaw<Array<{
        total_connections: string;
        active_connections: string;
        idle_connections: string;
        idle_in_transaction: string;
      }>>`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;

      return {
        total: parseInt(result[0]?.total_connections || '0', 10),
        active: parseInt(result[0]?.active_connections || '0', 10),
        idle: parseInt(result[0]?.idle_connections || '0', 10),
        idleInTransaction: parseInt(result[0]?.idle_in_transaction || '0', 10),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      queryLogger.error('Failed to get connection pool stats', { error });
      return null;
    }
  }

  static async getLongRunningQueries(thresholdSeconds: number = 10) {
    try {
      const result = await this.prisma.$queryRaw<Array<{
        pid: number;
        duration: string;
        state: string;
        query: string;
      }>>`
        SELECT
          pid,
          now() - query_start as duration,
          state,
          query
        FROM pg_stat_activity
        WHERE (now() - query_start) > interval '${thresholdSeconds} seconds'
          AND state != 'idle'
          AND datname = current_database()
        ORDER BY duration DESC;
      `;

      return result;
    } catch (error) {
      queryLogger.error('Failed to get long running queries', { error });
      return [];
    }
  }
}

/**
 * Middleware to track request database performance
 */
export const requestQueryMonitoring = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Hook into response finish to calculate total time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const operation = `${req.method} ${req.path}`;

    QueryMetrics.recordQuery(operation, duration);

    if (duration > SLOW_QUERY_THRESHOLD) {
      queryLogger.warn('Slow Request Detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

export default {
  createMonitoredPrismaClient,
  QueryMetrics,
  ConnectionPoolMonitor,
  requestQueryMonitoring,
};
