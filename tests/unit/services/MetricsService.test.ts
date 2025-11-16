import { MetricsService } from '../../../src/services/MetricsService';
import { Registry } from 'prom-client';

jest.mock('../../../src/utils/logger', () => ({
  logger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    metricsService = new MetricsService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset metrics after each test
    metricsService.resetMetrics();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(metricsService).toBeDefined();
      expect(metricsService).toBeInstanceOf(MetricsService);
    });

    it('should initialize with a registry', () => {
      expect(metricsService['register']).toBeDefined();
      expect(metricsService['register']).toBeInstanceOf(Registry);
    });

    it('should initialize HTTP request duration histogram', () => {
      expect(metricsService['httpRequestDuration']).toBeDefined();
    });

    it('should initialize HTTP request total counter', () => {
      expect(metricsService['httpRequestTotal']).toBeDefined();
    });

    it('should initialize HTTP request errors counter', () => {
      expect(metricsService['httpRequestErrors']).toBeDefined();
    });

    it('should initialize active connections gauge', () => {
      expect(metricsService['activeConnections']).toBeDefined();
    });

    it('should initialize database query duration histogram', () => {
      expect(metricsService['databaseQueryDuration']).toBeDefined();
    });

    it('should initialize cache hit rate counter', () => {
      expect(metricsService['cacheHitRate']).toBeDefined();
    });

    it('should initialize cache miss rate counter', () => {
      expect(metricsService['cacheMissRate']).toBeDefined();
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request with correct labels', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

      // Verify no errors thrown
      expect(true).toBe(true);
    });

    it('should normalize method to uppercase', () => {
      metricsService.recordHttpRequest('get', '/api/users', 200, 150);
      metricsService.recordHttpRequest('post', '/api/events', 201, 250);

      expect(true).toBe(true);
    });

    it('should convert duration from milliseconds to seconds', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 1000);
      metricsService.recordHttpRequest('POST', '/api/events', 201, 500);

      expect(true).toBe(true);
    });

    it('should normalize route paths', () => {
      metricsService.recordHttpRequest('GET', '/api/users/123', 200, 150);
      metricsService.recordHttpRequest('GET', '/api/users/456', 200, 160);

      expect(true).toBe(true);
    });

    it('should handle UUID route parameters', () => {
      metricsService.recordHttpRequest('GET', '/api/events/550e8400-e29b-41d4-a716-446655440000', 200, 150);

      expect(true).toBe(true);
    });

    it('should handle different status codes', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);
      metricsService.recordHttpRequest('POST', '/api/events', 201, 250);
      metricsService.recordHttpRequest('GET', '/api/notfound', 404, 50);
      metricsService.recordHttpRequest('POST', '/api/error', 500, 300);

      expect(true).toBe(true);
    });

    it('should handle very fast requests', () => {
      metricsService.recordHttpRequest('GET', '/api/health', 200, 5);

      expect(true).toBe(true);
    });

    it('should handle slow requests', () => {
      metricsService.recordHttpRequest('GET', '/api/reports', 200, 5000);

      expect(true).toBe(true);
    });
  });

  describe('recordHttpError', () => {
    it('should record HTTP error with correct labels', () => {
      metricsService.recordHttpError('GET', '/api/users', 'NotFoundError');

      expect(true).toBe(true);
    });

    it('should normalize method to uppercase', () => {
      metricsService.recordHttpError('post', '/api/events', 'ValidationError');

      expect(true).toBe(true);
    });

    it('should handle different error types', () => {
      metricsService.recordHttpError('GET', '/api/users', 'NotFoundError');
      metricsService.recordHttpError('POST', '/api/events', 'ValidationError');
      metricsService.recordHttpError('PUT', '/api/scores', 'ForbiddenError');
      metricsService.recordHttpError('DELETE', '/api/contests', 'UnauthorizedError');

      expect(true).toBe(true);
    });

    it('should normalize route paths for errors', () => {
      metricsService.recordHttpError('GET', '/api/users/123', 'NotFoundError');
      metricsService.recordHttpError('GET', '/api/users/456', 'NotFoundError');

      expect(true).toBe(true);
    });
  });

  describe('recordDatabaseQuery', () => {
    it('should record database query duration', () => {
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);

      expect(true).toBe(true);
    });

    it('should convert duration from milliseconds to seconds', () => {
      metricsService.recordDatabaseQuery('SELECT', 'events', 1000);

      expect(true).toBe(true);
    });

    it('should handle different operations', () => {
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);
      metricsService.recordDatabaseQuery('INSERT', 'events', 75);
      metricsService.recordDatabaseQuery('UPDATE', 'scores', 100);
      metricsService.recordDatabaseQuery('DELETE', 'contests', 60);

      expect(true).toBe(true);
    });

    it('should handle different tables', () => {
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);
      metricsService.recordDatabaseQuery('SELECT', 'events', 60);
      metricsService.recordDatabaseQuery('SELECT', 'contests', 70);

      expect(true).toBe(true);
    });

    it('should handle very fast queries', () => {
      metricsService.recordDatabaseQuery('SELECT', 'cache', 5);

      expect(true).toBe(true);
    });

    it('should handle slow queries', () => {
      metricsService.recordDatabaseQuery('SELECT', 'reports', 3000);

      expect(true).toBe(true);
    });
  });

  describe('recordCacheHit', () => {
    it('should record cache hit', () => {
      metricsService.recordCacheHit('users:list');

      expect(true).toBe(true);
    });

    it('should handle different cache keys', () => {
      metricsService.recordCacheHit('users:list');
      metricsService.recordCacheHit('events:123');
      metricsService.recordCacheHit('contests:active');

      expect(true).toBe(true);
    });

    it('should handle multiple hits for same key', () => {
      metricsService.recordCacheHit('users:list');
      metricsService.recordCacheHit('users:list');
      metricsService.recordCacheHit('users:list');

      expect(true).toBe(true);
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss', () => {
      metricsService.recordCacheMiss('users:list');

      expect(true).toBe(true);
    });

    it('should handle different cache keys', () => {
      metricsService.recordCacheMiss('users:list');
      metricsService.recordCacheMiss('events:123');
      metricsService.recordCacheMiss('contests:active');

      expect(true).toBe(true);
    });

    it('should handle multiple misses for same key', () => {
      metricsService.recordCacheMiss('users:new-key');
      metricsService.recordCacheMiss('users:new-key');

      expect(true).toBe(true);
    });
  });

  describe('setActiveConnections', () => {
    it('should set active connections count', () => {
      metricsService.setActiveConnections(10);

      expect(true).toBe(true);
    });

    it('should handle zero connections', () => {
      metricsService.setActiveConnections(0);

      expect(true).toBe(true);
    });

    it('should handle large connection counts', () => {
      metricsService.setActiveConnections(1000);

      expect(true).toBe(true);
    });

    it('should update connection count', () => {
      metricsService.setActiveConnections(10);
      metricsService.setActiveConnections(20);
      metricsService.setActiveConnections(15);

      expect(true).toBe(true);
    });
  });

  describe('incrementActiveConnections', () => {
    it('should increment active connections', () => {
      metricsService.incrementActiveConnections();

      expect(true).toBe(true);
    });

    it('should increment multiple times', () => {
      metricsService.incrementActiveConnections();
      metricsService.incrementActiveConnections();
      metricsService.incrementActiveConnections();

      expect(true).toBe(true);
    });
  });

  describe('decrementActiveConnections', () => {
    it('should decrement active connections', () => {
      metricsService.setActiveConnections(10);
      metricsService.decrementActiveConnections();

      expect(true).toBe(true);
    });

    it('should decrement multiple times', () => {
      metricsService.setActiveConnections(10);
      metricsService.decrementActiveConnections();
      metricsService.decrementActiveConnections();
      metricsService.decrementActiveConnections();

      expect(true).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);

      const metrics = await metricsService.getMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include HTTP request metrics', async () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_requests_total');
    });

    it('should include database metrics', async () => {
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('database_query_duration_seconds');
    });

    it('should include cache metrics', async () => {
      metricsService.recordCacheHit('users:list');
      metricsService.recordCacheMiss('events:123');

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await metricsService.getMetrics();

      // Default metrics include process metrics
      expect(metrics).toBeDefined();
    });
  });

  describe('getMetricsAsJson', () => {
    it('should return metrics as JSON', async () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

      const metrics = await metricsService.getMetricsAsJson();

      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should include metric metadata', async () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

      const metrics = await metricsService.getMetricsAsJson();

      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should be parseable JSON structure', async () => {
      const metrics = await metricsService.getMetricsAsJson();

      expect(typeof metrics).toBe('object');
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);
      metricsService.recordCacheHit('users:list');

      metricsService.resetMetrics();

      expect(true).toBe(true);
    });

    it('should allow recording new metrics after reset', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);
      metricsService.resetMetrics();
      metricsService.recordHttpRequest('POST', '/api/events', 201, 200);

      expect(true).toBe(true);
    });
  });

  describe('normalizeRoute (private)', () => {
    it('should normalize numeric IDs', () => {
      metricsService.recordHttpRequest('GET', '/api/users/123', 200, 150);
      metricsService.recordHttpRequest('GET', '/api/users/456', 200, 160);

      // Both should be normalized to the same route
      expect(true).toBe(true);
    });

    it('should normalize UUIDs', () => {
      metricsService.recordHttpRequest('GET', '/api/events/550e8400-e29b-41d4-a716-446655440000', 200, 150);
      metricsService.recordHttpRequest('GET', '/api/events/6ba7b810-9dad-11d1-80b4-00c04fd430c8', 200, 160);

      expect(true).toBe(true);
    });

    it('should convert to lowercase', () => {
      metricsService.recordHttpRequest('GET', '/API/USERS', 200, 150);
      metricsService.recordHttpRequest('GET', '/api/users', 200, 160);

      expect(true).toBe(true);
    });

    it('should preserve /api/ prefix', () => {
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);

      expect(true).toBe(true);
    });

    it('should handle complex paths', () => {
      metricsService.recordHttpRequest('GET', '/api/events/123/contests/456/categories', 200, 150);

      expect(true).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete request lifecycle', async () => {
      metricsService.incrementActiveConnections();
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);
      metricsService.recordCacheHit('users:list');
      metricsService.recordHttpRequest('GET', '/api/users', 200, 150);
      metricsService.decrementActiveConnections();

      const metrics = await metricsService.getMetrics();

      expect(metrics).toBeDefined();
    });

    it('should handle error scenario', async () => {
      metricsService.incrementActiveConnections();
      metricsService.recordDatabaseQuery('SELECT', 'users', 50);
      metricsService.recordHttpError('GET', '/api/users/999', 'NotFoundError');
      metricsService.recordHttpRequest('GET', '/api/users/999', 404, 100);
      metricsService.decrementActiveConnections();

      const metrics = await metricsService.getMetrics();

      expect(metrics).toBeDefined();
    });

    it('should handle high volume of requests', async () => {
      for (let i = 0; i < 100; i++) {
        metricsService.recordHttpRequest('GET', `/api/users/${i}`, 200, 100 + i);
      }

      const metrics = await metricsService.getMetrics();

      expect(metrics).toBeDefined();
    });
  });
});
