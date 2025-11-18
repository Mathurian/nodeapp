import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
interface CreateTemplateDto {
    name: string;
    description?: string;
    contests: any;
    categories: any;
    createdBy: string;
    tenantId: string;
}
interface UpdateTemplateDto {
    name: string;
    description?: string;
    contests: any;
    categories: any;
}
interface CreateEventFromTemplateDto {
    templateId: string;
    eventName: string;
    eventDescription?: string;
    startDate: Date;
    endDate: Date;
    tenantId: string;
}
export declare class EventTemplateService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateTemplateDto): Promise<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        createdAt: any;
    }>;
    getAll(tenantId: string): Promise<any>;
    getById(id: string, tenantId: string): Promise<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        creator: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(id: string, tenantId: string, data: UpdateTemplateDto): Promise<{
        id: any;
        name: any;
        description: any;
        contests: any;
        categories: any;
        updatedAt: any;
    }>;
    delete(id: string, tenantId: string): Promise<void>;
    createEventFromTemplate(data: CreateEventFromTemplateDto): Promise<{
        id: any;
        name: any;
        description: any;
        startDate: any;
        endDate: any;
        createdAt: any;
    }>;
}
export {};
//# sourceMappingURL=EventTemplateService.d.ts.map