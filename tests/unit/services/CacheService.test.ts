/**
 * CacheService Unit Tests
 * Tests Redis operations with mocked ioredis
 */

import { CacheService } from '../../../src/services/CacheService';
import Redis from 'ioredis';

jest.mock('ioredis');

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushdb: jest.fn(),
      dbsize: jest.fn(),
      info: jest.fn(),
      quit: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);
    cacheService = new CacheService();

    // Simulate successful connection
    const connectHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'connect')?.[1];
    if (connectHandler) connectHandler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return parsed value if exists', async () => {
      const cachedData = { id: '1', name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(cachedData);
      expect(mockRedis.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null if key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should return null if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should return null and log error on parse failure', async () => {
      mockRedis.get.mockResolvedValue('invalid-json{');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return null and log error on Redis error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const data = { id: '1', name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('test-key', data, 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(data));
    });

    it('should use default TTL of 3600 seconds if not provided', async () => {
      const data = { id: '1', name: 'Test' };
      mockRedis.setex.mockResolvedValue('OK');

      await cacheService.set('test-key', data);

      expect(mockRedis.setex).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(data));
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.set('test-key', { data: 'test' }, 3600)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not set if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      await cacheService.set('test-key', { data: 'test' }, 3600);

      expect(mockRedis.setex).not.toHaveBeenCalled();
    });
  });

  describe('del', () => {
    it('should delete single key', async () => {
      mockRedis.del.mockResolvedValue(1);

      await cacheService.del('test-key');

      expect(mockRedis.del).toHaveBeenCalledWith('test-key');
    });

    it('should delete multiple keys', async () => {
      mockRedis.del.mockResolvedValue(2);

      await cacheService.del(['key1', 'key2']);

      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should not call del if array is empty', async () => {
      await cacheService.del([]);

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.del('test-key')).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not delete if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      await cacheService.del('test-key');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      mockRedis.keys.mockResolvedValue(['event:1', 'event:2', 'event:3']);
      mockRedis.del.mockResolvedValue(3);

      await cacheService.invalidatePattern('event:*');

      expect(mockRedis.keys).toHaveBeenCalledWith('event:*');
      expect(mockRedis.del).toHaveBeenCalledWith('event:1', 'event:2', 'event:3');
    });

    it('should not call del if no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await cacheService.invalidatePattern('event:*');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.invalidatePattern('event:*')).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should not invalidate if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      await cacheService.invalidatePattern('event:*');

      expect(mockRedis.keys).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false if key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('nonexistent-key');

      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.exists('test-key');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return false if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      const result = await cacheService.exists('test-key');

      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      await cacheService.expire('test-key', 3600);

      expect(mockRedis.expire).toHaveBeenCalledWith('test-key', 3600);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.expire.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.expire('test-key', 3600)).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('ttl', () => {
    it('should return TTL for key', async () => {
      mockRedis.ttl.mockResolvedValue(3600);

      const result = await cacheService.ttl('test-key');

      expect(result).toBe(3600);
      expect(mockRedis.ttl).toHaveBeenCalledWith('test-key');
    });

    it('should return -1 on Redis error', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.ttl('test-key');

      expect(result).toBe(-1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should return -1 if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      const result = await cacheService.ttl('test-key');

      expect(result).toBe(-1);
    });
  });

  describe('flushAll', () => {
    it('should clear all cache', async () => {
      mockRedis.flushdb.mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(mockRedis.flushdb).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.flushdb.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.flushAll()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedis.dbsize.mockResolvedValue(100);
      mockRedis.info.mockResolvedValue('used_memory_human:1.5M\nother_info:value');

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: true,
        enabled: true,
        keys: 100,
        memory: '1.5M',
      });
    });

    it('should return default stats if Redis is not connected', async () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: false,
        enabled: false,
        keys: 0,
        memory: '0',
      });
    });

    it('should return default stats on Redis error', async () => {
      mockRedis.dbsize.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await cacheService.getStats();

      expect(result).toEqual({
        connected: false,
        enabled: false,
        keys: 0,
        memory: '0',
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Redis', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await cacheService.disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.quit.mockRejectedValue(new Error('Redis error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cacheService.disconnect()).resolves.not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('enabled', () => {
    it('should return true when connected', () => {
      expect(cacheService.enabled).toBe(true);
    });

    it('should return false when not connected', () => {
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler(new Error('Connection failed'));

      expect(cacheService.enabled).toBe(false);
    });
  });

  describe('connection event handlers', () => {
    it('should handle connect event', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const connectHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'connect')?.[1];

      if (connectHandler) connectHandler();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Redis cache connected'));
      consoleLogSpy.mockRestore();
    });

    it('should handle error event', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const errorHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'error')?.[1];

      if (errorHandler) errorHandler(new Error('Connection failed'));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis cache unavailable')
      );
      consoleLogSpy.mockRestore();
    });

    it('should handle ready event', () => {
      const readyHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'ready')?.[1];

      if (readyHandler) readyHandler();

      expect(cacheService.enabled).toBe(true);
    });

    it('should handle close event', () => {
      const closeHandler = mockRedis.on.mock.calls.find((call) => call[0] === 'close')?.[1];

      if (closeHandler) closeHandler();

      expect(cacheService.enabled).toBe(false);
    });
  });
});
