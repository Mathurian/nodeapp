/**
 * Enhanced Rate Limiting Service with Database Integration
 *
 * Implements token bucket algorithm with database-backed configuration.
 * Supports per-user, per-tenant, and per-endpoint rate limiting.
 * Uses Redis for distributed rate limiting with in-memory fallback.
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient, RateLimitConfig } from '@prisma/client';
import { Redis } from 'ioredis';
import {
  RateLimitContext,
  RateLimitResult,
  RateLimitBucket,
  RATE_LIMIT_KEYS,
  RATE_LIMIT_CONFIG,
  calculateTokenRefill,
  calculateRefillRate,
  calculateRetryAfter,
} from '../config/rate-limit.config';
import { createLogger } from '../utils/logger';

const logger = createLogger('EnhancedRateLimitService');

/**
 * In-memory cache for rate limit configurations
 */
interface ConfigCacheEntry {
  config: RateLimitConfig;
  expiresAt: number;
}

/**
 * In-memory cache for rate limit buckets (fallback when Redis unavailable)
 */
interface BucketCacheEntry {
  bucket: RateLimitBucket;
  expiresAt: number;
}

@injectable()
export class EnhancedRateLimitService {
  private configCache: Map<string, ConfigCacheEntry> = new Map();
  private bucketCache: Map<string, BucketCacheEntry> = new Map();
  private redisAvailable: boolean = false;
  private configCacheTTL: number = 300000; // 5 minutes
  private bucketCacheTTL: number = 3600000; // 1 hour

  private metrics = {
    allowed: 0,
    denied: 0,
    redisHits: 0,
    redisMisses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    dbQueries: 0,
  };

  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('RedisClient') private redis: Redis | null
  ) {
    // Check Redis availability
    if (this.redis) {
      this.checkRedisConnection();
    }

    // Cleanup expired cache entries periodically
    setInterval(() => this.cleanupCache(), 60000); // Every minute
  }

  /**
   * Check Redis connection status
   */
  private async checkRedisConnection(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.ping();
        this.redisAvailable = true;
        logger.info('Redis connection verified for rate limiting');
      }
    } catch (error) {
      this.redisAvailable = false;
      logger.warn('Redis unavailable, using in-memory rate limiting fallback');
    }
  }

  /**
   * Get rate limit configuration for a context
   * Uses database with caching
   */
  async getConfig(context: RateLimitContext): Promise<RateLimitConfig | null> {
    const cacheKey = this.getConfigCacheKey(context);

    // Check cache first
    const cached = this.configCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.metrics.cacheHits++;
      return cached.config;
    }

    this.metrics.cacheMisses++;
    this.metrics.dbQueries++;

    // Query database for matching configs
    const configs = await this.prisma.rateLimitConfig.findMany({
      where: {
        enabled: true,
        OR: [
          // User-specific for this endpoint (most specific)
          {
            tenantId: context.tenantId,
            userId: context.userId || null,
            endpoint: context.endpoint || null,
          },
          // Tenant-specific for this endpoint
          {
            tenantId: context.tenantId,
            userId: null,
            endpoint: context.endpoint || null,
          },
          // User-specific general
          {
            tenantId: context.tenantId,
            userId: context.userId || null,
            endpoint: null,
          },
          // Tenant-specific general (by tier)
          {
            tenantId: context.tenantId,
            userId: null,
            endpoint: null,
          },
          // Global endpoint override
          {
            tenantId: null,
            userId: null,
            endpoint: context.endpoint || null,
          },
          // Global tier default
          {
            tenantId: null,
            userId: null,
            endpoint: null,
            tier: context.tier,
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 1, // Only need the highest priority match
    });

    const config = configs[0] || null;

    if (config) {
      // Cache the result
      this.configCache.set(cacheKey, {
        config,
        expiresAt: Date.now() + this.configCacheTTL,
      });
    }

    return config;
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkRateLimit(context: RateLimitContext): Promise<RateLimitResult> {
    if (!RATE_LIMIT_CONFIG.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        limit: Infinity,
        resetAt: new Date(Date.now() + 3600000),
      };
    }

    try {
      // Get the effective configuration
      const config = await this.getConfig(context);

      if (!config) {
        logger.warn('No rate limit config found for context', context);
        // Allow request if no config found (fail open)
        return {
          allowed: true,
          remaining: 0,
          limit: 0,
          resetAt: new Date(Date.now() + 3600000),
        };
      }

      // Check both minute and hour limits
      const minuteResult = await this.checkLimit(
        RATE_LIMIT_KEYS.user(context.userId || context.tenantId, 'minute'),
        config.requestsPerMinute,
        config.burstLimit,
        calculateRefillRate(config.requestsPerMinute * 60) // Convert to hourly rate for consistency
      );

      if (!minuteResult.allowed) {
        this.metrics.denied++;
        return minuteResult;
      }

      const hourResult = await this.checkLimit(
        RATE_LIMIT_KEYS.user(context.userId || context.tenantId, 'hour'),
        config.requestsPerHour,
        config.burstLimit,
        calculateRefillRate(config.requestsPerHour)
      );

      if (!hourResult.allowed) {
        this.metrics.denied++;
        return hourResult;
      }

      // Check tenant aggregate limit (10x individual limit)
      const tenantLimit = config.requestsPerHour * 10;
      const tenantResult = await this.checkLimit(
        RATE_LIMIT_KEYS.tenant(context.tenantId, 'hour'),
        tenantLimit,
        Math.floor(tenantLimit / 10),
        calculateRefillRate(tenantLimit)
      );

      if (!tenantResult.allowed) {
        this.metrics.denied++;
        return {
          ...tenantResult,
          // Add context that it's a tenant limit
        };
      }

      // All checks passed
      this.metrics.allowed++;

      // Return the most restrictive limit
      const result = hourResult.remaining < minuteResult.remaining ? hourResult : minuteResult;

      if (RATE_LIMIT_CONFIG.logEvents) {
        logger.debug('Rate limit check passed', {
          userId: context.userId,
          tenantId: context.tenantId,
          endpoint: context.endpoint,
          remaining: result.remaining,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error checking rate limit', { error, context });

      // Fail open: allow request if rate limiting fails
      return {
        allowed: true,
        remaining: 0,
        limit: 0,
        resetAt: new Date(),
      };
    }
  }

  /**
   * Check a specific rate limit using token bucket algorithm
   */
  private async checkLimit(
    key: string,
    limit: number,
    burstLimit: number,
    refillRate: number
  ): Promise<RateLimitResult> {
    // Try Redis first
    if (this.redisAvailable && this.redis) {
      try {
        const result = await this.checkLimitRedis(key, limit, burstLimit, refillRate);
        this.metrics.redisHits++;
        return result;
      } catch (error) {
        logger.warn('Redis rate limit check failed, falling back to memory', { error });
        this.metrics.redisMisses++;
        this.redisAvailable = false;
      }
    }

    // Fallback to in-memory
    return this.checkLimitMemory(key, limit, burstLimit, refillRate);
  }

  /**
   * Check rate limit using Redis (token bucket algorithm)
   */
  private async checkLimitRedis(
    key: string,
    limit: number,
    burstLimit: number,
    refillRate: number
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      throw new Error('Redis not available');
    }

    const now = Math.floor(Date.now() / 1000);
    const windowDuration = 3600; // 1 hour

    // Get current bucket state
    const bucketData = await this.redis.hgetall(key);
    let bucket: RateLimitBucket;

    if (!bucketData || !bucketData['tokens']) {
      // Initialize new bucket
      bucket = {
        tokens: burstLimit,
        lastRefill: now,
        resetAt: now + windowDuration,
      };
    } else {
      bucket = {
        tokens: parseFloat(bucketData['tokens'] || '0'),
        lastRefill: parseInt(bucketData['lastRefill'] || '0', 10),
        resetAt: parseInt(bucketData['resetAt'] || '0', 10),
      };

      // Check if window expired
      if (bucket.resetAt < now) {
        bucket = {
          tokens: burstLimit,
          lastRefill: now,
          resetAt: now + windowDuration,
        };
      } else {
        // Refill tokens based on elapsed time
        const tokensToAdd = calculateTokenRefill(bucket.lastRefill, now, refillRate);
        bucket.tokens = Math.min(burstLimit, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }

    // Try to consume one token
    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;

      // Update Redis
      await this.redis
        .multi()
        .hset(key, 'tokens', bucket.tokens.toString())
        .hset(key, 'lastRefill', bucket.lastRefill.toString())
        .hset(key, 'resetAt', bucket.resetAt.toString())
        .expire(key, windowDuration)
        .exec();
    }

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      limit,
      resetAt: new Date(bucket.resetAt * 1000),
      retryAfter: allowed ? undefined : calculateRetryAfter(bucket.tokens, refillRate),
    };
  }

  /**
   * Check rate limit using in-memory cache (token bucket algorithm)
   */
  private checkLimitMemory(
    key: string,
    limit: number,
    burstLimit: number,
    refillRate: number
  ): RateLimitResult {
    const now = Math.floor(Date.now() / 1000);
    const windowDuration = 3600;

    let bucketEntry = this.bucketCache.get(key);
    let bucket: RateLimitBucket;

    if (!bucketEntry || bucketEntry.expiresAt < Date.now()) {
      // Initialize new bucket
      bucket = {
        tokens: burstLimit,
        lastRefill: now,
        resetAt: now + windowDuration,
      };
    } else {
      bucket = bucketEntry.bucket;

      // Check if window expired
      if (bucket.resetAt < now) {
        bucket = {
          tokens: burstLimit,
          lastRefill: now,
          resetAt: now + windowDuration,
        };
      } else {
        // Refill tokens based on elapsed time
        const tokensToAdd = calculateTokenRefill(bucket.lastRefill, now, refillRate);
        bucket.tokens = Math.min(burstLimit, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
      }
    }

    // Try to consume one token
    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    // Save bucket state
    this.bucketCache.set(key, {
      bucket,
      expiresAt: Date.now() + this.bucketCacheTTL,
    });

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      limit,
      resetAt: new Date(bucket.resetAt * 1000),
      retryAfter: allowed ? undefined : calculateRetryAfter(bucket.tokens, refillRate),
    };
  }

  /**
   * Reset rate limit for a user
   */
  async resetUserLimit(userId: string): Promise<void> {
    const keys = [
      RATE_LIMIT_KEYS.user(userId, 'minute'),
      RATE_LIMIT_KEYS.user(userId, 'hour'),
    ];

    if (this.redis) {
      await this.redis.del(...keys);
    }

    keys.forEach(key => this.bucketCache.delete(key));

    logger.info('Rate limit reset for user', { userId });
  }

  /**
   * Reset rate limit for a tenant
   */
  async resetTenantLimit(tenantId: string): Promise<void> {
    const keys = [
      RATE_LIMIT_KEYS.tenant(tenantId, 'minute'),
      RATE_LIMIT_KEYS.tenant(tenantId, 'hour'),
    ];

    if (this.redis) {
      await this.redis.del(...keys);
    }

    keys.forEach(key => this.bucketCache.delete(key));

    logger.info('Rate limit reset for tenant', { tenantId });
  }

  /**
   * Clear configuration cache
   */
  clearConfigCache(): void {
    this.configCache.clear();
    logger.info('Rate limit configuration cache cleared');
  }

  /**
   * Generate cache key for configuration
   */
  private getConfigCacheKey(context: RateLimitContext): string {
    return `config:${context.tenantId}:${context.userId || 'null'}:${context.endpoint || 'null'}:${context.tier}`;
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    // Cleanup config cache
    for (const [key, entry] of this.configCache.entries()) {
      if (entry.expiresAt < now) {
        this.configCache.delete(key);
        cleaned++;
      }
    }

    // Cleanup bucket cache
    for (const [key, entry] of this.bucketCache.entries()) {
      if (entry.expiresAt < now) {
        this.bucketCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit cache entries`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      configCacheSize: this.configCache.size,
      bucketCacheSize: this.bucketCache.size,
      redisAvailable: this.redisAvailable,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      allowed: 0,
      denied: 0,
      redisHits: 0,
      redisMisses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dbQueries: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check database
      await this.prisma.$queryRaw`SELECT 1`;

      // Check Redis if available
      if (this.redis) {
        await this.redis.ping();
        this.redisAvailable = true;
      }

      return true;
    } catch (error) {
      logger.error('Rate limit service health check failed', { error });
      return false;
    }
  }
}

/**
 * Get or create singleton instance
 */
let serviceInstance: EnhancedRateLimitService | undefined;

export function getEnhancedRateLimitService(): EnhancedRateLimitService {
  if (!serviceInstance) {
    const { container } = require('tsyringe');
    serviceInstance = container.resolve(EnhancedRateLimitService);
  }
  return serviceInstance!;
}
