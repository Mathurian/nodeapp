"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeductionHistory = exports.getApprovalStatus = exports.rejectDeduction = exports.approveDeduction = exports.getPendingDeductions = exports.createDeductionRequest = exports.DeductionController = void 0;
const container_1 = require("../config/container");
const DeductionService_1 = require("../services/DeductionService");
const responseHelpers_1 = require("../utils/responseHelpers");
class DeductionController {
    deductionService;
    constructor() {
        this.deductionService = container_1.container.resolve(DeductionService_1.DeductionService);
    }
    createDeductionRequest = async (req, res, next) => {
        try {
            const { contestantId, categoryId, amount, reason } = req.body;
            const requestedBy = req.user.id;
            const deduction = await this.deductionService.createDeductionRequest({
                contestantId,
                categoryId,
                amount: parseFloat(amount),
                reason,
                requestedBy,
                tenantId: req.user.tenantId
            });
            (0, responseHelpers_1.sendCreated)(res, deduction, 'Deduction request created successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getPendingDeductions = async (req, res, next) => {
        try {
            const userRole = req.user.role;
            const userId = req.user.id;
            const deductions = await this.deductionService.getPendingDeductions(userRole, userId, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, deductions, 'Pending deductions retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    approveDeduction = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { signature, notes } = req.body;
            const approvedBy = req.user.id;
            const userRole = req.user.role;
            const result = await this.deductionService.approveDeduction(id, approvedBy, userRole, signature, notes);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    rejectDeduction = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { reason } = req.body;
            const rejectedBy = req.user.id;
            await this.deductionService.rejectDeduction(id, rejectedBy, reason, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Deduction rejected successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getApprovalStatus = async (req, res, next) => {
        try {
            const id = req.params.id;
            const status = await this.deductionService.getApprovalStatus(id, req.user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, status, 'Approval status retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getDeductionHistory = async (req, res, next) => {
        try {
            const { page = '1', limit = '50', status, categoryId, contestantId } = req.query;
            const result = await this.deductionService.getDeductionHistory({
                status: status,
                categoryId: categoryId,
                contestantId: contestantId,
                tenantId: req.user.tenantId
            }, parseInt(page), parseInt(limit));
            (0, responseHelpers_1.sendSuccess)(res, result, 'Deduction history retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.DeductionController = DeductionController;
const controller = new DeductionController();
exports.createDeductionRequest = controller.createDeductionRequest;
exports.getPendingDeductions = controller.getPendingDeductions;
exports.approveDeduction = controller.approveDeduction;
exports.rejectDeduction = controller.rejectDeduction;
exports.getApprovalStatus = controller.getApprovalStatus;
exports.getDeductionHistory = controller.getDeductionHistory;
//# sourceMappingURL=deductionController.js.map