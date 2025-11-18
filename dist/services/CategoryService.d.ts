import { Category } from '@prisma/client';
import { BaseService } from './BaseService';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { CacheService } from './CacheService';
interface CreateCategoryDto {
    contestId: string;
    name: string;
    description?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
}
interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
}
export declare class CategoryService extends BaseService {
    private categoryRepo;
    private cacheService;
    constructor(categoryRepo: CategoryRepository, cacheService: CacheService);
    private getCacheKey;
    private invalidateCategoryCache;
    createCategory(data: CreateCategoryDto): Promise<Category>;
    getCategoryById(id: string): Promise<Category>;
    getCategoryWithDetails(id: string): Promise<any>;
    getCategoriesByContestId(contestId: string): Promise<Category[]>;
    updateCategory(id: string, data: UpdateCategoryDto): Promise<Category>;
    deleteCategory(id: string): Promise<void>;
    getCategoryStats(id: string): Promise<any>;
    certifyTotals(id: string, certified: boolean): Promise<Category>;
    searchCategories(query: string): Promise<Category[]>;
}
export {};
//# sourceMappingURL=CategoryService.d.ts.map