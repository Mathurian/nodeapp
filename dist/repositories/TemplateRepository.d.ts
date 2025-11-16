import { BaseRepository } from './BaseRepository';
import { CategoryTemplate } from '@prisma/client';
export interface TemplateWithCriteria extends CategoryTemplate {
    criteria: Array<{
        id: string;
        name: string;
        maxScore: number;
        templateId: string;
    }>;
}
export interface CreateTemplateData {
    name: string;
    description?: string | null;
    criteria?: Array<{
        name: string;
        maxScore: number;
    }>;
}
export interface UpdateTemplateData {
    name?: string;
    description?: string | null;
    criteria?: Array<{
        name: string;
        maxScore: number;
    }>;
}
export declare class TemplateRepository extends BaseRepository<CategoryTemplate> {
    constructor();
    protected getModelName(): string;
    findAllWithCriteria(): Promise<TemplateWithCriteria[]>;
    findByIdWithCriteria(id: string): Promise<TemplateWithCriteria | null>;
    createWithCriteria(data: CreateTemplateData): Promise<TemplateWithCriteria>;
    updateWithCriteria(id: string, data: UpdateTemplateData): Promise<TemplateWithCriteria>;
    duplicateTemplate(id: string): Promise<TemplateWithCriteria | null>;
}
//# sourceMappingURL=TemplateRepository.d.ts.map