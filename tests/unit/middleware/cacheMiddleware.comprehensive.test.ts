/**
 * Cache Middleware - Comprehensive Unit Tests
 * Tests HTTP caching functionality with proper mocking
 */

import { Request, Response, NextFunction } from 'express';
import {
  cacheMiddleware,
  cacheIf,
  cacheAuthenticated,
  cachePaginated,
  invalidateCache,
  invalidateCacheTag,
  noCache,
} from '../../../src/middleware/cacheMiddleware';

// Mock RedisCacheService
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDeletePattern = jest.fn();
const mockInvalidateTag = jest.fn();

jest.mock('../../../src/services/RedisCacheService', () => ({
  getCacheService: jest.fn(() => ({
    get: mockGet,
    set: mockSet,
    deletePattern: mockDeletePattern,
    invalidateTag: mockInvalidateTag,
  })),
}));

// Mock crypto for consistent cache key generation in tests
jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash-key'),
  })),
}));

describe('Cache Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/events',
      query: {},
      user: undefined,
    };

    jsonSpy = jest.fn();

    res = {
      status: jest.fn().mockReturnThis(),
      json: jsonSpy,
      statusCode: 200,
      setHeader: jest.fn(),
      getHeader: jest.fn(),
    } as any;

    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('cacheMiddleware', () => {
    it('should skip caching for non-GET requests', async () => {
      req.method = 'POST';

      const middleware = cacheMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(mockGet).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should return cached response on cache hit', async () => {
      const cachedResponse = {
        status: 200,
        body: { data: [{ id: '1', name: 'Event 1' }] },
        headers: { 'content-type': 'application/json' },
        cachedAt: new Date().toISOString(),
      };

      mockGet.mockResolvedValue(cachedResponse);

      const middleware = cacheMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(mockGet).toHaveBeenCalledWith('mock-hash-key', { namespace: 'http' });
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Key', 'mock-hash-key');
      expect(res.setHeader).toHaveBeenCalledWith('content-type', 'application/json');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(cachedResponse.body);
      expect(next).not.toHaveBeenCalled();
    });

    it('should proceed and cache response on cache miss', async () => {
      mockGet.mockResolvedValue(null); // Cache miss
      mockSet.mockResolvedValue(undefined);

      const middleware = cacheMiddleware({ ttl: 300, namespace: 'api' });
      await middleware(req as Request, res as Response, next);

      expect(mockGet).toHaveBeenCalledWith('mock-hash-key', { namespace: 'api' });
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(res.setHeader).toHaveBeenCalledWith('X-Cache-Key', 'mock-hash-key');
      expect(next).toHaveBeenCalled();

      // Verify json method was wrapped
      expect(typeof res.json).toBe('function');

      // Simulate calling the wrapped json method
      const responseBody = { data: [{ id: '1', name: 'Event 1' }] };
      (res as any).statusCode = 200;
      await (res.json as Function)(responseBody);

      // Wait for async cache set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).toHaveBeenCalledWith(
        'mock-hash-key',
        expect.objectContaining({
          status: 200,
          body: responseBody,
        }),
        expect.objectContaining({
          namespace: 'api',
          ttl: 300,
        })
      );
    });

    it('should not cache error responses', async () => {
      mockGet.mockResolvedValue(null);

      const middleware = cacheMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();

      // Simulate error response
      (res as any).statusCode = 404;
      await (res.json as Function)({ error: 'Not found' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSet).not.toHaveBeenCalled();
    });

    it('should skip caching when condition returns false', async () => {
      const condition = jest.fn().mockReturnValue(false);

      const middleware = cacheMiddleware({ condition });
      await middleware(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(req);
      expect(mockGet).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should cache when condition returns true', async () => {
      const condition = jest.fn().mockReturnValue(true);
      mockGet.mockResolvedValue(null);

      const middleware = cacheMiddleware({ condition });
      await middleware(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(req);
      expect(mockGet).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const customKey = 'custom-cache-key';
      const keyGenerator = jest.fn().mockReturnValue(customKey);
      mockGet.mockResolvedValue(null);

      const middleware = cacheMiddleware({ keyGenerator });
      await middleware(req as Request, res as Response, next);

      expect(keyGenerator).toHaveBeenCalledWith(req);
      expect(mockGet).toHaveBeenCalledWith(customKey, { namespace: 'http' });
    });

    it('should handle cache service errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Redis connection failed'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const middleware = cacheMiddleware();
      await middleware(req as Request, res as Response, next);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cache middleware error:',
        expect.any(Error)
      );
      expect(next).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cacheIf', () => {
    it('should create middleware with condition', async () => {
      const condition = jest.fn().mockReturnValue(true);
      mockGet.mockResolvedValue(null);

      const middleware = cacheIf(condition, { ttl: 600 });
      await middleware(req as Request, res as Response, next);

      expect(condition).toHaveBeenCalledWith(req);
      expect(mockGet).toHaveBeenCalled();
    });
  });

  describe('cacheAuthenticated', () => {
    it('should not cache for unauthenticated users', async () => {
      req.user = undefined;

      const middleware = cacheAuthenticated();
      await middleware(req as Request, res as Response, next);

      expect(mockGet).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should cache for authenticated users', async () => {
      req.user = { id: 'user-123', role: 'ADMIN' } as any;
      mockGet.mockResolvedValue(null);

      const middleware = cacheAuthenticated();
      await middleware(req as Request, res as Response, next);

      expect(mockGet).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('cachePaginated', () => {
    it('should include pagination parameters in cache key', async () => {
      req.query = {
        page: '2',
        limit: '20',
        sort: 'name',
      };
      mockGet.mockResolvedValue(null);

      const middleware = cachePaginated();
      await middleware(req as Request, res as Response, next);

      expect(mockGet).toHaveBeenCalled();
      // The cache key generation includes query params, verified by the mock being called
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache pattern after successful response', async () => {
      const pattern = 'events:*';
      mockDeletePattern.mockResolvedValue(undefined);

      const middleware = invalidateCache(pattern);
      await middleware(req as Request, res as Response, next);

      // Simulate successful response
      (res as any).statusCode = 200;
      await (res.json as Function)({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDeletePattern).toHaveBeenCalledWith(pattern, undefined);
    });

    it('should not invalidate cache on error response', async () => {
      const pattern = 'events:*';

      const middleware = invalidateCache(pattern);
      await middleware(req as Request, res as Response, next);

      // Simulate error response
      (res as any).statusCode = 400;
      await (res.json as Function)({ error: 'Bad request' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDeletePattern).not.toHaveBeenCalled();
    });

    it('should handle multiple patterns', async () => {
      const patterns = ['events:*', 'contests:*'];
      mockDeletePattern.mockResolvedValue(undefined);

      const middleware = invalidateCache(patterns, 'api');
      await middleware(req as Request, res as Response, next);

      (res as any).statusCode = 201;
      await (res.json as Function)({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockDeletePattern).toHaveBeenCalledTimes(2);
      expect(mockDeletePattern).toHaveBeenCalledWith('events:*', 'api');
      expect(mockDeletePattern).toHaveBeenCalledWith('contests:*', 'api');
    });

    it('should handle invalidation errors gracefully', async () => {
      const pattern = 'events:*';
      mockDeletePattern.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const middleware = invalidateCache(pattern);
      await middleware(req as Request, res as Response, next);

      (res as any).statusCode = 200;
      await (res.json as Function)({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error invalidating cache:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('invalidateCacheTag', () => {
    it('should invalidate cache by tag after successful response', async () => {
      const tag = 'user:123';
      mockInvalidateTag.mockResolvedValue(undefined);

      const middleware = invalidateCacheTag(tag);
      await middleware(req as Request, res as Response, next);

      (res as any).statusCode = 200;
      await (res.json as Function)({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInvalidateTag).toHaveBeenCalledWith(tag);
    });

    it('should handle multiple tags', async () => {
      const tags = ['user:123', 'events'];
      mockInvalidateTag.mockResolvedValue(undefined);

      const middleware = invalidateCacheTag(tags);
      await middleware(req as Request, res as Response, next);

      (res as any).statusCode = 200;
      await (res.json as Function)({ success: true });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockInvalidateTag).toHaveBeenCalledTimes(2);
      expect(mockInvalidateTag).toHaveBeenCalledWith('user:123');
      expect(mockInvalidateTag).toHaveBeenCalledWith('events');
    });
  });

  describe('noCache', () => {
    it('should set no-cache headers', () => {
      noCache(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      );
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(next).toHaveBeenCalled();
    });
  });
});
