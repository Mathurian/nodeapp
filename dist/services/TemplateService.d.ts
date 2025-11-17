import { BaseService } from './BaseService';
import { TemplateRepository, CreateTemplateData, UpdateTemplateData, TemplateWithCriteria } from '../repositories/TemplateRepository';
export declare class TemplateService extends BaseService {
    private templateRepo;
    constructor(templateRepo: TemplateRepository);
    getAllTemplates(tenantId: string): Promise<TemplateWithCriteria[]>;
    getTemplateById(id: string, tenantId: string): Promise<TemplateWithCriteria>;
    createTemplate(data: CreateTemplateData): Promise<TemplateWithCriteria>;
    updateTemplate(id: string, tenantId: string, data: UpdateTemplateData): Promise<TemplateWithCriteria>;
    deleteTemplate(id: string, tenantId: string): Promise<void>;
    duplicateTemplate(id: string, tenantId: string): Promise<TemplateWithCriteria>;
}
//# sourceMappingURL=TemplateService.d.ts.map