/**
 * CategoryTypeService Tests
 *
 * Comprehensive test suite for category type management including
 * system vs custom types, CRUD operations, and deletion constraints.
 *
 * Test Coverage:
 * - Category type retrieval
 * - Creation of custom types
 * - Type updates
 * - Deletion with system type protection
 * - Validation and authorization
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { CategoryTypeService } from '../../src/services/CategoryTypeService';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';
import prisma from '../../src/utils/prisma';

// Mock Prisma
jest.mock('../../src/utils/prisma', () => ({
  default: {
    categoryType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('CategoryTypeService', () => {
  let service: CategoryTypeService;

  beforeEach(() => {
    service = new CategoryTypeService();
    jest.clearAllMocks();
  });

  describe('getAllCategoryTypes', () => {
    it('should retrieve all category types sorted by name', async () => {
      const mockTypes = [
        { id: 'ct1', name: 'Dance', description: 'Dance categories', isSystem: false },
        { id: 'ct2', name: 'Vocal', description: 'Vocal categories', isSystem: true },
      ];

      (prisma.categoryType.findMany as any).mockResolvedValue(mockTypes);

      const result = await service.getAllCategoryTypes();

      expect(result).toEqual(mockTypes);
      expect(prisma.categoryType.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no types exist', async () => {
      (prisma.categoryType.findMany as any).mockResolvedValue([]);

      const result = await service.getAllCategoryTypes();

      expect(result).toEqual([]);
    });

    it('should include system and custom types', async () => {
      const mockTypes = [
        { id: 'ct1', name: 'System Type', isSystem: true },
        { id: 'ct2', name: 'Custom Type', isSystem: false },
      ];

      (prisma.categoryType.findMany as any).mockResolvedValue(mockTypes);

      const result = await service.getAllCategoryTypes();

      expect(result.some((t: any) => t.isSystem === true)).toBe(true);
      expect(result.some((t: any) => t.isSystem === false)).toBe(true);
    });

    it('should sort types alphabetically by name', async () => {
      const mockTypes = [
        { id: 'ct1', name: 'Zebra', isSystem: false },
        { id: 'ct2', name: 'Apple', isSystem: false },
        { id: 'ct3', name: 'Mango', isSystem: false },
      ];

      (prisma.categoryType.findMany as any).mockResolvedValue(mockTypes);

      await service.getAllCategoryTypes();

      expect(prisma.categoryType.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('createCategoryType', () => {
    it('should create a new custom category type', async () => {
      const mockCreated = {
        id: 'ct1',
        name: 'Instrumental',
        description: 'Instrumental categories',
        isSystem: false,
        createdById: 'u1',
      };

      (prisma.categoryType.create as any).mockResolvedValue(mockCreated);

      const result = await service.createCategoryType('Instrumental', 'Instrumental categories', 'u1');

      expect(result).toEqual(mockCreated);
      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: {
          name: 'Instrumental',
          description: 'Instrumental categories',
          isSystem: false,
          createdById: 'u1',
        },
      });
    });

    it('should throw ValidationError when name is missing', async () => {
      await expect(service.createCategoryType('', 'Description', 'u1')).rejects.toThrow(
        ValidationError
      );
    });

    it('should create type with null description', async () => {
      const mockCreated = {
        id: 'ct1',
        name: 'Type',
        description: null,
        isSystem: false,
        createdById: 'u1',
      };

      (prisma.categoryType.create as any).mockResolvedValue(mockCreated);

      const result = await service.createCategoryType('Type', null, 'u1');

      expect(result.description).toBeNull();
      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should always set isSystem to false for custom types', async () => {
      (prisma.categoryType.create as any).mockResolvedValue({ isSystem: false } as any);

      await service.createCategoryType('Type', 'Description', 'u1');

      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSystem: false,
        }),
      });
    });

    it('should handle empty string description as null', async () => {
      (prisma.categoryType.create as any).mockResolvedValue({
        id: 'ct1',
        description: null,
      } as any);

      await service.createCategoryType('Type', '', 'u1');

      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });
  });

  describe('updateCategoryType', () => {
    it('should update category type name', async () => {
      const mockUpdated = {
        id: 'ct1',
        name: 'Updated Name',
        description: 'Original description',
        isSystem: false,
      };

      (prisma.categoryType.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', 'Updated Name');

      expect(result.name).toBe('Updated Name');
      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update category type description', async () => {
      const mockUpdated = {
        id: 'ct1',
        name: 'Type',
        description: 'Updated description',
        isSystem: false,
      };

      (prisma.categoryType.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', undefined, 'Updated description');

      expect(result.description).toBe('Updated description');
      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { description: 'Updated description' },
      });
    });

    it('should update both name and description', async () => {
      const mockUpdated = {
        id: 'ct1',
        name: 'New Name',
        description: 'New description',
        isSystem: false,
      };

      (prisma.categoryType.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', 'New Name', 'New description');

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { name: 'New Name', description: 'New description' },
      });
    });

    it('should handle null description', async () => {
      (prisma.categoryType.update as any).mockResolvedValue({
        id: 'ct1',
        description: null,
      } as any);

      await service.updateCategoryType('ct1', undefined, null);

      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { description: null },
      });
    });

    it('should handle empty string description as null', async () => {
      (prisma.categoryType.update as any).mockResolvedValue({} as any);

      await service.updateCategoryType('ct1', undefined, '');

      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { description: null },
      });
    });

    it('should not update when no fields provided', async () => {
      (prisma.categoryType.update as any).mockResolvedValue({} as any);

      await service.updateCategoryType('ct1');

      expect(prisma.categoryType.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: {},
      });
    });

    it('should allow updating system types', async () => {
      const mockUpdated = {
        id: 'ct1',
        name: 'Updated System Type',
        isSystem: true,
      };

      (prisma.categoryType.update as any).mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', 'Updated System Type');

      expect(result.isSystem).toBe(true);
    });
  });

  describe('deleteCategoryType', () => {
    it('should delete a custom category type', async () => {
      const mockType = {
        id: 'ct1',
        name: 'Custom Type',
        isSystem: false,
      };

      (prisma.categoryType.findUnique as any).mockResolvedValue(mockType);
      (prisma.categoryType.delete as any).mockResolvedValue(mockType);

      await service.deleteCategoryType('ct1');

      expect(prisma.categoryType.delete).toHaveBeenCalledWith({
        where: { id: 'ct1' },
      });
    });

    it('should throw NotFoundError when category type does not exist', async () => {
      (prisma.categoryType.findUnique as any).mockResolvedValue(null);

      await expect(service.deleteCategoryType('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.deleteCategoryType('nonexistent')).rejects.toThrow(
        'CategoryType with ID nonexistent not found'
      );
    });

    it('should throw ValidationError when trying to delete system type', async () => {
      const mockSystemType = {
        id: 'ct1',
        name: 'System Type',
        isSystem: true,
      };

      (prisma.categoryType.findUnique as any).mockResolvedValue(mockSystemType);

      await expect(service.deleteCategoryType('ct1')).rejects.toThrow(
        'Cannot delete system category types'
      );
      expect(prisma.categoryType.delete).not.toHaveBeenCalled();
    });

    it('should verify type exists before attempting deletion', async () => {
      const mockType = {
        id: 'ct1',
        isSystem: false,
      };

      (prisma.categoryType.findUnique as any).mockResolvedValue(mockType);
      (prisma.categoryType.delete as any).mockResolvedValue(mockType);

      await service.deleteCategoryType('ct1');

      expect(prisma.categoryType.findUnique).toHaveBeenCalledWith({
        where: { id: 'ct1' },
      });
    });
  });

  describe('system type protection', () => {
    it('should not allow deletion of system types', async () => {
      const mockSystemType = {
        id: 'ct-system',
        name: 'System Type',
        isSystem: true,
      };

      (prisma.categoryType.findUnique as any).mockResolvedValue(mockSystemType);

      await expect(service.deleteCategoryType('ct-system')).rejects.toThrow(ValidationError);
    });

    it('should allow updates to system types', async () => {
      const mockSystemType = {
        id: 'ct-system',
        name: 'Updated System Type',
        isSystem: true,
      };

      (prisma.categoryType.update as any).mockResolvedValue(mockSystemType);

      const result = await service.updateCategoryType('ct-system', 'Updated System Type');

      expect(result.name).toBe('Updated System Type');
    });

    it('should only create custom types via service', async () => {
      (prisma.categoryType.create as any).mockResolvedValue({
        id: 'ct1',
        isSystem: false,
      } as any);

      await service.createCategoryType('Type', 'Description', 'u1');

      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSystem: false,
        }),
      });
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in name', async () => {
      const mockType = {
        id: 'ct1',
        name: 'Dance & Performance',
        isSystem: false,
      };

      (prisma.categoryType.create as any).mockResolvedValue(mockType);

      const result = await service.createCategoryType('Dance & Performance', null, 'u1');

      expect(result.name).toBe('Dance & Performance');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const mockType = {
        id: 'ct1',
        name: 'Type',
        description: longDescription,
        isSystem: false,
      };

      (prisma.categoryType.create as any).mockResolvedValue(mockType);

      const result = await service.createCategoryType('Type', longDescription, 'u1');

      expect(result.description).toBe(longDescription);
    });

    it('should handle whitespace-only description as null', async () => {
      (prisma.categoryType.create as any).mockResolvedValue({
        id: 'ct1',
        description: null,
      } as any);

      await service.createCategoryType('Type', '   ', 'u1');

      expect(prisma.categoryType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should handle concurrent operations', async () => {
      (prisma.categoryType.findMany as any).mockResolvedValue([]);

      const promises = [
        service.getAllCategoryTypes(),
        service.getAllCategoryTypes(),
        service.getAllCategoryTypes(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toEqual([]);
      });
    });

    it('should preserve case in names', async () => {
      const mockType = {
        id: 'ct1',
        name: 'DaNcE',
        isSystem: false,
      };

      (prisma.categoryType.create as any).mockResolvedValue(mockType);

      const result = await service.createCategoryType('DaNcE', null, 'u1');

      expect(result.name).toBe('DaNcE');
    });
  });

  describe('error handling', () => {
    it('should propagate Prisma errors', async () => {
      (prisma.categoryType.findMany as any).mockRejectedValue(new Error('Database error'));

      await expect(service.getAllCategoryTypes()).rejects.toThrow('Database error');
    });

    it('should handle unique constraint violations', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';

      (prisma.categoryType.create as any).mockRejectedValue(error);

      await expect(service.createCategoryType('Duplicate', null, 'u1')).rejects.toThrow(
        'Unique constraint failed'
      );
    });

    it('should handle foreign key constraint violations on delete', async () => {
      const mockType = { id: 'ct1', isSystem: false };
      const error = new Error('Foreign key constraint failed');
      (error as any).code = 'P2003';

      (prisma.categoryType.findUnique as any).mockResolvedValue(mockType);
      (prisma.categoryType.delete as any).mockRejectedValue(error);

      await expect(service.deleteCategoryType('ct1')).rejects.toThrow(
        'Foreign key constraint failed'
      );
    });
  });
});
