"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const CategoryRepository_1 = require("../repositories/CategoryRepository");
const CacheService_1 = require("./CacheService");
let CategoryService = class CategoryService extends BaseService_1.BaseService {
    categoryRepo;
    cacheService;
    constructor(categoryRepo, cacheService) {
        super();
        this.categoryRepo = categoryRepo;
        this.cacheService = cacheService;
    }
    getCacheKey(id) {
        return `category:${id}`;
    }
    async invalidateCategoryCache(id, contestId) {
        if (id) {
            await this.cacheService.del(this.getCacheKey(id));
            await this.cacheService.del(`category:details:${id}`);
        }
        if (contestId) {
            await this.cacheService.del(`categories:contest:${contestId}`);
        }
        await this.cacheService.invalidatePattern('categories:*');
    }
    async createCategory(data) {
        try {
            this.validateRequired(data, ['contestId', 'name']);
            if (data.scoreCap !== undefined && data.scoreCap < 0) {
                throw new BaseService_1.ValidationError('Score cap must be non-negative');
            }
            const category = await this.categoryRepo.create(data);
            await this.invalidateCategoryCache(undefined, data.contestId);
            this.logInfo('Category created', { categoryId: category.id, contestId: data.contestId });
            return category;
        }
        catch (error) {
            return this.handleError(error, { operation: 'createCategory', data });
        }
    }
    async getCategoryById(id) {
        try {
            const cacheKey = this.getCacheKey(id);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const category = await this.categoryRepo.findById(id);
            if (!category) {
                throw new BaseService_1.NotFoundError('Category', id);
            }
            await this.cacheService.set(cacheKey, category, 1800);
            return category;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getCategoryById', id });
        }
    }
    async getCategoryWithDetails(id) {
        try {
            const cacheKey = `category:details:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const category = await this.categoryRepo.findCategoryWithDetails(id);
            if (!category) {
                throw new BaseService_1.NotFoundError('Category', id);
            }
            await this.cacheService.set(cacheKey, category, 900);
            return category;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getCategoryWithDetails', id });
        }
    }
    async getCategoriesByContestId(contestId) {
        try {
            const cacheKey = `categories:contest:${contestId}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const categories = await this.categoryRepo.findByContestId(contestId);
            await this.cacheService.set(cacheKey, categories, 600);
            return categories;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getCategoriesByContestId', contestId });
        }
    }
    async updateCategory(id, data) {
        try {
            const existing = await this.getCategoryById(id);
            if (data.scoreCap !== undefined && data.scoreCap < 0) {
                throw new BaseService_1.ValidationError('Score cap must be non-negative');
            }
            const category = await this.categoryRepo.update(id, data);
            await this.invalidateCategoryCache(id, existing.contestId);
            this.logInfo('Category updated', { categoryId: id });
            return category;
        }
        catch (error) {
            return this.handleError(error, { operation: 'updateCategory', id, data });
        }
    }
    async deleteCategory(id) {
        try {
            const existing = await this.getCategoryById(id);
            await this.categoryRepo.delete(id);
            await this.invalidateCategoryCache(id, existing.contestId);
            this.logInfo('Category deleted', { categoryId: id });
        }
        catch (error) {
            return this.handleError(error, { operation: 'deleteCategory', id });
        }
    }
    async getCategoryStats(id) {
        try {
            const cacheKey = `category:stats:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const stats = await this.categoryRepo.getCategoryStats(id);
            await this.cacheService.set(cacheKey, stats, 300);
            return stats;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getCategoryStats', id });
        }
    }
    async certifyTotals(id, certified) {
        try {
            const existing = await this.getCategoryById(id);
            const category = await this.categoryRepo.certifyTotals(id, certified);
            await this.invalidateCategoryCache(id, existing.contestId);
            this.logInfo('Category totals certified', { categoryId: id, certified });
            return category;
        }
        catch (error) {
            return this.handleError(error, { operation: 'certifyTotals', id, certified });
        }
    }
    async searchCategories(query) {
        try {
            const cacheKey = `categories:search:${query}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const categories = await this.categoryRepo.searchCategories(query);
            await this.cacheService.set(cacheKey, categories, 300);
            return categories;
        }
        catch (error) {
            return this.handleError(error, { operation: 'searchCategories', query });
        }
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('CategoryRepository')),
    __param(1, (0, tsyringe_1.inject)('CacheService')),
    __metadata("design:paramtypes", [CategoryRepository_1.CategoryRepository,
        CacheService_1.CacheService])
], CategoryService);
//# sourceMappingURL=CategoryService.js.map