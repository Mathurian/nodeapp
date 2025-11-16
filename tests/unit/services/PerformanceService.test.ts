import { PerformanceService } from '../../../src/services/PerformanceService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import * as fs from 'fs/promises';
import * as os from 'os';

jest.mock('fs/promises');
jest.mock('os');

describe('PerformanceService', () => {
  let service: PerformanceService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    mockPrisma = mockDeep<PrismaClient>();
    service = new PerformanceService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PerformanceService);
    });
  });

  describe('logPerformance', () => {
    beforeEach(() => {
      process.env.PERF_SAMPLE_RATE = '1.0'; // Always log for tests
    });

    it('should log performance data with sampling', async () => {
      mockPrisma.performanceLog.create.mockResolvedValue({} as any);

      await service.logPerformance({
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
      });

      expect(mockPrisma.performanceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endpoint: '/api/users',
          method: 'GET',
          responseTime: 150,
          statusCode: 200,
        }),
      });
    });

    it('should include optional fields when provided', async () => {
      mockPrisma.performanceLog.create.mockResolvedValue({} as any);

      await service.logPerformance({
        endpoint: '/api/events',
        method: 'POST',
        responseTime: 250,
        statusCode: 201,
        userId: 'user-123',
        eventId: 'event-456',
        contestId: 'contest-789',
        categoryId: 'category-012',
      });

      expect(mockPrisma.performanceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endpoint: '/api/events',
          method: 'POST',
          responseTime: 250,
          statusCode: 201,
          userId: 'user-123',
          eventId: 'event-456',
          contestId: 'contest-789',
          categoryId: 'category-012',
        }),
      });
    });

    it('should handle null optional fields', async () => {
      mockPrisma.performanceLog.create.mockResolvedValue({} as any);

      await service.logPerformance({
        endpoint: '/api/health',
        method: 'GET',
        responseTime: 5,
        statusCode: 200,
        userId: null,
      });

      expect(mockPrisma.performanceLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
        }),
      });
    });

    it('should respect sampling rate', async () => {
      process.env.PERF_SAMPLE_RATE = '0.0'; // Never log
      mockPrisma.performanceLog.create.mockResolvedValue({} as any);

      await service.logPerformance({
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 150,
        statusCode: 200,
      });

      expect(mockPrisma.performanceLog.create).not.toHaveBeenCalled();
    });

    it('should silently fail on database error', async () => {
      mockPrisma.performanceLog.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.logPerformance({
          endpoint: '/api/users',
          method: 'GET',
          responseTime: 150,
          statusCode: 200,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics for 24h', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 150 },
        _min: { responseTime: 50 },
        _max: { responseTime: 500 },
        _count: { id: 1000 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([
          { statusCode: 200, _count: { id: 800 }, _avg: { responseTime: 140 } },
          { statusCode: 404, _count: { id: 100 }, _avg: { responseTime: 80 } },
        ] as any)
        .mockResolvedValueOnce([
          { endpoint: '/api/users', _count: { id: 300 }, _avg: { responseTime: 200 } },
          { endpoint: '/api/events', _count: { id: 200 }, _avg: { responseTime: 180 } },
        ] as any)
        .mockResolvedValueOnce([
          { statusCode: 404, _count: { id: 100 } },
          { statusCode: 500, _count: { id: 50 } },
        ] as any);

      const result = await service.getPerformanceStats({ timeRange: '24h' });

      expect(result).toMatchObject({
        timeRange: '24h',
        totalRequests: 1000,
        averageResponseTime: 150,
        minResponseTime: 50,
        maxResponseTime: 500,
        errorRate: '15.00',
      });
    });

    it('should handle 1h time range', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 100 },
        _min: { responseTime: 30 },
        _max: { responseTime: 300 },
        _count: { id: 200 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getPerformanceStats({ timeRange: '1h' });

      expect(result.timeRange).toBe('1h');
    });

    it('should handle 7d time range', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 120 },
        _min: { responseTime: 40 },
        _max: { responseTime: 600 },
        _count: { id: 5000 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getPerformanceStats({ timeRange: '7d' });

      expect(result.timeRange).toBe('7d');
    });

    it('should handle 30d time range', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 130 },
        _min: { responseTime: 50 },
        _max: { responseTime: 1000 },
        _count: { id: 20000 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getPerformanceStats({ timeRange: '30d' });

      expect(result.timeRange).toBe('30d');
    });

    it('should filter by endpoint', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 180 },
        _min: { responseTime: 100 },
        _max: { responseTime: 300 },
        _count: { id: 500 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getPerformanceStats({
        timeRange: '24h',
        endpoint: '/api/users',
      });

      expect(mockPrisma.performanceLog.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endpoint: '/api/users',
          }),
        })
      );
    });

    it('should filter by method', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 200 },
        _min: { responseTime: 150 },
        _max: { responseTime: 400 },
        _count: { id: 300 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getPerformanceStats({
        timeRange: '24h',
        method: 'POST',
      });

      expect(mockPrisma.performanceLog.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: 'POST',
          }),
        })
      );
    });

    it('should calculate error rate correctly', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: 150 },
        _min: { responseTime: 50 },
        _max: { responseTime: 500 },
        _count: { id: 1000 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { statusCode: 400, _count: { id: 50 } },
          { statusCode: 404, _count: { id: 100 } },
          { statusCode: 500, _count: { id: 50 } },
        ] as any);

      const result = await service.getPerformanceStats({ timeRange: '24h' });

      expect(result.errorRate).toBe('20.00');
    });

    it('should handle zero requests', async () => {
      mockPrisma.performanceLog.aggregate.mockResolvedValue({
        _avg: { responseTime: null },
        _min: { responseTime: null },
        _max: { responseTime: null },
        _count: { id: 0 },
      } as any);

      mockPrisma.performanceLog.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getPerformanceStats({ timeRange: '24h' });

      expect(result.totalRequests).toBe(0);
      expect(result.averageResponseTime).toBe(0);
      expect(result.errorRate).toBe('0');
    });
  });

  describe('getSystemMetrics', () => {
    beforeEach(() => {
      (os.platform as jest.Mock).mockReturnValue('linux');
      (os.arch as jest.Mock).mockReturnValue('x64');
      (os.hostname as jest.Mock).mockReturnValue('test-server');
      (os.uptime as jest.Mock).mockReturnValue(86400);
      (os.loadavg as jest.Mock).mockReturnValue([1.5, 1.2, 1.0]);
      (os.totalmem as jest.Mock).mockReturnValue(16 * 1024 * 1024 * 1024);
      (os.freemem as jest.Mock).mockReturnValue(8 * 1024 * 1024 * 1024);
      (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]);
    });

    it('should return system metrics', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ status: 1 }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(5) }]);
      (fs.stat as jest.Mock).mockResolvedValue({});

      const result = await service.getSystemMetrics();

      expect(result).toMatchObject({
        timestamp: expect.any(String),
        process: expect.objectContaining({
          pid: expect.any(Number),
          uptime: expect.any(Number),
          cpuUsage: expect.any(Object),
          memoryUsage: expect.any(Object),
        }),
        system: expect.objectContaining({
          platform: 'linux',
          arch: 'x64',
          hostname: 'test-server',
        }),
        database: expect.objectContaining({
          status: 'connected',
        }),
      });
    });

    it('should handle database connection failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      (fs.stat as jest.Mock).mockResolvedValue({});

      await expect(service.getSystemMetrics()).rejects.toThrow();
    });

    it('should handle disk access failure', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ status: 1 }]);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: BigInt(5) }]);
      (fs.stat as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const result = await service.getSystemMetrics();

      expect(result.disk.available).toBe(false);
      expect(result.disk.error).toBeDefined();
    });
  });

  describe('getPerformanceLogs', () => {
    it('should return paginated performance logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          endpoint: '/api/users',
          method: 'GET',
          responseTime: 150,
          statusCode: 200,
          createdAt: new Date(),
          user: { id: 'user1', name: 'Test User', email: 'test@example.com', role: 'USER' },
        },
      ];

      mockPrisma.performanceLog.findMany.mockResolvedValue(mockLogs as any);
      mockPrisma.performanceLog.count.mockResolvedValue(50);

      const result = await service.getPerformanceLogs({ page: 1, limit: 10 });

      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 50,
        pages: 5,
      });
    });

    it('should filter by endpoint', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({ endpoint: '/api/users' });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endpoint: { contains: '/api/users' },
          }),
        })
      );
    });

    it('should filter by method', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({ method: 'POST' });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            method: 'POST',
          }),
        })
      );
    });

    it('should filter by status code', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({ statusCode: 404 });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statusCode: 404,
          }),
        })
      );
    });

    it('should filter by userId', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({ userId: 'user-123' });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
          }),
        })
      );
    });

    it('should filter by response time range', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({
        minResponseTime: 100,
        maxResponseTime: 500,
      });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            responseTime: { gte: 100, lte: 500 },
          }),
        })
      );
    });

    it('should filter by date range', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(0);

      await service.getPerformanceLogs({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.performanceLog.findMany.mockResolvedValue([]);
      mockPrisma.performanceLog.count.mockResolvedValue(100);

      await service.getPerformanceLogs({ page: 3, limit: 20 });

      expect(mockPrisma.performanceLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        })
      );
    });
  });

  describe('clearPerformanceLogs', () => {
    it('should clear all logs when no date provided', async () => {
      mockPrisma.performanceLog.deleteMany.mockResolvedValue({ count: 1000 });

      const result = await service.clearPerformanceLogs();

      expect(result).toMatchObject({
        message: 'Cleared 1000 performance log entries',
        count: 1000,
      });
      expect(mockPrisma.performanceLog.deleteMany).toHaveBeenCalledWith({
        where: {},
      });
    });

    it('should clear logs older than specified date', async () => {
      mockPrisma.performanceLog.deleteMany.mockResolvedValue({ count: 500 });

      const result = await service.clearPerformanceLogs('2024-01-01');

      expect(result.count).toBe(500);
      expect(mockPrisma.performanceLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: new Date('2024-01-01'),
          },
        },
      });
    });

    it('should handle zero deleted logs', async () => {
      mockPrisma.performanceLog.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.clearPerformanceLogs();

      expect(result.count).toBe(0);
    });
  });

  describe('getHealthCheck', () => {
    beforeEach(() => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);
    });

    it('should return healthy status when all checks pass', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ status: 1 }]);

      const result = await service.getHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.checks).toMatchObject({
        database: true,
        memory: true,
        disk: true,
        uptime: true,
      });
    });

    it('should return unhealthy status when database fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

      const result = await service.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database).toBe(false);
    });

    it('should return unhealthy status when disk fails', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ status: 1 }]);
      (fs.access as jest.Mock).mockRejectedValue(new Error('Access denied'));

      const result = await service.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.disk).toBe(false);
    });

    it('should include memory usage', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ status: 1 }]);

      const result = await service.getHealthCheck();

      expect(result.memory).toBeDefined();
      expect(result.memory.used).toBeGreaterThan(0);
      expect(result.memory.total).toBeGreaterThan(0);
      expect(result.memory.percent).toBeDefined();
    });

    it('should include uptime', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ status: 1 }]);

      const result = await service.getHealthCheck();

      expect(result.uptime).toBeGreaterThan(0);
    });
  });
});
