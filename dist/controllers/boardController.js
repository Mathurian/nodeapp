"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectScoreRemoval = exports.approveScoreRemoval = exports.getScoreRemovalRequests = exports.generateReport = exports.deleteEmceeScript = exports.updateEmceeScript = exports.createEmceeScript = exports.getEmceeScripts = exports.getCertificationStatus = exports.rejectCertification = exports.approveCertification = exports.getCertifications = exports.getStats = exports.BoardController = void 0;
const tsyringe_1 = require("tsyringe");
const BoardService_1 = require("../services/BoardService");
const logger_1 = require("../utils/logger");
class BoardController {
    boardService;
    constructor() {
        this.boardService = tsyringe_1.container.resolve(BoardService_1.BoardService);
    }
    getStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const stats = await this.boardService.getStats();
            res.json(stats);
        }
        catch (error) {
            log.error('Get board stats error', error);
            return next(error);
        }
    };
    getCertifications = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const certifications = await this.boardService.getCertifications();
            res.json(certifications);
        }
        catch (error) {
            log.error('Get certifications error', error);
            return next(error);
        }
    };
    approveCertification = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.boardService.approveCertification(id);
            res.json(result);
        }
        catch (error) {
            log.error('Approve certification error', error);
            return next(error);
        }
    };
    rejectCertification = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            const { reason } = req.body;
            if (!id) {
                res.status(400).json({ error: 'Category ID required' });
                return;
            }
            const result = await this.boardService.rejectCertification(id, reason);
            res.json(result);
        }
        catch (error) {
            log.error('Reject certification error', error);
            return next(error);
        }
    };
    getCertificationStatus = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const status = await this.boardService.getCertificationStatus();
            res.json(status);
        }
        catch (error) {
            log.error('Get certification status error', error);
            return next(error);
        }
    };
    getEmceeScripts = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const scripts = await this.boardService.getEmceeScripts();
            res.json(scripts);
        }
        catch (error) {
            log.error('Get emcee scripts error', error);
            return next(error);
        }
    };
    createEmceeScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { title, content, type, eventId, contestId, categoryId, order, notes } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const script = await this.boardService.createEmceeScript({
                title,
                content,
                type,
                eventId,
                contestId,
                categoryId,
                order,
                notes,
                userId,
                tenantId: req.user.tenantId,
            });
            res.status(201).json(script);
        }
        catch (error) {
            log.error('Create emcee script error', error);
            return next(error);
        }
    };
    updateEmceeScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            const { title, content, type, eventId, contestId, categoryId, order, notes, isActive } = req.body;
            if (!id) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const script = await this.boardService.updateEmceeScript(id, {
                title,
                content,
                type,
                eventId,
                contestId,
                categoryId,
                order,
                notes,
                isActive,
            });
            res.json(script);
        }
        catch (error) {
            log.error('Update emcee script error', error);
            return next(error);
        }
    };
    deleteEmceeScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const result = await this.boardService.deleteEmceeScript(id);
            res.json(result);
        }
        catch (error) {
            log.error('Delete emcee script error', error);
            return next(error);
        }
    };
    generateReport = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { type } = req.body;
            log.warn('Generate report - not fully implemented', { type });
            res.status(501).json({ error: 'Report generation to be implemented in ReportGenerationService' });
        }
        catch (error) {
            log.error('Generate report error', error);
            return next(error);
        }
    };
    getScoreRemovalRequests = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const status = req.query.status;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const result = await this.boardService.getScoreRemovalRequests(status, page, limit);
            res.json(result);
        }
        catch (error) {
            log.error('Get score removal requests error', error);
            return next(error);
        }
    };
    approveScoreRemoval = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            if (!id || !userId) {
                res.status(400).json({ error: 'Request ID and user required' });
                return;
            }
            const result = await this.boardService.approveScoreRemoval(id, userId, reason);
            res.json(result);
        }
        catch (error) {
            log.error('Approve score removal error', error);
            return next(error);
        }
    };
    rejectScoreRemoval = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'board');
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            if (!id || !userId) {
                res.status(400).json({ error: 'Request ID and user required' });
                return;
            }
            const result = await this.boardService.rejectScoreRemoval(id, userId, reason);
            res.json(result);
        }
        catch (error) {
            log.error('Reject score removal error', error);
            return next(error);
        }
    };
}
exports.BoardController = BoardController;
const controller = new BoardController();
exports.getStats = controller.getStats;
exports.getCertifications = controller.getCertifications;
exports.approveCertification = controller.approveCertification;
exports.rejectCertification = controller.rejectCertification;
exports.getCertificationStatus = controller.getCertificationStatus;
exports.getEmceeScripts = controller.getEmceeScripts;
exports.createEmceeScript = controller.createEmceeScript;
exports.updateEmceeScript = controller.updateEmceeScript;
exports.deleteEmceeScript = controller.deleteEmceeScript;
exports.generateReport = controller.generateReport;
exports.getScoreRemovalRequests = controller.getScoreRemovalRequests;
exports.approveScoreRemoval = controller.approveScoreRemoval;
exports.rejectScoreRemoval = controller.rejectScoreRemoval;
//# sourceMappingURL=boardController.js.map