/**
 * Redis Configuration
 * Configuration for Redis distributed caching with support for:
 * - Docker containers (redis:6379)
 * - Native installations (localhost:6379)
 * - Unix socket connections
 * - In-memory fallback (when Redis unavailable)
 * - Disabled mode (in-memory only)
 */

import { RedisOptions } from 'ioredis';
import { env } from './env';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis');

export type RedisMode = 'docker' | 'native' | 'socket' | 'memory' | 'disabled';

export interface RedisConfig {
  enabled: boolean;
  mode: RedisMode;
  host: string;
  port: number;
  path?: string; // Unix socket path
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryStrategy?: (times: number) => number | void;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
  connectTimeout?: number;
  lazyConnect?: boolean;
  showFriendlyErrorStack?: boolean;
  fallbackToMemory?: boolean;
}

/**
 * Detect Redis connection mode based on environment
 */
export const detectRedisMode = (): RedisMode => {
  // Check if explicitly disabled
  if (!env.get('REDIS_ENABLE')) {
    return 'disabled';
  }

  // Check for Unix socket path
  if (env.get('REDIS_SOCKET')) {
    return 'socket';
  }

  // Check if in Docker environment (custom env variable)
  if (env.get('REDIS_HOST') === 'redis' || (env.get('DOCKER_ENV') as boolean | undefined)) {
    return 'docker';
  }

  // Default to native (localhost)
  return 'native';
};

/**
 * Get Redis configuration from environment
 */
export const getRedisConfig = (): RedisConfig => {
  const isProduction = env.isProduction();
  const mode = detectRedisMode();
  const enabled = env.get('REDIS_ENABLE');

  // Unix socket configuration (custom optional variable)
  const socketPath = env.get('REDIS_SOCKET');

  // Parse Redis URL if provided
  const redisUrl = env.get('REDIS_URL');
  let host = 'localhost';
  let port = 6379;

  // Extract host/port from URL
  try {
    const url = new URL(redisUrl);
    host = url.hostname || 'localhost';
    port = parseInt(url.port, 10) || 6379;
  } catch (e) {
    // Invalid URL, use defaults
  }

  return {
    enabled,
    mode,
    host: process.env['REDIS_HOST'] || host,
    port: parseInt(process.env['REDIS_PORT'] || String(port), 10),
    path: socketPath,
    password: env.get('REDIS_PASSWORD'),
    db: env.get('REDIS_DB'),
    keyPrefix: env.get('REDIS_KEY_PREFIX') || 'event-manager:',
    enableOfflineQueue: true,
    maxRetriesPerRequest: mode === 'disabled' ? 0 : 3,
    connectTimeout: 10000,
    lazyConnect: false,
    showFriendlyErrorStack: !isProduction,
    fallbackToMemory: env.get('REDIS_FALLBACK_TO_MEMORY'),
    retryStrategy: (times: number) => {
      // Don't retry if disabled
      if (!enabled) {
        return undefined;
      }

      // Exponential backoff with max delay of 30 seconds
      const delay = Math.min(times * 500, 30000);
      logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);

      // Stop retrying after 10 attempts if fallback is enabled
      if (env.get('REDIS_FALLBACK_TO_MEMORY') && times > 10) {
        logger.warn('Redis max retries reached, will use in-memory fallback');
        return undefined;
      }

      return delay;
    },
  };
};

/**
 * Get Redis options for ioredis client
 */
export const getRedisOptions = (): RedisOptions => {
  const config = getRedisConfig();

  // If disabled, return minimal config (won't actually connect)
  if (!config.enabled || config.mode === 'disabled') {
    return {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
    };
  }

  const options: RedisOptions = {
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    retryStrategy: config.retryStrategy,
    enableOfflineQueue: config.enableOfflineQueue,
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    connectTimeout: config.connectTimeout,
    lazyConnect: config.lazyConnect,
    showFriendlyErrorStack: config.showFriendlyErrorStack,
  };

  // Unix socket connection
  if (config.mode === 'socket' && config.path) {
    options.path = config.path;
  } else {
    // TCP connection (Docker or native)
    options.host = config.host;
    options.port = config.port;
  }

  return options;
};

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
  VERY_SHORT: 60,           // 1 minute
  SHORT: 300,               // 5 minutes
  MEDIUM: 900,              // 15 minutes
  LONG: 3600,               // 1 hour
  VERY_LONG: 86400,         // 24 hours
  WEEK: 604800,             // 7 days
} as const;

/**
 * Cache key namespaces
 */
export const CacheNamespace = {
  USER: 'user',
  EVENT: 'event',
  CONTEST: 'contest',
  CATEGORY: 'category',
  SCORE: 'score',
  JUDGE: 'judge',
  CONTESTANT: 'contestant',
  ASSIGNMENT: 'assignment',
  SETTINGS: 'settings',
  SESSION: 'session',
  RATE_LIMIT: 'rate_limit',
  REPORT: 'report',
  TEMPLATE: 'template',
  CERTIFICATION: 'certification',
} as const;

/**
 * Redis cache configuration by data type
 */
export const CacheConfig = {
  [CacheNamespace.USER]: {
    ttl: CacheTTL.LONG,
    invalidateOn: ['user:update', 'user:delete'],
  },
  [CacheNamespace.EVENT]: {
    ttl: CacheTTL.MEDIUM,
    invalidateOn: ['event:update', 'event:delete'],
  },
  [CacheNamespace.CONTEST]: {
    ttl: CacheTTL.MEDIUM,
    invalidateOn: ['contest:update', 'contest:delete'],
  },
  [CacheNamespace.CATEGORY]: {
    ttl: CacheTTL.MEDIUM,
    invalidateOn: ['category:update', 'category:delete'],
  },
  [CacheNamespace.SCORE]: {
    ttl: CacheTTL.SHORT,
    invalidateOn: ['score:update', 'score:delete'],
  },
  [CacheNamespace.JUDGE]: {
    ttl: CacheTTL.LONG,
    invalidateOn: ['judge:update', 'judge:delete'],
  },
  [CacheNamespace.CONTESTANT]: {
    ttl: CacheTTL.LONG,
    invalidateOn: ['contestant:update', 'contestant:delete'],
  },
  [CacheNamespace.ASSIGNMENT]: {
    ttl: CacheTTL.MEDIUM,
    invalidateOn: ['assignment:update', 'assignment:delete'],
  },
  [CacheNamespace.SETTINGS]: {
    ttl: CacheTTL.VERY_LONG,
    invalidateOn: ['settings:update'],
  },
  [CacheNamespace.SESSION]: {
    ttl: CacheTTL.VERY_LONG,
    invalidateOn: ['session:invalidate'],
  },
  [CacheNamespace.RATE_LIMIT]: {
    ttl: CacheTTL.SHORT,
    invalidateOn: [],
  },
  [CacheNamespace.REPORT]: {
    ttl: CacheTTL.MEDIUM,
    invalidateOn: ['report:regenerate'],
  },
  [CacheNamespace.TEMPLATE]: {
    ttl: CacheTTL.VERY_LONG,
    invalidateOn: ['template:update', 'template:delete'],
  },
  [CacheNamespace.CERTIFICATION]: {
    ttl: CacheTTL.LONG,
    invalidateOn: ['certification:update'],
  },
} as const;

export default {
  getRedisConfig,
  getRedisOptions,
  CacheTTL,
  CacheNamespace,
  CacheConfig,
};
