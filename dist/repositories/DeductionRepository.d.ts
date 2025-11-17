import { BaseRepository } from './BaseRepository';
import { DeductionRequest, DeductionApproval } from '@prisma/client';
export interface DeductionWithRelations extends DeductionRequest {
    contestant: {
        id: string;
        name: string;
        email: string;
    };
    category: {
        id: string;
        name: string;
    };
    requestedBy: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    approvals: Array<DeductionApproval & {
        approver: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
}
export interface CreateDeductionData {
    contestantId: string;
    categoryId: string;
    amount: number;
    reason: string;
    requestedBy: string;
    tenantId: string;
}
export interface DeductionFilters {
    status?: string;
    categoryId?: string;
    contestantId?: string;
    tenantId: string;
}
export declare class DeductionRepository extends BaseRepository<DeductionRequest> {
    constructor();
    protected getModelName(): string;
    findPendingWithRelations(tenantId: string, categoryIds?: string[]): Promise<DeductionWithRelations[]>;
    findByIdWithRelations(id: string, tenantId: string): Promise<DeductionWithRelations | null>;
    createDeduction(data: CreateDeductionData): Promise<DeductionWithRelations>;
    findWithFilters(filters: DeductionFilters, page: number, limit: number): Promise<{
        deductions: DeductionWithRelations[];
        total: number;
    }>;
    getApprovals(requestId: string, tenantId: string): Promise<DeductionApproval[]>;
    createApproval(requestId: string, approvedById: string, role: string, tenantId: string, isHeadJudge?: boolean): Promise<DeductionApproval>;
    hasUserApproved(requestId: string, userId: string, tenantId: string): Promise<boolean>;
    updateStatus(id: string, status: string, tenantId: string, additionalData?: any): Promise<DeductionRequest>;
    applyDeductionToScores(_contestantId: string, _categoryId: string, _amount: number, _reason: string): Promise<number>;
}
//# sourceMappingURL=DeductionRepository.d.ts.map