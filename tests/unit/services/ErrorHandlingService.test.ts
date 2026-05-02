import 'reflect-metadata';
import { ErrorHandlingService } from '../../../src/services/ErrorHandlingService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ErrorHandlingService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ErrorHandlingService);
    });
  });

  describe('logError', () => {
    it('should log error and return status', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const error = new Error('Test error');
      const result = await service.logError(error);

      expect(result).toMatchObject({
        logged: true,
        timestamp: expect.any(Date),
        error: 'Test error',
      });
    });

    it('should log error with context', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const error = new Error('Test error');
      const context = { userId: 'user-123', action: 'create-event' };

      const result = await service.logError(error, context);

      expect(result.logged).toBe(true);
      expect(mockPrisma.errorLog.create).toHaveBeenCalled();
    });

    it('should handle Error objects', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const error = new Error('Database connection failed');
      const result = await service.logError(error);

      expect(result.error).toBe('Database connection failed');
    });

    it('should handle string errors', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const result = await service.logError('Something went wrong');

      expect(result.error).toBe('Something went wrong');
    });

    it('should handle non-Error objects', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const error = { code: 500, message: 'Internal error' };
      const result = await service.logError(error);

      expect(result.error).toBe('[object Object]');
    });

    it('should include timestamp', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const beforeTime = new Date();
      const result = await service.logError(new Error('Test'));
      const afterTime = new Date();

      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should handle null error', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const result = await service.logError(null);

      expect(result.logged).toBe(true);
      expect(result.error).toBe('null');
    });

    it('should handle undefined error', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const result = await service.logError(undefined);

      expect(result.logged).toBe(true);
      expect(result.error).toBe('undefined');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.errorLog.create.mockRejectedValue(new Error('DB Error'));

      const result = await service.logError(new Error('Test error'));

      // Should still return logged: true even if DB fails
      expect(result.logged).toBe(true);
    });

    it('should always return logged: true', async () => {
      mockPrisma.errorLog.create.mockResolvedValue({ id: '1' } as any);

      const result = await service.logError(new Error('Any error'));
      expect(result.logged).toBe(true);
    });
  });

  describe('getErrorStats', () => {
    it('should return error statistics', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(10);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([]);

      const result = await service.getErrorStats();

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('last24Hours');
      expect(result).toHaveProperty('byType');
    });

    it('should return zero counts when no errors logged', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(0);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([]);

      const result = await service.getErrorStats();

      expect(result.total).toBe(0);
    });

    it('should return empty byType object when no errors', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(0);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([]);

      const result = await service.getErrorStats();

      expect(result.byType).toEqual({});
    });

    it('should filter by tenantId when provided', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(5);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([]);

      await service.getErrorStats('tenant-1');

      expect(mockPrisma.errorLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' })
        })
      );
    });

    it('should return number types for counts', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(5);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([]);

      const result = await service.getErrorStats();

      expect(typeof result.total).toBe('number');
      expect(typeof result.last24Hours).toBe('number');
    });

    it('should return object type for byType', async () => {
      mockPrisma.errorLog.count.mockResolvedValue(5);
      (mockPrisma.errorLog.groupBy as unknown as jest.Mock).mockResolvedValue([
        { level: 'ERROR', _count: { level: 3 } }
      ] as any);

      const result = await service.getErrorStats();

      expect(typeof result.byType).toBe('object');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.errorLog.count.mockRejectedValue(new Error('DB Error'));

      const result = await service.getErrorStats();

      // Should return default values on error
      expect(result.total).toBe(0);
      expect(result.byType).toEqual({});
    });
  });
});
