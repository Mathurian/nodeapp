/**
 * Categories Controller - TypeScript Implementation
 * Thin controller layer delegating business logic to CategoryService
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { CategoryService } from '../services/CategoryService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class CategoriesController {
  private categoryService: CategoryService;
  private prisma: PrismaClient;

  constructor() {
    this.categoryService = container.resolve(CategoryService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get all categories - Note: For full list, query by contest is recommended
   */
  getAllCategories = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Return empty array or implement pagination - CategoryService doesn't have getAllCategories
      // In production, this should require a contest filter or implement pagination
      return sendSuccess(res, [], 'Please use getCategoriesByContest endpoint for category lists');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get category by ID
   */
  getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }
      const category = await this.categoryService.getCategoryWithDetails(id);
      return sendSuccess(res, category, 'Category retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get categories by contest
   */
  getCategoriesByContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestId } = req.params;
      if (!contestId) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const categories = await this.categoryService.getCategoriesByContestId(contestId);
      return sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create category
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // Get contestId from params or body
      const contestId = req.params['contestId'] || req.body['contestId'];
      if (!contestId) {
        return sendError(res, 'Contest ID is required', 400);
      }

      const { name, description, scoreCap, timeLimit, contestantMin, contestantMax } = req.body;

      const category = await this.categoryService.createCategory({
        contestId,
        name,
        description,
        scoreCap,
        timeLimit,
        contestantMin,
        contestantMax,
      });

      return sendCreated(res, category, 'Category created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update category
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }

      const { name, description, scoreCap, timeLimit, contestantMin, contestantMax } = req.body;

      const category = await this.categoryService.updateCategory(id, {
        name,
        description,
        scoreCap,
        timeLimit,
        contestantMin,
        contestantMax,
      });

      return sendSuccess(res, category, 'Category updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete category
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }
      await this.categoryService.deleteCategory(id);
      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get category statistics
   */
  getCategoryStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }
      const stats = await this.categoryService.getCategoryStats(id);
      return sendSuccess(res, stats, 'Category statistics retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Certify category totals
   */
  certifyTotals = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }
      const { certified } = req.body;
      const category = await this.categoryService.certifyTotals(id, certified);
      return sendSuccess(res, category, 'Category totals certified successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search categories
   */
  searchCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return sendError(res, 'Search query is required', 400);
      }
      const categories = await this.categoryService.searchCategories(query);
      return sendSuccess(res, categories, 'Search results retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get category criteria
   */
  getCategoryCriteria = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        return sendError(res, 'Category ID is required', 400);
      }

      const criteria = await this.prisma.criterion.findMany({
        where: { categoryId },
        orderBy: { name: 'asc' }
      });

      return sendSuccess(res, criteria, 'Category criteria retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create criterion
   */
  createCriterion = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        return sendError(res, 'Category ID is required', 400);
      }

      const { name, maxScore } = req.body;

      if (!name || maxScore === undefined) {
        return sendError(res, 'name and maxScore are required', 400);
      }

      // Verify category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return sendError(res, 'Category not found', 404);
      }

      const criterion = await this.prisma.criterion.create({
        data: {
          categoryId,
          name,
          maxScore: parseInt(maxScore),
          tenantId: req.user!.tenantId
        }
      });

      return sendCreated(res, criterion, 'Criterion created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update criterion
   */
  updateCriterion = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { criterionId } = req.params;
      if (!criterionId) {
        return sendError(res, 'Criterion ID is required', 400);
      }

      const { name, maxScore } = req.body;

      const existing = await this.prisma.criterion.findUnique({
        where: { id: criterionId }
      });

      if (!existing) {
        return sendError(res, 'Criterion not found', 404);
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (maxScore !== undefined) updateData.maxScore = parseInt(maxScore);

      const criterion = await this.prisma.criterion.update({
        where: { id: criterionId },
        data: updateData
      });

      return sendSuccess(res, criterion, 'Criterion updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete criterion
   */
  deleteCriterion = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { criterionId } = req.params;
      if (!criterionId) {
        return sendError(res, 'Criterion ID is required', 400);
      }

      const criterion = await this.prisma.criterion.findUnique({
        where: { id: criterionId }
      });

      if (!criterion) {
        return sendError(res, 'Criterion not found', 404);
      }

      await this.prisma.criterion.delete({
        where: { id: criterionId }
      });

      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update category with time limit
   */
  updateCategoryWithTimeLimit = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }
      const { timeLimit } = req.body;
      const category = await this.categoryService.updateCategory(id, { timeLimit });
      return sendSuccess(res, category, 'Category time limit updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Bulk delete categories
   */
  bulkDeleteCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryIds } = req.body;
      if (!categoryIds || !Array.isArray(categoryIds)) {
        return sendError(res, 'Category IDs array is required', 400);
      }

      if (categoryIds.length === 0) {
        return sendSuccess(res, { deleted: 0 }, 'No categories to delete');
      }

      const result = await this.prisma.category.deleteMany({
        where: {
          id: { in: categoryIds }
        }
      });

      return sendSuccess(res, { deleted: result.count }, 'Categories deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Bulk update categories
   */
  bulkUpdateCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates)) {
        return sendError(res, 'Updates array is required', 400);
      }

      if (updates.length === 0) {
        return sendSuccess(res, { updated: 0 }, 'No categories to update');
      }

      // Each update should have { id, ...fields }
      const results = await Promise.allSettled(
        updates.map(async (update: any) => {
          const { id, ...data } = update;
          if (!id) {
            throw new Error('Each update must have an id');
          }
          return this.prisma.category.update({
            where: { id },
            data
          });
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        updated: successful,
        failed,
        total: updates.length
      }, 'Categories bulk update completed');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Bulk delete criteria
   */
  bulkDeleteCriteria = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { criteriaIds } = req.body;
      if (!criteriaIds || !Array.isArray(criteriaIds)) {
        return sendError(res, 'Criteria IDs array is required', 400);
      }

      if (criteriaIds.length === 0) {
        return sendSuccess(res, { deleted: 0 }, 'No criteria to delete');
      }

      const result = await this.prisma.criterion.deleteMany({
        where: {
          id: { in: criteriaIds }
        }
      });

      return sendSuccess(res, { deleted: result.count }, 'Criteria deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Bulk update criteria
   */
  bulkUpdateCriteria = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { updates } = req.body;
      if (!updates || !Array.isArray(updates)) {
        return sendError(res, 'Updates array is required', 400);
      }

      if (updates.length === 0) {
        return sendSuccess(res, { updated: 0 }, 'No criteria to update');
      }

      // Each update should have { id, ...fields }
      const results = await Promise.allSettled(
        updates.map(async (update: any) => {
          const { id, ...data } = update;
          if (!id) {
            throw new Error('Each update must have an id');
          }
          return this.prisma.criterion.update({
            where: { id },
            data
          });
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return sendSuccess(res, {
        updated: successful,
        failed,
        total: updates.length
      }, 'Criteria bulk update completed');
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and individual methods
const controller = new CategoriesController();
export const getAllCategories = controller.getAllCategories;
export const getCategoryById = controller.getCategoryById;
export const getCategoriesByContest = controller.getCategoriesByContest;
export const createCategory = controller.createCategory;
export const updateCategory = controller.updateCategory;
export const deleteCategory = controller.deleteCategory;
export const getCategoryStats = controller.getCategoryStats;
export const certifyTotals = controller.certifyTotals;
export const searchCategories = controller.searchCategories;

// Criteria management exports
export const getCategoryCriteria = controller.getCategoryCriteria;
export const createCriterion = controller.createCriterion;
export const updateCriterion = controller.updateCriterion;
export const deleteCriterion = controller.deleteCriterion;

// Special update exports
export const updateCategoryWithTimeLimit = controller.updateCategoryWithTimeLimit;

// Bulk operations exports
export const bulkDeleteCategories = controller.bulkDeleteCategories;
export const bulkUpdateCategories = controller.bulkUpdateCategories;
export const bulkDeleteCriteria = controller.bulkDeleteCriteria;
export const bulkUpdateCriteria = controller.bulkUpdateCriteria;
