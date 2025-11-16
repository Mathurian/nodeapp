"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingCertifications = exports.getCertificationStatus = exports.getJudgeScoringProgress = exports.getScoringProgressByCategory = exports.getScoringProgressByContest = exports.TrackerController = void 0;
const container_1 = require("../config/container");
const TrackerService_1 = require("../services/TrackerService");
const responseHelpers_1 = require("../utils/responseHelpers");
class TrackerController {
    trackerService;
    prisma;
    constructor() {
        this.trackerService = container_1.container.resolve(TrackerService_1.TrackerService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    getScoringProgressByContest = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            const progress = await this.trackerService.getScoringProgressByContest(contestId);
            return (0, responseHelpers_1.sendSuccess)(res, progress);
        }
        catch (error) {
            next(error);
        }
    };
    getScoringProgressByCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const progress = await this.trackerService.getScoringProgressByCategory(categoryId);
            return (0, responseHelpers_1.sendSuccess)(res, progress);
        }
        catch (error) {
            next(error);
        }
    };
    getJudgeScoringProgress = async (req, res, next) => {
        try {
            const { judgeId } = req.params;
            const eventId = req.query.eventId;
            if (!judgeId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge ID is required', 400);
            }
            const where = { judgeId };
            if (eventId) {
                where.category = {
                    contest: { eventId }
                };
            }
            const [totalAssignments, scoredAssignments, certifiedScores] = await Promise.all([
                this.prisma.assignment.count({ where: { judgeId, eventId } }),
                this.prisma.score.count({ where }),
                this.prisma.score.count({ where: { ...where, isCertified: true } })
            ]);
            const progress = {
                judgeId,
                totalAssignments,
                scoredAssignments,
                certifiedScores,
                completionRate: totalAssignments > 0 ? ((scoredAssignments / totalAssignments) * 100).toFixed(2) : '0',
                certificationRate: scoredAssignments > 0 ? ((certifiedScores / scoredAssignments) * 100).toFixed(2) : '0'
            };
            return (0, responseHelpers_1.sendSuccess)(res, progress);
        }
        catch (error) {
            next(error);
        }
    };
    getCertificationStatus = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category ID is required', 400);
            }
            const certification = await this.prisma.certification.findFirst({
                where: { categoryId },
                orderBy: { createdAt: 'desc' }
            });
            if (!certification) {
                return (0, responseHelpers_1.sendSuccess)(res, { status: 'NOT_STARTED', categoryId });
            }
            const status = {
                categoryId,
                status: 'IN_PROGRESS',
                judgeCertified: certification.judgeCertified || false,
                tallyMasterCertified: certification.tallyCertified || false,
                auditorCertified: certification.auditorCertified || false,
                boardApproved: certification.boardApproved || false,
                certifiedAt: certification.certifiedAt,
                certifiedBy: certification.certifiedBy
            };
            if (certification.boardApproved) {
                status.status = 'COMPLETE';
            }
            return (0, responseHelpers_1.sendSuccess)(res, status);
        }
        catch (error) {
            next(error);
        }
    };
    getPendingCertifications = async (req, res, next) => {
        try {
            const role = req.query.role;
            const eventId = req.query.eventId;
            const where = {};
            if (role === 'JUDGE') {
                where.judgeCertified = false;
            }
            else if (role === 'TALLY_MASTER') {
                where.judgeCertified = true;
                where.tallyCertified = false;
            }
            else if (role === 'AUDITOR') {
                where.tallyCertified = true;
                where.auditorCertified = false;
            }
            else if (role === 'BOARD') {
                where.auditorCertified = true;
                where.boardApproved = false;
            }
            if (eventId) {
                where.eventId = eventId;
            }
            const pendingCertifications = await this.prisma.certification.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                role,
                eventId,
                count: pendingCertifications.length,
                certifications: pendingCertifications
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TrackerController = TrackerController;
const controller = new TrackerController();
exports.getScoringProgressByContest = controller.getScoringProgressByContest;
exports.getScoringProgressByCategory = controller.getScoringProgressByCategory;
exports.getJudgeScoringProgress = controller.getJudgeScoringProgress;
exports.getCertificationStatus = controller.getCertificationStatus;
exports.getPendingCertifications = controller.getPendingCertifications;
//# sourceMappingURL=trackerController.js.map