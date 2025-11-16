/**
 * ReportInstanceService Unit Tests
 * Comprehensive test coverage for ReportInstance functionality
 */

import 'reflect-metadata';
import { ReportInstanceService } from '../../../src/services/ReportInstanceService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('ReportInstanceService', () => {
  let service: ReportInstanceService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

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
      const mockData = {"id":"1"};
      mockPrisma.reportInstance.create.mockResolvedValue(mockData as any);
      
      const result = await service.createInstance({ type: "test", name: "test", generatedById: "user1", format: "pdf" });
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.create).toHaveBeenCalled();
    });

    it('should handle errors in createInstance', async () => {
      mockPrisma.reportInstance.create.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.createInstance({ type: "test", name: "test", generatedById: "user1", format: "pdf" })).rejects.toThrow();
    });

    it('should validate input for createInstance', async () => {
      await expect(service.createInstance({})).rejects.toThrow();
    });
  });

  describe('getInstances', () => {
    it('should get all instances', async () => {
      const mockData = [{"id":"1"}];
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockData as any);
      
      const result = await service.getInstances();
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalled();
    });

    it('should handle errors in getInstances', async () => {
      mockPrisma.reportInstance.findMany.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.getInstances()).rejects.toThrow();
    });

    it('should validate input for getInstances', async () => {
      await expect(service.getInstances(undefined)).rejects.toThrow();
    });
  });

  describe('getInstanceById', () => {
    it('should get instance by ID', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportInstance.findUnique.mockResolvedValue(mockData as any);
      
      const result = await service.getInstanceById("instance1");
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.findUnique).toHaveBeenCalled();
    });

    it('should handle errors in getInstanceById', async () => {
      mockPrisma.reportInstance.findUnique.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.getInstanceById("instance1")).rejects.toThrow();
    });

    it('should validate input for getInstanceById', async () => {
      await expect(service.getInstanceById("")).rejects.toThrow();
    });
  });

  describe('deleteInstance', () => {
    it('should delete instance', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportInstance.delete.mockResolvedValue(mockData as any);
      
      const result = await service.deleteInstance("instance1");
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.delete).toHaveBeenCalled();
    });

    it('should handle errors in deleteInstance', async () => {
      mockPrisma.reportInstance.delete.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.deleteInstance("instance1")).rejects.toThrow();
    });

    it('should validate input for deleteInstance', async () => {
      await expect(service.deleteInstance("")).rejects.toThrow();
    });
  });

  describe('deleteOldInstances', () => {
    it('should delete old instances', async () => {
      const mockData = {"count":5};
      mockPrisma.reportInstance.deleteMany.mockResolvedValue(mockData as any);
      
      const result = await service.deleteOldInstances(30);
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.deleteMany).toHaveBeenCalled();
    });

    it('should handle errors in deleteOldInstances', async () => {
      mockPrisma.reportInstance.deleteMany.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.deleteOldInstances(30)).rejects.toThrow();
    });

    it('should validate input for deleteOldInstances', async () => {
      await expect(service.deleteOldInstances(-1)).rejects.toThrow();
    });
  });

  describe('getInstanceStats', () => {
    it('should get statistics', async () => {
      const mockData = [];
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockData as any);
      
      const result = await service.getInstanceStats();
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalled();
    });

    it('should handle errors in getInstanceStats', async () => {
      mockPrisma.reportInstance.findMany.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.getInstanceStats()).rejects.toThrow();
    });

    it('should validate input for getInstanceStats', async () => {
      await expect(service.getInstanceStats(undefined)).rejects.toThrow();
    });
  });
  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.reportInstance.findMany.mockRejectedValue(dbError);
      
      await expect(service.createInstance()).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      await expect(service.createInstance(null as any)).rejects.toThrow();
    });

    it('should handle not found errors', async () => {
      mockPrisma.reportInstance.findUnique.mockResolvedValue(null);
      
      await expect(service.createInstance('nonexistent')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      mockPrisma.reportInstance.findMany.mockResolvedValue([]);
      
      const result = await service.createInstance();
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
      mockPrisma.reportInstance.findMany.mockResolvedValue(largeDataset as any);
      
      const result = await service.createInstance();
      expect(result).toHaveLength(1000);
    });

    it('should handle special characters in input', async () => {
      const specialInput = { name: "Test's & <Special> "Chars"" };
      mockPrisma.reportInstance.create.mockResolvedValue({ id: '1', ...specialInput } as any);
      
      await expect(service.createInstance(specialInput as any)).resolves.toBeDefined();
    });
  });
});
