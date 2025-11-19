/**
 * Cache Service - TypeScript Implementation
 * Redis-based caching layer for performance optimization
 */

import Redis from 'ioredis';
import { injectable } from 'tsyringe';

@injectable()
export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      password: process.env['REDIS_PASSWORD'] || undefined,
      db: parseInt(process.env['REDIS_DB'] || '0', 10),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.setupEventHandlers();
    this.connect();
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Redis cache connected');
      this.isConnected = true;
      this.isEnabled = true;
    });

    let errorLogged = false;
    this.redis.on('error', (_error: Error) => {
      if (!errorLogged) {
        console.log('⚠️  Redis cache unavailable - continuing without caching');
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
      console.log('Redis connection failed - continuing without caching');
      this.isEnabled = false;
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error);
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
      await this.redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error);
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
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await this.redis.del(...key);
        }
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
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
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for "${pattern}":`, error);
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
      console.error(`Cache exists error for key "${key}":`, error);
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
      console.error(`Cache expire error for key "${key}":`, error);
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
      console.error(`Cache TTL error for key "${key}":`, error);
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
      console.error('Cache flush error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    enabled: boolean;
    keys: number;
    memory: string;
  }> {
    if (!this.isEnabled) {
      return {
        connected: false,
        enabled: false,
        keys: 0,
        memory: '0',
      };
    }

    try {
      const dbsize = await this.redis.dbsize();
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory: string = (memoryMatch && memoryMatch[1]) || '0';

      return {
        connected: this.isConnected,
        enabled: this.isEnabled,
        keys: dbsize,
        memory,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return {
        connected: false,
        enabled: false,
        keys: 0,
        memory: '0',
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
      console.error('Cache disconnect error:', error);
    }
  }

  /**
   * Check if cache is enabled and connected
   */
  get enabled(): boolean {
    return this.isEnabled && this.isConnected;
  }
}
