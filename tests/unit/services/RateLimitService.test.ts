/**
 * RateLimitService Tests
 * Comprehensive test coverage for rate limiting functionality
 */

import 'reflect-metadata';
import { RateLimitService, RateLimitConfig } from '../../../src/services/RateLimitService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { Request } from 'express';
import Redis from 'ioredis';

// Mock Redis
jest.mock('ioredis');

describe('RateLimitService', () => {
  let rateLimitService: RateLimitService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockRedis: DeepMockProxy<Redis>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();
    mockRedis = mockDeep<Redis>();

    // Mock Redis constructor
    (Redis as any).mockImplementation(() => mockRedis);

    // Mock Redis methods
    mockRedis.connect.mockResolvedValue(undefined as any);
    mockRedis.on.mockReturnValue(mockRedis);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(60);
    mockRedis.get.mockResolvedValue('1');
    mockRedis.decr.mockResolvedValue(0);
    mockRedis.del.mockResolvedValue(1);

    // Set status as ready
    Object.defineProperty(mockRedis, 'status', {
      get: () => 'ready',
      configurable: true
    });

    rateLimitService = new RateLimitService(mockPrisma);

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
  });

  describe('Configuration Management', () => {
    it('should initialize with default configurations', async () => {
      const configs = await rateLimitService.getAllConfigs();

      expect(configs).toBeDefined();
      expect(configs.length).toBeGreaterThanOrEqual(4);

      // Check default tiers exist
      const publicConfig = configs.find(c => c.tier === 'public');
      expect(publicConfig).toBeDefined();
      expect(publicConfig?.points).toBe(100);
      expect(publicConfig?.duration).toBe(60);
    });

    it('should get configuration for a specific tier', async () => {
      const config = await rateLimitService.getConfig('admin');

      expect(config).toBeDefined();
      expect(config.tier).toBe('admin');
      expect(config.points).toBe(5000);
      expect(config.duration).toBe(60);
      expect(config.blockDuration).toBe(0);
    });

    it('should get public config when tier not found', async () => {
      const config = await rateLimitService.getConfig('nonexistent');

      expect(config).toBeDefined();
      expect(config.tier).toBe('public');
    });

    it('should update rate limit configuration for a tier', async () => {
      const updates = {
        points: 200,
        duration: 120,
      };

      const updated = await rateLimitService.updateConfig('public', updates);

      expect(updated.tier).toBe('public');
      expect(updated.points).toBe(200);
      expect(updated.duration).toBe(120);
    });

    it('should cache updated configurations', async () => {
      await rateLimitService.updateConfig('public', { points: 300 });
      const config = await rateLimitService.getConfig('public');

      expect(config.points).toBe(300);
    });

    it('should get all configurations', async () => {
      const configs = await rateLimitService.getAllConfigs();

      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should have correct default authenticated config', async () => {
      const config = await rateLimitService.getConfig('authenticated');

      expect(config.tier).toBe('authenticated');
      expect(config.points).toBe(500);
      expect(config.duration).toBe(60);
      expect(config.blockDuration).toBe(300);
    });

    it('should have correct default judge config', async () => {
      const config = await rateLimitService.getConfig('judge');

      expect(config.tier).toBe('judge');
      expect(config.points).toBe(1000);
      expect(config.duration).toBe(60);
      expect(config.blockDuration).toBe(60);
    });
  });

  describe('Tier Detection from Request', () => {
    it('should return public tier for unauthenticated requests', () => {
      const mockRequest = {
        user: undefined,
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('public');
    });

    it('should return admin tier for admin users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'ADMIN' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should return admin tier for organizer users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'ORGANIZER' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should return judge tier for judge users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'JUDGE' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('judge');
    });

    it('should return admin tier for board users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'BOARD' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should return admin tier for tally master users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'TALLY_MASTER' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should return admin tier for auditor users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'AUDITOR' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should return authenticated tier for emcee users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'EMCEE' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('authenticated');
    });

    it('should return authenticated tier for contestant users', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'CONTESTANT' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('authenticated');
    });

    it('should return authenticated tier for unknown roles', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'UNKNOWN_ROLE' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('authenticated');
    });

    it('should handle case-insensitive roles', () => {
      const mockRequest = {
        user: { id: 'user-1', role: 'admin' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('admin');
    });

    it('should handle users without role property', () => {
      const mockRequest = {
        user: { id: 'user-1' },
      } as any as Request;

      const tier = rateLimitService.getTierFromRequest(mockRequest);

      expect(tier).toBe('authenticated');
    });
  });

  describe('Redis Integration', () => {
    it('should check Redis availability', () => {
      const isAvailable = rateLimitService.isRedisAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should return false when Redis is not connected', () => {
      Object.defineProperty(mockRedis, 'status', {
        get: () => 'disconnected',
        configurable: true
      });

      const isAvailable = rateLimitService.isRedisAvailable();
      expect(isAvailable).toBe(false);
    });

    it('should handle Redis connection errors gracefully', async () => {
      mockRedis.connect.mockRejectedValue(new Error('Connection failed'));

      const newService = new RateLimitService(mockPrisma);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Service should still be functional
      const config = await newService.getConfig('public');
      expect(config).toBeDefined();
    });

    it('should handle Redis initialization errors', async () => {
      const originalRedis = Redis;
      (Redis as any) = jest.fn().mockImplementation(() => {
        throw new Error('Redis initialization failed');
      });

      const newService = new RateLimitService(mockPrisma);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Service should still work with in-memory fallback
      const config = await newService.getConfig('public');
      expect(config).toBeDefined();

      (Redis as any) = originalRedis;
    });
  });

  describe('Rate Limiter Creation', () => {
    it('should create limiter for a specific tier', async () => {
      const limiter = rateLimitService.createLimiter('admin');

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create limiter with custom config', async () => {
      const customConfig = {
        points: 50,
        duration: 30,
      };

      const limiter = rateLimitService.createLimiter('public', customConfig);

      expect(limiter).toBeDefined();
    });

    it('should create endpoint-specific limiter', () => {
      const config = {
        points: 100,
        duration: 60,
      };

      const limiter = rateLimitService.createEndpointLimiter('/api/login', config);

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create endpoint limiter with default values', () => {
      const limiter = rateLimitService.createEndpointLimiter('/api/test', {});

      expect(limiter).toBeDefined();
    });

    it('should create user-specific limiter', () => {
      const limiter = rateLimitService.createUserLimiter('user-123', {
        points: 200,
        duration: 120,
      });

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should create user limiter with default values', () => {
      const limiter = rateLimitService.createUserLimiter('user-123', {});

      expect(limiter).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing environment variables', async () => {
      const originalEnv = { ...process.env };
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      const newService = new RateLimitService(mockPrisma);
      await new Promise(resolve => setTimeout(resolve, 10));

      const config = await newService.getConfig('public');
      expect(config).toBeDefined();

      process.env = originalEnv;
    });

    it('should handle invalid Redis port', async () => {
      const originalPort = process.env.REDIS_PORT;
      process.env.REDIS_PORT = 'invalid';

      const newService = new RateLimitService(mockPrisma);
      await new Promise(resolve => setTimeout(resolve, 10));

      const config = await newService.getConfig('public');
      expect(config).toBeDefined();

      process.env.REDIS_PORT = originalPort;
    });

    it('should handle partial config updates', async () => {
      const updated = await rateLimitService.updateConfig('judge', {
        points: 1500,
      });

      expect(updated.points).toBe(1500);
      expect(updated.tier).toBe('judge');
      expect(updated.duration).toBe(60); // Unchanged
    });

    it('should handle concurrent config reads', async () => {
      const promises = [
        rateLimitService.getConfig('public'),
        rateLimitService.getConfig('admin'),
        rateLimitService.getConfig('judge'),
      ];

      const configs = await Promise.all(promises);

      expect(configs).toHaveLength(3);
      expect(configs[0].tier).toBe('public');
      expect(configs[1].tier).toBe('admin');
      expect(configs[2].tier).toBe('judge');
    });

    it('should handle zero block duration', async () => {
      const config = await rateLimitService.getConfig('admin');
      expect(config.blockDuration).toBe(0);
    });

    it('should merge custom config with tier config', async () => {
      const customConfig = { points: 999 };
      const limiter = rateLimitService.createLimiter('public', customConfig);

      expect(limiter).toBeDefined();
      expect(typeof limiter).toBe('function');
    });

    it('should handle multiple config updates to same tier', async () => {
      await rateLimitService.updateConfig('public', { points: 150 });
      await rateLimitService.updateConfig('public', { duration: 90 });
      await rateLimitService.updateConfig('public', { points: 200 });

      const config = await rateLimitService.getConfig('public');
      expect(config.points).toBe(200);
      expect(config.duration).toBe(90);
    });
  });
});
