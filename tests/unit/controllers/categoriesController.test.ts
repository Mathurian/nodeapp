/**
 * Categories Controller Tests
 * Comprehensive test coverage for CategoriesController endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { CategoriesController } from '../../../src/controllers/categoriesController';
import { CategoryService } from '../../../src/services/CategoryService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../../../src/utils/responseHelpers';
import { container } from '../../../src/config/container';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/CategoryService');
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/config/container');

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let mockCategoryService: jest.Mocked<CategoryService>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  // Mock data
  const mockCategory = {
    id: 'category-1',
    contestId: 'contest-1',
    name: 'Singing',
    description: 'Vocal performance',
    scoreCap: 100,
    timeLimit: 300,
    contestantMin: 1,
    contestantMax: 10,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockCategoryWithDetails = {
    ...mockCategory,
    contest: { id: 'contest-1', name: 'Talent Show' },
    criteria: [
      { id: 'crit-1', name: 'Pitch', maxScore: 25 },
      { id: 'crit-2', name: 'Performance', maxScore: 25 },
    ],
    _count: {
      criteria: 2,
      contestants: 5,
    },
  };

  const mockCategories = [
    mockCategory,
    {
      id: 'category-2',
      contestId: 'contest-1',
      name: 'Dancing',
      description: 'Dance performance',
      scoreCap: 100,
      timeLimit: 240,
      contestantMin: 1,
      contestantMax: 8,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
    },
  ];

  const mockCriterion = {
    id: 'crit-1',
    categoryId: 'category-1',
    name: 'Pitch',
    maxScore: 25,
  };

  const mockStats = {
    totalContestants: 10,
    totalScores: 50,
    averageScore: 85.5,
    completionRate: 0.9,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service
    mockCategoryService = {
      getCategoryWithDetails: jest.fn(),
      getCategoriesByContestId: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      getCategoryStats: jest.fn(),
      certifyTotals: jest.fn(),
      searchCategories: jest.fn(),
    } as any;

    // Setup mock Prisma
    mockPrisma = {
      category: {
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      criterion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    } as any;

    // Mock container resolve
    (container.resolve as jest.Mock).mockImplementation((token: any) => {
      if (token === CategoryService || token === 'CategoryService') return mockCategoryService;
      if (token === 'PrismaClient') return mockPrisma;
      return mockCategoryService;
    });

    controller = new CategoriesController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'admin' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock response helpers
    (sendSuccess as jest.Mock).mockImplementation((res, data) => res.json({ success: true, data }));
    (sendCreated as jest.Mock).mockImplementation((res, data) => res.status(201).json({ success: true, data }));
    (sendNoContent as jest.Mock).mockImplementation((res) => res.status(204).send());
    (sendError as jest.Mock).mockImplementation((res, message, status) => res.status(status).json({ success: false, error: message }));
  });

  describe('getAllCategories', () => {
    it('should return empty array with message', async () => {
      await controller.getAllCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, [], 'Please use getCategoriesByContest endpoint for category lists');
    });

    it('should call next with error if exception occurs', async () => {
      const error = new Error('Unexpected error');
      (sendSuccess as jest.Mock).mockImplementation(() => { throw error; });

      await controller.getAllCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoryById', () => {
    it('should return category details when category exists', async () => {
      mockReq.params = { id: 'category-1' };
      mockCategoryService.getCategoryWithDetails.mockResolvedValue(mockCategoryWithDetails as any);

      await controller.getCategoryById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.getCategoryWithDetails).toHaveBeenCalledWith('category-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCategoryWithDetails, 'Category retrieved successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getCategoryById(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
      expect(mockCategoryService.getCategoryWithDetails).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'category-1' };
      mockCategoryService.getCategoryWithDetails.mockRejectedValue(error);

      await controller.getCategoryById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoriesByContest', () => {
    it('should return categories for contest', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockCategoryService.getCategoriesByContestId.mockResolvedValue(mockCategories as any);

      await controller.getCategoriesByContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.getCategoriesByContestId).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCategories, 'Categories retrieved successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.getCategoriesByContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { contestId: 'contest-1' };
      mockCategoryService.getCategoriesByContestId.mockRejectedValue(error);

      await controller.getCategoriesByContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createCategory', () => {
    it('should create category with contestId from params', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.body = {
        name: 'New Category',
        description: 'Test description',
        scoreCap: 100,
        timeLimit: 300,
      };
      mockCategoryService.createCategory.mockResolvedValue(mockCategory as any);

      await controller.createCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith({
        contestId: 'contest-1',
        name: 'New Category',
        description: 'Test description',
        scoreCap: 100,
        timeLimit: 300,
        contestantMin: undefined,
        contestantMax: undefined,
      });
      expect(sendCreated).toHaveBeenCalledWith(mockRes, mockCategory, 'Category created successfully');
    });

    it('should create category with contestId from body', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        name: 'New Category',
      };
      mockCategoryService.createCategory.mockResolvedValue(mockCategory as any);

      await controller.createCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({ contestId: 'contest-1', name: 'New Category' })
      );
    });

    it('should return 400 when contestId is missing', async () => {
      mockReq.body = { name: 'Test' };

      await controller.createCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Validation error');
      mockReq.params = { contestId: 'contest-1' };
      mockReq.body = { name: 'Test' };
      mockCategoryService.createCategory.mockRejectedValue(error);

      await controller.createCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCategory', () => {
    it('should update category with valid data', async () => {
      mockReq.params = { id: 'category-1' };
      mockReq.body = {
        name: 'Updated Category',
        scoreCap: 150,
        timeLimit: 360,
      };
      const updated = { ...mockCategory, ...mockReq.body };
      mockCategoryService.updateCategory.mockResolvedValue(updated as any);

      await controller.updateCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith('category-1', {
        name: 'Updated Category',
        description: undefined,
        scoreCap: 150,
        timeLimit: 360,
        contestantMin: undefined,
        contestantMax: undefined,
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, updated, 'Category updated successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.body = { name: 'Test' };

      await controller.updateCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'category-1' };
      mockReq.body = { name: 'Test' };
      mockCategoryService.updateCategory.mockRejectedValue(error);

      await controller.updateCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and return 204', async () => {
      mockReq.params = { id: 'category-1' };
      mockCategoryService.deleteCategory.mockResolvedValue(undefined);

      await controller.deleteCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith('category-1');
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.deleteCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Cannot delete category with contestants');
      mockReq.params = { id: 'category-1' };
      mockCategoryService.deleteCategory.mockRejectedValue(error);

      await controller.deleteCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoryStats', () => {
    it('should return category statistics', async () => {
      mockReq.params = { id: 'category-1' };
      mockCategoryService.getCategoryStats.mockResolvedValue(mockStats as any);

      await controller.getCategoryStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.getCategoryStats).toHaveBeenCalledWith('category-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStats, 'Category statistics retrieved successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getCategoryStats(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'category-1' };
      mockCategoryService.getCategoryStats.mockRejectedValue(error);

      await controller.getCategoryStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyTotals', () => {
    it('should certify category totals', async () => {
      mockReq.params = { id: 'category-1' };
      mockReq.body = { certified: true };
      const certified = { ...mockCategory, totalsCertified: true };
      mockCategoryService.certifyTotals.mockResolvedValue(certified as any);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.certifyTotals).toHaveBeenCalledWith('category-1', true);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, certified, 'Category totals certified successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.body = { certified: true };

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'category-1' };
      mockReq.body = { certified: true };
      mockCategoryService.certifyTotals.mockRejectedValue(error);

      await controller.certifyTotals(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('searchCategories', () => {
    it('should search categories with query string', async () => {
      mockReq.query = { query: 'singing' };
      mockCategoryService.searchCategories.mockResolvedValue([mockCategory] as any);

      await controller.searchCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.searchCategories).toHaveBeenCalledWith('singing');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, [mockCategory], 'Search results retrieved successfully');
    });

    it('should return 400 when query is missing', async () => {
      mockReq.query = {};

      await controller.searchCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Search query is required', 400);
    });

    it('should return 400 when query is not a string', async () => {
      mockReq.query = { query: 123 };

      await controller.searchCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Search query is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Search error');
      mockReq.query = { query: 'test' };
      mockCategoryService.searchCategories.mockRejectedValue(error);

      await controller.searchCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoryCriteria', () => {
    it('should return criteria for category', async () => {
      mockReq.params = { categoryId: 'category-1' };
      const criteria = [mockCriterion, { ...mockCriterion, id: 'crit-2', name: 'Performance' }];
      (mockPrisma.criterion.findMany as jest.Mock).mockResolvedValue(criteria);

      await controller.getCategoryCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category-1' },
        orderBy: { name: 'asc' },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, criteria, 'Category criteria retrieved successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.params = {};

      await controller.getCategoryCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'category-1' };
      (mockPrisma.criterion.findMany as jest.Mock).mockRejectedValue(error);

      await controller.getCategoryCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createCriterion', () => {
    it('should create criterion with valid data', async () => {
      mockReq.params = { categoryId: 'category-1' };
      mockReq.body = { name: 'Pitch', maxScore: 25 };
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.criterion.create as jest.Mock).mockResolvedValue(mockCriterion);

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({ where: { id: 'category-1' } });
      expect(mockPrisma.criterion.create).toHaveBeenCalledWith({
        data: {
          categoryId: 'category-1',
          name: 'Pitch',
          maxScore: 25,
        },
      });
      expect(sendCreated).toHaveBeenCalledWith(mockRes, mockCriterion, 'Criterion created successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.body = { name: 'Test', maxScore: 10 };

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should return 400 when name is missing', async () => {
      mockReq.params = { categoryId: 'category-1' };
      mockReq.body = { maxScore: 10 };

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'name and maxScore are required', 400);
    });

    it('should return 400 when maxScore is missing', async () => {
      mockReq.params = { categoryId: 'category-1' };
      mockReq.body = { name: 'Test' };

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'name and maxScore are required', 400);
    });

    it('should return 404 when category does not exist', async () => {
      mockReq.params = { categoryId: 'category-1' };
      mockReq.body = { name: 'Test', maxScore: 10 };
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category not found', 404);
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'category-1' };
      mockReq.body = { name: 'Test', maxScore: 10 };
      (mockPrisma.category.findUnique as jest.Mock).mockRejectedValue(error);

      await controller.createCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCriterion', () => {
    it('should update criterion with valid data', async () => {
      mockReq.params = { criterionId: 'crit-1' };
      mockReq.body = { name: 'Updated Name', maxScore: 30 };
      (mockPrisma.criterion.findUnique as jest.Mock).mockResolvedValue(mockCriterion);
      const updated = { ...mockCriterion, name: 'Updated Name', maxScore: 30 };
      (mockPrisma.criterion.update as jest.Mock).mockResolvedValue(updated);

      await controller.updateCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.update).toHaveBeenCalledWith({
        where: { id: 'crit-1' },
        data: { name: 'Updated Name', maxScore: 30 },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, updated, 'Criterion updated successfully');
    });

    it('should update only provided fields', async () => {
      mockReq.params = { criterionId: 'crit-1' };
      mockReq.body = { name: 'Updated Name' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockResolvedValue(mockCriterion);
      (mockPrisma.criterion.update as jest.Mock).mockResolvedValue(mockCriterion);

      await controller.updateCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.update).toHaveBeenCalledWith({
        where: { id: 'crit-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should return 400 when criterion ID is missing', async () => {
      mockReq.body = { name: 'Test' };

      await controller.updateCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Criterion ID is required', 400);
    });

    it('should return 404 when criterion not found', async () => {
      mockReq.params = { criterionId: 'crit-1' };
      mockReq.body = { name: 'Test' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.updateCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Criterion not found', 404);
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { criterionId: 'crit-1' };
      mockReq.body = { name: 'Test' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockRejectedValue(error);

      await controller.updateCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteCriterion', () => {
    it('should delete criterion and return 204', async () => {
      mockReq.params = { criterionId: 'crit-1' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockResolvedValue(mockCriterion);
      (mockPrisma.criterion.delete as jest.Mock).mockResolvedValue(mockCriterion);

      await controller.deleteCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.delete).toHaveBeenCalledWith({ where: { id: 'crit-1' } });
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });

    it('should return 400 when criterion ID is missing', async () => {
      mockReq.params = {};

      await controller.deleteCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Criterion ID is required', 400);
    });

    it('should return 404 when criterion not found', async () => {
      mockReq.params = { criterionId: 'crit-1' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockResolvedValue(null);

      await controller.deleteCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Criterion not found', 404);
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { criterionId: 'crit-1' };
      (mockPrisma.criterion.findUnique as jest.Mock).mockRejectedValue(error);

      await controller.deleteCriterion(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateCategoryWithTimeLimit', () => {
    it('should update category time limit', async () => {
      mockReq.params = { id: 'category-1' };
      mockReq.body = { timeLimit: 420 };
      const updated = { ...mockCategory, timeLimit: 420 };
      mockCategoryService.updateCategory.mockResolvedValue(updated as any);

      await controller.updateCategoryWithTimeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith('category-1', { timeLimit: 420 });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, updated, 'Category time limit updated successfully');
    });

    it('should return 400 when category ID is missing', async () => {
      mockReq.body = { timeLimit: 300 };

      await controller.updateCategoryWithTimeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category ID is required', 400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'category-1' };
      mockReq.body = { timeLimit: 300 };
      mockCategoryService.updateCategory.mockRejectedValue(error);

      await controller.updateCategoryWithTimeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('bulkDeleteCategories', () => {
    it('should delete multiple categories', async () => {
      mockReq.body = { categoryIds: ['cat-1', 'cat-2', 'cat-3'] };
      (mockPrisma.category.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

      await controller.bulkDeleteCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['cat-1', 'cat-2', 'cat-3'] } },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { deleted: 3 }, 'Categories deleted successfully');
    });

    it('should return 400 when categoryIds is missing', async () => {
      mockReq.body = {};

      await controller.bulkDeleteCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category IDs array is required', 400);
    });

    it('should return 400 when categoryIds is not an array', async () => {
      mockReq.body = { categoryIds: 'not-an-array' };

      await controller.bulkDeleteCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Category IDs array is required', 400);
    });

    it('should handle empty array', async () => {
      mockReq.body = { categoryIds: [] };

      await controller.bulkDeleteCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { deleted: 0 }, 'No categories to delete');
      expect(mockPrisma.category.deleteMany).not.toHaveBeenCalled();
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.body = { categoryIds: ['cat-1'] };
      (mockPrisma.category.deleteMany as jest.Mock).mockRejectedValue(error);

      await controller.bulkDeleteCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('bulkUpdateCategories', () => {
    it('should update multiple categories', async () => {
      mockReq.body = {
        updates: [
          { id: 'cat-1', name: 'Updated 1' },
          { id: 'cat-2', scoreCap: 150 },
        ],
      };
      (mockPrisma.category.update as jest.Mock).mockResolvedValue(mockCategory);

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.update).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { updated: 2, failed: 0, total: 2 },
        'Categories bulk update completed'
      );
    });

    it('should return 400 when updates is missing', async () => {
      mockReq.body = {};

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Updates array is required', 400);
    });

    it('should return 400 when updates is not an array', async () => {
      mockReq.body = { updates: 'not-an-array' };

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Updates array is required', 400);
    });

    it('should handle empty array', async () => {
      mockReq.body = { updates: [] };

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { updated: 0 }, 'No categories to update');
    });

    it('should handle partial failures', async () => {
      mockReq.body = {
        updates: [
          { id: 'cat-1', name: 'Updated 1' },
          { id: 'cat-2', scoreCap: 150 },
          { id: 'cat-3', name: 'Updated 3' },
        ],
      };
      (mockPrisma.category.update as jest.Mock)
        .mockResolvedValueOnce(mockCategory)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(mockCategory);

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { updated: 2, failed: 1, total: 3 },
        'Categories bulk update completed'
      );
    });

    it('should call next with error when catastrophic failure', async () => {
      const error = new Error('Catastrophic error');
      mockReq.body = { updates: [{ id: 'cat-1' }] };
      (sendSuccess as jest.Mock).mockImplementation(() => { throw error; });

      await controller.bulkUpdateCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('bulkDeleteCriteria', () => {
    it('should delete multiple criteria', async () => {
      mockReq.body = { criteriaIds: ['crit-1', 'crit-2'] };
      (mockPrisma.criterion.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await controller.bulkDeleteCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['crit-1', 'crit-2'] } },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { deleted: 2 }, 'Criteria deleted successfully');
    });

    it('should return 400 when criteriaIds is missing', async () => {
      mockReq.body = {};

      await controller.bulkDeleteCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Criteria IDs array is required', 400);
    });

    it('should handle empty array', async () => {
      mockReq.body = { criteriaIds: [] };

      await controller.bulkDeleteCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { deleted: 0 }, 'No criteria to delete');
    });

    it('should call next with error when database throws', async () => {
      const error = new Error('Database error');
      mockReq.body = { criteriaIds: ['crit-1'] };
      (mockPrisma.criterion.deleteMany as jest.Mock).mockRejectedValue(error);

      await controller.bulkDeleteCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('bulkUpdateCriteria', () => {
    it('should update multiple criteria', async () => {
      mockReq.body = {
        updates: [
          { id: 'crit-1', name: 'Updated 1', maxScore: 30 },
          { id: 'crit-2', maxScore: 40 },
        ],
      };
      (mockPrisma.criterion.update as jest.Mock).mockResolvedValue(mockCriterion);

      await controller.bulkUpdateCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.criterion.update).toHaveBeenCalledTimes(2);
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { updated: 2, failed: 0, total: 2 },
        'Criteria bulk update completed'
      );
    });

    it('should return 400 when updates is missing', async () => {
      mockReq.body = {};

      await controller.bulkUpdateCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Updates array is required', 400);
    });

    it('should handle empty array', async () => {
      mockReq.body = { updates: [] };

      await controller.bulkUpdateCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, { updated: 0 }, 'No criteria to update');
    });

    it('should handle partial failures', async () => {
      mockReq.body = {
        updates: [
          { id: 'crit-1', name: 'Updated 1' },
          { id: 'crit-2', maxScore: 40 },
        ],
      };
      (mockPrisma.criterion.update as jest.Mock)
        .mockResolvedValueOnce(mockCriterion)
        .mockRejectedValueOnce(new Error('Failed'));

      await controller.bulkUpdateCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        { updated: 1, failed: 1, total: 2 },
        'Criteria bulk update completed'
      );
    });

    it('should call next with error when catastrophic failure', async () => {
      const error = new Error('Catastrophic error');
      mockReq.body = { updates: [{ id: 'crit-1' }] };
      (sendSuccess as jest.Mock).mockImplementation(() => { throw error; });

      await controller.bulkUpdateCriteria(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
