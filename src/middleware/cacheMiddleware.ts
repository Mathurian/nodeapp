/**
 * HTTP Cache Middleware
 * Middleware for caching HTTP responses with Redis
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getCacheService } from '../services/RedisCacheService';
import { CacheTTL } from '../config/redis.config';

export interface CacheMiddlewareOptions {
  ttl?: number;
  namespace?: string;
  varyBy?: string[];  // Request properties to include in cache key (e.g., ['user.id', 'query.page'])
  condition?: (req: Request) => boolean;  // Condition to determine if response should be cached
  keyGenerator?: (req: Request) => string;  // Custom cache key generator
}

/**
 * Create HTTP cache middleware
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const cacheService = getCacheService();
  const ttl = options.ttl || CacheTTL.MEDIUM;
  const namespace = options.namespace || 'http';

  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      next();
      return;
    }

    // Check condition if provided
    if (options.condition && !options.condition(req)) {
      next();
      return;
    }

    try {
      // Generate cache key
      const cacheKey = options.keyGenerator
        ? options.keyGenerator(req)
        : generateCacheKey(req, options.varyBy);

      // Try to get from cache
      const cachedResponse = await cacheService.get<CachedResponse>(cacheKey, {
        namespace,
      });

      if (cachedResponse) {
        // Cache hit - send cached response
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);

        // Set original headers
        if (cachedResponse.headers) {
          Object.entries(cachedResponse.headers).forEach(([key, value]) => {
            res.setHeader(key, value as string);
          });
        }

        res.status(cachedResponse.status).json(cachedResponse.body);
        return;
      }

      // Cache miss - proceed with request
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function (body: any): Response {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cachedResponse: CachedResponse = {
            status: res.statusCode,
            body,
            headers: extractRelevantHeaders(res),
            cachedAt: new Date().toISOString(),
          };

          // Cache asynchronously (don't block response)
          cacheService.set(cacheKey, cachedResponse, {
            namespace,
            ttl,
            tags: extractCacheTags(req),
          }).catch(error => {
            console.error('Error caching response:', error);
          });
        }

        // Call original json method
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // On error, proceed without caching
      next();
    }
  };
};

/**
 * Conditional cache middleware - only cache if condition is true
 */
export const cacheIf = (
  condition: (req: Request) => boolean,
  options: Omit<CacheMiddlewareOptions, 'condition'> = {}
) => {
  return cacheMiddleware({
    ...options,
    condition,
  });
};

/**
 * Cache middleware for authenticated requests
 */
export const cacheAuthenticated = (options: Omit<CacheMiddlewareOptions, 'varyBy'> = {}) => {
  return cacheMiddleware({
    ...options,
    varyBy: ['user.id', 'user.role'],
    condition: (req: Request) => {
      return !!req.user;
    },
  });
};

/**
 * Cache middleware with pagination
 */
export const cachePaginated = (options: CacheMiddlewareOptions = {}) => {
  return cacheMiddleware({
    ...options,
    varyBy: ['query.page', 'query.limit', 'query.sort', ...(options.varyBy || [])],
  });
};

/**
 * Cache invalidation middleware
 */
export const invalidateCache = (patterns: string | string[], namespace?: string) => {
  const cacheService = getCacheService();

  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function (body: any): Response {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];

        // Invalidate asynchronously (don't block response)
        Promise.all(
          patternArray.map(pattern => cacheService.deletePattern(pattern, namespace))
        ).catch(error => {
          console.error('Error invalidating cache:', error);
        });
      }

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

/**
 * Cache invalidation by tags
 */
export const invalidateCacheTag = (tag: string | string[]) => {
  const cacheService = getCacheService();

  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function (body: any): Response {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const tags = Array.isArray(tag) ? tag : [tag];

        // Invalidate asynchronously (don't block response)
        Promise.all(
          tags.map(t => cacheService.invalidateTag(t))
        ).catch(error => {
          console.error('Error invalidating cache tags:', error);
        });
      }

      // Call original json method
      return originalJson(body);
    };

    next();
  };
};

/**
 * No-cache middleware - bypass cache for this request
 */
export const noCache = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// Helper types and functions

interface CachedResponse {
  status: number;
  body: any;
  headers: Record<string, string>;
  cachedAt: string;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, varyBy?: string[]): string {
  const parts: string[] = [
    req.method,
    req.path,
  ];

  // Add query parameters
  const queryString = JSON.stringify(req.query);
  if (queryString !== '{}') {
    parts.push(queryString);
  }

  // Add varyBy properties
  if (varyBy && varyBy.length > 0) {
    varyBy.forEach(prop => {
      const value = getNestedProperty(req, prop);
      if (value !== undefined) {
        parts.push(`${prop}:${value}`);
      }
    });
  }

  // Generate hash
  const combined = parts.join('|');
  return crypto.createHash('md5').update(combined).digest('hex');
}

/**
 * Get nested property from object
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => {
    return current?.[prop];
  }, obj);
}

/**
 * Extract relevant headers for caching
 */
function extractRelevantHeaders(res: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  const relevantHeaders = ['content-type', 'content-length', 'etag', 'last-modified'];

  relevantHeaders.forEach(header => {
    const value = res.getHeader(header);
    if (value) {
      headers[header] = String(value);
    }
  });

  return headers;
}

/**
 * Extract cache tags from request
 */
function extractCacheTags(req: Request): string[] {
  const tags: string[] = [];

  // Add path-based tags
  const pathParts = req.path.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    tags.push(pathParts[0]); // First path segment (e.g., 'users', 'events')
  }

  // Add user-based tag if authenticated
  if (req.user && 'id' in req.user) {
    tags.push(`user:${req.user.id}`);
  }

  return tags;
}

export default {
  cacheMiddleware,
  cacheIf,
  cacheAuthenticated,
  cachePaginated,
  invalidateCache,
  invalidateCacheTag,
  noCache,
};
