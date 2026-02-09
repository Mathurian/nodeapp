/**
 * ReportTemplateService Unit Tests
 * Comprehensive test coverage for ReportTemplate functionality
 */

import 'reflect-metadata';
import { ReportTemplateService } from '../../../src/services/ReportTemplateService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('ReportTemplateService', () => {
  let service: ReportTemplateService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  const tenantId = 'tenant-1';

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
      const mockData = [{ id: '1', name: 'Test Template', type: 'report', template: 'content', tenantId }];
      mockPrisma.reportTemplate.findMany.mockResolvedValue(mockData as any);

      const result = await service.getAllTemplates(tenantId);

      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should filter templates by type', async () => {
      const mockData = [{ id: '1', name: 'Test Template', type: 'pdf', template: 'content', tenantId }];
      mockPrisma.reportTemplate.findMany.mockResolvedValue(mockData as any);

      const result = await service.getAllTemplates(tenantId, { type: 'pdf' });

      expect(mockPrisma.reportTemplate.findMany).toHaveBeenCalledWith({
        where: { tenantId, type: 'pdf' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle errors in getAllTemplates', async () => {
      mockPrisma.reportTemplate.findMany.mockRejectedValue(new Error('Operation failed'));

      await expect(service.getAllTemplates(tenantId)).rejects.toThrow();
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID', async () => {
      const mockData = { id: 'template1', name: 'Test', type: 'report', template: 'content', tenantId };
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(mockData as any);

      const result = await service.getTemplateById('template1', tenantId);

      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.findFirst).toHaveBeenCalledWith({
        where: { id: 'template1', tenantId }
      });
    });

    it('should handle errors in getTemplateById', async () => {
      mockPrisma.reportTemplate.findFirst.mockRejectedValue(new Error('Operation failed'));

      await expect(service.getTemplateById('template1', tenantId)).rejects.toThrow();
    });

    it('should throw not found for missing template', async () => {
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.getTemplateById('nonexistent', tenantId)).rejects.toThrow();
    });
  });

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const createData = { name: 'test', type: 'report', template: 'content', tenantId };
      const mockData = { id: '1', ...createData };
      mockPrisma.reportTemplate.create.mockResolvedValue(mockData as any);

      const result = await service.createTemplate(createData);

      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.create).toHaveBeenCalled();
    });

    it('should handle errors in createTemplate', async () => {
      mockPrisma.reportTemplate.create.mockRejectedValue(new Error('Operation failed'));

      await expect(service.createTemplate({ name: 'test', type: 'report', template: 'content', tenantId })).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockExisting = { id: 'template1', name: 'Test', type: 'report', template: 'content', tenantId };
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(mockExisting as any);
      const mockData = { ...mockExisting, name: 'updated' };
      mockPrisma.reportTemplate.update.mockResolvedValue(mockData as any);

      const result = await service.updateTemplate('template1', tenantId, { name: 'updated' });

      expect(result).toBeDefined();
      expect(mockPrisma.reportTemplate.update).toHaveBeenCalled();
    });

    it('should handle errors in updateTemplate', async () => {
      mockPrisma.reportTemplate.findFirst.mockResolvedValue({ id: 'template1' } as any);
      mockPrisma.reportTemplate.update.mockRejectedValue(new Error('Operation failed'));

      await expect(service.updateTemplate('template1', tenantId, { name: 'updated' })).rejects.toThrow();
    });

    it('should throw not found for missing template', async () => {
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.updateTemplate('nonexistent', tenantId, { name: 'updated' })).rejects.toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      const mockExisting = { id: 'template1', name: 'Test', type: 'report', template: 'content', tenantId };
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(mockExisting as any);
      mockPrisma.reportTemplate.delete.mockResolvedValue(mockExisting as any);

      await service.deleteTemplate('template1', tenantId);

      expect(mockPrisma.reportTemplate.delete).toHaveBeenCalledWith({
        where: { id: 'template1' }
      });
    });

    it('should handle errors in deleteTemplate', async () => {
      mockPrisma.reportTemplate.findFirst.mockResolvedValue({ id: 'template1' } as any);
      mockPrisma.reportTemplate.delete.mockRejectedValue(new Error('Operation failed'));

      await expect(service.deleteTemplate('template1', tenantId)).rejects.toThrow();
    });

    it('should throw not found for missing template', async () => {
      mockPrisma.reportTemplate.findFirst.mockResolvedValue(null);

      await expect(service.deleteTemplate('nonexistent', tenantId)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty results', async () => {
      mockPrisma.reportTemplate.findMany.mockResolvedValue([]);

      const result = await service.getAllTemplates(tenantId);
      expect(result).toEqual([]);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({ id: String(i), tenantId }));
      mockPrisma.reportTemplate.findMany.mockResolvedValue(largeDataset as any);

      const result = await service.getAllTemplates(tenantId);
      expect(result).toHaveLength(1000);
    });

    it('should handle special characters in input', async () => {
      const specialInput = { name: "Test's & <Special> Chars", type: 'report', template: 'content', tenantId };
      mockPrisma.reportTemplate.create.mockResolvedValue({ id: '1', ...specialInput } as any);

      const result = await service.createTemplate(specialInput);
      expect(result).toBeDefined();
    });
  });
});
