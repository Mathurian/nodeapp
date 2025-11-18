"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJudgeHistory = exports.getContestantBio = exports.getContestantBios = exports.getCertificationWorkflow = exports.submitScore = exports.getScoringInterface = exports.updateAssignmentStatus = exports.getAssignments = exports.getStats = exports.JudgeController = void 0;
const container_1 = require("../config/container");
const JudgeService_1 = require("../services/JudgeService");
const responseHelpers_1 = require("../utils/responseHelpers");
class JudgeController {
    judgeService;
    constructor() {
        this.judgeService = container_1.container.resolve(JudgeService_1.JudgeService);
    }
    getStats = async (req, res, next) => {
        try {
            const user = req.user;
            const stats = await this.judgeService.getStats(user.id, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getAssignments = async (req, res, next) => {
        try {
            const user = req.user;
            const assignments = await this.judgeService.getAssignments(user.id, user.role, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, assignments);
        }
        catch (error) {
            return next(error);
        }
    };
    updateAssignmentStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = req.user;
            if (!id) {
                res.status(400).json({ error: 'Assignment ID is required' });
                return;
            }
            const assignment = await this.judgeService.updateAssignmentStatus(id, status, user.id, user.role, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, assignment, 'Assignment status updated');
        }
        catch (error) {
            return next(error);
        }
    };
    getScoringInterface = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const scoringData = await this.judgeService.getScoringInterface(categoryId, user.id, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, scoringData);
        }
        catch (error) {
            return next(error);
        }
    };
    submitScore = async (req, res, next) => {
        try {
            const user = req.user;
            const { categoryId, contestantId, criterionId, score, comment } = req.body;
            const scoreRecord = await this.judgeService.submitScore({
                categoryId,
                contestantId,
                criterionId,
                score,
                comment,
                tenantId: user.tenantId
            }, user.id);
            (0, responseHelpers_1.sendSuccess)(res, scoreRecord, 'Score submitted successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getCertificationWorkflow = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const certificationData = await this.judgeService.getCertificationWorkflow(categoryId, user.id, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, certificationData);
        }
        catch (error) {
            return next(error);
        }
    };
    getContestantBios = async (req, res, next) => {
        try {
            const { categoryId } = req.params;
            const user = req.user;
            if (!categoryId) {
                res.status(400).json({ error: 'Category ID is required' });
                return;
            }
            const contestants = await this.judgeService.getContestantBios(categoryId, user.id, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, contestants);
        }
        catch (error) {
            return next(error);
        }
    };
    getContestantBio = async (req, res, next) => {
        try {
            const { contestantId } = req.params;
            const user = req.user;
            if (!contestantId) {
                res.status(400).json({ error: 'Contestant ID is required' });
                return;
            }
            const contestant = await this.judgeService.getContestantBio(contestantId, user.id, user.tenantId);
            (0, responseHelpers_1.sendSuccess)(res, contestant);
        }
        catch (error) {
            return next(error);
        }
    };
    getJudgeHistory = async (req, res, next) => {
        try {
            const user = req.user;
            const result = await this.judgeService.getJudgeHistory(user.id, user.tenantId, req.query);
            (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.JudgeController = JudgeController;
const controller = new JudgeController();
exports.getStats = controller.getStats;
exports.getAssignments = controller.getAssignments;
exports.updateAssignmentStatus = controller.updateAssignmentStatus;
exports.getScoringInterface = controller.getScoringInterface;
exports.submitScore = controller.submitScore;
exports.getCertificationWorkflow = controller.getCertificationWorkflow;
exports.getContestantBios = controller.getContestantBios;
exports.getContestantBio = controller.getContestantBio;
exports.getJudgeHistory = controller.getJudgeHistory;
//# sourceMappingURL=judgeController.js.map