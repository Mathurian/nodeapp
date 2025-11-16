import { BaseService } from './BaseService';
export declare class CategoryTypeService extends BaseService {
    getAllCategoryTypes(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        tenantId: string | null;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }[]>;
    createCategoryType(name: string, description: string | null, createdById: string, tenantId?: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        tenantId: string | null;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }>;
    updateCategoryType(id: string, name?: string, description?: string | null): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        tenantId: string | null;
        description: string | null;
        isSystem: boolean;
        createdById: string | null;
    }>;
    deleteCategoryType(id: string): Promise<void>;
}
//# sourceMappingURL=CategoryTypeService.d.ts.map