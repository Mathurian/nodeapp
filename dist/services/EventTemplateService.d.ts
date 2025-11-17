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
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        createdAt: Date;
    }>;
    getAll(tenantId: string): Promise<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        creator: never;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getById(id: string, tenantId: string): Promise<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        creator: never;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, tenantId: string, data: UpdateTemplateDto): Promise<{
        id: string;
        name: string;
        description: string;
        contests: any;
        categories: any;
        updatedAt: Date;
    }>;
    delete(id: string, tenantId: string): Promise<void>;
    createEventFromTemplate(data: CreateEventFromTemplateDto): Promise<{
        id: string;
        name: string;
        description: string;
        startDate: Date;
        endDate: Date;
        createdAt: Date;
    }>;
}
export {};
//# sourceMappingURL=EventTemplateService.d.ts.map