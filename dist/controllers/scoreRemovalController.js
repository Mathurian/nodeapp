"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeScoreRemoval = exports.signScoreRemovalRequest = exports.getScoreRemovalRequest = exports.getScoreRemovalRequests = exports.createScoreRemovalRequest = exports.ScoreRemovalController = void 0;
const container_1 = require("../config/container");
const ScoreRemovalService_1 = require("../services/ScoreRemovalService");
const responseHelpers_1 = require("../utils/responseHelpers");
class ScoreRemovalController {
    scoreRemovalService;
    constructor() {
        this.scoreRemovalService = container_1.container.resolve(ScoreRemovalService_1.ScoreRemovalService);
    }
    createScoreRemovalRequest = async (req, res, next) => {
        try {
            const { judgeId, categoryId, reason } = req.body;
            const request = await this.scoreRemovalService.createRequest({
                judgeId,
                categoryId,
                reason,
                requestedBy: req.user.id,
                userRole: req.user.role,
                tenantId: req.user.tenantId
            });
            return (0, responseHelpers_1.sendSuccess)(res, request, 'Score removal request created. Awaiting co-signatures.');
        }
        catch (error) {
            return next(error);
        }
    };
    getScoreRemovalRequests = async (req, res, next) => {
        try {
            const { status } = req.query;
            const requests = await this.scoreRemovalService.getAll(status, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, requests);
        }
        catch (error) {
            return next(error);
        }
    };
    getScoreRemovalRequest = async (req, res, next) => {
        try {
            const { id } = req.params;
            const request = await this.scoreRemovalService.getById(id, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, request);
        }
        catch (error) {
            return next(error);
        }
    };
    signScoreRemovalRequest = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { signatureName } = req.body;
            const result = await this.scoreRemovalService.signRequest(id, req.user.tenantId, {
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
    executeScoreRemoval = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.scoreRemovalService.executeRemoval(id, req.user.tenantId);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Score removal executed successfully');
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.ScoreRemovalController = ScoreRemovalController;
const controller = new ScoreRemovalController();
exports.createScoreRemovalRequest = controller.createScoreRemovalRequest;
exports.getScoreRemovalRequests = controller.getScoreRemovalRequests;
exports.getScoreRemovalRequest = controller.getScoreRemovalRequest;
exports.signScoreRemovalRequest = controller.signScoreRemovalRequest;
exports.executeScoreRemoval = controller.executeScoreRemoval;
//# sourceMappingURL=scoreRemovalController.js.map