"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditHistory = exports.generateSummaryReport = exports.getCertificationWorkflow = exports.getTallyMasterStatus = exports.verifyScore = exports.getScoreVerification = exports.rejectAudit = exports.finalCertification = exports.getCompletedAudits = exports.getPendingAudits = exports.getStats = exports.AuditorController = void 0;
const tsyringe_1 = require("tsyringe");
const AuditorService_1 = require("../services/AuditorService");
const logger_1 = require("../utils/logger");
class AuditorController {
    auditorService;
    constructor() {
        this.auditorService = tsyringe_1.container.resolve(AuditorService_1.AuditorService);
    }
    getStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const stats = await this.auditorService.getStats();
            res.json(stats);
        }
        catch (error) {
            log.error('Get auditor stats error', error);
            next(error);
        }
    };
    getPendingAudits = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.auditorService.getPendingAudits(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get pending audits error', error);
            next(error);
        }
    };
    getCompletedAudits = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.auditorService.getCompletedAudits(page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get completed audits error', error);
            next(error);
        }
    };
    finalCertification = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId } = req.params;
            const userId = req.user?.id;
            if (!categoryId || !userId) {
                res.status(400).json({ error: 'Category ID and user required' });
                return;
            }
            const result = await this.auditorService.finalCertification(categoryId, userId);
            res.json(result);
        }
        catch (error) {
            log.error('Final certification error', error);
            next(error);
        }
    };
    rejectAudit = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            if (!categoryId || !userId) {
                res.status(400).json({ error: 'Category ID and user required' });
                return;
            }
            const result = await this.auditorService.rejectAudit(categoryId, userId, reason);
            res.json(result);
        }
        catch (error) {
            log.error('Reject audit error', error);
            next(error);
        }
    };
    getScoreVerification = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId, contestantId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.auditorService.getScoreVerification(categoryId, contestantId);
            res.json(result);
        }
        catch (error) {
            log.error('Get score verification error', error);
            next(error);
        }
    };
    verifyScore = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { scoreId } = req.params;
            const { verified, comments, issues } = req.body;
            const userId = req.user?.id;
            if (!scoreId || !userId) {
                res.status(400).json({ error: 'Score ID and user required' });
                return;
            }
            const result = await this.auditorService.verifyScore(scoreId, userId, {
                verified,
                comments,
                issues,
            });
            res.json(result);
        }
        catch (error) {
            log.error('Verify score error', error);
            next(error);
        }
    };
    getTallyMasterStatus = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.auditorService.getTallyMasterStatus(categoryId);
            res.json(result);
        }
        catch (error) {
            log.error('Get tally master status error', error);
            next(error);
        }
    };
    getCertificationWorkflow = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.auditorService.getCertificationWorkflow(categoryId);
            res.json(result);
        }
        catch (error) {
            log.error('Get certification workflow error', error);
            next(error);
        }
    };
    generateSummaryReport = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId, includeDetails = false } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const result = await this.auditorService.generateSummaryReport(categoryId, userId, includeDetails === true || includeDetails === 'true');
            res.json(result);
        }
        catch (error) {
            log.error('Generate summary report error', error);
            next(error);
        }
    };
    getAuditHistory = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'auditor');
        try {
            const { categoryId } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.auditorService.getAuditHistory(categoryId, page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get audit history error', error);
            next(error);
        }
    };
}
exports.AuditorController = AuditorController;
const controller = new AuditorController();
exports.getStats = controller.getStats;
exports.getPendingAudits = controller.getPendingAudits;
exports.getCompletedAudits = controller.getCompletedAudits;
exports.finalCertification = controller.finalCertification;
exports.rejectAudit = controller.rejectAudit;
exports.getScoreVerification = controller.getScoreVerification;
exports.verifyScore = controller.verifyScore;
exports.getTallyMasterStatus = controller.getTallyMasterStatus;
exports.getCertificationWorkflow = controller.getCertificationWorkflow;
exports.generateSummaryReport = controller.generateSummaryReport;
exports.getAuditHistory = controller.getAuditHistory;
//# sourceMappingURL=auditorController.js.map