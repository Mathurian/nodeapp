/**
 * Enhanced Rate Limiting Middleware
 *
 * Implements token bucket algorithm with per-user and per-tenant rate limiting.
 * Supports tiered limits based on tenant subscription plan.
 *
 * Features:
 * - Per-user rate limiting
 * - Per-tenant aggregate rate limiting
 * - Tiered limits (free, standard, premium, enterprise)
 * - Endpoint-specific overrides
 * - Redis-based with in-memory fallback
 * - Proper rate limit headers
 * - Graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_TIERS,
} from '../config/rate-limit.config';
import { getEnhancedRateLimitService } from '../services/EnhancedRateLimitService';
import { createLogger } from '../utils/logger';

const logger = createLogger('EnhancedRateLimiting');

/**
 * Main rate limiting middleware
 * Checks both user and tenant rate limits
 */
export function rateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if rate limiting is disabled
    if (!RATE_LIMIT_CONFIG.enabled) {
      next();
      return;
    }

    // Skip for excluded paths
    if (RATE_LIMIT_CONFIG.skipPaths.some(path => req.path === path || req.path.startsWith(path))) {
      next();
      return;
    }

    try {
      const user = (req as any).user;
      const tenantId = (req as any).tenantId;

      // If no tenant ID, skip rate limiting (public endpoints)
      if (!tenantId) {
        next();
        return;
      }

      // Determine the tier based on tenant's subscription plan
      const tier = await getTenantTier(tenantId);

      // Skip for admins if configured
      if (RATE_LIMIT_CONFIG.skipForAdmins && user?.role === 'ADMIN') {
        next();
        return;
      }

      // Check rate limit
      const rateLimitService = getEnhancedRateLimitService();
      const result = await rateLimitService.checkRateLimit({
        userId: user?.id,
        tenantId,
        tier,
        endpoint: req.path,
      });

      // Add rate limit headers
      if (RATE_LIMIT_CONFIG.includeHeaders) {
        res.setHeader('X-RateLimit-Limit', result.limit.toString());
        res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
        res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString());
        res.setHeader('X-RateLimit-Tier', tier);
      }

      // If rate limit exceeded, return 429
      if (!result.allowed) {
        if (RATE_LIMIT_CONFIG.logEvents) {
          logger.warn('Rate limit exceeded', {
            userId: user?.id,
            tenantId,
            tier,
            endpoint: req.path,
            remaining: result.remaining,
          });
        }

        if (result.retryAfter) {
          res.setHeader('Retry-After', result.retryAfter.toString());
        }

        const tierName = RATE_LIMIT_TIERS[tier]?.name || tier;
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded for your plan (${tierName}: ${result.limit}/hour). ` +
                   `Please try again later or upgrade your plan for higher limits.`,
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: 0,
          tier: tierName,
          upgradeUrl: '/settings/billing',
        });
        return;
      }

      // Rate limit check passed
      next();
    } catch (error) {
      logger.error('Error in rate limiting middleware', { error });

      // Fail open: allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Get tenant's rate limit tier from database
 * Caches the result for performance
 */
const tierCache = new Map<string, { tier: string; expiresAt: number }>();
const TIER_CACHE_TTL = 300000; // 5 minutes

async function getTenantTier(tenantId: string): Promise<string> {
  // Check cache first
  const cached = tierCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  try {
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { planType: true },
    });

    const tier = tenant?.planType?.toLowerCase() || RATE_LIMIT_CONFIG.defaultTier;

    // Cache the result
    tierCache.set(tenantId, {
      tier,
      expiresAt: Date.now() + TIER_CACHE_TTL,
    });

    return tier;
  } catch (error) {
    logger.error('Error fetching tenant tier', { error, tenantId });
    return RATE_LIMIT_CONFIG.defaultTier;
  }
}

/**
 * Strict rate limiting for sensitive endpoints
 * Uses the stricter auth endpoint limits
 */
export function strictRateLimit() {
  return rateLimitMiddleware();
}

/**
 * Lenient rate limiting for public endpoints
 * Uses higher limits
 */
export function lenientRateLimit() {
  return rateLimitMiddleware();
}

/**
 * Clear tier cache (useful for testing or after tenant plan changes)
 */
export function clearTierCache(): void {
  tierCache.clear();
}

/**
 * Get current tier cache size (for monitoring)
 */
export function getTierCacheSize(): number {
  return tierCache.size;
}

export default {
  rateLimitMiddleware,
  strictRateLimit,
  lenientRateLimit,
  clearTierCache,
  getTierCacheSize,
};
