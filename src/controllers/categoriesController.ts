/**
 * Categories Controller - TypeScript Implementation
 * Thin controller layer delegating business logic to CategoryService
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { CategoryService } from '../services/CategoryService';
import { StructureCopyService } from '../services/StructureCopyService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { resolveRequestTenantId } from '../utils/tenantContext';

export class CategoriesController {
  private categoryService: CategoryService;
  private structureCopyService: StructureCopyService;
  private prisma: PrismaClient;

  constructor() {
    this.categoryService = container.resolve(CategoryService);
    this.structureCopyService = container.resolve(StructureCopyService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  private isContestVisibleToContestant(contest: {
    contestantViewRestricted?: boolean | null;
    contestantViewReleaseDate?: Date | null;
    event?: {
      contestantViewRestricted?: boolean | null;
      contestantViewReleaseDate?: Date | null;
    } | null;
  }): boolean {
    const now = new Date();
    if (contest.event?.contestantViewRestricted) {
      if (!contest.event.contestantViewReleaseDate || contest.event.contestantViewReleaseDate > now) {
        return false;
      }
    }
    if (contest.contestantViewRestricted) {
      if (!contest.contestantViewReleaseDate || contest.contestantViewReleaseDate > now) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get all categories for the tenant with pagination
   */
  getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const user = req.user;
      if (!user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if (user.role === 'CONTESTANT' && user.contestantId) {
        const categories = await this.prisma.category.findMany({
          where: {
            tenantId: user.tenantId,
            deletedAt: null,
            contest: {
              deletedAt: null,
              event: {
                deletedAt: null,
              },
            },
            OR: [
              { categoryContestants: { some: { contestantId: user.contestantId } } },
              { contest: { contestContestants: { some: { contestantId: user.contestantId } } } }
            ]
          },
          include: {
            contest: {
              include: {
                event: true
              }
            }
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }]
        });

        const visible = categories.filter((category) => this.isContestVisibleToContestant(category.contest as any));
        return sendSuccess(res, visible, 'Categories retrieved successfully');
      }

      if (user.role === 'JUDGE' && user.judgeId) {
        const categories = await this.prisma.category.findMany({
          where: {
            tenantId: user.tenantId,
            deletedAt: null,
            contest: {
              deletedAt: null,
              event: {
                deletedAt: null,
              },
            },
            OR: [
              {
                assignments: {
                  some: {
                    judgeId: user.judgeId,
                    status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                  }
                }
              },
              {
                contest: {
                  assignments: {
                    some: {
                      judgeId: user.judgeId,
                      categoryId: null,
                      status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                    }
                  }
                }
              }
            ]
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }]
        });
        return sendSuccess(res, categories, 'Categories retrieved successfully');
      }

      // Get all categories for tenant with high limit for UI compatibility
      const result = await this.categoryService.getAllCategoriesPaginated({
        page: 1,
        limit: 1000
      });

      // Return just the data array to match expected format
      return sendSuccess(res, result.data, 'Categories retrieved successfully');
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
      const user = req.user;
      if (!user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if (user.role === 'CONTESTANT' && user.contestantId) {
        const contest = await this.prisma.contest.findUnique({
          where: { id: contestId },
          include: { event: true }
        });
        if (!contest || !this.isContestVisibleToContestant(contest as any)) {
          return sendSuccess(res, [], 'Categories retrieved successfully');
        }

        const categories = await this.prisma.category.findMany({
          where: {
            contestId,
            tenantId: user.tenantId,
            deletedAt: null,
            contest: {
              deletedAt: null,
              event: {
                deletedAt: null,
              },
            },
            OR: [
              { categoryContestants: { some: { contestantId: user.contestantId } } },
              { contest: { contestContestants: { some: { contestantId: user.contestantId } } } }
            ]
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }]
        });
        return sendSuccess(res, categories, 'Categories retrieved successfully');
      }

      if (user.role === 'JUDGE' && user.judgeId) {
        const categories = await this.prisma.category.findMany({
          where: {
            contestId,
            tenantId: user.tenantId,
            deletedAt: null,
            contest: {
              deletedAt: null,
              event: {
                deletedAt: null,
              },
            },
            OR: [
              {
                assignments: {
                  some: {
                    judgeId: user.judgeId,
                    status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                  }
                }
              },
              {
                contest: {
                  assignments: {
                    some: {
                      judgeId: user.judgeId,
                      categoryId: null,
                      status: { in: ['PENDING', 'ACTIVE', 'COMPLETED'] }
                    }
                  }
                }
              }
            ]
          },
          orderBy: { name: 'asc' }
        });
        return sendSuccess(res, categories, 'Categories retrieved successfully');
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
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendError(res, 'Tenant context is required to create a category', 400);
      }

      const { name, description, scoreCap, timeLimit, contestantMin, contestantMax } = req.body;

      const category = await this.categoryService.createCategory({
        tenantId,
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
   * Delete category (soft delete)
   * S4-3: Pass userId for deletedBy tracking
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }

      // S4-3: Pass userId for deletedBy tracking
      const userId = req.user?.id;
      await this.categoryService.deleteCategory(id, userId);

      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Restore a soft-deleted category
   * S4-3: Allow undeleting categories
   */
  restoreCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id} = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }

      const restoredCategory = await this.categoryService.restoreCategory(id);
      return sendSuccess(res, restoredCategory, 'Category restored successfully');
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

      // Add tenant filtering
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const criteria = await this.prisma.criterion.findMany({
        where: {
          categoryId,
          tenantId: tenantId
        },
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

      // Verify category exists and belongs to tenant
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId: tenantId
        }
      });

      if (!category) {
        return sendError(res, 'Category not found', 404);
      }

      const criterion = await this.prisma.criterion.create({
        data: {
          categoryId,
          name,
          maxScore: parseInt(maxScore),
          tenantId: tenantId
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

      // Add tenant filtering
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const existing = await this.prisma.criterion.findFirst({
        where: {
          id: criterionId,
          tenantId: tenantId
        }
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

      // Add tenant filtering
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const criterion = await this.prisma.criterion.findFirst({
        where: {
          id: criterionId,
          tenantId: tenantId
        }
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

      // CRITICAL FIX: Add tenant filtering to prevent deletion of other tenants' data
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const result = await this.prisma.category.deleteMany({
        where: {
          id: { in: categoryIds },
          tenantId: tenantId
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
      const tenantId = (req as any).tenantId;

      if (!updates || !Array.isArray(updates)) {
        return sendError(res, 'Updates array is required', 400);
      }

      if (updates.length === 0) {
        return sendSuccess(res, { updated: 0 }, 'No categories to update');
      }

      if (!tenantId) {
        return sendError(res, 'Tenant identification is required', 400);
      }

      // SECURITY FIX: Pre-validate all IDs belong to tenant
      const categoryIds = updates.map((u: any) => u.id).filter((id: string) => id);
      const validCategories = await this.prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          tenantId: tenantId,
          deletedAt: null,
        },
        select: { id: true }
      });

      const validIds = new Set(validCategories.map(c => c.id));
      const invalidIds = categoryIds.filter((id: string) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return sendError(res, `Access denied: ${invalidIds.length} categor${invalidIds.length === 1 ? 'y' : 'ies'} do not belong to your tenant`, 403);
      }

      // Each update should have { id, ...fields }
      const results = await Promise.allSettled(
        updates.map(async (update: any) => {
          const { id, ...data } = update;
          if (!id) {
            throw new Error('Each update must have an id');
          }
          // Add tenantId to WHERE clause for defense in depth
          return this.prisma.category.update({
            where: {
              id,
              tenantId: tenantId
            },
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

      // CRITICAL FIX: Add tenant filtering to prevent deletion of other tenants' data
      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      const result = await this.prisma.criterion.deleteMany({
        where: {
          id: { in: criteriaIds },
          tenantId: tenantId
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
      const tenantId = (req as any).tenantId;

      if (!updates || !Array.isArray(updates)) {
        return sendError(res, 'Updates array is required', 400);
      }

      if (updates.length === 0) {
        return sendSuccess(res, { updated: 0 }, 'No criteria to update');
      }

      if (!tenantId) {
        return sendError(res, 'Tenant identification is required', 400);
      }

      // SECURITY FIX: Pre-validate all IDs belong to tenant
      const criterionIds = updates.map((u: any) => u.id).filter((id: string) => id);
      const validCriteria = await this.prisma.criterion.findMany({
        where: {
          id: { in: criterionIds },
          tenantId: tenantId
        },
        select: { id: true }
      });

      const validIds = new Set(validCriteria.map(c => c.id));
      const invalidIds = criterionIds.filter((id: string) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return sendError(res, `Access denied: ${invalidIds.length} criteri${invalidIds.length === 1 ? 'on' : 'a'} do not belong to your tenant`, 403);
      }

      // Each update should have { id, ...fields }
      const results = await Promise.allSettled(
        updates.map(async (update: any) => {
          const { id, ...data } = update;
          if (!id) {
            throw new Error('Each update must have an id');
          }
          // Add tenantId to WHERE clause for defense in depth
          return this.prisma.criterion.update({
            where: {
              id,
              tenantId: tenantId
            },
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

  cloneCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }

      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }

      const { targetContestId, name, includeCriteria } = req.body;
      const category = await this.structureCopyService.cloneCategory({
        tenantId,
        sourceCategoryId: id,
        targetContestId,
        name,
        includeCriteria,
        actorRole: req.user?.role,
      });

      return sendCreated(res, category, 'Category cloned successfully');
    } catch (error) {
      return next(error);
    }
  };

  importCriteria = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Category ID is required', 400);
      }

      const tenantId = resolveRequestTenantId(req);
      if (!tenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }

      const { sourceCategoryId, templateId } = req.body;
      const result = await this.structureCopyService.importCriteriaAppend({
        tenantId,
        targetCategoryId: id,
        sourceCategoryId,
        templateId,
      });

      return sendCreated(res, result, 'Criteria imported successfully');
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
export const restoreCategory = controller.restoreCategory; // S4-3: Restore soft-deleted categories
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
export const cloneCategory = controller.cloneCategory;
export const importCriteria = controller.importCriteria;
