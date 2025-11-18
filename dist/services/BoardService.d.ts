import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class BoardService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        contests: any;
        categories: any;
        certified: any;
        pending: any;
    }>;
    getCertifications(): Promise<any>;
    approveCertification(categoryId: string): Promise<{
        message: string;
        category: any;
    }>;
    rejectCertification(categoryId: string, reason?: string): Promise<{
        message: string;
        category: any;
    }>;
    getCertificationStatus(): Promise<{
        total: any;
        pending: any;
        certified: any;
        approved: number;
    }>;
    getEmceeScripts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        eventId: string | null;
        contestId: string | null;
        categoryId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
    }[]>;
    createEmceeScript(data: {
        title: string;
        content: string;
        type?: string;
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        order?: number;
        notes?: string;
        userId: string;
        tenantId: string;
    }): Promise<any>;
    updateEmceeScript(scriptId: string, data: {
        title?: string;
        content?: string;
        type?: string;
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        order?: number;
        notes?: string;
        isActive?: boolean;
    }): Promise<any>;
    deleteEmceeScript(scriptId: string): Promise<{
        message: string;
    }>;
    getScoreRemovalRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>;
    approveScoreRemoval(requestId: string, userId: string, reason?: string): Promise<any>;
    rejectScoreRemoval(requestId: string, userId: string, reason?: string): Promise<any>;
}
//# sourceMappingURL=BoardService.d.ts.map