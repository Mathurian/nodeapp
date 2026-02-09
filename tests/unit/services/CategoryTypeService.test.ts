/**
 * CategoryTypeService Tests
 *
 * Comprehensive test suite for category type management including
 * system vs custom types, CRUD operations, and deletion constraints.
 */

import 'reflect-metadata';
import { CategoryTypeService } from '../../../src/services/CategoryTypeService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';
import prisma from '../../../src/utils/prisma';

describe('CategoryTypeService', () => {
  let service: CategoryTypeService;
  let findManySpy: jest.SpyInstance;
  let findUniqueSpy: jest.SpyInstance;
  let createSpy: jest.SpyInstance;
  let updateSpy: jest.SpyInstance;
  let deleteSpy: jest.SpyInstance;

  beforeEach(() => {
    findManySpy = jest.spyOn(prisma.categoryType, 'findMany');
    findUniqueSpy = jest.spyOn(prisma.categoryType, 'findUnique');
    createSpy = jest.spyOn(prisma.categoryType, 'create');
    updateSpy = jest.spyOn(prisma.categoryType, 'update');
    deleteSpy = jest.spyOn(prisma.categoryType, 'delete');

    service = new CategoryTypeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAllCategoryTypes', () => {
    it('should retrieve all category types sorted by name', async () => {
      const mockTypes = [
        { id: 'ct1', name: 'Dance', description: 'Dance categories', isSystem: false },
        { id: 'ct2', name: 'Vocal', description: 'Vocal categories', isSystem: true },
      ];

      findManySpy.mockResolvedValue(mockTypes);

      const result = await service.getAllCategoryTypes();

      expect(result).toEqual(mockTypes);
      expect(findManySpy).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no types exist', async () => {
      findManySpy.mockResolvedValue([]);

      const result = await service.getAllCategoryTypes();

      expect(result).toEqual([]);
    });

    it('should include system and custom types', async () => {
      const mockTypes = [
        { id: 'ct1', name: 'System Type', isSystem: true },
        { id: 'ct2', name: 'Custom Type', isSystem: false },
      ];

      findManySpy.mockResolvedValue(mockTypes);

      const result = await service.getAllCategoryTypes();

      expect(result.some((t: any) => t.isSystem === true)).toBe(true);
      expect(result.some((t: any) => t.isSystem === false)).toBe(true);
    });

    it('should propagate database errors', async () => {
      findManySpy.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllCategoryTypes()).rejects.toThrow('Database error');
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

      createSpy.mockResolvedValue(mockCreated);

      const result = await service.createCategoryType('Instrumental', 'Instrumental categories', 'u1');

      expect(result).toEqual(mockCreated);
      expect(createSpy).toHaveBeenCalledWith({
        data: {
          name: 'Instrumental',
          description: 'Instrumental categories',
          isSystem: false,
          createdById: 'u1',
        },
      });
    });

    it('should throw ValidationError when name is missing', async () => {
      await expect(service.createCategoryType('', 'Description', 'u1')).rejects.toThrow(ValidationError);
    });

    it('should create type with null description', async () => {
      const mockCreated = {
        id: 'ct1',
        name: 'Type',
        description: null,
        isSystem: false,
        createdById: 'u1',
      };

      createSpy.mockResolvedValue(mockCreated);

      const result = await service.createCategoryType('Type', null, 'u1');

      expect(result.description).toBeNull();
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should always set isSystem to false for custom types', async () => {
      createSpy.mockResolvedValue({ isSystem: false } as any);

      await service.createCategoryType('Type', 'Description', 'u1');

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isSystem: false,
        }),
      });
    });

    it('should handle empty string description as null', async () => {
      createSpy.mockResolvedValue({
        id: 'ct1',
        description: null,
      } as any);

      await service.createCategoryType('Type', '', 'u1');

      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });

    it('should handle unique constraint violations', async () => {
      const error = new Error('Unique constraint failed');
      (error as any).code = 'P2002';

      createSpy.mockRejectedValue(error);

      await expect(service.createCategoryType('Duplicate', null, 'u1')).rejects.toThrow('Unique constraint failed');
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

      updateSpy.mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', 'Updated Name');

      expect(result.name).toBe('Updated Name');
      expect(updateSpy).toHaveBeenCalledWith({
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

      updateSpy.mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', undefined, 'Updated description');

      expect(result.description).toBe('Updated description');
      expect(updateSpy).toHaveBeenCalledWith({
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

      updateSpy.mockResolvedValue(mockUpdated);

      const result = await service.updateCategoryType('ct1', 'New Name', 'New description');

      expect(result.name).toBe('New Name');
      expect(result.description).toBe('New description');
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { name: 'New Name', description: 'New description' },
      });
    });

    it('should handle null description', async () => {
      updateSpy.mockResolvedValue({
        id: 'ct1',
        description: null,
      } as any);

      await service.updateCategoryType('ct1', undefined, null);

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { description: null },
      });
    });

    it('should handle empty string description as null', async () => {
      updateSpy.mockResolvedValue({} as any);

      await service.updateCategoryType('ct1', undefined, '');

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { description: null },
      });
    });

    it('should not update when no fields provided', async () => {
      updateSpy.mockResolvedValue({} as any);

      await service.updateCategoryType('ct1');

      expect(updateSpy).toHaveBeenCalledWith({
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

      updateSpy.mockResolvedValue(mockUpdated);

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

      findUniqueSpy.mockResolvedValue(mockType);
      deleteSpy.mockResolvedValue(mockType);

      await service.deleteCategoryType('ct1');

      expect(deleteSpy).toHaveBeenCalledWith({
        where: { id: 'ct1' },
      });
    });

    it('should throw NotFoundError when category type does not exist', async () => {
      findUniqueSpy.mockResolvedValue(null);

      await expect(service.deleteCategoryType('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when trying to delete system type', async () => {
      const mockSystemType = {
        id: 'ct1',
        name: 'System Type',
        isSystem: true,
      };

      findUniqueSpy.mockResolvedValue(mockSystemType);

      await expect(service.deleteCategoryType('ct1')).rejects.toThrow('Cannot delete system category types');
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    it('should verify type exists before attempting deletion', async () => {
      const mockType = {
        id: 'ct1',
        isSystem: false,
      };

      findUniqueSpy.mockResolvedValue(mockType);
      deleteSpy.mockResolvedValue(mockType);

      await service.deleteCategoryType('ct1');

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { id: 'ct1' },
      });
    });

    it('should handle foreign key constraint violations on delete', async () => {
      const mockType = { id: 'ct1', isSystem: false };
      const error = new Error('Foreign key constraint failed');
      (error as any).code = 'P2003';

      findUniqueSpy.mockResolvedValue(mockType);
      deleteSpy.mockRejectedValue(error);

      await expect(service.deleteCategoryType('ct1')).rejects.toThrow('Foreign key constraint failed');
    });
  });

  describe('system type protection', () => {
    it('should not allow deletion of system types', async () => {
      const mockSystemType = {
        id: 'ct-system',
        name: 'System Type',
        isSystem: true,
      };

      findUniqueSpy.mockResolvedValue(mockSystemType);

      await expect(service.deleteCategoryType('ct-system')).rejects.toThrow(ValidationError);
    });

    it('should allow updates to system types', async () => {
      const mockSystemType = {
        id: 'ct-system',
        name: 'Updated System Type',
        isSystem: true,
      };

      updateSpy.mockResolvedValue(mockSystemType);

      const result = await service.updateCategoryType('ct-system', 'Updated System Type');

      expect(result.name).toBe('Updated System Type');
    });

    it('should only create custom types via service', async () => {
      createSpy.mockResolvedValue({
        id: 'ct1',
        isSystem: false,
      } as any);

      await service.createCategoryType('Type', 'Description', 'u1');

      expect(createSpy).toHaveBeenCalledWith({
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

      createSpy.mockResolvedValue(mockType);

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

      createSpy.mockResolvedValue(mockType);

      const result = await service.createCategoryType('Type', longDescription, 'u1');

      expect(result.description).toBe(longDescription);
    });

    it('should handle concurrent operations', async () => {
      findManySpy.mockResolvedValue([]);

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

      createSpy.mockResolvedValue(mockType);

      const result = await service.createCategoryType('DaNcE', null, 'u1');

      expect(result.name).toBe('DaNcE');
    });
  });
});
