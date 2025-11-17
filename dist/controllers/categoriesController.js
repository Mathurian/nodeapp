"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateCriteria = exports.bulkDeleteCriteria = exports.bulkUpdateCategories = exports.bulkDeleteCategories = exports.updateCategoryWithTimeLimit = exports.deleteCriterion = exports.updateCriterion = exports.createCriterion = exports.getCategoryCriteria = exports.searchCategories = exports.certifyTotals = exports.getCategoryStats = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoriesByContest = exports.getCategoryById = exports.getAllCategories = exports.CategoriesController = void 0;
const container_1 = require("../config/container");
const CategoryService_1 = require("../services/CategoryService");
const responseHelpers_1 = require("../utils/responseHelpers");
class CategoriesController {
    categoryService;
    prisma;
    constructor() {
        this.categoryService = container_1.container.resolve(CategoryService_1.CategoryService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getAllCategories = async (_req, res, next) => {
        try {
            return (0, responseHelpers_1.sendSuccess)(res, [], 'Please use getCategoriesByContest endpoint for category lists');
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoryById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const category = await this.categoryService.getCategoryWithDetails(id);
            return (0, responseHelpers_1.sendSuccess)(res, category, 'Category retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoriesByContest = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            if (!contestId) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const categories = await this.categoryService.getCategoriesByContestId(contestId);
            return (0, responseHelpers_1.sendSuccess)(res, categories, 'Categories retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    createCategory = async (req, res, next) => {
        try {
            const contestId = req.params.contestId || req.body.contestId;
            if (!contestId) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
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
            return (0, responseHelpers_1.sendCreated)(res, category, 'Category created successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    updateCategory = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
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
            return (0, responseHelpers_1.sendSuccess)(res, category, 'Category updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteCategory = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            await this.categoryService.deleteCategory(id);
            return (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoryStats = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const stats = await this.categoryService.getCategoryStats(id);
            return (0, responseHelpers_1.sendSuccess)(res, stats, 'Category statistics retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    certifyTotals = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const { certified } = req.body;
            const category = await this.categoryService.certifyTotals(id, certified);
            return (0, responseHelpers_1.sendSuccess)(res, category, 'Category totals certified successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    searchCategories = async (req, res, next) => {
        try {
            const { query } = req.query;
            if (!query || typeof query !== 'string') {
                return (0, responseHelpers_1.sendError)(res, 'Search query is required', 400);
            }
            const categories = await this.categoryService.searchCategories(query);
            return (0, responseHelpers_1.sendSuccess)(res, categories, 'Search results retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCategoryCriteria = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const criteria = await this.prisma.criterion.findMany({
                where: { categoryId },
                orderBy: { name: 'asc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, criteria, 'Category criteria retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    createCriterion = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const { name, maxScore } = req.body;
            if (!name || maxScore === undefined) {
                return (0, responseHelpers_1.sendError)(res, 'name and maxScore are required', 400);
            }
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                return (0, responseHelpers_1.sendError)(res, 'Category not found', 404);
            }
            const criterion = await this.prisma.criterion.create({
                data: {
                    categoryId,
                    name,
                    maxScore: parseInt(maxScore)
                }
            });
            return (0, responseHelpers_1.sendCreated)(res, criterion, 'Criterion created successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    updateCriterion = async (req, res, next) => {
        try {
            const { criterionId } = req.params;
            if (!criterionId) {
                return (0, responseHelpers_1.sendError)(res, 'Criterion ID is required', 400);
            }
            const { name, maxScore } = req.body;
            const existing = await this.prisma.criterion.findUnique({
                where: { id: criterionId }
            });
            if (!existing) {
                return (0, responseHelpers_1.sendError)(res, 'Criterion not found', 404);
            }
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (maxScore !== undefined)
                updateData.maxScore = parseInt(maxScore);
            const criterion = await this.prisma.criterion.update({
                where: { id: criterionId },
                data: updateData
            });
            return (0, responseHelpers_1.sendSuccess)(res, criterion, 'Criterion updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteCriterion = async (req, res, next) => {
        try {
            const { criterionId } = req.params;
            if (!criterionId) {
                return (0, responseHelpers_1.sendError)(res, 'Criterion ID is required', 400);
            }
            const criterion = await this.prisma.criterion.findUnique({
                where: { id: criterionId }
            });
            if (!criterion) {
                return (0, responseHelpers_1.sendError)(res, 'Criterion not found', 404);
            }
            await this.prisma.criterion.delete({
                where: { id: criterionId }
            });
            return (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            return next(error);
        }
    };
    updateCategoryWithTimeLimit = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Category ID is required', 400);
            }
            const { timeLimit } = req.body;
            const category = await this.categoryService.updateCategory(id, { timeLimit });
            return (0, responseHelpers_1.sendSuccess)(res, category, 'Category time limit updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    bulkDeleteCategories = async (req, res, next) => {
        try {
            const { categoryIds } = req.body;
            if (!categoryIds || !Array.isArray(categoryIds)) {
                return (0, responseHelpers_1.sendError)(res, 'Category IDs array is required', 400);
            }
            if (categoryIds.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { deleted: 0 }, 'No categories to delete');
            }
            const result = await this.prisma.category.deleteMany({
                where: {
                    id: { in: categoryIds }
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, { deleted: result.count }, 'Categories deleted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    bulkUpdateCategories = async (req, res, next) => {
        try {
            const { updates } = req.body;
            if (!updates || !Array.isArray(updates)) {
                return (0, responseHelpers_1.sendError)(res, 'Updates array is required', 400);
            }
            if (updates.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { updated: 0 }, 'No categories to update');
            }
            const results = await Promise.allSettled(updates.map(async (update) => {
                const { id, ...data } = update;
                if (!id) {
                    throw new Error('Each update must have an id');
                }
                return this.prisma.category.update({
                    where: { id },
                    data
                });
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                updated: successful,
                failed,
                total: updates.length
            }, 'Categories bulk update completed');
        }
        catch (error) {
            return next(error);
        }
    };
    bulkDeleteCriteria = async (req, res, next) => {
        try {
            const { criteriaIds } = req.body;
            if (!criteriaIds || !Array.isArray(criteriaIds)) {
                return (0, responseHelpers_1.sendError)(res, 'Criteria IDs array is required', 400);
            }
            if (criteriaIds.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { deleted: 0 }, 'No criteria to delete');
            }
            const result = await this.prisma.criterion.deleteMany({
                where: {
                    id: { in: criteriaIds }
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, { deleted: result.count }, 'Criteria deleted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    bulkUpdateCriteria = async (req, res, next) => {
        try {
            const { updates } = req.body;
            if (!updates || !Array.isArray(updates)) {
                return (0, responseHelpers_1.sendError)(res, 'Updates array is required', 400);
            }
            if (updates.length === 0) {
                return (0, responseHelpers_1.sendSuccess)(res, { updated: 0 }, 'No criteria to update');
            }
            const results = await Promise.allSettled(updates.map(async (update) => {
                const { id, ...data } = update;
                if (!id) {
                    throw new Error('Each update must have an id');
                }
                return this.prisma.criterion.update({
                    where: { id },
                    data
                });
            }));
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            return (0, responseHelpers_1.sendSuccess)(res, {
                updated: successful,
                failed,
                total: updates.length
            }, 'Criteria bulk update completed');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.CategoriesController = CategoriesController;
const controller = new CategoriesController();
exports.getAllCategories = controller.getAllCategories;
exports.getCategoryById = controller.getCategoryById;
exports.getCategoriesByContest = controller.getCategoriesByContest;
exports.createCategory = controller.createCategory;
exports.updateCategory = controller.updateCategory;
exports.deleteCategory = controller.deleteCategory;
exports.getCategoryStats = controller.getCategoryStats;
exports.certifyTotals = controller.certifyTotals;
exports.searchCategories = controller.searchCategories;
exports.getCategoryCriteria = controller.getCategoryCriteria;
exports.createCriterion = controller.createCriterion;
exports.updateCriterion = controller.updateCriterion;
exports.deleteCriterion = controller.deleteCriterion;
exports.updateCategoryWithTimeLimit = controller.updateCategoryWithTimeLimit;
exports.bulkDeleteCategories = controller.bulkDeleteCategories;
exports.bulkUpdateCategories = controller.bulkUpdateCategories;
exports.bulkDeleteCriteria = controller.bulkDeleteCriteria;
exports.bulkUpdateCriteria = controller.bulkUpdateCriteria;
//# sourceMappingURL=categoriesController.js.map