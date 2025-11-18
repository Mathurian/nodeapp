import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class BoardService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        contests: number;
        categories: number;
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
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
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
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }>;
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
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }>;
    deleteEmceeScript(scriptId: string): Promise<{
        message: string;
    }>;
    getScoreRemovalRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: any;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    approveScoreRemoval(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        judgeId: string;
        contestantId: string;
        tenantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    rejectScoreRemoval(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        judgeId: string;
        contestantId: string;
        tenantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
}
//# sourceMappingURL=BoardService.d.ts.map