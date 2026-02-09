/**
 * ReportInstanceService Unit Tests
 * Comprehensive test coverage for ReportInstance functionality
 */

import 'reflect-metadata';
import { ReportInstanceService } from '../../../src/services/ReportInstanceService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ReportInstanceService', () => {
  let service: ReportInstanceService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  const tenantId = 'tenant-1';

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ReportInstanceService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ReportInstanceService);
    });
  });

  describe('createInstance', () => {
    it('should create new instance', async () => {
      const createData = { type: 'test', name: 'Test Report', generatedById: 'user1', format: 'pdf', tenantId };
      const mockData = { id: '1', ...createData, createdAt: new Date() };
      mockPrisma.reportInstance.create.mockResolvedValue(mockData as any);

      const result = await service.createInstance(createData);

      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.create).toHaveBeenCalled();
    });

    it('should handle errors in createInstance', async () => {
      mockPrisma.reportInstance.create.mockRejectedValue(new Error('Operation failed'));

      await expect(service.createInstance({ type: 'test', name: 'test', generatedById: 'user1', format: 'pdf', tenantId })).rejects.toThrow();
    });

    it('should validate input for createInstance', async () => {
      await expect(service.createInstance({} as any)).rejects.toThrow();
    });
  });

  describe('getInstances', () => {
    it('should get all instances', async () => {
      const mockData = [{ id: '1', type: 'test', name: 'Report', generatedById: 'user1', format: 'pdf', tenantId }];
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockData as any);

      const result = await service.getInstances();

      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalled();
    });

    it('should filter instances by type', async () => {
      const mockData = [{ id: '1', type: 'pdf', tenantId }];
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockData as any);

      const result = await service.getInstances({ type: 'pdf' });

      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalled();
    });

    it('should handle errors in getInstances', async () => {
      mockPrisma.reportInstance.findMany.mockRejectedValue(new Error('Operation failed'));

      await expect(service.getInstances()).rejects.toThrow();
    });
  });

  describe('getInstanceById', () => {
    it('should get instance by ID', async () => {
      const mockData = { id: 'instance1', type: 'test', name: 'Report', generatedById: 'user1', format: 'pdf', tenantId };
      mockPrisma.reportInstance.findUnique.mockResolvedValue(mockData as any);

      const result = await service.getInstanceById('instance1');

      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.findUnique).toHaveBeenCalledWith({
        where: { id: 'instance1' }
      });
    });

    it('should handle errors in getInstanceById', async () => {
      mockPrisma.reportInstance.findUnique.mockRejectedValue(new Error('Operation failed'));

      await expect(service.getInstanceById('instance1')).rejects.toThrow();
    });

    it('should throw not found for missing instance', async () => {
      mockPrisma.reportInstance.findUnique.mockResolvedValue(null);

      await expect(service.getInstanceById('nonexistent')).rejects.toThrow();
    });
  });

  describe('deleteInstance', () => {
    it('should delete instance', async () => {
      const mockData = { id: 'instance1', type: 'test', tenantId };
      mockPrisma.reportInstance.findUnique.mockResolvedValue(mockData as any);
      mockPrisma.reportInstance.delete.mockResolvedValue(mockData as any);

      await service.deleteInstance('instance1');

      expect(mockPrisma.reportInstance.delete).toHaveBeenCalledWith({
        where: { id: 'instance1' }
      });
    });

    it('should handle errors in deleteInstance', async () => {
      mockPrisma.reportInstance.findUnique.mockResolvedValue({ id: 'instance1' } as any);
      mockPrisma.reportInstance.delete.mockRejectedValue(new Error('Operation failed'));

      await expect(service.deleteInstance('instance1')).rejects.toThrow();
    });
  });

  describe('deleteOldInstances', () => {
    it('should delete old instances', async () => {
      const mockData = { count: 5 };
      mockPrisma.reportInstance.deleteMany.mockResolvedValue(mockData as any);

      const result = await service.deleteOldInstances(30);

      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.deleteMany).toHaveBeenCalled();
    });

    it('should handle errors in deleteOldInstances', async () => {
      mockPrisma.reportInstance.deleteMany.mockRejectedValue(new Error('Operation failed'));

      await expect(service.deleteOldInstances(30)).rejects.toThrow();
    });
  });

  describe('getInstanceStats', () => {
    it('should get statistics', async () => {
      const mockData = [
        { id: '1', type: 'pdf', format: 'pdf', tenantId },
        { id: '2', type: 'csv', format: 'csv', tenantId }
      ];
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockData as any);

      const result = await service.getInstanceStats();

      expect(result).toBeDefined();
    });

    it('should handle errors in getInstanceStats', async () => {
      mockPrisma.reportInstance.findMany.mockRejectedValue(new Error('Operation failed'));

      await expect(service.getInstanceStats()).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      mockPrisma.reportInstance.findMany.mockResolvedValue([]);

      const result = await service.getInstances();
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), tenantId }));
      mockPrisma.reportInstance.findMany.mockResolvedValue(largeDataset as any);

      const result = await service.getInstances();
      expect(result).toHaveLength(1000);
    });

    it('should handle special characters in input', async () => {
      const specialInput = {
        name: "Test's & <Special> Chars",
        type: 'report',
        generatedById: 'user1',
        format: 'pdf',
        tenantId
      };
      mockPrisma.reportInstance.create.mockResolvedValue({ id: '1', ...specialInput } as any);

      const result = await service.createInstance(specialInput);
      expect(result).toBeDefined();
    });
  });
});
