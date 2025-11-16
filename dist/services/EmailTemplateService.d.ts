import { PrismaClient, EmailTemplate } from '@prisma/client';
export interface CreateEmailTemplateDTO {
    tenantId?: string;
    name: string;
    subject: string;
    body: string;
    type?: string;
    eventId?: string;
    variables?: string[];
    headerHtml?: string;
    footerHtml?: string;
    logoUrl?: string;
    logoPosition?: string;
    backgroundColor?: string;
    primaryColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontSize?: string;
    layoutType?: string;
    contentWrapper?: string;
    borderStyle?: string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: string;
    padding?: string;
    createdBy: string;
}
export interface UpdateEmailTemplateDTO {
    name?: string;
    subject?: string;
    body?: string;
    type?: string;
    variables?: string[];
    headerHtml?: string;
    footerHtml?: string;
    logoUrl?: string;
    logoPosition?: string;
    backgroundColor?: string;
    primaryColor?: string;
    textColor?: string;
    fontFamily?: string;
    fontSize?: string;
    layoutType?: string;
    contentWrapper?: string;
    borderStyle?: string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: string;
    padding?: string;
}
export declare class EmailTemplateService {
    private prisma;
    constructor(prisma: PrismaClient);
    createEmailTemplate(data: CreateEmailTemplateDTO): Promise<EmailTemplate>;
    getAllEmailTemplates(eventId?: string): Promise<EmailTemplate[]>;
    getEmailTemplateById(id: string): Promise<EmailTemplate | null>;
    getEmailTemplatesByType(type: string, eventId?: string): Promise<EmailTemplate[]>;
    updateEmailTemplate(id: string, data: UpdateEmailTemplateDTO): Promise<EmailTemplate>;
    deleteEmailTemplate(id: string): Promise<void>;
    renderTemplate(template: EmailTemplate, variables: Record<string, string>): {
        subject: string;
        html: string;
    };
    private buildHtmlEmail;
    getAvailableVariables(type: string): string[];
    cloneEmailTemplate(id: string, userId: string): Promise<EmailTemplate>;
    previewEmailTemplate(id: string, sampleVariables?: Record<string, string>): Promise<{
        subject: string;
        html: string;
    }>;
}
//# sourceMappingURL=EmailTemplateService.d.ts.map