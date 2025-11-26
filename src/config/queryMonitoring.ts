/**
 * Query Monitoring Configuration
 *
 * Basic query monitoring setup for Prisma.
 * Logs slow queries and provides metrics for database performance analysis.
 *
 * For Sprint 2, this will be expanded with:
 * - N+1 query detection
 * - Query performance analysis
 * - Automated optimization suggestions
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('query-monitoring');

/**
 * Configuration for query monitoring
 */
export const QUERY_MONITORING_CONFIG = {
  // Enable/disable query logging
  enabled: process.env['ENABLE_QUERY_LOGGING'] === 'true' || process.env['NODE_ENV'] === 'development',

  // Log all queries (verbose)
  logAllQueries: process.env['LOG_ALL_QUERIES'] === 'true',

  // Slow query threshold in milliseconds
  slowQueryThreshold: parseInt(process.env['SLOW_QUERY_THRESHOLD'] || '100', 10),

  // Log query parameters
  logParameters: process.env['LOG_QUERY_PARAMETERS'] === 'true',
};

/**
 * Prisma log levels configuration
 */
export const getPrismaLogConfig = () => {
  if (!QUERY_MONITORING_CONFIG.enabled) {
    return ['error', 'warn'];
  }

  const logConfig: any[] = [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ];

  return logConfig;
};

/**
 * Query event handler
 *
 * Logs slow queries and optionally all queries for analysis
 */
export function handleQueryEvent(event: any): void {
  const duration = parseFloat(event.duration) || 0;

  // Always log slow queries
  if (duration >= QUERY_MONITORING_CONFIG.slowQueryThreshold) {
    logger.warn('Slow query detected', {
      query: event.query,
      duration: `${duration}ms`,
      params: QUERY_MONITORING_CONFIG.logParameters ? event.params : '[hidden]',
      target: event.target,
    });
  }

  // Log all queries if enabled
  if (QUERY_MONITORING_CONFIG.logAllQueries) {
    logger.debug('Database query', {
      query: event.query,
      duration: `${duration}ms`,
      params: QUERY_MONITORING_CONFIG.logParameters ? event.params : '[hidden]',
    });
  }
}

/**
 * Error event handler
 */
export function handleErrorEvent(event: any): void {
  logger.error('Database error', {
    message: event.message,
    target: event.target,
  });
}

/**
 * Warning event handler
 */
export function handleWarnEvent(event: any): void {
  logger.warn('Database warning', {
    message: event.message,
    target: event.target,
  });
}

/**
 * Query metrics tracking (in-memory for now)
 *
 * In Sprint 2, this will be exported to Prometheus
 */
interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  errors: number;
  averageDuration: number;
}

const metrics: QueryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  averageDuration: 0,
};

let totalDuration = 0;

export function trackQueryMetrics(duration: number, isSlow: boolean): void {
  metrics.totalQueries++;
  totalDuration += duration;
  metrics.averageDuration = totalDuration / metrics.totalQueries;

  if (isSlow) {
    metrics.slowQueries++;
  }
}

export function trackQueryError(): void {
  metrics.errors++;
}

export function getQueryMetrics(): QueryMetrics {
  return { ...metrics };
}

export function resetQueryMetrics(): void {
  metrics.totalQueries = 0;
  metrics.slowQueries = 0;
  metrics.errors = 0;
  metrics.averageDuration = 0;
  totalDuration = 0;
}

/**
 * Enable query monitoring on Prisma client
 *
 * Usage:
 * ```typescript
 * const prisma = new PrismaClient({ log: getPrismaLogConfig() });
 * enableQueryMonitoring(prisma);
 * ```
 */
export function enableQueryMonitoring(prisma: any): void {
  if (!QUERY_MONITORING_CONFIG.enabled) {
    logger.info('Query monitoring disabled');
    return;
  }

  logger.info('Query monitoring enabled', {
    slowQueryThreshold: `${QUERY_MONITORING_CONFIG.slowQueryThreshold}ms`,
    logAllQueries: QUERY_MONITORING_CONFIG.logAllQueries,
    logParameters: QUERY_MONITORING_CONFIG.logParameters,
  });

  // Attach event listeners
  prisma.$on('query', (event: any) => {
    const duration = parseFloat(event.duration) || 0;
    const isSlow = duration >= QUERY_MONITORING_CONFIG.slowQueryThreshold;

    handleQueryEvent(event);
    trackQueryMetrics(duration, isSlow);
  });

  prisma.$on('error', (event: any) => {
    handleErrorEvent(event);
    trackQueryError();
  });

  prisma.$on('warn', (event: any) => {
    handleWarnEvent(event);
  });
}

export default {
  QUERY_MONITORING_CONFIG,
  getPrismaLogConfig,
  handleQueryEvent,
  handleErrorEvent,
  handleWarnEvent,
  trackQueryMetrics,
  trackQueryError,
  getQueryMetrics,
  resetQueryMetrics,
  enableQueryMonitoring,
};
