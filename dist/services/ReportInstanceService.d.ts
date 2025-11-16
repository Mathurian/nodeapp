import { PrismaClient, ReportInstance } from '@prisma/client';
import { BaseService } from './BaseService';
export interface CreateReportInstanceDTO {
    type: string;
    name: string;
    generatedById: string;
    format: string;
    data?: string;
    templateId?: string;
}
export interface ReportInstanceFilters {
    type?: string;
    generatedById?: string;
    format?: string;
    startDate?: Date;
    endDate?: Date;
}
export declare class ReportInstanceService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    createInstance(data: CreateReportInstanceDTO): Promise<ReportInstance>;
    getInstances(filters?: ReportInstanceFilters): Promise<ReportInstance[]>;
    getInstanceById(instanceId: string): Promise<ReportInstance>;
    deleteInstance(instanceId: string): Promise<void>;
    deleteOldInstances(olderThanDays?: number): Promise<number>;
    getInstanceStats(filters?: {
        type?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        totalInstances: number;
        byType: Record<string, number>;
        byFormat: Record<string, number>;
        topGenerators: Array<{
            userId: string;
            userName: string;
            count: number;
        }>;
    }>;
}
//# sourceMappingURL=ReportInstanceService.d.ts.map