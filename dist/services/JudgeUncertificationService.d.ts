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
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        approvedBy: string | null;
        rejectedBy: string | null;
    })[]>;
    createUncertificationRequest(data: any): Promise<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        approvedAt: Date | null;
        rejectedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        approvedBy: string | null;
        rejectedBy: string | null;
    }>;
    signRequest(id: string, data: any): Promise<{
        request: {
            category: never;
            judge: never;
        } & {
            id: string;
            judgeId: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            categoryId: string;
            reason: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            requestedAt: Date;
            approvedAt: Date | null;
            rejectedAt: Date | null;
            rejectionReason: string | null;
            requestedBy: string;
            approvedBy: string | null;
            rejectedBy: string | null;
        };
        allSigned: boolean;
    }>;
    executeUncertification(id: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=JudgeUncertificationService.d.ts.map