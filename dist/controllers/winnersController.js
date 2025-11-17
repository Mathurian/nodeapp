"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certifyScores = exports.getRoleCertificationStatus = exports.getCertificationProgress = exports.getSignatureStatus = exports.signWinners = exports.getWinnersByContest = exports.getWinnersByCategory = exports.getWinners = exports.WinnersController = void 0;
const container_1 = require("../config/container");
const WinnerService_1 = require("../services/WinnerService");
const responseHelpers_1 = require("../utils/responseHelpers");
class WinnersController {
    winnerService;
    constructor() {
        this.winnerService = container_1.container.resolve(WinnerService_1.WinnerService);
    }
    getWinnersByCategory = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const result = await this.winnerService.getWinnersByCategory(categoryId, user.role);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    getWinnersByContest = async (req, res, next) => {
        try {
            const { contestId } = req.params;
            const { includeCategoryBreakdown = true } = req.query;
            const user = req.user;
            if (!contestId) {
                res.status(400).json({ error: 'Contest ID is required' });
                return;
            }
            const result = await this.winnerService.getWinnersByContest(contestId, user.role, Boolean(includeCategoryBreakdown));
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    signWinners = async (req, res, next) => {
        try {
            const { categoryId } = req.body;
            const user = req.user;
            const ipAddress = req.ip;
            const userAgent = req.get('user-agent');
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const result = await this.winnerService.signWinners(categoryId, user.id, user.role, ipAddress, userAgent);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    getSignatureStatus = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const result = await this.winnerService.getSignatureStatus(categoryId, user.id);
            (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    getCertificationProgress = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const result = await this.winnerService.getCertificationProgress(categoryId);
            (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    getRoleCertificationStatus = async (req, res, next) => {
        try {
            const { categoryId, role } = req.params;
            if (!categoryId || !role) {
                res.status(400).json({ error: 'Category ID and role are required' });
                return;
            }
            const result = await this.winnerService.getRoleCertificationStatus(categoryId, role);
            (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    certifyScores = async (req, res, next) => {
        try {
            const { categoryId } = req.body;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const result = await this.winnerService.certifyScores(categoryId, user.id, user.role);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    getWinners = async (req, res, next) => {
        try {
            const { eventId, contestId } = req.query;
            const result = await this.winnerService.getWinners(eventId, contestId);
            (0, responseHelpers_1.sendSuccess)(res, result, result.message || 'Winners retrieved successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.WinnersController = WinnersController;
const controller = new WinnersController();
exports.getWinners = controller.getWinners;
exports.getWinnersByCategory = controller.getWinnersByCategory;
exports.getWinnersByContest = controller.getWinnersByContest;
exports.signWinners = controller.signWinners;
exports.getSignatureStatus = controller.getSignatureStatus;
exports.getCertificationProgress = controller.getCertificationProgress;
exports.getRoleCertificationStatus = controller.getRoleCertificationStatus;
exports.certifyScores = controller.certifyScores;
//# sourceMappingURL=winnersController.js.map