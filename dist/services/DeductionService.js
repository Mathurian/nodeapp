"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeductionService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const DeductionRepository_1 = require("../repositories/DeductionRepository");
const database_1 = require("../config/database");
let DeductionService = class DeductionService extends BaseService_1.BaseService {
    deductionRepo;
    constructor(deductionRepo) {
        super();
        this.deductionRepo = deductionRepo;
    }
    async createDeductionRequest(data) {
        this.validateRequired(data, [
            'contestantId',
            'categoryId',
            'amount',
            'reason',
            'requestedBy',
            'tenantId'
        ]);
        if (data.amount <= 0) {
            throw new BaseService_1.ValidationError('Deduction amount must be greater than 0');
        }
        const [contestant, category] = await Promise.all([
            database_1.prisma.contestant.findFirst({
                where: { id: data.contestantId, tenantId: data.tenantId }
            }),
            database_1.prisma.category.findFirst({
                where: { id: data.categoryId, tenantId: data.tenantId }
            })
        ]);
        if (!contestant) {
            throw new BaseService_1.NotFoundError('Contestant', data.contestantId);
        }
        if (!category) {
            throw new BaseService_1.NotFoundError('Category', data.categoryId);
        }
        return await this.deductionRepo.createDeduction(data);
    }
    async getPendingDeductions(userRole, userId, tenantId) {
        let categoryIds;
        if (userRole === 'JUDGE') {
            const user = await database_1.prisma.user.findFirst({
                where: { id: userId, tenantId },
                include: {
                    judge: {
                        include: {
                            categoryJudges: {
                                select: { categoryId: true }
                            }
                        }
                    }
                }
            });
            if (user?.judge) {
                categoryIds = user.judge.categoryJudges.map((cj) => cj.categoryId);
            }
            else {
                categoryIds = [];
            }
        }
        const deductions = await this.deductionRepo.findPendingWithRelations(tenantId, categoryIds);
        return deductions.map(deduction => ({
            ...deduction,
            approvalStatus: this.calculateApprovalStatus(deduction.approvals, userId)
        }));
    }
    async approveDeduction(id, approvedBy, userRole, tenantId, signature, notes) {
        this.validateRequired({ id, approvedBy, signature }, [
            'id',
            'approvedBy',
            'signature'
        ]);
        const deductionRequest = await this.deductionRepo.findByIdWithRelations(id, tenantId);
        if (!deductionRequest) {
            throw new BaseService_1.NotFoundError('Deduction request', id);
        }
        if (deductionRequest.status !== 'PENDING') {
            throw new BaseService_1.ValidationError('Deduction request is not pending');
        }
        const hasApproved = await this.deductionRepo.hasUserApproved(id, approvedBy, tenantId);
        if (hasApproved) {
            throw new BaseService_1.ValidationError('You have already approved this deduction');
        }
        let isHeadJudge = false;
        if (userRole === 'JUDGE') {
            const user = await database_1.prisma.user.findFirst({
                where: { id: approvedBy, tenantId },
                include: { judge: true }
            });
            if (user?.judge) {
                isHeadJudge = user.judge.isHeadJudge;
            }
        }
        const approval = await this.deductionRepo.createApproval(id, approvedBy, userRole, tenantId, isHeadJudge);
        const allApprovals = await this.deductionRepo.getApprovals(id, tenantId);
        const approvalStatus = this.calculateApprovalStatus(allApprovals, approvedBy);
        if (approvalStatus.isFullyApproved) {
            await this.deductionRepo.updateStatus(id, 'APPROVED', tenantId);
            await this.deductionRepo.applyDeductionToScores(deductionRequest.contestantId, deductionRequest.categoryId, deductionRequest.amount, deductionRequest.reason);
        }
        return {
            approval,
            isFullyApproved: approvalStatus.isFullyApproved,
            message: 'Deduction approved successfully'
        };
    }
    async rejectDeduction(id, rejectedBy, reason, tenantId) {
        this.validateRequired({ id, reason }, ['id', 'reason']);
        const deductionRequest = await this.deductionRepo.findByIdWithRelations(id, tenantId);
        if (!deductionRequest) {
            throw new BaseService_1.NotFoundError('Deduction request', id);
        }
        if (deductionRequest.status !== 'PENDING') {
            throw new BaseService_1.ValidationError('Deduction request is not pending');
        }
        await this.deductionRepo.updateStatus(id, 'REJECTED', tenantId, {
            rejectionReason: reason,
            rejectedBy,
            rejectedAt: new Date()
        });
    }
    async getApprovalStatus(id, tenantId) {
        const deductionRequest = await this.deductionRepo.findByIdWithRelations(id, tenantId);
        if (!deductionRequest) {
            throw new BaseService_1.NotFoundError('Deduction request', id);
        }
        const approvalStatus = this.calculateApprovalStatus(deductionRequest.approvals, '');
        return {
            ...deductionRequest,
            approvalStatus
        };
    }
    async getDeductionHistory(filters, page = 1, limit = 50) {
        const { deductions, total } = await this.deductionRepo.findWithFilters(filters, page, limit);
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        return {
            deductions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: skip + limit < total,
                hasPrev: page > 1
            }
        };
    }
    calculateApprovalStatus(approvals, _currentUserId) {
        const hasHeadJudgeApproval = approvals.some(a => a.isHeadJudge);
        const hasTallyMasterApproval = approvals.some(a => a.role === 'TALLY_MASTER');
        const hasAuditorApproval = approvals.some(a => a.role === 'AUDITOR');
        const hasBoardApproval = approvals.some(a => ['BOARD', 'ORGANIZER', 'ADMIN'].includes(a.role));
        const isFullyApproved = hasHeadJudgeApproval &&
            hasTallyMasterApproval &&
            hasAuditorApproval &&
            hasBoardApproval;
        return {
            hasHeadJudgeApproval,
            hasTallyMasterApproval,
            hasAuditorApproval,
            hasBoardApproval,
            isFullyApproved,
            approvalCount: approvals.length,
            requiredApprovals: 4
        };
    }
};
exports.DeductionService = DeductionService;
exports.DeductionService = DeductionService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('DeductionRepository')),
    __metadata("design:paramtypes", [DeductionRepository_1.DeductionRepository])
], DeductionService);
//# sourceMappingURL=DeductionService.js.map