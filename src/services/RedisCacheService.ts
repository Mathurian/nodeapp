/**
 * Redis Cache Service
 * Comprehensive distributed caching with ioredis and in-memory fallback
 * Supports:
 * - Redis (Docker/Native/Socket)
 * - In-memory cache (when Redis unavailable)
 * - Graceful degradation
 */

import Redis, { RedisOptions } from 'ioredis';
import { getRedisOptions, getRedisConfig, CacheTTL } from '../config/redis.config';

export interface CacheOptions {
  ttl?: number;
  namespace?: string;
  tags?: string[];
}

export interface CacheStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  memoryUsage?: number;
  keyCount?: number;
  mode: 'redis' | 'memory' | 'disabled';
  redisMode?: string;
}

interface CacheEntry {
  value: any;
  expiry: number; // timestamp
  tags?: string[];
}

export class RedisCacheService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;
  private useMemoryFallback: boolean = false;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private config = getRedisConfig();
  private stats: Omit<CacheStatistics, 'hitRate' | 'memoryUsage' | 'keyCount' | 'mode' | 'redisMode'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(options?: RedisOptions) {
    const redisOptions = options || getRedisOptions();

    // Only initialize Redis if enabled
    if (this.config.enabled && this.config.mode !== 'disabled') {
      try {
        this.client = new Redis(redisOptions);
        this.subscriber = new Redis(redisOptions);
        this.setupEventListeners();
      } catch (error) {
        console.error('Failed to initialize Redis client:', error);
        if (this.config.fallbackToMemory) {
          console.warn('Falling back to in-memory cache');
          this.useMemoryFallback = true;
        }
      }
    } else {
      console.log('Redis disabled, using in-memory cache only');
      this.useMemoryFallback = true;
    }

    // Start cleanup interval for in-memory cache
    if (this.useMemoryFallback) {
      this.startMemoryCacheCleanup();
    }
  }

  /**
   * Setup Redis event listeners
   */
  private setupEventListeners(): void {
    if (!this.client || !this.subscriber) return;

    this.client.on('connect', () => {
      console.log(`Redis cache client connected (${this.config.mode} mode)`);
      this.isConnected = true;
      this.useMemoryFallback = false;
    });

    this.client.on('ready', () => {
      console.log('Redis cache client ready');
    });

    this.client.on('error', (error) => {
      console.error('Redis cache client error:', error);
      this.stats.errors++;
      this.isConnected = false;

      // Fall back to memory if configured
      if (this.config.fallbackToMemory && !this.useMemoryFallback) {
        console.warn('Redis connection failed, falling back to in-memory cache');
        this.useMemoryFallback = true;
        this.startMemoryCacheCleanup();
      }
    });

    this.client.on('close', () => {
      console.warn('Redis cache client connection closed');
      this.isConnected = false;

      // Fall back to memory if configured
      if (this.config.fallbackToMemory && !this.useMemoryFallback) {
        console.warn('Redis connection closed, falling back to in-memory cache');
        this.useMemoryFallback = true;
        this.startMemoryCacheCleanup();
      }
    });

    this.client.on('reconnecting', () => {
      console.log('Redis cache client reconnecting...');
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleCacheInvalidation(channel, message);
    });
  }

  /**
   * Check if Redis client is available, fall back to memory if not
   */
  private ensureRedisOrFallback(): boolean {
    if (!this.client && !this.useMemoryFallback) {
      console.warn('Redis client not available, falling back to memory cache');
      this.useMemoryFallback = true;
      this.startMemoryCacheCleanup();
    }
    return this.client !== null && this.isConnected;
  }

  /**
   * Start cleanup interval for expired in-memory cache entries
   */
  private cleanupInterval?: NodeJS.Timeout;

  private startMemoryCacheCleanup(): void {
    // Clear existing interval if any
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMemoryEntries();
    }, 60000);
  }

  /**
   * Remove expired entries from memory cache
   */
  private cleanupExpiredMemoryEntries(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiry < now) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`Cleaned up ${removed} expired entries from memory cache`);
    }
  }

  /**
   * Check if Redis is connected
   */
  public async healthCheck(): Promise<boolean> {
    if (this.useMemoryFallback || !this.client) {
      return true; // In-memory cache is always "healthy"
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get value from cache (Redis or in-memory)
   */
  public async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const fullKey = this.buildKey(key, options?.namespace);

    // Use in-memory cache
    if (this.useMemoryFallback || !this.client) {
      const entry = this.memoryCache.get(fullKey);

      if (!entry) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (entry.expiry < Date.now()) {
        this.memoryCache.delete(fullKey);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value as T;
    }

    // Use Redis
    try {
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value in cache (Redis or in-memory)
   */
  public async set(key: string, value: any, options?: CacheOptions): Promise<boolean> {
    const fullKey = this.buildKey(key, options?.namespace);
    const ttl = options?.ttl || CacheTTL.MEDIUM;

    // Use in-memory cache
    if (this.useMemoryFallback || !this.client) {
      const expiry = Date.now() + (ttl * 1000);
      this.memoryCache.set(fullKey, {
        value,
        expiry,
        tags: options?.tags,
      });
      this.stats.sets++;
      return true;
    }

    // Use Redis
    try {
      const serialized = JSON.stringify(value);
      await this.client.setex(fullKey, ttl, serialized);

      // Store tags for invalidation
      if (options?.tags && options.tags.length > 0) {
        await this.tagKey(fullKey, options.tags);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete value from cache (Redis or in-memory)
   */
  public async delete(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);

    // Use in-memory cache
    if (this.useMemoryFallback || !this.client) {
      const deleted = this.memoryCache.delete(fullKey);
      if (deleted) {
        this.stats.deletes++;
      }
      return deleted;
    }

    // Use Redis
    try {
      const result = await this.client.del(fullKey);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Check in memory cache
        return this.memoryCache.has(fullKey);
      }

      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple values from cache
   */
  public async getMany<T = any>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, namespace));

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Get from memory cache
        return fullKeys.map(fullKey => {
          const entry = this.memoryCache.get(fullKey);
          if (!entry || entry.expiry < Date.now()) {
            this.stats.misses++;
            return null;
          }
          this.stats.hits++;
          return entry.value as T;
        });
      }

      const values = await this.client.mget(...fullKeys);

      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return JSON.parse(value) as T;
      });
    } catch (error) {
      console.error('Cache getMany error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  public async setMany(items: { key: string; value: any; options?: CacheOptions }[]): Promise<boolean> {
    try {
      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        for (const item of items) {
          const fullKey = this.buildKey(item.key, item.options?.namespace);
          const ttl = item.options?.ttl || CacheTTL.MEDIUM;
          this.memoryCache.set(fullKey, {
            value: item.value,
            expiry: Date.now() + (ttl * 1000),
            tags: item.options?.tags
          });
        }
        this.stats.sets += items.length;
        return true;
      }

      const pipeline = this.client.pipeline();

      for (const item of items) {
        const fullKey = this.buildKey(item.key, item.options?.namespace);
        const serialized = JSON.stringify(item.value);
        const ttl = item.options?.ttl || CacheTTL.MEDIUM;

        pipeline.setex(fullKey, ttl, serialized);

        if (item.options?.tags && item.options.tags.length > 0) {
          await this.tagKey(fullKey, item.options.tags);
        }
      }

      await pipeline.exec();
      this.stats.sets += items.length;
      return true;
    } catch (error) {
      console.error('Cache setMany error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  public async deleteMany(keys: string[], namespace?: string): Promise<number> {
    try {
      if (keys.length === 0) return 0;

      const fullKeys = keys.map(key => this.buildKey(key, namespace));

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        let deleted = 0;
        fullKeys.forEach(key => {
          if (this.memoryCache.delete(key)) deleted++;
        });
        this.stats.deletes += deleted;
        return deleted;
      }

      const result = await this.client.del(...fullKeys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('Cache deleteMany error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Delete keys by pattern
   */
  public async deletePattern(pattern: string, namespace?: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache - match pattern manually
        const regex = new RegExp(fullPattern.replace(/\*/g, '.*'));
        let deleted = 0;
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
        this.stats.deletes += deleted;
        return deleted;
      }

      const keys = await this.client.keys(fullPattern);

      if (keys.length === 0) return 0;

      const result = await this.client.del(...keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('Cache deletePattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Clear entire cache (use with caution!)
   */
  public async clear(): Promise<boolean> {
    try {
      if (!this.ensureRedisOrFallback() || !this.client) {
        // Clear memory cache
        this.memoryCache.clear();
        return true;
      }

      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  public async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - generate value
    const value = await factory();

    // Store in cache (fire and forget to avoid blocking)
    this.set(key, value, options).catch(error => {
      console.error('Cache set error in getOrSet:', error);
    });

    return value;
  }

  /**
   * Increment counter
   */
  public async increment(key: string, amount: number = 1, namespace?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        const entry = this.memoryCache.get(fullKey);
        const current = entry && typeof entry.value === 'number' ? entry.value : 0;
        const newValue = current + amount;
        this.memoryCache.set(fullKey, {
          value: newValue,
          expiry: Date.now() + (CacheTTL.LONG * 1000)
        });
        return newValue;
      }

      return await this.client.incrby(fullKey, amount);
    } catch (error) {
      console.error(`Cache increment error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  public async decrement(key: string, amount: number = 1, namespace?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        const entry = this.memoryCache.get(fullKey);
        const current = entry && typeof entry.value === 'number' ? entry.value : 0;
        const newValue = current - amount;
        this.memoryCache.set(fullKey, {
          value: newValue,
          expiry: Date.now() + (CacheTTL.LONG * 1000)
        });
        return newValue;
      }

      return await this.client.decrby(fullKey, amount);
    } catch (error) {
      console.error(`Cache decrement error for key ${key}:`, error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Set expiration on existing key
   */
  public async expire(key: string, ttl: number, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        const entry = this.memoryCache.get(fullKey);
        if (entry) {
          entry.expiry = Date.now() + (ttl * 1000);
          return true;
        }
        return false;
      }

      const result = await this.client.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  public async ttl(key: string, namespace?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, namespace);

      if (!this.ensureRedisOrFallback() || !this.client) {
        // Use memory cache
        const entry = this.memoryCache.get(fullKey);
        if (!entry) return -2; // Key doesn't exist
        const ttl = Math.floor((entry.expiry - Date.now()) / 1000);
        return ttl > 0 ? ttl : -1; // -1 means no expiry
      }

      return await this.client.ttl(fullKey);
    } catch (error) {
      console.error(`Cache ttl error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Tag a key for group invalidation
   */
  private async tagKey(key: string, tags: string[]): Promise<void> {
    try {
      if (!this.ensureRedisOrFallback() || !this.client) {
        // Tags not supported in memory cache
        return;
      }

      const pipeline = this.client.pipeline();

      for (const tag of tags) {
        const tagKey = this.buildKey(`tag:${tag}`, undefined);
        pipeline.sadd(tagKey, key);
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Cache tagKey error:', error);
    }
  }

  /**
   * Invalidate all keys with specific tag
   */
  public async invalidateTag(tag: string): Promise<number> {
    try {
      if (!this.ensureRedisOrFallback() || !this.client) {
        // Find all keys with this tag in memory cache
        let deleted = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
          if (entry.tags && entry.tags.includes(tag)) {
            this.memoryCache.delete(key);
            deleted++;
          }
        }
        this.stats.deletes += deleted;
        return deleted;
      }

      const tagKey = this.buildKey(`tag:${tag}`, undefined);
      const keys = await this.client.smembers(tagKey);

      if (keys.length === 0) return 0;

      // Delete all tagged keys
      const pipeline = this.client.pipeline();
      keys.forEach(key => pipeline.del(key));
      pipeline.del(tagKey); // Delete the tag set itself

      const results = await pipeline.exec();
      const deletedCount = results?.filter(([err, result]) => !err && result === 1).length || 0;

      this.stats.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      console.error('Cache invalidateTag error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Subscribe to cache invalidation events
   */
  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    try {
      if (!this.subscriber) {
        console.warn('Redis subscriber not available, cannot subscribe');
        return;
      }

      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(msg);
        }
      });
    } catch (error) {
      console.error('Cache subscribe error:', error);
    }
  }

  /**
   * Publish cache invalidation event
   */
  public async publish(channel: string, message: string): Promise<void> {
    try {
      if (!this.client) {
        console.warn('Redis client not available, cannot publish');
        return;
      }

      await this.client.publish(channel, message);
    } catch (error) {
      console.error('Cache publish error:', error);
    }
  }

  /**
   * Handle cache invalidation messages
   */
  private handleCacheInvalidation(_channel: string, message: string): void {
    try {
      const data = JSON.parse(message);
      if (data.pattern) {
        this.deletePattern(data.pattern).catch(console.error);
      } else if (data.keys) {
        this.deleteMany(data.keys).catch(console.error);
      }
    } catch (error) {
      console.error('Error handling cache invalidation:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getStatistics(): Promise<CacheStatistics> {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    let memoryUsage: number | undefined;
    let keyCount: number | undefined;
    let mode: 'redis' | 'memory' | 'disabled' = 'disabled';

    // In-memory cache statistics
    if (this.useMemoryFallback || !this.client) {
      mode = 'memory';
      keyCount = this.memoryCache.size;

      // Rough estimate of memory usage (not exact)
      let estimatedMemory = 0;
      for (const [key, entry] of this.memoryCache.entries()) {
        estimatedMemory += key.length * 2; // 2 bytes per char
        estimatedMemory += JSON.stringify(entry.value).length * 2;
        estimatedMemory += 16; // overhead
      }
      memoryUsage = estimatedMemory;
    } else {
      // Redis statistics
      mode = 'redis';
      try {
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        if (memoryMatch) {
          memoryUsage = parseInt(memoryMatch[1], 10);
        }

        keyCount = await this.client.dbsize();
      } catch (error) {
        console.error('Error fetching cache statistics:', error);
      }
    }

    return {
      ...this.stats,
      hitRate: parseFloat(hitRate.toFixed(2)),
      memoryUsage,
      keyCount,
      mode,
      redisMode: this.config.mode,
    };
  }

  /**
   * Reset statistics
   */
  public resetStatistics(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string, namespace?: string): string {
    if (namespace) {
      return `${namespace}:${key}`;
    }
    return key;
  }

  /**
   * Close Redis connections
   */
  public async disconnect(): Promise<void> {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear in-memory cache
    if (this.useMemoryFallback) {
      this.memoryCache.clear();
    }

    // Close Redis connections if active
    if (this.client) {
      try {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis cache client closed');
      } catch (error) {
        console.error('Error disconnecting Redis cache client:', error);
      }
    }

    if (this.subscriber) {
      try {
        await this.subscriber.quit();
        console.log('Redis cache subscriber closed');
      } catch (error) {
        console.error('Error disconnecting Redis cache subscriber:', error);
      }
    }
  }

  /**
   * Get Redis client (for advanced operations)
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Check if using in-memory fallback
   */
  public isUsingMemoryCache(): boolean {
    return this.useMemoryFallback;
  }

  /**
   * Get cache mode information
   */
  public getCacheMode(): { mode: 'redis' | 'memory' | 'disabled'; redisMode?: string } {
    if (this.useMemoryFallback || !this.client) {
      return { mode: 'memory' };
    }
    return { mode: 'redis', redisMode: this.config.mode };
  }
}

// Singleton instance
let cacheServiceInstance: RedisCacheService | null = null;

/**
 * Get singleton cache service instance
 */
export const getCacheService = (): RedisCacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new RedisCacheService();
  }
  return cacheServiceInstance;
};

export default RedisCacheService;
