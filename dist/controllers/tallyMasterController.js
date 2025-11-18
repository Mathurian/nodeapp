"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContestCertifications = exports.getContestScoreReview = exports.removeJudgeContestantScores = exports.getCategoryJudges = exports.getJudgeScores = exports.getContestantScores = exports.rejectScoreRemoval = exports.approveScoreRemoval = exports.getScoreRemovalRequests = exports.requestScoreRemoval = exports.getTallyMasterHistory = exports.getBiasCheckingTools = exports.getCertificationWorkflow = exports.getScoreReview = exports.certifyTotals = exports.getPendingCertifications = exports.getCertificationQueue = exports.getCertifications = exports.getStats = exports.TallyMasterController = void 0;
const tsyringe_1 = require("tsyringe");
const TallyMasterService_1 = require("../services/TallyMasterService");
const logger_1 = require("../utils/logger");
class TallyMasterController {
    tallyMasterService;
    prisma;
    constructor() {
        this.tallyMasterService = tsyringe_1.container.resolve(TallyMasterService_1.TallyMasterService);
        this.prisma = tsyringe_1.container.resolve('PrismaClient');
    }
    getStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const stats = await this.tallyMasterService.getStats();
            res.json(stats);
        }
        catch (error) {
            log.error('Get tally master stats error', error);
            return next(error);
        }
    };
    getCertifications = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.tallyMasterService.getCertifications(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get certifications error', error);
            return next(error);
        }
    };
    getCertificationQueue = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.tallyMasterService.getCertificationQueue(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get certification queue error', error);
            return next(error);
        }
    };
    getPendingCertifications = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.tallyMasterService.getPendingCertifications(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get pending certifications error', error);
            return next(error);
        }
    };
    certifyTotals = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId } = req.body;
            const userId = req.user?.id;
            const userRole = req.user?.role;
            if (!userId || !userRole) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const result = await this.tallyMasterService.certifyTotals(categoryId, userId, userRole);
            res.json(result);
        }
        catch (error) {
            log.error('Certify totals error', error);
            return next(error);
        }
    };
    getScoreReview = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.tallyMasterService.getScoreReview(categoryId);
            res.json(result);
        }
        catch (error) {
            log.error('Get score review error', error);
            return next(error);
        }
    };
    getCertificationWorkflow = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const category = await this.tallyMasterService.getScoreReview(categoryId);
            const certificationStatus = {
                totalsCertified: category.category.scoreCap > 0,
                currentStep: 1,
                totalSteps: 2,
                canProceed: true,
                nextStep: 'CERTIFY_TOTALS',
            };
            res.json({
                category: category.category,
                contest: category.contest,
                certificationStatus,
                totalScores: category.totalScores,
            });
        }
        catch (error) {
            log.error('Get certification workflow error:', error);
            return next(error);
        }
    };
    getBiasCheckingTools = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.tallyMasterService.getBiasCheckingTools(categoryId);
            res.json(result);
        }
        catch (error) {
            log.error('Get bias checking tools error', error);
            return next(error);
        }
    };
    getTallyMasterHistory = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await this.tallyMasterService.getTallyMasterHistory(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get tally master history error', error);
            return next(error);
        }
    };
    requestScoreRemoval = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId, contestId, judgeId, contestantId, reason } = req.body;
            const userId = req.user?.id;
            if (!judgeId) {
                res.status(400).json({ error: 'Judge ID is required' });
                return;
            }
            if (!categoryId && !contestId) {
                res.status(400).json({ error: 'Either categoryId or contestId is required' });
                return;
            }
            if (contestId) {
                const categories = await this.prisma.category.findMany({
                    where: { contestId },
                    select: { id: true }
                });
                if (categories.length === 0) {
                    res.status(404).json({ error: 'No categories found for this contest' });
                    return;
                }
                let contestantIds = [];
                if (contestantId) {
                    contestantIds = [contestantId];
                }
                else {
                    const categoryContestants = await this.prisma.categoryContestant.findMany({
                        where: { categoryId: { in: categories.map(c => c.id) } },
                        select: { contestantId: true },
                        distinct: ['contestantId']
                    });
                    contestantIds = categoryContestants.map(cc => cc.contestantId);
                }
                const requests = [];
                for (const category of categories) {
                    for (const cId of contestantIds) {
                        const request = await this.prisma.judgeScoreRemovalRequest.create({
                            data: {
                                tenantId: req.user.tenantId,
                                categoryId: category.id,
                                contestantId: cId,
                                judgeId,
                                reason: reason || 'Score removal requested',
                                status: 'PENDING'
                            }
                        });
                        requests.push(request);
                    }
                }
                res.json({
                    success: true,
                    message: `Created ${requests.length} score removal request(s)`,
                    requests: requests
                });
            }
            else {
                if (!contestantId) {
                    res.status(400).json({ error: 'Contestant ID is required for category-level requests' });
                    return;
                }
                const request = await this.prisma.judgeScoreRemovalRequest.create({
                    data: {
                        tenantId: req.user.tenantId,
                        categoryId,
                        contestantId,
                        judgeId,
                        reason: reason || 'Score removal requested',
                        status: 'PENDING'
                    }
                });
                res.json({
                    success: true,
                    message: 'Score removal request created successfully',
                    request: request
                });
            }
        }
        catch (error) {
            log.error('Request score removal error', error);
            return next(error);
        }
    };
    getScoreRemovalRequests = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status;
            const categoryId = req.query.categoryId;
            const contestId = req.query.contestId;
            const result = await this.tallyMasterService.getScoreRemovalRequests(page, limit, status, categoryId, contestId);
            res.json(result);
        }
        catch (error) {
            log.error('Get score removal requests error', error);
            return next(error);
        }
    };
    approveScoreRemoval = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            res.status(501).json({ error: 'Score removal approval to be implemented in ScoreRemovalService' });
        }
        catch (error) {
            log.error('Approve score removal error', error);
            return next(error);
        }
    };
    rejectScoreRemoval = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            res.status(501).json({ error: 'Score removal rejection to be implemented in ScoreRemovalService' });
        }
        catch (error) {
            log.error('Reject score removal error', error);
            return next(error);
        }
    };
    getContestantScores = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            res.status(501).json({ error: 'Get contestant scores to be implemented' });
        }
        catch (error) {
            log.error('Get contestant scores error', error);
            return next(error);
        }
    };
    getJudgeScores = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            res.status(501).json({ error: 'Get judge scores to be implemented' });
        }
        catch (error) {
            log.error('Get judge scores error', error);
            return next(error);
        }
    };
    getCategoryJudges = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const judges = await this.tallyMasterService.getCategoryJudges(categoryId);
            res.json(judges);
        }
        catch (error) {
            log.error('Get category judges error', error);
            return next(error);
        }
    };
    removeJudgeContestantScores = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            res.status(501).json({ error: 'Remove judge contestant scores to be implemented' });
        }
        catch (error) {
            log.error('Remove judge contestant scores error', error);
            return next(error);
        }
    };
    getContestScoreReview = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { contestId } = req.params;
            if (!contestId) {
                res.status(400).json({ error: 'Contest ID required' });
                return;
            }
            const result = await this.tallyMasterService.getContestScoreReview(contestId);
            res.json(result);
        }
        catch (error) {
            log.error('Get contest score review error', error);
            return next(error);
        }
    };
    getContestCertifications = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'tallyMaster');
        try {
            const { contestId } = req.params;
            if (!contestId) {
                res.status(400).json({ error: 'Contest ID is required' });
                return;
            }
            const result = await this.tallyMasterService.getContestCertifications(contestId);
            res.json(result);
        }
        catch (error) {
            log.error('Get contest certifications error', error);
            return next(error);
        }
    };
}
exports.TallyMasterController = TallyMasterController;
const controller = new TallyMasterController();
exports.getStats = controller.getStats;
exports.getCertifications = controller.getCertifications;
exports.getCertificationQueue = controller.getCertificationQueue;
exports.getPendingCertifications = controller.getPendingCertifications;
exports.certifyTotals = controller.certifyTotals;
exports.getScoreReview = controller.getScoreReview;
exports.getCertificationWorkflow = controller.getCertificationWorkflow;
exports.getBiasCheckingTools = controller.getBiasCheckingTools;
exports.getTallyMasterHistory = controller.getTallyMasterHistory;
exports.requestScoreRemoval = controller.requestScoreRemoval;
exports.getScoreRemovalRequests = controller.getScoreRemovalRequests;
exports.approveScoreRemoval = controller.approveScoreRemoval;
exports.rejectScoreRemoval = controller.rejectScoreRemoval;
exports.getContestantScores = controller.getContestantScores;
exports.getJudgeScores = controller.getJudgeScores;
exports.getCategoryJudges = controller.getCategoryJudges;
exports.removeJudgeContestantScores = controller.removeJudgeContestantScores;
exports.getContestScoreReview = controller.getContestScoreReview;
exports.getContestCertifications = controller.getContestCertifications;
//# sourceMappingURL=tallyMasterController.js.map