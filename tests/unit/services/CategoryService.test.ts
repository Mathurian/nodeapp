/**
 * CategoryService Unit Tests
 * Tests all public methods with mocked dependencies
 */

import { CategoryService } from '../../../src/services/CategoryService';
import { CategoryRepository } from '../../../src/repositories/CategoryRepository';
import { CacheService } from '../../../src/services/CacheService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockCategoryRepo: jest.Mocked<CategoryRepository>;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    mockCategoryRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findByContestId: jest.fn(),
      findCategoryWithDetails: jest.fn(),
      getCategoryStats: jest.fn(),
      searchCategories: jest.fn(),
      certifyTotals: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidatePattern: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
      flushAll: jest.fn(),
      getStats: jest.fn(),
      disconnect: jest.fn(),
      enabled: true,
    } as any;

    categoryService = new CategoryService(mockCategoryRepo, mockCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('should create category with valid data', async () => {
      const categoryData = {
        name: 'Talent',
        contestId: 'contest-1',
        description: 'Talent category',
        scoreCap: 100,
      };
      const createdCategory = { id: '1', ...categoryData };
      mockCategoryRepo.create.mockResolvedValue(createdCategory as any);

      const result = await categoryService.createCategory(categoryData);

      expect(result).toEqual(createdCategory);
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(categoryData);
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:contest:contest-1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('categories:*');
    });

    it('should throw error if contestId is missing', async () => {
      const invalidData = { name: 'Talent' } as any;

      await expect(categoryService.createCategory(invalidData)).rejects.toThrow();
    });

    it('should throw error if name is missing', async () => {
      const invalidData = { contestId: 'contest-1' } as any;

      await expect(categoryService.createCategory(invalidData)).rejects.toThrow();
    });

    it('should throw error if scoreCap is negative', async () => {
      const invalidData = {
        name: 'Talent',
        contestId: 'contest-1',
        scoreCap: -10,
      };

      await expect(categoryService.createCategory(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should allow scoreCap of 0', async () => {
      const categoryData = {
        name: 'Talent',
        contestId: 'contest-1',
        scoreCap: 0,
      };
      const createdCategory = { id: '1', ...categoryData };
      mockCategoryRepo.create.mockResolvedValue(createdCategory as any);

      const result = await categoryService.createCategory(categoryData);

      expect(result).toEqual(createdCategory);
    });
  });

  describe('getCategoryById', () => {
    it('should return cached category if available', async () => {
      const cachedCategory = {
        id: '1',
        name: 'Cached Category',
        contestId: 'contest-1',
      };
      mockCacheService.get.mockResolvedValue(cachedCategory);

      const result = await categoryService.getCategoryById('1');

      expect(result).toEqual(cachedCategory);
      expect(mockCacheService.get).toHaveBeenCalledWith('category:1');
      expect(mockCategoryRepo.findById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbCategory = {
        id: '1',
        name: 'DB Category',
        contestId: 'contest-1',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(dbCategory as any);

      const result = await categoryService.getCategoryById('1');

      expect(result).toEqual(dbCategory);
      expect(mockCategoryRepo.findById).toHaveBeenCalledWith('1');
      expect(mockCacheService.set).toHaveBeenCalledWith('category:1', dbCategory, 1800);
    });

    it('should throw NotFoundError if category not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(categoryService.getCategoryById('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCategoryWithDetails', () => {
    it('should return cached detailed category if available', async () => {
      const cachedCategory = {
        id: '1',
        name: 'Category',
        scores: [],
        contestants: [],
      };
      mockCacheService.get.mockResolvedValue(cachedCategory);

      const result = await categoryService.getCategoryWithDetails('1');

      expect(result).toEqual(cachedCategory);
      expect(mockCacheService.get).toHaveBeenCalledWith('category:details:1');
    });

    it('should fetch from database and cache if not cached', async () => {
      const dbCategory = {
        id: '1',
        name: 'Category',
        scores: [],
        contestants: [],
      };
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findCategoryWithDetails.mockResolvedValue(dbCategory as any);

      const result = await categoryService.getCategoryWithDetails('1');

      expect(result).toEqual(dbCategory);
      expect(mockCacheService.set).toHaveBeenCalledWith('category:details:1', dbCategory, 900);
    });

    it('should throw NotFoundError if not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findCategoryWithDetails.mockResolvedValue(null);

      await expect(categoryService.getCategoryWithDetails('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCategoriesByContestId', () => {
    it('should return categories for contest', async () => {
      const categories = [
        { id: '1', name: 'Category 1', contestId: 'contest-1' },
        { id: '2', name: 'Category 2', contestId: 'contest-1' },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findByContestId.mockResolvedValue(categories as any);

      const result = await categoryService.getCategoriesByContestId('contest-1');

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.findByContestId).toHaveBeenCalledWith('contest-1');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'categories:contest:contest-1',
        categories,
        600
      );
    });

    it('should return cached categories if available', async () => {
      const categories = [{ id: '1', name: 'Cached Category' }];
      mockCacheService.get.mockResolvedValue(categories);

      const result = await categoryService.getCategoriesByContestId('contest-1');

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.findByContestId).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('should update category and invalidate cache', async () => {
      const existingCategory = {
        id: '1',
        name: 'Old Name',
        contestId: 'contest-1',
      };
      const updateData = { name: 'New Name' };
      const updatedCategory = { ...existingCategory, ...updateData };

      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(existingCategory as any);
      mockCategoryRepo.update.mockResolvedValue(updatedCategory as any);

      const result = await categoryService.updateCategory('1', updateData);

      expect(result).toEqual(updatedCategory);
      expect(mockCacheService.del).toHaveBeenCalledWith('category:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('category:details:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:contest:contest-1');
      expect(mockCacheService.invalidatePattern).toHaveBeenCalledWith('categories:*');
    });

    it('should throw error if scoreCap is negative', async () => {
      const existingCategory = {
        id: '1',
        name: 'Category',
        contestId: 'contest-1',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(existingCategory as any);

      const invalidUpdate = { scoreCap: -50 };

      await expect(categoryService.updateCategory('1', invalidUpdate)).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw error if category not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(categoryService.updateCategory('invalid', { name: 'New Name' })).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and invalidate cache', async () => {
      const existingCategory = {
        id: '1',
        name: 'Category',
        contestId: 'contest-1',
      };
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(existingCategory as any);
      mockCategoryRepo.delete.mockResolvedValue(undefined);

      await categoryService.deleteCategory('1');

      expect(mockCategoryRepo.delete).toHaveBeenCalledWith('1');
      expect(mockCacheService.del).toHaveBeenCalledWith('category:1');
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:contest:contest-1');
    });

    it('should throw error if category not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(categoryService.deleteCategory('invalid')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCategoryStats', () => {
    it('should return category statistics', async () => {
      const stats = {
        totalContestants: 50,
        totalJudges: 10,
        totalCriteria: 5,
      };
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.getCategoryStats.mockResolvedValue(stats);

      const result = await categoryService.getCategoryStats('1');

      expect(result).toEqual(stats);
      expect(mockCacheService.set).toHaveBeenCalledWith('category:stats:1', stats, 300);
    });

    it('should return cached stats', async () => {
      const stats = {
        totalContestants: 50,
        totalJudges: 10,
        totalCriteria: 5,
      };
      mockCacheService.get.mockResolvedValue(stats);

      const result = await categoryService.getCategoryStats('1');

      expect(result).toEqual(stats);
      expect(mockCategoryRepo.getCategoryStats).not.toHaveBeenCalled();
    });
  });

  describe('certifyTotals', () => {
    it('should certify category totals', async () => {
      const existingCategory = {
        id: '1',
        name: 'Category',
        contestId: 'contest-1',
        totalsCertified: false,
      };
      const certifiedCategory = { ...existingCategory, totalsCertified: true };

      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(existingCategory as any);
      mockCategoryRepo.certifyTotals.mockResolvedValue(certifiedCategory as any);

      const result = await categoryService.certifyTotals('1', true);

      expect(result).toEqual(certifiedCategory);
      expect(mockCategoryRepo.certifyTotals).toHaveBeenCalledWith('1', true);
      expect(mockCacheService.del).toHaveBeenCalledWith('category:1');
    });

    it('should uncertify category totals', async () => {
      const existingCategory = {
        id: '1',
        name: 'Category',
        contestId: 'contest-1',
        totalsCertified: true,
      };
      const uncertifiedCategory = { ...existingCategory, totalsCertified: false };

      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(existingCategory as any);
      mockCategoryRepo.certifyTotals.mockResolvedValue(uncertifiedCategory as any);

      const result = await categoryService.certifyTotals('1', false);

      expect(result).toEqual(uncertifiedCategory);
      expect(mockCategoryRepo.certifyTotals).toHaveBeenCalledWith('1', false);
    });

    it('should throw error if category not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(categoryService.certifyTotals('invalid', true)).rejects.toThrow(NotFoundError);
    });
  });

  describe('searchCategories', () => {
    it('should search categories by query', async () => {
      const categories = [{ id: '1', name: 'Found Category' }];
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepo.searchCategories.mockResolvedValue(categories as any);

      const result = await categoryService.searchCategories('test query');

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.searchCategories).toHaveBeenCalledWith('test query');
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should return cached search results', async () => {
      const categories = [{ id: '1', name: 'Cached Result' }];
      mockCacheService.get.mockResolvedValue(categories);

      const result = await categoryService.searchCategories('test query');

      expect(result).toEqual(categories);
      expect(mockCategoryRepo.searchCategories).not.toHaveBeenCalled();
    });
  });
});
