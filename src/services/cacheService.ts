import Redis from 'ioredis';

/**
 * CacheService - Redis-based caching layer for performance optimization
 * Provides key-value storage with TTL support
 */
class CacheService {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize Redis connection
   */
  initialize(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis cache connected');
        this.enabled = true;
      });

      let errorLogged = false;
      
      this.redis.on('error', (error: Error) => {
        if (!errorLogged) {
          console.log('⚠️  Redis cache unavailable - continuing without caching');
          errorLogged = true;
        }
        this.enabled = false;
      });

      this.redis.on('close', () => {
        this.enabled = false;
      });

      // Attempt connection silently
      this.redis.connect().catch(() => {
        if (!errorLogged) {
          console.log('⚠️  Redis cache unavailable - continuing without caching');
          errorLogged = true;
        }
        this.enabled = false;
      });
    } catch (error: any) {
      console.warn('⚠️  Redis initialization failed (will continue without caching):', error.message);
      this.enabled = false;
    }
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (default: 300)
   */
  async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Alias for delete (for compatibility)
   */
  async del(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern - Key pattern (e.g., 'user:*')
   */
  async deletePattern(pattern: string): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache deletePattern error:', error);
      return false;
    }
  }

  /**
   * Alias for deletePattern (for compatibility)
   */
  async invalidatePattern(pattern: string): Promise<boolean> {
    return this.deletePattern(pattern);
  }

  /**
   * Remember pattern - Get from cache or execute callback and cache result
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   * @param callback - Function to execute if cache miss
   * @returns Promise<any>
   */
  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - execute callback
    const value = await callback();
    
    // Store in cache
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<boolean> {
    if (!this.enabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns Promise<Object>
   */
  async getStats(): Promise<any> {
    if (!this.enabled || !this.redis) {
      return {
        enabled: false,
        hits: 0,
        misses: 0,
        keys: 0,
        memory: '0'
      };
    }

    try {
      const info = await this.redis.info('stats');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse Redis INFO output
      const stats: any = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      // Get database size
      const dbSize = await this.redis.dbsize();

      return {
        enabled: true,
        hits: parseInt(stats.keyspace_hits || '0'),
        misses: parseInt(stats.keyspace_misses || '0'),
        keys: dbSize,
        hitRate: stats.keyspace_hits && stats.keyspace_misses 
          ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%'
          : '0%',
        memory: stats.used_memory_human || '0'
      };
    } catch (error: any) {
      console.error('Cache stats error:', error);
      return {
        enabled: false,
        error: error.message
      };
    }
  }

  /**
   * Check if cache is enabled and connected
   */
  isEnabled(): boolean {
    return this.enabled && this.redis !== null && this.redis.status === 'ready';
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export singleton instance
export default new CacheService();
export { CacheService };

