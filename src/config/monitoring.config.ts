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
      profilesSampleRate: (env.get('SENTRY_PROFILES_SAMPLE_RATE') as number | undefined) ?? 0.1,
      debug: (env.get('SENTRY_DEBUG') as boolean | undefined) ?? isDevelopment,
    },
    metrics: {
      enabled: (env.get('ENABLE_METRICS') ?? true) && env.get('METRICS_ENABLED'),
      prefix: env.get('METRICS_PREFIX') || 'event_manager_',
      collectInterval: env.get('METRICS_COLLECT_INTERVAL') ?? 60000,
    },
    logging: {
      level: env.get('LOG_LEVEL'),
      enableFileLogging: !env.get('DISABLE_FILE_LOGGING'),
      logDirectory: env.get('LOG_DIRECTORY') || './logs',
      maxFiles: env.get('LOG_MAX_FILES'),
      maxSize: env.get('LOG_MAX_SIZE'),
    },
    healthCheck: {
      enabled: env.get('HEALTH_CHECK_ENABLED') ?? true,
      path: String(env.get('HEALTH_CHECK_PATH') || '/health'),
      services: String(env.get('HEALTH_CHECK_SERVICES') || 'database,redis,cache,virusScan').split(','),
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
