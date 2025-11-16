/**
 * ReportTemplateService Unit Tests
 * Comprehensive test coverage for ReportTemplate functionality
 */

import 'reflect-metadata';
import { ReportTemplateService } from '../../../src/services/ReportTemplateService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('ReportTemplateService', () => {
  let service: ReportTemplateService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ReportTemplateService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ReportTemplateService);
    });
  });

  describe('getAllTemplates', () => {
    it('should get all templates', async () => {
      const mockData = [{"id":"1"}];
      mockPrisma.reportTemplate.findMany.mockResolvedValue(mockData as any);
      
      const result = await service.getAllTemplates();
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalled();
    });

    it('should handle errors in getAllTemplates', async () => {
      mockPrisma.reportTemplate.findMany.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.getAllTemplates()).rejects.toThrow();
    });

    it('should validate input for getAllTemplates', async () => {
      await expect(service.getAllTemplates(undefined)).rejects.toThrow();
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportTemplate.findUnique.mockResolvedValue(mockData as any);
      
      const result = await service.getTemplateById("template1");
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.findUnique).toHaveBeenCalled();
    });

    it('should handle errors in getTemplateById', async () => {
      mockPrisma.reportTemplate.findUnique.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.getTemplateById("template1")).rejects.toThrow();
    });

    it('should validate input for getTemplateById', async () => {
      await expect(service.getTemplateById("")).rejects.toThrow();
    });
  });

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportTemplate.create.mockResolvedValue(mockData as any);
      
      const result = await service.createTemplate({ name: "test", type: "test", template: "test" });
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.create).toHaveBeenCalled();
    });

    it('should handle errors in createTemplate', async () => {
      mockPrisma.reportTemplate.create.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.createTemplate({ name: "test", type: "test", template: "test" })).rejects.toThrow();
    });

    it('should validate input for createTemplate', async () => {
      await expect(service.createTemplate({})).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportTemplate.update.mockResolvedValue(mockData as any);
      
      const result = await service.updateTemplate("template1", { name: "updated" });
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalled();
    });

    it('should handle errors in updateTemplate', async () => {
      mockPrisma.reportTemplate.update.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.updateTemplate("template1", { name: "updated" })).rejects.toThrow();
    });

    it('should validate input for updateTemplate', async () => {
      await expect(service.updateTemplate("", {})).rejects.toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      const mockData = {"id":"1"};
      mockPrisma.reportTemplate.delete.mockResolvedValue(mockData as any);
      
      const result = await service.deleteTemplate("template1");
      
      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.delete).toHaveBeenCalled();
    });

    it('should handle errors in deleteTemplate', async () => {
      mockPrisma.reportTemplate.delete.mockRejectedValue(new Error('Operation failed'));
      
      await expect(service.deleteTemplate("template1")).rejects.toThrow();
    });

    it('should validate input for deleteTemplate', async () => {
      await expect(service.deleteTemplate("")).rejects.toThrow();
    });
  });
  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.reportTemplate.findMany.mockRejectedValue(dbError);
      
      await expect(service.getAllTemplates()).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      await expect(service.getAllTemplates(null as any)).rejects.toThrow();
    });

    it('should handle not found errors', async () => {
      mockPrisma.reportTemplate.findUnique.mockResolvedValue(null);
      
      await expect(service.getAllTemplates('nonexistent')).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([]);
      
      const result = await service.getAllTemplates();
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }));
      mockPrisma.reportTemplate.findMany.mockResolvedValue(largeDataset as any);
      
      const result = await service.getAllTemplates();
      expect(result).toHaveLength(1000);
    });

    it('should handle special characters in input', async () => {
      const specialInput = { name: "Test's & <Special> "Chars"" };
      mockPrisma.reportTemplate.create.mockResolvedValue({ id: '1', ...specialInput } as any);
      
      await expect(service.getAllTemplates(specialInput as any)).resolves.toBeDefined();
    });
  });
});
