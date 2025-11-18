import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
interface CreateScoreRemovalRequestDto {
    judgeId: string;
    categoryId: string;
    reason: string;
    requestedBy: string;
    userRole: string;
    tenantId: string;
}
interface SignRequestDto {
    signatureName: string;
    userId: string;
    userRole: string;
}
export declare class ScoreRemovalService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    createRequest(data: CreateScoreRemovalRequestDto): Promise<{
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
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    }>;
    getAll(tenantId: string, status?: string): Promise<({
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
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    })[]>;
    getById(id: string, tenantId: string): Promise<any>;
    signRequest(id: string, tenantId: string, data: SignRequestDto): Promise<{
        request: any;
        allSigned: boolean;
    }>;
    executeRemoval(id: string, tenantId: string): Promise<{
        deletedCount: any;
    }>;
}
export {};
//# sourceMappingURL=ScoreRemovalService.d.ts.map