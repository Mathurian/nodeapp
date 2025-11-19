import { injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import prisma from '../utils/prisma';

/**
 * Service for Category Type management
 * Handles CRUD operations for category types
 */
@injectable()
export class CategoryTypeService extends BaseService {
  /**
   * Get all category types
   */
  async getAllCategoryTypes() {
    return await prisma.categoryType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Create a new category type
   */
  async createCategoryType(name: string, description: string | null, createdById: string, _tenantId: string = '') {
    this.validateRequired({ name } as unknown as Record<string, unknown>, ['name']);

    const categoryType = await prisma.categoryType.create({
      data: {
        name,
        description: description || null,
        isSystem: false,
        createdById: createdById
      }
    });

    return categoryType;
  }

  /**
   * Update a category type
   */
  async updateCategoryType(id: string, name?: string, description?: string | null) {
    const categoryType = await prisma.categoryType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return categoryType;
  }

  /**
   * Delete a category type
   */
  async deleteCategoryType(id: string) {
    const categoryType = await prisma.categoryType.findUnique({
      where: { id },
    });

    if (!categoryType) {
      throw this.notFoundError('CategoryType', id);
    }

    if (categoryType.isSystem) {
      throw this.validationError('Cannot delete system category types');
    }

    await prisma.categoryType.delete({
      where: { id },
    });
  }
}
