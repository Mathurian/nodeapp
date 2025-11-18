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
        status: import(".prisma/client").$Enums.RequestStatus;
        rejectionReason: string | null;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        approvedAt: Date | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
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
        status: import(".prisma/client").$Enums.RequestStatus;
        rejectionReason: string | null;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        approvedAt: Date | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    }>;
    signRequest(id: string, data: any): Promise<{
        request: any;
        allSigned: boolean;
    }>;
    executeUncertification(id: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=JudgeUncertificationService.d.ts.map