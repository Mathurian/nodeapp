import { BaseService } from './BaseService';
import { TemplateRepository, CreateTemplateData, UpdateTemplateData, TemplateWithCriteria } from '../repositories/TemplateRepository';
export declare class TemplateService extends BaseService {
    private templateRepo;
    constructor(templateRepo: TemplateRepository);
    getAllTemplates(): Promise<TemplateWithCriteria[]>;
    getTemplateById(id: string): Promise<TemplateWithCriteria>;
    createTemplate(data: CreateTemplateData): Promise<TemplateWithCriteria>;
    updateTemplate(id: string, data: UpdateTemplateData): Promise<TemplateWithCriteria>;
    deleteTemplate(id: string): Promise<void>;
    duplicateTemplate(id: string): Promise<TemplateWithCriteria>;
}
//# sourceMappingURL=TemplateService.d.ts.map