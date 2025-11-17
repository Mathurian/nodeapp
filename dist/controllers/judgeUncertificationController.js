"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJudgeUncertificationRequests = exports.rejectUncertification = exports.approveUncertification = exports.requestUncertification = exports.executeUncertification = exports.signUncertificationRequest = exports.createUncertificationRequest = exports.getUncertificationRequests = exports.JudgeUncertificationController = void 0;
const container_1 = require("../config/container");
const JudgeUncertificationService_1 = require("../services/JudgeUncertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class JudgeUncertificationController {
    judgeUncertificationService;
    prisma;
    constructor() {
        this.judgeUncertificationService = container_1.container.resolve(JudgeUncertificationService_1.JudgeUncertificationService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getUncertificationRequests = async (req, res, next) => {
        try {
            const { status } = req.query;
            const requests = await this.judgeUncertificationService.getUncertificationRequests(status);
            return (0, responseHelpers_1.sendSuccess)(res, requests);
        }
        catch (error) {
            return next(error);
        }
    };
    createUncertificationRequest = async (req, res, next) => {
        try {
            const { judgeId, categoryId, reason } = req.body;
            const request = await this.judgeUncertificationService.createUncertificationRequest({
                judgeId,
                categoryId,
                reason,
                requestedBy: req.user.id,
                userRole: req.user.role
            });
            return (0, responseHelpers_1.sendSuccess)(res, request, 'Uncertification request created. Awaiting co-signatures.');
        }
        catch (error) {
            return next(error);
        }
    };
    signUncertificationRequest = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { signatureName } = req.body;
            const result = await this.judgeUncertificationService.signRequest(id, {
                signatureName,
                userId: req.user.id,
                userRole: req.user.role
            });
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Request signed successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    executeUncertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.judgeUncertificationService.executeUncertification(id);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Uncertification executed successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    requestUncertification = async (req, res, next) => {
        try {
            const { judgeId, categoryId, reason } = req.body;
            if (!judgeId || !categoryId || !reason) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'judgeId, categoryId, and reason are required', 400);
            }
            if (!req.user) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            const judge = await this.prisma.judge.findUnique({
                where: { id: judgeId }
            });
            if (!judge) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge not found', 404);
            }
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            const request = await this.prisma.judgeUncertificationRequest.create({
                data: {
                    tenantId: req.user.tenantId,
                    judgeId,
                    categoryId,
                    reason,
                    requestedBy: req.user.id,
                    status: 'PENDING'
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, request, 'Uncertification request created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    approveUncertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!req.user) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            const request = await this.prisma.judgeUncertificationRequest.findUnique({
                where: { id }
            });
            if (!request) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Uncertification request not found', 404);
            }
            if (request.status !== 'PENDING') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, `Cannot approve ${request.status.toLowerCase()} request`, 400);
            }
            const approved = await this.prisma.judgeUncertificationRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    approvedBy: req.user.id,
                    approvedAt: new Date()
                }
            });
            await this.prisma.score.updateMany({
                where: {
                    judgeId: request.judgeId,
                    categoryId: request.categoryId,
                    isCertified: true
                },
                data: {
                    isCertified: false,
                    certifiedAt: null,
                    certifiedBy: null
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, approved, 'Uncertification request approved and scores uncertified successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    rejectUncertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { rejectionReason } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'User not authenticated', 401);
            }
            if (!rejectionReason) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'rejectionReason is required', 400);
            }
            const request = await this.prisma.judgeUncertificationRequest.findUnique({
                where: { id }
            });
            if (!request) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Uncertification request not found', 404);
            }
            if (request.status !== 'PENDING') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, `Cannot reject ${request.status.toLowerCase()} request`, 400);
            }
            const rejected = await this.prisma.judgeUncertificationRequest.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectedBy: req.user.id,
                    rejectedAt: new Date(),
                    rejectionReason: rejectionReason
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, rejected, 'Uncertification request rejected successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getJudgeUncertificationRequests = async (req, res, next) => {
        try {
            const { judgeId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            const status = req.query.status;
            if (!judgeId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'judgeId is required', 400);
            }
            const where = { judgeId };
            if (status)
                where.status = status;
            const [requests, total] = await Promise.all([
                this.prisma.judgeUncertificationRequest.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.judgeUncertificationRequest.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                requests,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.JudgeUncertificationController = JudgeUncertificationController;
const controller = new JudgeUncertificationController();
exports.getUncertificationRequests = controller.getUncertificationRequests;
exports.createUncertificationRequest = controller.createUncertificationRequest;
exports.signUncertificationRequest = controller.signUncertificationRequest;
exports.executeUncertification = controller.executeUncertification;
exports.requestUncertification = controller.requestUncertification;
exports.approveUncertification = controller.approveUncertification;
exports.rejectUncertification = controller.rejectUncertification;
exports.getJudgeUncertificationRequests = controller.getJudgeUncertificationRequests;
//# sourceMappingURL=judgeUncertificationController.js.map