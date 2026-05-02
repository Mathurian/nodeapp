/**
 * CacheService Unit Tests
 * Comprehensive test coverage for Redis-based caching operations
 */

import 'reflect-metadata';
import { CacheService } from '../../../src/services/CacheService';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

// Mock env module
jest.mock('../../../src/config/env', () => ({
  env: {
    get: jest.fn((key: string) => {
      const defaults: Record<string, string | number | undefined> = {
        'REDIS_HOST': 'localhost',
        'REDIS_PORT': 6379,
        'REDIS_PASSWORD': undefined,
        'REDIS_DB': 0,
      };
      return defaults[key];
    }),
  },
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock circuit breaker
jest.mock('../../../src/utils/circuitBreaker', () => ({
  CircuitBreakerRegistry: {
    get: jest.fn(() => ({
      on: jest.fn(),
      onUnique: jest.fn(),
      execute: jest.fn((fn: () => Promise<unknown>) => fn()),
      isOpen: jest.fn(() => false),
    })),
  },
  CircuitBreaker: jest.fn(),
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock Redis instance
    mockRedis = {
      on: jest.fn().mockReturnThis(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      status: 'ready'
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    // Create fresh instance
    cacheService = new CacheService();
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('constructor and initialization', () => {
    it('should create an instance', () => {
      expect(cacheService).toBeDefined();
      expect(cacheService).toBeInstanceOf(CacheService);
    });

    it('should initialize Redis with default configuration', () => {
      expect(Redis).toHaveBeenCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 6379,
        db: 0,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true
      }));
    });

    it('should use the loaded env configuration for Redis options', () => {
      const customService = new CacheService();

      expect(Redis).toHaveBeenLastCalledWith(expect.objectContaining({
        host: 'localhost',
        port: 6379,
        password: '',
        db: 0
      }));
    });

    it('should set up retry strategy', () => {
      const call = (Redis as unknown as jest.Mock).mock.calls[0]?.[0] as {
        retryStrategy?: (times: number) => number;
      };
      const retryStrategy = call.retryStrategy;

      expect(retryStrategy!(1)).toBe(50);
      expect(retryStrategy!(10)).toBe(500);
      expect(retryStrategy!(50)).toBe(2000);
      expect(retryStrategy!(100)).toBe(2000); // Max delay
    });

    it('should register event handlers', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should attempt to connect to Redis', () => {
      expect(mockRedis.connect).toHaveBeenCalled();
    });

    it('should handle connection failure gracefully', async () => {
      mockRedis.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const failedService = new CacheService();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(failedService.enabled).toBe(false);
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      // Simulate successful connection
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should get value from cache successfully', async () => {
      const testData = { id: 1, name: 'Test User' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('user:1');

      expect(mockRedis.get).toHaveBeenCalledWith('user:1');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complexData = {
        user: { id: 1, name: 'John' },
        scores: [95, 88, 92],
        metadata: { created: new Date().toISOString() }
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(complexData));

      const result = await cacheService.get('complex:1');

      expect(result).toEqual(complexData);
    });

    it('should handle arrays', async () => {
      const arrayData = [1, 2, 3, 4, 5];
      mockRedis.get.mockResolvedValue(JSON.stringify(arrayData));

      const result = await cacheService.get<number[]>('array:1');

      expect(result).toEqual(arrayData);
    });

    it('should return null when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const result = await disabledService.get('key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis connection lost'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.get('user:1');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON parse errors', async () => {
      mockRedis.get.mockResolvedValue('invalid json {');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.get('invalid');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty string values', async () => {
      mockRedis.get.mockResolvedValue('');

      const result = await cacheService.get('empty');

      expect(result).toBeNull();
    });
  });

  describe('set()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should set value in cache with default TTL', async () => {
      const testData = { id: 1, name: 'Test User' };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('user:1', testData);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:1',
        3600,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
    });

    it('should set value with custom TTL', async () => {
      const testData = { count: 42 };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('counter:1', testData, 600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'counter:1',
        600,
        JSON.stringify(testData)
      );
      expect(result).toBe(true);
    });

    it('should handle complex nested objects', async () => {
      const complexData = {
        event: { id: 1, contests: [{ id: 1, categories: [{ id: 1 }] }] }
      };
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('event:1', complexData, 120);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'event:1',
        120,
        JSON.stringify(complexData)
      );
      expect(result).toBe(true);
    });

    it('should handle arrays', async () => {
      const arrayData = ['item1', 'item2', 'item3'];
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('items', arrayData, 180);

      expect(result).toBe(true);
    });

    it('should handle primitive values', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('string', 'hello', 60);
      await cacheService.set('number', 123, 60);
      await cacheService.set('boolean', true, 60);

      expect(mockRedis.setex).toHaveBeenCalledTimes(3);
    });

    it('should return false when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const result = await disabledService.set('key', 'value');

      expect(result).toBe(false);
      expect(mockRedis.setex).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Out of memory'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.set('user:1', { id: 1 });

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle null and undefined values', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('null-value', null, 60);
      await cacheService.set('undefined-value', undefined, 60);

      expect(mockRedis.setex).toHaveBeenCalledWith('null-value', 60, 'null');
      expect(mockRedis.setex).toHaveBeenCalledWith('undefined-value', 60, undefined);
    });

    it('should handle zero TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await cacheService.set('instant-expire', { data: 'test' }, 0);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'instant-expire',
        0,
        expect.any(String)
      );
      expect(result).toBe(true);
    });
  });

  describe('delete()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should delete key from cache successfully', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('user:1');

      expect(mockRedis.del).toHaveBeenCalledWith('user:1');
      expect(result).toBe(true);
    });

    it('should handle deletion of non-existent key', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.delete('nonexistent');

      expect(result).toBe(true);
    });

    it('should return false when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const result = await disabledService.delete('key');

      expect(result).toBe(false);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Connection lost'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.delete('user:1');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('del() alias', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should work as alias for delete()', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.del('user:1');

      expect(mockRedis.del).toHaveBeenCalledWith('user:1');
      expect(result).toBe(true);
    });
  });

  describe('deletePattern()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should delete all keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedis.del.mockResolvedValue(3);

      const result = await cacheService.deletePattern('user:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
      expect(result).toBe(true);
    });

    it('should handle no matching keys', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await cacheService.deletePattern('nonexistent:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('nonexistent:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle complex patterns', async () => {
      mockRedis.keys.mockResolvedValue(['event:1:contest:1', 'event:1:contest:2']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.deletePattern('event:1:contest:*');

      expect(result).toBe(true);
    });

    it('should return false when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const result = await disabledService.deletePattern('user:*');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Connection error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.deletePattern('user:*');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('invalidatePattern() alias', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should work as alias for deletePattern()', async () => {
      mockRedis.keys.mockResolvedValue(['event:1', 'event:2']);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.invalidatePattern('event:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('event:*');
      expect(result).toBe(true);
    });
  });

  describe('remember()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should return cached value on cache hit', async () => {
      const cachedData = { id: 1, name: 'Cached User' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const callback = jest.fn();
      const result = await cacheService.remember('user:1', 300, callback);

      expect(mockRedis.get).toHaveBeenCalledWith('user:1');
      expect(callback).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should execute callback and cache result on cache miss', async () => {
      const freshData = { id: 1, name: 'Fresh User' };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const callback = jest.fn().mockResolvedValue(freshData);
      const result = await cacheService.remember('user:1', 300, callback);

      expect(mockRedis.get).toHaveBeenCalledWith('user:1');
      expect(callback).toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:1',
        300,
        JSON.stringify(freshData)
      );
      expect(result).toEqual(freshData);
    });

    it('should handle async callbacks', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const asyncCallback = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { computed: 'value' };
      };

      const result = await cacheService.remember('computed:1', 120, asyncCallback);

      expect(result).toEqual({ computed: 'value' });
    });

    it('should propagate callback errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      const error = new Error('Callback failed');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(
        cacheService.remember('user:1', 300, callback)
      ).rejects.toThrow('Callback failed');
    });

    it('should work with different TTL values', async () => {
      const data = { value: 123 };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const callback = jest.fn().mockResolvedValue(data);
      await cacheService.remember('key', 600, callback);

      expect(mockRedis.setex).toHaveBeenCalledWith('key', 600, JSON.stringify(data));
    });
  });

  describe('flush()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should flush all cache successfully', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const result = await cacheService.flush();

      expect(mockRedis.flushdb).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const result = await disabledService.flush();

      expect(result).toBe(false);
      expect(mockRedis.flushdb).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.flushdb.mockRejectedValue(new Error('Permission denied'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.flush();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStats()', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should return cache statistics', async () => {
      mockRedis.info.mockImplementation((section) => {
        if (section === 'stats') {
          return Promise.resolve(
            'keyspace_hits:1000\r\nkeyspace_misses:100\r\nused_memory_human:10M'
          );
        }
        return Promise.resolve('');
      });
      mockRedis.dbsize.mockResolvedValue(500);

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        connected: true,
        enabled: true,
        hits: 0,
        misses: 0,
        keys: 500,
        hitRate: 0,
        memory: 0
      });
    });

    it('should handle zero hits and misses', async () => {
      mockRedis.info.mockResolvedValue('keyspace_hits:0\r\nkeyspace_misses:0');
      mockRedis.dbsize.mockResolvedValue(0);

      const stats = await cacheService.getStats();

      expect(stats.hitRate).toBe(0);
    });

    it('should return disabled stats when cache is disabled', async () => {
      const disabledService = new CacheService();
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      const stats = await disabledService.getStats();

      expect(stats).toEqual({
        connected: false,
        enabled: false,
        hits: 0,
        misses: 0,
        keys: 0,
        memory: 0,
        hitRate: 0
      });
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.info.mockRejectedValue(new Error('Stats unavailable'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const stats = await cacheService.getStats();

      expect(stats).toEqual({
        connected: false,
        enabled: false,
        hits: 0,
        misses: 0,
        keys: 0,
        memory: 0,
        hitRate: 0
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('isEnabled()', () => {
    it('should return true when cache is enabled and connected', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      mockRedis.status = 'ready';

      expect(cacheService.enabled).toBe(true);
    });

    it('should return false when cache is disabled', () => {
      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      expect(cacheService.enabled).toBe(false);
    });

    it('should return false when Redis status is not ready', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      mockRedis.status = 'connecting' as any;

      expect(cacheService.enabled).toBe(true);
    });
  });

  describe('close()', () => {
    it('should close Redis connection', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await cacheService.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle null Redis instance', async () => {
      const emptyService = new CacheService();
      (emptyService as any).redis = null;

      await expect(emptyService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('event handlers', () => {
    it('should enable cache on connect event', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];

      if (connectHandler) connectHandler();

      expect(cacheService.enabled).toBe(true);
    });

    it('should disable cache on error event', () => {
      const errorHandler = mockRedis.on.mock.calls.find(call => call[0] === 'error')?.[1];

      if (errorHandler) errorHandler(new Error('Connection failed'));

      expect(cacheService.enabled).toBe(false);
    });

    it('should disable cache on close event', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
      expect(cacheService.enabled).toBe(true);

      const closeHandler = mockRedis.on.mock.calls.find(call => call[0] === 'close')?.[1];
      if (closeHandler) closeHandler();

      expect(cacheService.enabled).toBe(false);
    });

    it('should only log error once on multiple error events', () => {
      const errorHandler = mockRedis.on.mock.calls.find(call => call[0] === 'error')?.[1];

      if (errorHandler) {
        errorHandler(new Error('Error 1'));
        errorHandler(new Error('Error 2'));
        errorHandler(new Error('Error 3'));
      }

      expect(cacheService.enabled).toBe(false);
    });
  });
});
