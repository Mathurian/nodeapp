/**
 * Rate Limiting Configuration
 *
 * Token bucket algorithm configuration for per-user and per-tenant rate limiting.
 * Implements tiered limits based on tenant subscription plan.
 *
 * Algorithm: Token Bucket
 * - Each user/tenant has a bucket with N tokens
 * - Each request consumes 1 token
 * - Tokens refill at rate R per second
 * - If bucket empty, request rejected with 429
 *
 * Storage: Redis (with in-memory fallback)
 */

/**
 * Rate limit tier definition
 */
export interface RateLimitTier {
  name: string;
  requestsPerHour: number;
  requestsPerMinute: number;
  burstLimit: number;
}

/**
 * Rate limit bucket state
 */
export interface RateLimitBucket {
  tokens: number;
  lastRefill: number; // Unix timestamp in seconds
  resetAt: number; // Unix timestamp in seconds
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  retryAfter?: number; // Seconds until next token available
}

/**
 * Rate limit context
 */
export interface RateLimitContext {
  userId?: string;
  tenantId: string;
  tier: string;
  endpoint?: string;
}

/**
 * Predefined rate limit tiers
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'Free',
    requestsPerHour: 100,
    requestsPerMinute: 10,
    burstLimit: 20,
  },
  standard: {
    name: 'Standard',
    requestsPerHour: 1000,
    requestsPerMinute: 50,
    burstLimit: 100,
  },
  premium: {
    name: 'Premium',
    requestsPerHour: 5000,
    requestsPerMinute: 200,
    burstLimit: 400,
  },
  enterprise: {
    name: 'Enterprise',
    requestsPerHour: 10000,
    requestsPerMinute: 500,
    burstLimit: 1000,
  },
  // Internal/admin tier (very high limits)
  internal: {
    name: 'Internal',
    requestsPerHour: 100000,
    requestsPerMinute: 5000,
    burstLimit: 10000,
  },
};

/**
 * Get rate limit tier configuration
 */
export function getRateLimitTier(tierName: string): RateLimitTier {
  const tier = RATE_LIMIT_TIERS[tierName.toLowerCase()];
  if (!tier) {
    // Default to free tier if unknown
    return RATE_LIMIT_TIERS['free']!;
  }
  return tier;
}

/**
 * Get tenant aggregate limit (10x user limit)
 */
export function getTenantLimit(tier: RateLimitTier): number {
  return tier.requestsPerHour * 10;
}

/**
 * Redis key patterns for rate limiting
 */
export const RATE_LIMIT_KEYS = {
  user: (userId: string, window: 'minute' | 'hour') =>
    `rate_limit:user:${userId}:${window}`,
  tenant: (tenantId: string, window: 'minute' | 'hour') =>
    `rate_limit:tenant:${tenantId}:${window}`,
  prefix: 'rate_limit:',
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  // Enable/disable rate limiting
  enabled: process.env['RATE_LIMIT_ENABLED'] !== 'false',

  // Use Redis for distributed rate limiting
  useRedis: true,

  // Fallback to in-memory if Redis unavailable
  fallbackToMemory: true,

  // In-memory cache size limit
  memoryCacheSize: 10000,

  // In-memory cache TTL (seconds)
  memoryCacheTTL: 3600,

  // Default tier if not specified
  defaultTier: 'free',

  // Skip rate limiting for these paths (health checks, etc.)
  skipPaths: [
    '/health',
    '/healthz',
    '/metrics',
    '/api/health',
  ],

  // Skip rate limiting for authenticated admins (optional)
  skipForAdmins: false,

  // Add rate limit headers to all responses
  includeHeaders: true,

  // Log rate limit events
  logEvents: true,

  // Track metrics for monitoring
  trackMetrics: true,
};

/**
 * Rate limit window configurations
 */
export const RATE_LIMIT_WINDOWS = {
  minute: {
    duration: 60, // seconds
    maxAge: 60, // seconds
  },
  hour: {
    duration: 3600, // seconds
    maxAge: 3600, // seconds
  },
};

/**
 * Endpoint-specific rate limit overrides
 * Some endpoints may have stricter limits
 */
export const ENDPOINT_RATE_LIMITS: Record<string, Partial<RateLimitTier>> = {
  // Authentication endpoints - stricter limits to prevent brute force
  '/api/auth/login': {
    requestsPerHour: 20,
    requestsPerMinute: 5,
    burstLimit: 10,
  },
  '/api/auth/register': {
    requestsPerHour: 10,
    requestsPerMinute: 2,
    burstLimit: 5,
  },
  '/api/auth/reset-password': {
    requestsPerHour: 5,
    requestsPerMinute: 1,
    burstLimit: 3,
  },

  // File upload endpoints - moderate limits
  '/api/files/upload': {
    requestsPerHour: 100,
    requestsPerMinute: 10,
    burstLimit: 20,
  },

  // Report generation - resource intensive
  '/api/reports/generate': {
    requestsPerHour: 50,
    requestsPerMinute: 5,
    burstLimit: 10,
  },
};

/**
 * Get endpoint-specific rate limit if configured
 */
export function getEndpointRateLimit(endpoint: string): Partial<RateLimitTier> | null {
  // Try exact match first
  if (ENDPOINT_RATE_LIMITS[endpoint]) {
    return ENDPOINT_RATE_LIMITS[endpoint];
  }

  // Try prefix match
  for (const [pattern, limits] of Object.entries(ENDPOINT_RATE_LIMITS)) {
    if (endpoint.startsWith(pattern)) {
      return limits;
    }
  }

  return null;
}

/**
 * Calculate tokens to refill based on elapsed time
 */
export function calculateTokenRefill(
  lastRefill: number,
  now: number,
  refillRate: number
): number {
  const elapsedSeconds = Math.max(0, now - lastRefill);
  const tokensToAdd = Math.floor(elapsedSeconds * refillRate);
  return tokensToAdd;
}

/**
 * Calculate refill rate (tokens per second)
 */
export function calculateRefillRate(requestsPerHour: number): number {
  return requestsPerHour / 3600; // tokens per second
}

/**
 * Calculate retry-after seconds
 */
export function calculateRetryAfter(
  currentTokens: number,
  refillRate: number
): number {
  if (currentTokens >= 1) {
    return 0;
  }

  const tokensNeeded = 1 - currentTokens;
  const secondsNeeded = Math.ceil(tokensNeeded / refillRate);
  return secondsNeeded;
}

/**
 * Validate rate limit configuration
 */
export function validateRateLimitConfig(): boolean {
  // Check that all tiers have valid values
  for (const [tierName, tier] of Object.entries(RATE_LIMIT_TIERS)) {
    if (tier.requestsPerHour <= 0 || tier.requestsPerMinute <= 0 || tier.burstLimit <= 0) {
      console.error(`Invalid rate limit configuration for tier: ${tierName}`);
      return false;
    }

    // Ensure consistency: minute limit should be <= hour limit / 60
    const maxPerMinute = tier.requestsPerHour / 60;
    if (tier.requestsPerMinute > maxPerMinute * 2) {
      console.warn(
        `Inconsistent rate limits for tier ${tierName}: ` +
        `${tier.requestsPerMinute}/min may exceed ${tier.requestsPerHour}/hour`
      );
    }
  }

  return true;
}

// Validate on module load
if (!validateRateLimitConfig()) {
  console.warn('Rate limit configuration validation failed');
}
