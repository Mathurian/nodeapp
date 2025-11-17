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
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string;
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
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string;
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
    getById(id: string, tenantId: string): Promise<{
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string;
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
    signRequest(id: string, tenantId: string, data: SignRequestDto): Promise<{
        request: {
            category: never;
            judge: never;
        } & {
            status: import(".prisma/client").$Enums.RequestStatus;
            id: string;
            judgeId: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            categoryId: string;
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
        };
        allSigned: boolean;
    }>;
    executeRemoval(id: string, tenantId: string): Promise<{
        deletedCount: number;
    }>;
}
export {};
//# sourceMappingURL=ScoreRemovalService.d.ts.map