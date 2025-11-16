import { BaseService } from './BaseService';
import { DeductionRepository, CreateDeductionData, DeductionFilters, DeductionWithRelations } from '../repositories/DeductionRepository';
interface ApprovalStatus {
    hasHeadJudgeApproval: boolean;
    hasTallyMasterApproval: boolean;
    hasAuditorApproval: boolean;
    hasBoardApproval: boolean;
    isFullyApproved: boolean;
    approvalCount: number;
    requiredApprovals: number;
}
export declare class DeductionService extends BaseService {
    private deductionRepo;
    constructor(deductionRepo: DeductionRepository);
    createDeductionRequest(data: CreateDeductionData): Promise<DeductionWithRelations>;
    getPendingDeductions(userRole: string, userId: string): Promise<Array<DeductionWithRelations & {
        approvalStatus: ApprovalStatus;
    }>>;
    approveDeduction(id: string, approvedBy: string, userRole: string, signature: string, notes?: string): Promise<{
        approval: any;
        isFullyApproved: boolean;
        message: string;
    }>;
    rejectDeduction(id: string, rejectedBy: string, reason: string): Promise<void>;
    getApprovalStatus(id: string): Promise<DeductionWithRelations & {
        approvalStatus: ApprovalStatus;
    }>;
    getDeductionHistory(filters: DeductionFilters, page?: number, limit?: number): Promise<{
        deductions: DeductionWithRelations[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }>;
    private calculateApprovalStatus;
}
export {};
//# sourceMappingURL=DeductionService.d.ts.map