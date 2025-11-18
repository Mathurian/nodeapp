import { BaseService } from './BaseService';
export declare class CategoryTypeService extends BaseService {
    getAllCategoryTypes(): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }[]>;
    createCategoryType(name: string, description: string | null, createdById: string, _tenantId?: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }>;
    updateCategoryType(id: string, name?: string, description?: string | null): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }>;
    deleteCategoryType(id: string): Promise<void>;
}
//# sourceMappingURL=CategoryTypeService.d.ts.map