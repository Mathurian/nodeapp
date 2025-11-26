/**
 * Cache Service - TypeScript Implementation
 * Redis-based caching layer for performance optimization
 */

import Redis from 'ioredis';
import { injectable } from 'tsyringe';
import { createLogger } from '../utils/logger';
import { env } from '../config/env';
// S4-1: Circuit breaker for Redis resilience
import { CircuitBreaker, CircuitBreakerRegistry } from '../utils/circuitBreaker';

const logger = createLogger('CacheService');

@injectable()
export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;
  private hits: number = 0;
  private misses: number = 0;
  // S4-1: Circuit breaker for Redis resilience
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.redis = new Redis({
      host: env.get('REDIS_HOST') || 'localhost',
      port: env.get('REDIS_PORT') || 6379,
      password: env.get('REDIS_PASSWORD'),
      db: env.get('REDIS_DB') || 0,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    // S4-1: Initialize circuit breaker for Redis
    this.circuitBreaker = CircuitBreakerRegistry.get('redis-cache', {
      failureThreshold: 3,      // Open after 3 failures
      successThreshold: 2,      // Close after 2 successes
      timeout: 30000,           // 30s before retry (fast recovery)
      windowSize: 60000,        // 60s sliding window
      volumeThreshold: 10,      // Minimum 10 requests
    });

    // S4-1: Monitor circuit breaker state changes
    this.circuitBreaker.on('stateChange', (newState) => {
      logger.warn('Redis circuit breaker state changed', { newState });
    });

    this.circuitBreaker.on('open', () => {
      logger.error('Redis circuit breaker OPENED - failing fast');
    });

    this.circuitBreaker.on('close', () => {
      logger.info('Redis circuit breaker CLOSED - Redis service recovered');
    });

    this.setupEventHandlers();
    this.connect();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Redis cache connected');
      this.isConnected = true;
      this.isEnabled = true;
    });

    let errorLogged = false;
    this.redis.on('error', (_error: Error) => {
      if (!errorLogged) {
        logger.warn('Redis cache unavailable - continuing without caching');
        errorLogged = true;
      }
      this.isConnected = false;
      this.isEnabled = false;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.isEnabled = false;
    });

    this.redis.on('ready', () => {
      this.isConnected = true;
      this.isEnabled = true;
    });
  }

  /**
   * Connect to Redis
   */
  private async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch (error) {
      logger.warn('Redis connection failed - continuing without caching');
      this.isEnabled = false;
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) {
      this.misses++;
      return null;
    }

    try {
      // S4-1: Execute Redis get through circuit breaker
      const value = await this.circuitBreaker.execute(async () => {
        return await this.redis.get(key);
      });

      if (!value) {
        this.misses++;
        return null;
      }
      this.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      // S4-1: If circuit breaker is open, fail fast (return null for graceful degradation)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        logger.warn('Redis circuit breaker is OPEN - cache unavailable', { key });
        this.misses++;
        return null;
      }

      logger.error(`Cache get error for key "${key}"`, { error });
      this.misses++;
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);

      // S4-1: Execute Redis set through circuit breaker
      await this.circuitBreaker.execute(async () => {
        return await this.redis.setex(key, ttlSeconds, serialized);
      });
    } catch (error) {
      // S4-1: If circuit breaker is open, fail gracefully (no-op)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        logger.warn('Redis circuit breaker is OPEN - cache set skipped', { key });
        return;
      }

      logger.error(`Cache set error for key "${key}"`, { error });
    }
  }

  /**
   * Delete cached value(s)
   */
  async del(key: string | string[]): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // S4-1: Execute Redis del through circuit breaker
      await this.circuitBreaker.execute(async () => {
        if (Array.isArray(key)) {
          if (key.length > 0) {
            return await this.redis.del(...key);
          }
        } else {
          return await this.redis.del(key);
        }
        return 0;
      });
    } catch (error) {
      // S4-1: If circuit breaker is open, fail gracefully (no-op)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        logger.warn('Redis circuit breaker is OPEN - cache delete skipped', { key });
        return;
      }

      logger.error('Cache delete error', { error });
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // S4-1: Execute Redis pattern invalidation through circuit breaker
      await this.circuitBreaker.execute(async () => {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          return await this.redis.del(...keys);
        }
        return 0;
      });
    } catch (error) {
      // S4-1: If circuit breaker is open, fail gracefully (no-op)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Circuit breaker')) {
        logger.warn('Redis circuit breaker is OPEN - pattern invalidation skipped', { pattern });
        return;
      }

      logger.error(`Cache invalidate pattern error for "${pattern}"`, { error });
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key "${key}"`, { error });
      return false;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Cache expire error for key "${key}"`, { error });
    }
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled) {
      return -1;
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key "${key}"`, { error });
      return -1;
    }
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }

  /**
   * Get all cache keys with details
   */
  async getAllKeys(): Promise<Array<{ key: string; ttl: number; size: number }>> {
    if (!this.isEnabled) {
      return [];
    }

    try {
      const keys = await this.redis.keys('*');
      const keysWithDetails = await Promise.all(
        keys.map(async (key) => {
          const ttl = await this.redis.ttl(key);
          const value = await this.redis.get(key);
          const size = value ? Buffer.byteLength(value, 'utf8') : 0;

          return {
            key,
            ttl,
            size,
          };
        })
      );

      return keysWithDetails;
    } catch (error) {
      logger.error('Get all keys error', { error });
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    enabled: boolean;
    keys: number;
    memory: string | number;
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    if (!this.isEnabled) {
      return {
        connected: false,
        enabled: false,
        keys: 0,
        memory: 0,
        hits: this.hits,
        misses: this.misses,
        hitRate: 0,
      };
    }

    try {
      const dbsize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryBytes: number = (memoryMatch ? parseInt(memoryMatch[1] || '0', 10) : 0) || 0;

      const total = this.hits + this.misses;
      const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

      return {
        connected: this.isConnected,
        enabled: this.isEnabled,
        keys: dbsize,
        memory: memoryBytes,
        hits: this.hits,
        misses: this.misses,
        hitRate,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return {
        connected: false,
        enabled: false,
        keys: 0,
        memory: 0,
        hits: this.hits,
        misses: this.misses,
        hitRate: 0,
      };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      logger.error('Cache disconnect error', { error });
    }
  }

  /**
   * Check if cache is enabled and connected
   */
  get enabled(): boolean {
    return this.isEnabled && this.isConnected;
  }
}
