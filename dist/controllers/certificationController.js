"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCertificationStats = exports.rejectCertification = exports.approveBoard = exports.certifyAuditor = exports.certifyTally = exports.certifyJudge = exports.getCertificationById = exports.deleteCertification = exports.updateCertification = exports.createCertification = exports.getAllCertifications = exports.certifyAll = exports.getOverallStatus = exports.CertificationController = void 0;
const container_1 = require("../config/container");
const CertificationService_1 = require("../services/CertificationService");
const responseHelpers_1 = require("../utils/responseHelpers");
class CertificationController {
    certificationService;
    prisma;
    constructor() {
        this.certificationService = container_1.container.resolve(CertificationService_1.CertificationService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getOverallStatus = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            const status = await this.certificationService.getOverallStatus(eventId);
            return (0, responseHelpers_1.sendSuccess)(res, status);
        }
        catch (error) {
            next(error);
        }
    };
    certifyAll = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            const result = await this.certificationService.certifyAll(eventId, req.user.id, req.user.role);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'All categories certified');
        }
        catch (error) {
            next(error);
        }
    };
    getAllCertifications = async (req, res, next) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const status = req.query.status;
            const eventId = req.query.eventId;
            const contestId = req.query.contestId;
            const categoryId = req.query.categoryId;
            const skip = (page - 1) * limit;
            const where = {};
            if (status)
                where.status = status;
            if (eventId)
                where.eventId = eventId;
            if (contestId)
                where.contestId = contestId;
            if (categoryId)
                where.categoryId = categoryId;
            const [certifications, total] = await Promise.all([
                this.prisma.certification.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.certification.count({ where })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                certifications,
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
            next(error);
        }
    };
    createCertification = async (req, res, next) => {
        try {
            const { categoryId, contestId, eventId, comments } = req.body;
            if (!categoryId || !contestId || !eventId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'categoryId, contestId, and eventId are required', 400);
            }
            const existing = await this.prisma.certification.findUnique({
                where: {
                    tenantId_categoryId_contestId_eventId: {
                        tenantId: req.tenantId,
                        categoryId,
                        contestId,
                        eventId
                    }
                }
            });
            if (existing) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification already exists for this category/contest/event', 409);
            }
            const [category, contest, event] = await Promise.all([
                this.prisma.category.findUnique({ where: { id: categoryId } }),
                this.prisma.contest.findUnique({ where: { id: contestId } }),
                this.prisma.event.findUnique({ where: { id: eventId } })
            ]);
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            if (!contest) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Contest not found', 404);
            }
            if (!event) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Event not found', 404);
            }
            const certification = await this.prisma.certification.create({
                data: {
                    tenantId: req.tenantId,
                    categoryId,
                    contestId,
                    eventId,
                    userId: req.user?.id || null,
                    status: 'PENDING',
                    currentStep: 1,
                    totalSteps: 4,
                    comments: comments || null
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Certification created successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
    updateCertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, comments, totalSteps } = req.body;
            const existing = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!existing) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            const updateData = {};
            if (status !== undefined)
                updateData.status = status;
            if (comments !== undefined)
                updateData.comments = comments;
            if (totalSteps !== undefined)
                updateData.totalSteps = totalSteps;
            const certification = await this.prisma.certification.update({
                where: { id },
                data: updateData,
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Certification updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deleteCertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            await this.prisma.certification.delete({
                where: { id }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification deleted successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getCertificationById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const certification = await this.prisma.certification.findUnique({
                where: { id },
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            return (0, responseHelpers_1.sendSuccess)(res, certification);
        }
        catch (error) {
            next(error);
        }
    };
    certifyJudge = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            if (certification.judgeCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge certification already completed', 400);
            }
            const updated = await this.prisma.certification.update({
                where: { id },
                data: {
                    judgeCertified: true,
                    currentStep: 2,
                    status: 'IN_PROGRESS',
                    comments: comments || certification.comments
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Judge certification completed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    certifyTally = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            if (!certification.judgeCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge must certify first', 400);
            }
            if (certification.tallyCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Tally Master certification already completed', 400);
            }
            const updated = await this.prisma.certification.update({
                where: { id },
                data: {
                    tallyCertified: true,
                    currentStep: 3,
                    status: 'IN_PROGRESS',
                    comments: comments || certification.comments
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Tally Master certification completed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    certifyAuditor = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            if (!certification.tallyCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Tally Master must certify first', 400);
            }
            if (certification.auditorCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Auditor certification already completed', 400);
            }
            const updated = await this.prisma.certification.update({
                where: { id },
                data: {
                    auditorCertified: true,
                    currentStep: 4,
                    status: 'IN_PROGRESS',
                    comments: comments || certification.comments
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Auditor certification completed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    approveBoard = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { comments } = req.body;
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            if (!certification.auditorCertified) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Auditor must certify first', 400);
            }
            if (certification.boardApproved) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Board approval already completed', 400);
            }
            const updated = await this.prisma.certification.update({
                where: { id },
                data: {
                    boardApproved: true,
                    status: 'CERTIFIED',
                    certifiedAt: new Date(),
                    certifiedBy: req.user?.id || null,
                    comments: comments || certification.comments
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Board approval completed - Certification finalized');
        }
        catch (error) {
            next(error);
        }
    };
    rejectCertification = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { rejectionReason } = req.body;
            if (!rejectionReason) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Rejection reason is required', 400);
            }
            const certification = await this.prisma.certification.findUnique({
                where: { id }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Certification not found', 404);
            }
            if (certification.status === 'CERTIFIED') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Cannot reject a finalized certification', 400);
            }
            const updated = await this.prisma.certification.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    rejectionReason,
                    certifiedBy: req.user?.id || null
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Certification rejected');
        }
        catch (error) {
            next(error);
        }
    };
    getCertificationStats = async (req, res, next) => {
        try {
            const eventId = req.query.eventId;
            const contestId = req.query.contestId;
            const where = {};
            if (eventId)
                where.eventId = eventId;
            if (contestId)
                where.contestId = contestId;
            const [total, pending, inProgress, certified, rejected, judgeCertified, tallyCertified, auditorCertified, boardApproved] = await Promise.all([
                this.prisma.certification.count({ where }),
                this.prisma.certification.count({ where: { ...where, status: 'PENDING' } }),
                this.prisma.certification.count({ where: { ...where, status: 'IN_PROGRESS' } }),
                this.prisma.certification.count({ where: { ...where, status: 'CERTIFIED' } }),
                this.prisma.certification.count({ where: { ...where, status: 'REJECTED' } }),
                this.prisma.certification.count({ where: { ...where, judgeCertified: true } }),
                this.prisma.certification.count({ where: { ...where, tallyCertified: true } }),
                this.prisma.certification.count({ where: { ...where, auditorCertified: true } }),
                this.prisma.certification.count({ where: { ...where, boardApproved: true } })
            ]);
            const stats = {
                total,
                byStatus: {
                    pending,
                    inProgress,
                    certified,
                    rejected
                },
                byStage: {
                    judgeCertified,
                    tallyCertified,
                    auditorCertified,
                    boardApproved
                },
                completionRate: total > 0 ? ((certified / total) * 100).toFixed(2) + '%' : '0%',
                rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%',
                averageStep: total > 0
                    ? ((judgeCertified + tallyCertified + auditorCertified + boardApproved) / total).toFixed(2)
                    : '0'
            };
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CertificationController = CertificationController;
const controller = new CertificationController();
exports.getOverallStatus = controller.getOverallStatus;
exports.certifyAll = controller.certifyAll;
exports.getAllCertifications = controller.getAllCertifications;
exports.createCertification = controller.createCertification;
exports.updateCertification = controller.updateCertification;
exports.deleteCertification = controller.deleteCertification;
exports.getCertificationById = controller.getCertificationById;
exports.certifyJudge = controller.certifyJudge;
exports.certifyTally = controller.certifyTally;
exports.certifyAuditor = controller.certifyAuditor;
exports.approveBoard = controller.approveBoard;
exports.rejectCertification = controller.rejectCertification;
exports.getCertificationStats = controller.getCertificationStats;
//# sourceMappingURL=certificationController.js.map