import 'reflect-metadata';
import { HealthCheckService, getHealthCheckService } from '../../../src/services/HealthCheckService';
import prisma from '../../../src/utils/prisma';
import * as RedisCacheService from '../../../src/services/RedisCacheService';
import * as VirusScanService from '../../../src/services/VirusScanService';
import { SecretManager } from '../../../src/services/SecretManager';
import fs from 'fs';

jest.mock('../../../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let mockCacheService: any;
  let mockVirusScanService: any;
  let mockSecretManager: any;

  let prismaSpy: jest.SpyInstance;
  let getCacheServiceSpy: jest.SpyInstance;
  let getVirusScanServiceSpy: jest.SpyInstance;
  let secretManagerGetInstanceSpy: jest.SpyInstance;
  let fsWriteFileSyncSpy: jest.SpyInstance;
  let fsUnlinkSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new HealthCheckService();

    mockCacheService = {
      healthCheck: jest.fn(),
      getCacheMode: jest.fn(),
      isUsingMemoryCache: jest.fn(),
      getStatistics: jest.fn(),
    };

    mockVirusScanService = {
      getServiceInfo: jest.fn(),
      isAvailable: jest.fn(),
    };

    mockSecretManager = {
      healthCheck: jest.fn(),
    };

    prismaSpy = prisma.$queryRaw as jest.MockedFunction<typeof prisma.$queryRaw>;
    getCacheServiceSpy = jest.spyOn(RedisCacheService, 'getCacheService').mockReturnValue(mockCacheService);
    getVirusScanServiceSpy = jest.spyOn(VirusScanService, 'getVirusScanService').mockReturnValue(mockVirusScanService);
    secretManagerGetInstanceSpy = jest.spyOn(SecretManager, 'getInstance').mockReturnValue(mockSecretManager as any);

    // Mock synchronous fs methods (the service uses fs.writeFileSync and fs.unlinkSync)
    fsWriteFileSyncSpy = jest.spyOn(fs, 'writeFileSync');
    fsUnlinkSyncSpy = jest.spyOn(fs, 'unlinkSync');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all services are healthy', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({
        hitRate: 0.85,
        keyCount: 100,
        memoryUsage: '10MB',
      });

      mockVirusScanService.getServiceInfo.mockReturnValue({
        enabled: true,
        mode: 'socket',
        connection: 'active',
        cacheSize: 1000,
        config: { fallbackBehavior: 'block' },
      });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);

      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(5);
      expect(result.services.every(s => s.status === 'healthy')).toBe(true);
      expect(result.summary).toEqual({
        healthy: 5,
        degraded: 0,
        unhealthy: 0,
      });
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return degraded status when cache is using memory fallback', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'memory', redisMode: null });
      mockCacheService.isUsingMemoryCache.mockReturnValue(true);
      mockCacheService.getStatistics.mockResolvedValue({
        hitRate: 0.75,
        keyCount: 50,
        memoryUsage: '5MB',
      });

      mockVirusScanService.getServiceInfo.mockReturnValue({
        enabled: true,
        mode: 'socket',
        config: { fallbackBehavior: 'allow' },
      });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('degraded');
      expect(result.summary.degraded).toBeGreaterThan(0);

      const redisService = result.services.find(s => s.name === 'redis');
      expect(redisService?.status).toBe('degraded');
      expect(redisService?.message).toContain('memory');
    });

    it('should return unhealthy status when database fails', async () => {
      prismaSpy.mockRejectedValue(new Error('Connection timeout'));

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.summary.unhealthy).toBeGreaterThan(0);

      const dbService = result.services.find(s => s.name === 'database');
      expect(dbService?.status).toBe('unhealthy');
      expect(dbService?.message).toContain('failed');
    });

    it('should handle virus scan disabled gracefully', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({
        enabled: false,
        mode: 'disabled',
        config: { fallbackBehavior: 'allow' },
      });

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      const virusService = result.services.find(s => s.name === 'virusScan');
      expect(virusService?.status).toBe('degraded');
      expect(virusService?.message).toContain('disabled');
    });

    it('should handle virus scan unavailable with allow fallback', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({
        enabled: true,
        mode: 'socket',
        connection: 'disconnected',
        config: { fallbackBehavior: 'allow' },
      });
      mockVirusScanService.isAvailable.mockResolvedValue(false);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      const virusService = result.services.find(s => s.name === 'virusScan');
      expect(virusService?.status).toBe('degraded');
      expect(virusService?.message).toContain('unavailable');
      expect(virusService?.message).toContain('allowing');
    });

    it('should handle virus scan unavailable with block fallback', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({
        enabled: true,
        mode: 'socket',
        connection: 'disconnected',
        config: { fallbackBehavior: 'block' },
      });
      mockVirusScanService.isAvailable.mockResolvedValue(false);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      const virusService = result.services.find(s => s.name === 'virusScan');
      expect(virusService?.status).toBe('unhealthy');
      expect(virusService?.message).toContain('disabled');
    });

    it('should handle secrets management failure', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(false);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      const secretsService = result.services.find(s => s.name === 'secrets');
      expect(secretsService?.status).toBe('unhealthy');
    });

    it('should handle file system write failure', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await service.checkHealth();

      expect(result.status).toBe('unhealthy');
      const fsService = result.services.find(s => s.name === 'fileSystem');
      expect(fsService?.status).toBe('unhealthy');
      expect(fsService?.details?.error).toContain('Permission denied');
    });

    it('should handle cache service check failure gracefully', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockRejectedValue(new Error('Cache connection failed'));

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      const redisService = result.services.find(s => s.name === 'redis');
      expect(redisService?.status).toBe('degraded');
      expect(redisService?.details?.error).toContain('Cache connection failed');
    });

    it('should handle virus scan check exception gracefully', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockImplementation(() => {
        throw new Error('Service info error');
      });

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      const virusService = result.services.find(s => s.name === 'virusScan');
      expect(virusService?.status).toBe('degraded');
      expect(virusService?.details?.error).toContain('Service info error');
    });

    it('should handle secrets check exception', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockRejectedValue(new Error('Secrets unavailable'));
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      const secretsService = result.services.find(s => s.name === 'secrets');
      expect(secretsService?.status).toBe('unhealthy');
      expect(secretsService?.details?.error).toContain('Secrets unavailable');
    });

    it('should include response times for all services', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkHealth();

      result.services.forEach(serviceHealth => {
        expect(serviceHealth.responseTime).toBeGreaterThanOrEqual(0);
        expect(typeof serviceHealth.responseTime).toBe('number');
      });
    });
  });

  describe('checkReadiness', () => {
    it('should return true when database is healthy', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkReadiness();

      expect(result).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      prismaSpy.mockRejectedValue(new Error('Connection failed'));

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'redis', redisMode: 'standalone' });
      mockCacheService.isUsingMemoryCache.mockReturnValue(false);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.9, keyCount: 100, memoryUsage: '10MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: true, mode: 'socket', config: { fallbackBehavior: 'allow' } });
      mockVirusScanService.isAvailable.mockResolvedValue(true);

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkReadiness();

      expect(result).toBe(false);
    });

    it('should return true even if other services are degraded', async () => {
      prismaSpy.mockResolvedValue([{ result: 1 }]);

      mockCacheService.healthCheck.mockResolvedValue(true);
      mockCacheService.getCacheMode.mockReturnValue({ mode: 'memory', redisMode: null });
      mockCacheService.isUsingMemoryCache.mockReturnValue(true);
      mockCacheService.getStatistics.mockResolvedValue({ hitRate: 0.5, keyCount: 10, memoryUsage: '1MB' });

      mockVirusScanService.getServiceInfo.mockReturnValue({ enabled: false, mode: 'disabled', config: { fallbackBehavior: 'allow' } });

      mockSecretManager.healthCheck.mockResolvedValue(true);
      fsWriteFileSyncSpy.mockReturnValue(undefined);
      fsUnlinkSyncSpy.mockReturnValue(undefined);

      const result = await service.checkReadiness();

      expect(result).toBe(true);
    });
  });

  describe('checkLiveness', () => {
    it('should always return true', () => {
      const result = service.checkLiveness();

      expect(result).toBe(true);
    });
  });

  describe('getHealthCheckService', () => {
    it('should return singleton instance', () => {
      const instance1 = getHealthCheckService();
      const instance2 = getHealthCheckService();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(HealthCheckService);
    });
  });
});
