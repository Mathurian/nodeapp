import { Category } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export declare class CategoryRepository extends BaseRepository<Category> {
    protected getModelName(): string;
    findByContestId(contestId: string): Promise<Category[]>;
    findCategoryWithDetails(categoryId: string): Promise<any>;
    searchCategories(query: string): Promise<Category[]>;
    getCategoryStats(categoryId: string): Promise<{
        totalContestants: number;
        totalJudges: number;
        totalCriteria: number;
    }>;
    certifyTotals(categoryId: string, certified: boolean): Promise<Category>;
}
//# sourceMappingURL=CategoryRepository.d.ts.map