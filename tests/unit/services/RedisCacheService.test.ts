/**
 * RedisCacheService Unit Tests
 * Comprehensive test coverage for distributed caching with Redis and in-memory fallback
 */

import 'reflect-metadata';
import { RedisCacheService, CacheOptions, CacheStatistics } from '../../../src/services/RedisCacheService';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis');

// Mock redis config
jest.mock('../../../src/config/redis.config', () => ({
  getRedisOptions: jest.fn(() => ({
    host: 'localhost',
    port: 6379,
    retryStrategy: (times: number) => Math.min(times * 50, 2000)
  })),
  getRedisConfig: jest.fn(() => ({
    enabled: true,
    mode: 'docker',
    fallbackToMemory: true
  })),
  CacheTTL: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600
  },
  CacheNamespace: {
    USERS: 'users',
    EVENTS: 'events',
    CONTESTS: 'contests'
  }
}));

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let mockSubscriber: jest.Mocked<Redis>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Redis instances
    mockRedis = {
      on: jest.fn().mockReturnThis(),
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      mget: jest.fn(),
      keys: jest.fn(),
      flushdb: jest.fn(),
      info: jest.fn(),
      dbsize: jest.fn(),
      ping: jest.fn(),
      pipeline: jest.fn(),
      incrby: jest.fn(),
      decrby: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      sadd: jest.fn(),
      smembers: jest.fn(),
      publish: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK')
    } as any;

    mockSubscriber = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK')
    } as any;

    // Mock Redis constructor to return different instances
    let callCount = 0;
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
      callCount++;
      return callCount === 1 ? mockRedis : mockSubscriber;
    });

    service = new RedisCacheService();
  });

  afterEach(async () => {
    await service.disconnect();
    jest.clearAllTimers();
  });

  describe('constructor and initialization', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RedisCacheService);
    });

    it('should initialize both Redis client and subscriber', () => {
      expect(Redis).toHaveBeenCalledTimes(2);
    });

    it('should setup event listeners on client and subscriber', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should enable in-memory fallback when Redis initialization fails', () => {
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const failedService = new RedisCacheService();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Falling back to in-memory cache');
      expect(failedService.isUsingMemoryCache()).toBe(true);

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('healthCheck()', () => {
    it('should return true when Redis responds to ping', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();

      const result = await service.healthCheck();

      expect(mockRedis.ping).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when Redis ping fails', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Connection lost'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.healthCheck();

      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should return true for in-memory cache', async () => {
      const memoryService = new RedisCacheService();
      (memoryService as any).useMemoryFallback = true;

      const result = await memoryService.healthCheck();

      expect(result).toBe(true);
    });
  });

  describe('get() with Redis', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should get value from Redis successfully', async () => {
      const testData = { id: 1, name: 'Test User' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('user:1');

      expect(mockRedis.get).toHaveBeenCalledWith('user:1');
      expect(result).toEqual(testData);
    });

    it('should use namespace when provided', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ id: 1 }));

      await service.get('1', { namespace: 'users' });

      expect(mockRedis.get).toHaveBeenCalledWith('users:1');
    });

    it('should return null for non-existent key', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Connection lost'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.get('user:1');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should track cache statistics', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      await service.get('hit');
      await service.get('miss');

      mockRedis.get.mockResolvedValue(null);
      await service.get('another-miss');

      const stats = await service.getStatistics();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('set() with Redis', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should set value in Redis with default TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('user:1', { id: 1, name: 'John' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'user:1',
        300,
        JSON.stringify({ id: 1, name: 'John' })
      );
      expect(result).toBe(true);
    });

    it('should set value with custom TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      const result = await service.set('key', 'value', { ttl: 600 });

      expect(mockRedis.setex).toHaveBeenCalledWith('key', 600, JSON.stringify('value'));
      expect(result).toBe(true);
    });

    it('should handle tags for invalidation', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const mockPipeline = {
        sadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      await service.set('user:1', { id: 1 }, { tags: ['user', 'profile'] });

      expect(mockPipeline.sadd).toHaveBeenCalled();
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Out of memory'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.set('user:1', { id: 1 });

      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('delete() with Redis', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should delete key from Redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await service.delete('user:1');

      expect(mockRedis.del).toHaveBeenCalledWith('user:1');
      expect(result).toBe(true);
    });

    it('should handle non-existent key deletion', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Connection lost'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.delete('user:1');

      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('bulk operations with Redis', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should get multiple values', async () => {
      mockRedis.mget.mockResolvedValue([
        JSON.stringify({ id: 1 }),
        JSON.stringify({ id: 2 }),
        null
      ]);

      const result = await service.getMany(['user:1', 'user:2', 'user:3']);

      expect(mockRedis.mget).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
      expect(result).toEqual([{ id: 1 }, { id: 2 }, null]);
    });

    it('should set multiple values', async () => {
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const items = [
        { key: 'user:1', value: { id: 1 }, options: { ttl: 300 } },
        { key: 'user:2', value: { id: 2 }, options: { ttl: 600 } }
      ];

      const result = await service.setMany(items);

      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should delete multiple keys', async () => {
      mockRedis.del.mockResolvedValue(3);

      const result = await service.deleteMany(['user:1', 'user:2', 'user:3']);

      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
      expect(result).toBe(3);
    });

    it('should delete keys by pattern', async () => {
      mockRedis.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedis.del.mockResolvedValue(3);

      const result = await service.deletePattern('user:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedis.del).toHaveBeenCalledWith('user:1', 'user:2', 'user:3');
      expect(result).toBe(3);
    });
  });

  describe('cache-aside pattern', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should return cached value on cache hit', async () => {
      const cachedData = { id: 1, computed: true };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const factory = jest.fn();
      const result = await service.getOrSet('computed:1', factory);

      expect(mockRedis.get).toHaveBeenCalledWith('computed:1');
      expect(factory).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should execute factory and cache result on cache miss', async () => {
      const freshData = { id: 1, computed: true };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const factory = jest.fn().mockResolvedValue(freshData);
      const result = await service.getOrSet('computed:1', factory, { ttl: 300 });

      expect(mockRedis.get).toHaveBeenCalledWith('computed:1');
      expect(factory).toHaveBeenCalled();
      expect(result).toEqual(freshData);
    });
  });

  describe('counter operations', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should increment counter', async () => {
      mockRedis.incrby.mockResolvedValue(5);

      const result = await service.increment('views', 1);

      expect(mockRedis.incrby).toHaveBeenCalledWith('views', 1);
      expect(result).toBe(5);
    });

    it('should decrement counter', async () => {
      mockRedis.decrby.mockResolvedValue(3);

      const result = await service.decrement('inventory', 2);

      expect(mockRedis.decrby).toHaveBeenCalledWith('inventory', 2);
      expect(result).toBe(3);
    });

    it('should increment by custom amount', async () => {
      mockRedis.incrby.mockResolvedValue(10);

      const result = await service.increment('score', 5);

      expect(mockRedis.incrby).toHaveBeenCalledWith('score', 5);
      expect(result).toBe(10);
    });
  });

  describe('TTL operations', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should set expiration on key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.expire('user:1', 600);

      expect(mockRedis.expire).toHaveBeenCalledWith('user:1', 600);
      expect(result).toBe(true);
    });

    it('should get TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(300);

      const result = await service.ttl('user:1');

      expect(mockRedis.ttl).toHaveBeenCalledWith('user:1');
      expect(result).toBe(300);
    });
  });

  describe('tag-based invalidation', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should invalidate all keys with specific tag', async () => {
      mockRedis.smembers.mockResolvedValue(['user:1', 'user:2']);
      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1], [null, 1], [null, 1]])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline as any);

      const result = await service.invalidateTag('user');

      expect(mockRedis.smembers).toHaveBeenCalledWith('tag:user');
      expect(mockPipeline.del).toHaveBeenCalled();
      expect(result).toBeGreaterThan(0);
    });

    it('should handle tags with no keys', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await service.invalidateTag('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('pub/sub operations', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should subscribe to channel', async () => {
      mockSubscriber.subscribe.mockResolvedValue(1);

      const callback = jest.fn();
      await service.subscribe('cache:invalidate', callback);

      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('cache:invalidate');
    });

    it('should publish to channel', async () => {
      mockRedis.publish.mockResolvedValue(1);

      await service.publish('cache:invalidate', JSON.stringify({ pattern: 'user:*' }));

      expect(mockRedis.publish).toHaveBeenCalled();
    });
  });

  describe('statistics and monitoring', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should return comprehensive statistics', async () => {
      mockRedis.info.mockResolvedValue('used_memory:1048576');
      mockRedis.dbsize.mockResolvedValue(100);
      mockRedis.get.mockResolvedValue(JSON.stringify({ test: 'data' }));

      await service.get('test:1');
      mockRedis.get.mockResolvedValue(null);
      await service.get('test:2');

      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('mode');
      expect(stats.mode).toBe('redis');
    });

    it('should reset statistics', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ test: 'data' }));

      await service.get('test:1');

      service.resetStatistics();

      const stats = await service.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('clear operations', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should clear entire cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      const result = await service.clear();

      expect(mockRedis.flushdb).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('exists operation', () => {
    beforeEach(() => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();
    });

    it('should check if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.exists('user:1');

      expect(mockRedis.exists).toHaveBeenCalledWith('user:1');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.exists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return cache mode', () => {
      const connectHandler = mockRedis.on.mock.calls.find(call => call[0] === 'connect')?.[1];
      if (connectHandler) connectHandler();

      const mode = service.getCacheMode();

      expect(mode).toHaveProperty('mode');
      expect(mode.mode).toBe('redis');
    });

    it('should return Redis client', () => {
      const client = service.getClient();

      expect(client).toBeDefined();
    });

    it('should check if using memory cache', () => {
      const result = service.isUsingMemoryCache();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('disconnect', () => {
    it('should close all connections', async () => {
      mockRedis.quit.mockResolvedValue('OK');
      mockSubscriber.quit.mockResolvedValue('OK');

      await service.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockSubscriber.quit).toHaveBeenCalled();
    });

    it('should handle errors during disconnect', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Already closed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.disconnect();

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('in-memory fallback', () => {
    let memoryService: RedisCacheService;

    beforeEach(() => {
      (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => {
        throw new Error('Redis unavailable');
      });

      jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'warn').mockImplementation();

      memoryService = new RedisCacheService();
    });

    afterEach(async () => {
      await memoryService.disconnect();
      jest.restoreAllMocks();
    });

    it('should use in-memory cache when Redis is unavailable', () => {
      expect(memoryService.isUsingMemoryCache()).toBe(true);
    });

    it('should get and set values in memory cache', async () => {
      await memoryService.set('test:1', { id: 1, name: 'Test' });
      const result = await memoryService.get('test:1');

      expect(result).toEqual({ id: 1, name: 'Test' });
    });

    it('should handle TTL expiration in memory cache', async () => {
      jest.useFakeTimers();

      await memoryService.set('expire:1', { data: 'test' }, { ttl: 1 });

      // Value should be available immediately
      let result = await memoryService.get('expire:1');
      expect(result).toEqual({ data: 'test' });

      // Advance time past expiration
      jest.advanceTimersByTime(2000);

      // Value should be expired
      result = await memoryService.get('expire:1');
      expect(result).toBeNull();

      jest.useRealTimers();
    });

    it('should delete from memory cache', async () => {
      await memoryService.set('delete:1', { data: 'test' });
      const deleted = await memoryService.delete('delete:1');

      expect(deleted).toBe(true);

      const result = await memoryService.get('delete:1');
      expect(result).toBeNull();
    });

    it('should clear entire memory cache', async () => {
      await memoryService.set('key1', 'value1');
      await memoryService.set('key2', 'value2');

      const result = await memoryService.clear();

      expect(result).toBe(true);
      expect(await memoryService.get('key1')).toBeNull();
      expect(await memoryService.get('key2')).toBeNull();
    });

    it('should handle increment in memory cache', async () => {
      const result1 = await memoryService.increment('counter', 5);
      expect(result1).toBe(5);

      const result2 = await memoryService.increment('counter', 3);
      expect(result2).toBe(8);
    });

    it('should handle decrement in memory cache', async () => {
      await memoryService.set('counter', 10);
      const result = await memoryService.decrement('counter', 3);

      expect(result).toBe(7);
    });
  });
});
