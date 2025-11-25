/**
 * Category Service
 * Business logic layer for Category entity with caching support
 */

import { Category, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError, NotFoundError } from './BaseService';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { CacheService } from './CacheService';
import { PaginationOptions, PaginatedResponse } from '../utils/pagination';

// Proper type definitions for category responses
type CategoryWithDetails = Prisma.CategoryGetPayload<{
  include: {
    contest: true;
    criteria: true;
    categoryContestants: true;
  };
}>;

interface CategoryStats {
  totalContestants: number;
  totalScores: number;
  averageScore: number;
  completionPercentage: number;
}

interface CreateCategoryDto {
  contestId: string;
  name: string;
  description?: string;
  scoreCap?: number;
  timeLimit?: number;
  contestantMin?: number;
  contestantMax?: number;
}

interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

@injectable()
export class CategoryService extends BaseService {
  constructor(
    @inject('CategoryRepository') private categoryRepo: CategoryRepository,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  private getCacheKey(id: string): string {
    return `category:${id}`;
  }

  private async invalidateCategoryCache(id?: string, contestId?: string): Promise<void> {
    if (id) {
      await this.cacheService.del(this.getCacheKey(id));
      await this.cacheService.del(`category:details:${id}`);
    }
    if (contestId) {
      await this.cacheService.del(`categories:contest:${contestId}`);
    }
    await this.cacheService.invalidatePattern('categories:*');
  }

  async createCategory(data: CreateCategoryDto): Promise<Category> {
    try {
      this.validateRequired(data as unknown as Record<string, unknown>, ['contestId', 'name']);

      if (data.scoreCap !== undefined && data.scoreCap < 0) {
        throw new ValidationError('Score cap must be non-negative');
      }

      const category = await this.categoryRepo.create(data as unknown as Record<string, unknown>);
      await this.invalidateCategoryCache(undefined, data.contestId);

      this.logInfo('Category created', { categoryId: category.id, contestId: data.contestId });
      return category;
    } catch (error) {
      return this.handleError(error, { operation: 'createCategory', data });
    }
  }

  async getCategoryById(id: string): Promise<Category> {
    try {
      const cacheKey = this.getCacheKey(id);
      const cached = await this.cacheService.get<Category>(cacheKey);

      if (cached) {
        return cached;
      }

      const category = await this.categoryRepo.findById(id);

      if (!category) {
        throw new NotFoundError('Category', id);
      }

      await this.cacheService.set(cacheKey, category, 1800);
      return category;
    } catch (error) {
      return this.handleError(error, { operation: 'getCategoryById', id });
    }
  }

  async getCategoryWithDetails(id: string): Promise<CategoryWithDetails> {
    try {
      const cacheKey = `category:details:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as any;
      }

      const category = await this.categoryRepo.findCategoryWithDetails(id);

      if (!category) {
        throw new NotFoundError('Category', id);
      }

      await this.cacheService.set(cacheKey, category, 900);
      return category;
    } catch (error) {
      return this.handleError(error, { operation: 'getCategoryWithDetails', id });
    }
  }

  async getCategoriesByContestId(contestId: string): Promise<Category[]> {
    try {
      const cacheKey = `categories:contest:${contestId}`;
      const cached = await this.cacheService.get<Category[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const categories = await this.categoryRepo.findByContestId(contestId);
      await this.cacheService.set(cacheKey, categories, 600);

      return categories;
    } catch (error) {
      return this.handleError(error, { operation: 'getCategoriesByContestId', contestId });
    }
  }

  /**
   * Get all categories with pagination
   */
  async getAllCategoriesPaginated(paginationOptions?: PaginationOptions): Promise<PaginatedResponse<Category>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const result = await this.categoryRepo.findAllPaginated({ page, limit });

      return {
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      return this.handleError(error, { operation: 'getAllCategoriesPaginated', paginationOptions });
    }
  }

  /**
   * Get categories by contest with pagination
   */
  async getCategoriesByContestIdPaginated(
    contestId: string,
    paginationOptions?: PaginationOptions
  ): Promise<PaginatedResponse<Category>> {
    try {
      const page = paginationOptions?.page || 1;
      const limit = Math.min(paginationOptions?.limit || 50, 100);

      const result = await this.categoryRepo.findByContestIdPaginated(contestId, { page, limit });

      return {
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasNextPage,
          hasPrevious: result.hasPrevPage
        }
      };
    } catch (error) {
      return this.handleError(error, { operation: 'getCategoriesByContestIdPaginated', contestId, paginationOptions });
    }
  }

  async updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
    try {
      const existing = await this.getCategoryById(id);

      if (data.scoreCap !== undefined && data.scoreCap < 0) {
        throw new ValidationError('Score cap must be non-negative');
      }

      const category = await this.categoryRepo.update(id, data);
      await this.invalidateCategoryCache(id, existing.contestId);

      this.logInfo('Category updated', { categoryId: id });
      return category;
    } catch (error) {
      return this.handleError(error, { operation: 'updateCategory', id, data });
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const existing = await this.getCategoryById(id);
      await this.categoryRepo.delete(id);
      await this.invalidateCategoryCache(id, existing.contestId);

      this.logInfo('Category deleted', { categoryId: id });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteCategory', id });
    }
  }

  async getCategoryStats(id: string): Promise<CategoryStats> {
    try {
      const cacheKey = `category:stats:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as CategoryStats;
      }

      const stats = await this.categoryRepo.getCategoryStats(id);
      await this.cacheService.set(cacheKey, stats, 300);

      return stats as unknown as CategoryStats;
    } catch (error) {
      return this.handleError(error, { operation: 'getCategoryStats', id });
    }
  }

  async certifyTotals(id: string, certified: boolean): Promise<Category> {
    try {
      const existing = await this.getCategoryById(id);
      const category = await this.categoryRepo.certifyTotals(id, certified);
      await this.invalidateCategoryCache(id, existing.contestId);

      this.logInfo('Category totals certified', { categoryId: id, certified });
      return category;
    } catch (error) {
      return this.handleError(error, { operation: 'certifyTotals', id, certified });
    }
  }

  async searchCategories(query: string): Promise<Category[]> {
    try {
      const cacheKey = `categories:search:${query}`;
      const cached = await this.cacheService.get<Category[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const categories = await this.categoryRepo.searchCategories(query);
      await this.cacheService.set(cacheKey, categories, 300);

      return categories;
    } catch (error) {
      return this.handleError(error, { operation: 'searchCategories', query });
    }
  }
}
