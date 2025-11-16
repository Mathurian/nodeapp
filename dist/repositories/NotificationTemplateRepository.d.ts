import { PrismaClient, NotificationTemplate } from '@prisma/client';
export interface CreateNotificationTemplateDTO {
    name: string;
    type: string;
    title: string;
    body: string;
    emailSubject?: string;
    emailBody?: string;
    variables?: string[];
    isActive?: boolean;
}
export interface UpdateNotificationTemplateDTO {
    name?: string;
    type?: string;
    title?: string;
    body?: string;
    emailSubject?: string;
    emailBody?: string;
    variables?: string[];
    isActive?: boolean;
}
export declare class NotificationTemplateRepository {
    private prismaClient;
    constructor(prismaClient?: PrismaClient);
    findById(id: string): Promise<NotificationTemplate | null>;
    findByName(name: string): Promise<NotificationTemplate | null>;
    findAll(options?: {
        type?: string;
        isActive?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<NotificationTemplate[]>;
    create(data: CreateNotificationTemplateDTO): Promise<NotificationTemplate>;
    update(id: string, data: UpdateNotificationTemplateDTO): Promise<NotificationTemplate>;
    delete(id: string): Promise<NotificationTemplate>;
    renderTemplate(template: NotificationTemplate, variables: Record<string, any>): {
        title: string;
        body: string;
        emailSubject?: string;
        emailBody?: string;
    };
    seedDefaultTemplates(): Promise<void>;
}
//# sourceMappingURL=NotificationTemplateRepository.d.ts.map