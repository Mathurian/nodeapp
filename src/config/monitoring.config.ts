/**
 * Monitoring Configuration
 * Configuration for Sentry and custom metrics
 */

import { env } from './env';

export interface MonitoringConfig {
  sentry: {
    enabled: boolean;
    dsn?: string;
    environment: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
    debug: boolean;
    integrations?: string[];
  };
  metrics: {
    enabled: boolean;
    prefix: string;
    collectInterval: number; // milliseconds
  };
  logging: {
    level: string;
    enableFileLogging: boolean;
    logDirectory: string;
    maxFiles: number;
    maxSize: string;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    services: string[];
  };
}

/**
 * Get monitoring configuration from environment
 */
export const getMonitoringConfig = (): MonitoringConfig => {
  const isProduction = env.isProduction();
  const isDevelopment = env.isDevelopment();

  return {
    sentry: {
      enabled: (env.get('SENTRY_ENABLED') !== undefined && env.get('SENTRY_ENABLED')) || (isProduction && !!env.get('SENTRY_DSN')),
      dsn: env.get('SENTRY_DSN'),
      environment: env.get('SENTRY_ENVIRONMENT') || env.get('NODE_ENV'),
      tracesSampleRate: env.get('SENTRY_TRACES_SAMPLE_RATE') ?? 0.1,
      // Note: SENTRY_PROFILES_SAMPLE_RATE, SENTRY_DEBUG not in env.ts yet
      // TODO: Add these to env.ts configuration
      profilesSampleRate: parseFloat(process.env['SENTRY_PROFILES_SAMPLE_RATE'] || '0.1'),
      debug: process.env['SENTRY_DEBUG'] === 'true' || isDevelopment,
    },
    metrics: {
      // Note: ENABLE_METRICS, METRICS_PREFIX, METRICS_COLLECT_INTERVAL not in env.ts yet
      // TODO: Add these to env.ts configuration
      enabled: process.env['ENABLE_METRICS'] !== 'false' && env.get('METRICS_ENABLED'),
      prefix: process.env['METRICS_PREFIX'] || 'event_manager_',
      collectInterval: parseInt(process.env['METRICS_COLLECT_INTERVAL'] || '60000', 10),
    },
    logging: {
      level: env.get('LOG_LEVEL'),
      enableFileLogging: process.env['DISABLE_FILE_LOGGING'] !== 'true',
      logDirectory: process.env['LOG_DIRECTORY'] || './logs',
      maxFiles: env.get('LOG_MAX_FILES'),
      maxSize: env.get('LOG_MAX_SIZE'),
    },
    healthCheck: {
      enabled: process.env['HEALTH_CHECK_ENABLED'] !== 'false',
      path: process.env['HEALTH_CHECK_PATH'] || '/health',
      services: (process.env['HEALTH_CHECK_SERVICES'] || 'database,redis,cache,virusScan').split(','),
    },
  };
};

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Performance thresholds
 */
export const PerformanceThresholds = {
  API_RESPONSE_TIME_SLOW: 1000, // 1 second
  API_RESPONSE_TIME_VERY_SLOW: 3000, // 3 seconds
  DATABASE_QUERY_SLOW: 500, // 500ms
  DATABASE_QUERY_VERY_SLOW: 2000, // 2 seconds
  CACHE_OPERATION_SLOW: 100, // 100ms
  FILE_SCAN_SLOW: 5000, // 5 seconds
} as const;

export default {
  getMonitoringConfig,
  MetricType,
  PerformanceThresholds,
};
