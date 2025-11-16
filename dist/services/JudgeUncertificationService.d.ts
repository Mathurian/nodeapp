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
        id: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        approvedAt: Date | null;
        judgeId: string;
        tenantId: string | null;
        updatedAt: Date;
        requestedBy: string;
        approvedBy: string | null;
        rejectionReason: string | null;
        requestedAt: Date;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    })[]>;
    createUncertificationRequest(data: any): Promise<{
        category: never;
        judge: never;
    } & {
        id: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        approvedAt: Date | null;
        judgeId: string;
        tenantId: string | null;
        updatedAt: Date;
        requestedBy: string;
        approvedBy: string | null;
        rejectionReason: string | null;
        requestedAt: Date;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    }>;
    signRequest(id: string, data: any): Promise<{
        request: {
            category: never;
            judge: never;
        } & {
            id: string;
            categoryId: string;
            reason: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            createdAt: Date;
            approvedAt: Date | null;
            judgeId: string;
            tenantId: string | null;
            updatedAt: Date;
            requestedBy: string;
            approvedBy: string | null;
            rejectionReason: string | null;
            requestedAt: Date;
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