"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncertifyCategory = exports.certifyJudgeContestScores = exports.getDeductions = exports.rejectDeduction = exports.approveDeduction = exports.requestDeduction = exports.finalCertification = exports.certifyTotals = exports.getCategories = exports.getContestStats = exports.getScoresByContest = exports.getScoresByContestant = exports.getScoresByJudge = exports.unsignScore = exports.certifyScores = exports.certifyScore = exports.deleteScore = exports.updateScore = exports.submitScore = exports.getScores = exports.ScoringController = void 0;
const tsyringe_1 = require("tsyringe");
const ScoringService_1 = require("../services/ScoringService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class ScoringController {
    scoringService;
    prisma;
    constructor() {
        this.scoringService = tsyringe_1.container.resolve(ScoringService_1.ScoringService);
        this.prisma = tsyringe_1.container.resolve('PrismaClient');
    }
    getScores = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const categoryId = req.params.categoryId;
            const contestantId = req.params.contestantId;
            log.debug('Fetching scores', { categoryId, contestantId });
            const scores = await this.scoringService.getScoresByCategory(categoryId, contestantId);
            log.info('Scores retrieved successfully', { categoryId, contestantId, count: scores.length });
            (0, responseHelpers_1.sendSuccess)(res, scores);
        }
        catch (error) {
            log.error('Get scores error', { error: error.message, categoryId: req.params.categoryId });
            next(error);
        }
    };
    submitScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const categoryId = req.params.categoryId;
            const contestantId = req.params.contestantId;
            const { criteriaId, score, comments } = req.body;
            if (!req.user) {
                (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
                return;
            }
            const data = {
                categoryId,
                contestantId,
                criteriaId,
                score,
                comments
            };
            log.info('Score submission requested', {
                categoryId,
                contestantId,
                criteriaId,
                score,
                hasComments: !!comments,
                userId: req.user.id
            });
            const newScore = await this.scoringService.submitScore(data, req.user.id);
            log.info('Score submitted successfully', { scoreId: newScore.id });
            (0, responseHelpers_1.sendCreated)(res, newScore);
        }
        catch (error) {
            log.error('Submit score error', { error: error.message });
            next(error);
        }
    };
    updateScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const scoreId = req.params.scoreId;
            const { score, comments } = req.body;
            const data = {
                score,
                comments
            };
            log.info('Score update requested', { scoreId });
            const updatedScore = await this.scoringService.updateScore(scoreId, data);
            log.info('Score updated successfully', { scoreId });
            (0, responseHelpers_1.sendSuccess)(res, updatedScore);
        }
        catch (error) {
            log.error('Update score error', { error: error.message, scoreId: req.params.scoreId });
            next(error);
        }
    };
    deleteScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const scoreId = req.params.scoreId;
            log.info('Score deletion requested', { scoreId });
            await this.scoringService.deleteScore(scoreId);
            log.info('Score deleted successfully', { scoreId });
            (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            log.error('Delete score error', { error: error.message, scoreId: req.params.scoreId });
            next(error);
        }
    };
    certifyScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const scoreId = req.params.scoreId;
            if (!req.user) {
                (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
                return;
            }
            log.info('Score certification requested', { scoreId, certifiedBy: req.user.id });
            const certifiedScore = await this.scoringService.certifyScore(scoreId, req.user.id);
            log.info('Score certified successfully', { scoreId });
            (0, responseHelpers_1.sendSuccess)(res, certifiedScore);
        }
        catch (error) {
            log.error('Certify score error', { error: error.message, scoreId: req.params.scoreId });
            next(error);
        }
    };
    certifyScores = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const categoryId = req.params.categoryId;
            if (!req.user) {
                (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
                return;
            }
            log.info('Category scores certification requested', { categoryId, certifiedBy: req.user.id });
            const result = await this.scoringService.certifyScores(categoryId, req.user.id);
            log.info('Category scores certified successfully', { categoryId, certified: result.certified });
            (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            log.error('Certify scores error', { error: error.message, categoryId: req.params.categoryId });
            next(error);
        }
    };
    unsignScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const scoreId = req.params.scoreId;
            log.info('Score unsigned requested', { scoreId });
            const unsignedScore = await this.scoringService.unsignScore(scoreId);
            log.info('Score unsigned successfully', { scoreId });
            (0, responseHelpers_1.sendSuccess)(res, unsignedScore);
        }
        catch (error) {
            log.error('Unsign score error', { error: error.message, scoreId: req.params.scoreId });
            next(error);
        }
    };
    getScoresByJudge = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const judgeId = req.params.judgeId;
            log.debug('Fetching scores by judge', { judgeId });
            const scores = await this.scoringService.getScoresByJudge(judgeId);
            log.info('Scores by judge retrieved successfully', { judgeId, count: scores.length });
            (0, responseHelpers_1.sendSuccess)(res, scores);
        }
        catch (error) {
            log.error('Get scores by judge error', { error: error.message, judgeId: req.params.judgeId });
            next(error);
        }
    };
    getScoresByContestant = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const contestantId = req.params.contestantId;
            log.debug('Fetching scores by contestant', { contestantId });
            const scores = await this.scoringService.getScoresByContestant(contestantId);
            log.info('Scores by contestant retrieved successfully', { contestantId, count: scores.length });
            (0, responseHelpers_1.sendSuccess)(res, scores);
        }
        catch (error) {
            log.error('Get scores by contestant error', {
                error: error.message,
                contestantId: req.params.contestantId
            });
            next(error);
        }
    };
    getScoresByContest = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const contestId = req.params.contestId;
            log.debug('Fetching scores by contest', { contestId });
            const scores = await this.scoringService.getScoresByContest(contestId);
            log.info('Scores by contest retrieved successfully', { contestId, count: scores.length });
            (0, responseHelpers_1.sendSuccess)(res, scores);
        }
        catch (error) {
            log.error('Get scores by contest error', { error: error.message, contestId: req.params.contestId });
            next(error);
        }
    };
    getContestStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'scoring');
        try {
            const contestId = req.params.contestId;
            log.debug('Fetching contest statistics', { contestId });
            const stats = await this.scoringService.getContestStats(contestId);
            log.info('Contest statistics retrieved successfully', { contestId });
            (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            log.error('Get contest stats error', { error: error.message, contestId: req.params.contestId });
            next(error);
        }
    };
    getCategories = async (req, res, next) => {
        try {
            const contestId = req.query.contestId;
            const eventId = req.query.eventId;
            const where = {};
            if (contestId)
                where.contestId = contestId;
            if (eventId) {
                where.contest = {
                    eventId
                };
            }
            const categories = await this.prisma.category.findMany({
                where,
                include: {
                    contest: {
                        select: {
                            id: true,
                            name: true,
                            event: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            scores: true,
                            contestants: true
                        }
                    }
                },
                orderBy: { name: 'asc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, categories);
        }
        catch (error) {
            next(error);
        }
    };
    certifyTotals = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const { signatureName, comments } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            const certification = await this.prisma.categoryCertification.upsert({
                where: {
                    categoryId_role: {
                        categoryId,
                        role: 'TALLY_MASTER'
                    }
                },
                create: {
                    categoryId,
                    role: 'TALLY_MASTER',
                    userId: req.user.id,
                    signatureName: signatureName || null,
                    comments: comments || null
                },
                update: {
                    userId: req.user.id,
                    signatureName: signatureName || null,
                    comments: comments || null,
                    certifiedAt: new Date()
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Totals certified successfully by Tally Master');
        }
        catch (error) {
            next(error);
        }
    };
    finalCertification = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const { signatureName, comments } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            const tallyMasterCert = await this.prisma.categoryCertification.findUnique({
                where: {
                    categoryId_role: {
                        categoryId,
                        role: 'TALLY_MASTER'
                    }
                }
            });
            if (!tallyMasterCert) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Tally Master must certify totals first', 400);
            }
            const certification = await this.prisma.categoryCertification.upsert({
                where: {
                    categoryId_role: {
                        categoryId,
                        role: 'AUDITOR'
                    }
                },
                create: {
                    categoryId,
                    role: 'AUDITOR',
                    userId: req.user.id,
                    signatureName: signatureName || null,
                    comments: comments || null
                },
                update: {
                    userId: req.user.id,
                    signatureName: signatureName || null,
                    comments: comments || null,
                    certifiedAt: new Date()
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, certification, 'Final certification completed by Auditor');
        }
        catch (error) {
            next(error);
        }
    };
    requestDeduction = async (req, res, next) => {
        try {
            const { contestantId, categoryId, amount, reason } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            if (!contestantId || !categoryId || amount === undefined || !reason) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'contestantId, categoryId, amount, and reason are required', 400);
            }
            const [category, contestant] = await Promise.all([
                this.prisma.category.findUnique({ where: { id: categoryId } }),
                this.prisma.contestant.findUnique({ where: { id: contestantId } })
            ]);
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            if (!contestant) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Contestant not found', 404);
            }
            const deductionRequest = await this.prisma.deductionRequest.create({
                data: {
                    contestantId,
                    categoryId,
                    amount,
                    reason,
                    requestedById: req.user.id,
                    status: 'PENDING'
                },
            });
            return (0, responseHelpers_1.sendSuccess)(res, deductionRequest, 'Deduction request created successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
    approveDeduction = async (req, res, next) => {
        try {
            const { deductionId } = req.params;
            const { isHeadJudge } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            const deduction = await this.prisma.deductionRequest.findUnique({
                where: { id: deductionId }
            });
            if (!deduction) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Deduction request not found', 404);
            }
            if (deduction.status !== 'PENDING') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, `Deduction request already ${deduction.status.toLowerCase()}`, 400);
            }
            await this.prisma.deductionApproval.create({
                data: {
                    requestId: deductionId,
                    approvedById: req.user.id,
                    role: req.user.role,
                    isHeadJudge: isHeadJudge || false
                }
            });
            const updated = await this.prisma.deductionRequest.update({
                where: { id: deductionId },
                data: { status: 'APPROVED' },
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Deduction request approved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    rejectDeduction = async (req, res, next) => {
        try {
            const { deductionId } = req.params;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            const deduction = await this.prisma.deductionRequest.findUnique({
                where: { id: deductionId }
            });
            if (!deduction) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Deduction request not found', 404);
            }
            if (deduction.status !== 'PENDING') {
                return (0, responseHelpers_1.sendSuccess)(res, {}, `Deduction request already ${deduction.status.toLowerCase()}`, 400);
            }
            const updated = await this.prisma.deductionRequest.update({
                where: { id: deductionId },
                data: { status: 'REJECTED' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, updated, 'Deduction request rejected');
        }
        catch (error) {
            next(error);
        }
    };
    getDeductions = async (req, res, next) => {
        try {
            const status = req.query.status;
            const categoryId = req.query.categoryId;
            const contestantId = req.query.contestantId;
            const where = {};
            if (status)
                where.status = status;
            if (categoryId)
                where.categoryId = categoryId;
            if (contestantId)
                where.contestantId = contestantId;
            const deductions = await this.prisma.deductionRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });
            return (0, responseHelpers_1.sendSuccess)(res, deductions);
        }
        catch (error) {
            next(error);
        }
    };
    certifyJudgeContestScores = async (req, res, next) => {
        try {
            const { judgeId, contestId } = req.body;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            if (!judgeId || !contestId) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'judgeId and contestId are required', 400);
            }
            const [judge, contest] = await Promise.all([
                this.prisma.user.findUnique({ where: { id: judgeId } }),
                this.prisma.contest.findUnique({ where: { id: contestId } })
            ]);
            if (!judge) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Judge not found', 404);
            }
            if (!contest) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Contest not found', 404);
            }
            const categories = await this.prisma.category.findMany({
                where: { contestId },
                select: { id: true }
            });
            const categoryIds = categories.map(c => c.id);
            const result = await this.prisma.score.updateMany({
                where: {
                    judgeId,
                    categoryId: { in: categoryIds },
                    isCertified: false
                },
                data: {
                    isCertified: true,
                    certifiedAt: new Date(),
                    certifiedBy: req.user.id
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                judgeId,
                contestId,
                certifiedCount: result.count,
                certifiedBy: req.user.id,
                certifiedAt: new Date()
            }, `Certified ${result.count} scores for judge in contest`);
        }
        catch (error) {
            next(error);
        }
    };
    uncertifyCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!req.user) {
                return (0, responseHelpers_1.sendError)(res, 'User not authenticated', 401);
            }
            const category = await this.prisma.category.findUnique({
                where: { id: categoryId }
            });
            if (!category) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Category not found', 404);
            }
            const deletedCertifications = await this.prisma.categoryCertification.deleteMany({
                where: { categoryId }
            });
            const uncertifiedScores = await this.prisma.score.updateMany({
                where: {
                    categoryId,
                    isCertified: true
                },
                data: {
                    isCertified: false,
                    certifiedAt: null,
                    certifiedBy: null
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                categoryId,
                removedCertifications: deletedCertifications.count,
                uncertifiedScores: uncertifiedScores.count
            }, 'Category uncertified successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ScoringController = ScoringController;
const controller = new ScoringController();
exports.getScores = controller.getScores;
exports.submitScore = controller.submitScore;
exports.updateScore = controller.updateScore;
exports.deleteScore = controller.deleteScore;
exports.certifyScore = controller.certifyScore;
exports.certifyScores = controller.certifyScores;
exports.unsignScore = controller.unsignScore;
exports.getScoresByJudge = controller.getScoresByJudge;
exports.getScoresByContestant = controller.getScoresByContestant;
exports.getScoresByContest = controller.getScoresByContest;
exports.getContestStats = controller.getContestStats;
exports.getCategories = controller.getCategories;
exports.certifyTotals = controller.certifyTotals;
exports.finalCertification = controller.finalCertification;
exports.requestDeduction = controller.requestDeduction;
exports.approveDeduction = controller.approveDeduction;
exports.rejectDeduction = controller.rejectDeduction;
exports.getDeductions = controller.getDeductions;
exports.certifyJudgeContestScores = controller.certifyJudgeContestScores;
exports.uncertifyCategory = controller.uncertifyCategory;
//# sourceMappingURL=scoringController.js.map