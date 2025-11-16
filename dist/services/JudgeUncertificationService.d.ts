import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class JudgeUncertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getUncertificationRequests(status?: string): Promise<({
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    })[]>;
    createUncertificationRequest(data: any): Promise<{
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    }>;
    signRequest(id: string, data: any): Promise<{
        request: {
            category: never;
            judge: never;
        } & {
            status: import(".prisma/client").$Enums.RequestStatus;
            id: string;
            judgeId: string;
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            reason: string;
            approvedAt: Date | null;
            rejectionReason: string | null;
            requestedBy: string;
            requestedAt: Date;
            approvedBy: string | null;
            rejectedBy: string | null;
            rejectedAt: Date | null;
        };
        allSigned: boolean;
    }>;
    executeUncertification(id: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=JudgeUncertificationService.d.ts.map