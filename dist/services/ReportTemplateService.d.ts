import { PrismaClient, ReportTemplate } from '@prisma/client';
import { BaseService } from './BaseService';
export interface CreateReportTemplateDTO {
    name: string;
    type: string;
    template: string;
    parameters?: string;
    tenantId: string;
}
export interface UpdateReportTemplateDTO {
    name?: string;
    type?: string;
    template?: string;
    parameters?: string;
}
export declare class ReportTemplateService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllTemplates(tenantId: string, filters?: {
        type?: string;
    }): Promise<ReportTemplate[]>;
    getTemplateById(templateId: string, tenantId: string): Promise<ReportTemplate>;
    createTemplate(data: CreateReportTemplateDTO): Promise<ReportTemplate>;
    updateTemplate(templateId: string, tenantId: string, data: UpdateReportTemplateDTO): Promise<ReportTemplate>;
    deleteTemplate(templateId: string, tenantId: string): Promise<void>;
    getTemplatesByType(type: string, tenantId: string): Promise<ReportTemplate[]>;
}
//# sourceMappingURL=ReportTemplateService.d.ts.map