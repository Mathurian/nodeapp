/**
 * Enhanced Rate Limiting Service
 * Provides per-user, per-endpoint, and configurable rate limiting
 * Uses Redis for distributed rate limiting across multiple instances
 */

import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { createLogger } from '../utils/logger';

export interface RateLimitConfig {
  tier: string;
  points: number;
  duration: number; // in seconds
  blockDuration: number; // in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

@injectable()
export class RateLimitService {
  private configCache: Map<string, RateLimitConfig> = new Map();
  private redis: Redis | null = null;
  private redisEnabled: boolean = false;
  private redisUnavailableLogged: boolean = false; // Track if we've already logged Redis unavailability
  private log = createLogger('rate-limit');

  constructor(
    @inject('PrismaClient') private _prisma: PrismaClient
  ) {
    this.initializeRedis();
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize Redis connection for distributed rate limiting
   */
  private initializeRedis(): void {
    try {
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
      const redisPassword = process.env.REDIS_PASSWORD || undefined;
      const redisDb = parseInt(process.env.REDIS_DB || '1', 10); // Use DB 1 for rate limiting

      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.redisEnabled = true;
        this.redisUnavailableLogged = false; // Reset flag when Redis connects
        this.log.info('Redis connected for rate limiting');
      });

      this.redis.on('error', (error: Error) => {
        this.redisEnabled = false;
        // Only log once to avoid log spam
        if (!this.redisUnavailableLogged) {
          this.log.warn('Redis unavailable for rate limiting, falling back to memory:', error.message);
          this.redisUnavailableLogged = true;
        }
      });

      this.redis.on('close', () => {
        this.redisEnabled = false;
      });

      // Attempt connection
      this.redis.connect().catch(() => {
        // Only log once to avoid log spam
        if (!this.redisUnavailableLogged) {
          this.log.warn('Redis connection failed, using in-memory rate limiting');
          this.redisUnavailableLogged = true;
        }
      });
    } catch (error: any) {
      // Only log once to avoid log spam
      if (!this.redisUnavailableLogged) {
        this.log.warn('Redis initialization failed, using in-memory rate limiting:', error.message);
        this.redisUnavailableLogged = true;
      }
      this.redisEnabled = false;
    }
  }

  /**
   * Initialize default rate limit configurations
   */
  private async initializeDefaultConfigs(): Promise<void> {
    const defaults: RateLimitConfig[] = [
      { tier: 'public', points: 100, duration: 60, blockDuration: 300 },
      { tier: 'authenticated', points: 500, duration: 60, blockDuration: 300 },
      { tier: 'judge', points: 1000, duration: 60, blockDuration: 60 },
      { tier: 'admin', points: 5000, duration: 60, blockDuration: 0 },
    ];

    for (const config of defaults) {
      if (!this.configCache.has(config.tier)) {
        this.configCache.set(config.tier, config);
      }
    }
  }

  /**
   * Get rate limit configuration for a tier
   */
  async getConfig(tier: string): Promise<RateLimitConfig> {
    // Check cache first
    if (this.configCache.has(tier)) {
      return this.configCache.get(tier)!;
    }

    // Return default if not found
    return this.configCache.get('public') || defaults[0];
  }

  /**
   * Update rate limit configuration
   */
  async updateConfig(tier: string, updates: Partial<RateLimitConfig>): Promise<RateLimitConfig> {
    const current = await this.getConfig(tier);
    const updated = { ...current, ...updates };
    this.configCache.set(tier, updated);
    
    this.log.info(`Rate limit config updated for tier: ${tier}`, updated);
    return updated;
  }

  /**
   * Get all rate limit configurations
   */
  async getAllConfigs(): Promise<RateLimitConfig[]> {
    return Array.from(this.configCache.values());
  }

  /**
   * Create rate limiter middleware for a specific tier
   */
  createLimiter(tier: string, customConfig?: Partial<RateLimitConfig>) {
    return async (_req: Request): Promise<RateLimitConfig> => {
      const config = customConfig 
        ? { ...await this.getConfig(tier), ...customConfig }
        : await this.getConfig(tier);
      return config;
    };
  }

  /**
   * Get rate limit tier based on user role
   */
  getTierFromRequest(req: Request): string {
    const user = (req as any).user;
    
    if (!user) {
      return 'public';
    }

    const role = user.role?.toLowerCase() || 'authenticated';
    
    // Map roles to tiers
    const roleTierMap: Record<string, string> = {
      'admin': 'admin',
      'organizer': 'admin',
      'judge': 'judge',
      'board': 'admin',
      'tally_master': 'admin',
      'auditor': 'admin',
      'emcee': 'authenticated',
      'contestant': 'authenticated',
    };

    return roleTierMap[role] || 'authenticated';
  }

  /**
   * Create Redis store for rate limiting
   * Compatible with express-rate-limit v7 store interface
   */
  private createRedisStore(windowMs: number) {
    if (!this.redis || !this.redisEnabled) {
      return undefined; // Fall back to memory store
    }

    const windowSeconds = Math.ceil(windowMs / 1000);
    const redis = this.redis;
    // Log created but unused: const log = this.log;

    // Custom Redis store adapter for express-rate-limit v7
    return {
      async increment(key: string): Promise<{ totalHits: number; resetTime: Date | undefined }> {
        try {
          const exists = await redis.exists(key);
          const current = await redis.incr(key);
          
          if (exists === 0) {
            // First time this key is used, set expiration
            await redis.expire(key, windowSeconds);
          }

          const ttl = await redis.ttl(key);
          const resetTime = ttl > 0 
            ? new Date(Date.now() + ttl * 1000)
            : new Date(Date.now() + windowMs);

          return { totalHits: current, resetTime };
        } catch (error) {
          // Silently fall back - Redis errors are already logged during initialization
          // Fall back to allowing the request if Redis fails
          return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
        }
      },
      async decrement(key: string): Promise<void> {
        try {
          const current = await redis.get(key);
          if (current && parseInt(current, 10) > 0) {
            await redis.decr(key);
          }
        } catch (error) {
          // Silently fall back - Redis errors are already logged during initialization
        }
      },
      async resetKey(key: string): Promise<void> {
        try {
          await redis.del(key);
        } catch (error) {
          // Silently fall back - Redis errors are already logged during initialization
        }
      },
      async shutdown(): Promise<void> {
        // Redis connection is managed by the service
        // Don't close here as it's shared
      },
    };
  }

  /**
   * Create endpoint-specific rate limiter with Redis support
   */
  createEndpointLimiter(endpoint: string, config: Partial<RateLimitConfig>) {
    const windowMs = (config.duration || 60) * 1000;
    const redisStore = this.createRedisStore(windowMs);
    const limiterConfig: any = {
      windowMs,
      max: config.points || 100,
      standardHeaders: true,
      legacyHeaders: false,
      trustProxy: true,
      store: redisStore,
      skip: (req: Request): boolean => {
        // Skip for health checks
        return req.path === '/health' || req.path === '/api/health';
      },
      handler: (_req: Request, res: any) => {
        const resetAt = new Date(Date.now() + (config.duration || 60) * 1000);
        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests to ${endpoint}. Please try again later.`,
          retryAfter: resetAt.toISOString(),
        });
      },
    };

    return rateLimit(limiterConfig);
  }

  /**
   * Create per-user rate limiter with Redis support
   */
  createUserLimiter(userId: string, config: Partial<RateLimitConfig>) {
    const windowMs = (config.duration || 60) * 1000;
    const redisStore = this.createRedisStore(windowMs);
    return rateLimit({
      windowMs,
      max: config.points || 100,
      keyGenerator: () => `user:${userId}`,
      store: redisStore,
      standardHeaders: true,
      legacyHeaders: false,
      ...({ trustProxy: true } as any),
    });
  }

  /**
   * Check if Redis is available for rate limiting
   */
  isRedisAvailable(): boolean {
    return this.redisEnabled && this.redis !== null && this.redis.status === 'ready';
  }
}

const defaults: RateLimitConfig[] = [
  { tier: 'public', points: 100, duration: 60, blockDuration: 300 },
  { tier: 'authenticated', points: 500, duration: 60, blockDuration: 300 },
  { tier: 'judge', points: 1000, duration: 60, blockDuration: 60 },
  { tier: 'admin', points: 5000, duration: 60, blockDuration: 0 },
];

export default RateLimitService;

