/**
 * Cacheable Decorator
 *
 * Provides method-level caching using Redis with configurable TTL and cache keys.
 * Automatically handles cache invalidation and supports namespace-based organization.
 *
 * Usage:
 * ```typescript
 * class UserService {
 *   @Cacheable({ ttl: 3600, namespace: 'users' })
 *   async getUserById(id: string) {
 *     return prisma.user.findUnique({ where: { id } });
 *   }
 *
 *   @Cacheable({ ttl: 300, keyPrefix: 'active' })
 *   async getActiveUsers() {
 *     return prisma.user.findMany({ where: { isActive: true } });
 *   }
 * }
 * ```
 */

import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Create dedicated Redis client for caching decorator
const redisClient = new Redis({
  host: env.get('REDIS_HOST') || 'localhost',
  port: env.get('REDIS_PORT') || 6379,
  password: env.get('REDIS_PASSWORD'),
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

export interface CacheableOptions {
  /**
   * Time to live in seconds
   * @default 300 (5 minutes)
   */
  ttl?: number;

  /**
   * Cache namespace for organization
   * @default 'app'
   */
  namespace?: string;

  /**
   * Custom key prefix
   * @default method name
   */
  keyPrefix?: string;

  /**
   * Whether to cache null/undefined results
   * @default false
   */
  cacheNullable?: boolean;

  /**
   * Custom key generator function
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Whether to log cache hits/misses
   * @default false
   */
  debug?: boolean;
}

/**
 * Generate cache key from method name and arguments
 */
function generateCacheKey(
  namespace: string,
  keyPrefix: string,
  args: any[],
  keyGenerator?: (...args: any[]) => string
): string {
  if (keyGenerator) {
    const customKey = keyGenerator(...args);
    return `${namespace}:${keyPrefix}:${customKey}`;
  }

  // Default: hash arguments
  const argsHash = args.length > 0
    ? JSON.stringify(args).replace(/[^a-zA-Z0-9]/g, '_')
    : 'noargs';

  return `${namespace}:${keyPrefix}:${argsHash}`;
}

/**
 * Cacheable method decorator
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const {
        ttl = 300,
        namespace = 'app',
        keyPrefix = propertyKey,
        cacheNullable = false,
        keyGenerator,
        debug = false
      } = options;

      // Generate cache key
      const cacheKey = generateCacheKey(namespace, keyPrefix, args, keyGenerator);

      try {
        // Try to get from cache
        const cachedValue = await redisClient.get(cacheKey);

        if (cachedValue !== null) {
          if (debug) {
            logger.debug(`Cache HIT: ${cacheKey}`);
          }
          return JSON.parse(cachedValue);
        }

        if (debug) {
          logger.debug(`Cache MISS: ${cacheKey}`);
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Cache the result (if not null/undefined or if cacheNullable is true)
        if (result !== null && result !== undefined) {
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
        } else if (cacheNullable) {
          await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
        }

        return result;
      } catch (error) {
        // Log error but don't fail - fall back to executing method
        logger.error(`Cache error for ${cacheKey}:`, error);
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  /**
   * Invalidate all keys matching a pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await redisClient.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      return keys.length;
    } catch (error) {
      logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Invalidate entire namespace
   */
  static async invalidateNamespace(namespace: string): Promise<number> {
    return this.invalidatePattern(`${namespace}:*`);
  }

  /**
   * Invalidate specific cache key
   */
  static async invalidateKey(key: string): Promise<boolean> {
    try {
      const result = await redisClient.del(key);
      logger.debug(`Invalidated cache key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Failed to invalidate cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  static async clearAll(): Promise<void> {
    try {
      await redisClient.flushdb();
      logger.warn('Cleared entire Redis cache');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate?: number;
  }> {
    try {
      const info = await redisClient.info('stats');
      const dbsize = await redisClient.dbsize();

      // Parse info for hit rate
      const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : undefined;

      const memory = await redisClient.info('memory');
      const memoryUsed = memory.match(/used_memory_human:(.+)/)?.[1]?.trim() || 'unknown';

      return {
        totalKeys: dbsize,
        memoryUsed,
        hitRate
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { totalKeys: 0, memoryUsed: 'unknown' };
    }
  }
}

/**
 * CacheWarmer - Preload cache with frequently accessed data
 */
export class CacheWarmer {
  /**
   * Warm cache with data
   */
  static async warm(
    key: string,
    data: any,
    ttl: number = 3600
  ): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(data));
      logger.info(`Warmed cache key: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Failed to warm cache key ${key}:`, error);
    }
  }

  /**
   * Batch warm multiple keys
   */
  static async batchWarm(
    entries: Array<{ key: string; data: any; ttl?: number }>
  ): Promise<void> {
    try {
      const pipeline = redisClient.pipeline();

      for (const entry of entries) {
        const ttl = entry.ttl || 3600;
        pipeline.setex(entry.key, ttl, JSON.stringify(entry.data));
      }

      await pipeline.exec();
      logger.info(`Batch warmed ${entries.length} cache keys`);
    } catch (error) {
      logger.error('Failed to batch warm cache:', error);
    }
  }
}

/**
 * Example usage in a service:
 *
 * ```typescript
 * import { Cacheable, CacheInvalidator } from '../decorators/Cacheable';
 *
 * class EventService {
 *   // Cache for 1 hour
 *   @Cacheable({ ttl: 3600, namespace: 'events' })
 *   async getEventById(id: string) {
 *     return prisma.event.findUnique({ where: { id } });
 *   }
 *
 *   // Cache for 5 minutes with custom key
 *   @Cacheable({
 *     ttl: 300,
 *     namespace: 'events',
 *     keyGenerator: (status) => status
 *   })
 *   async getEventsByStatus(status: string) {
 *     return prisma.event.findMany({ where: { status } });
 *   }
 *
 *   // Invalidate cache when updating
 *   async updateEvent(id: string, data: any) {
 *     const result = await prisma.event.update({ where: { id }, data });
 *
 *     // Invalidate specific event cache
 *     await CacheInvalidator.invalidatePattern(`events:getEventById:*${id}*`);
 *
 *     // Invalidate list caches
 *     await CacheInvalidator.invalidatePattern(`events:getEventsByStatus:*`);
 *
 *     return result;
 *   }
 * }
 * ```
 */

export default Cacheable;
