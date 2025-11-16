"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScoreComment = exports.updateScoreComment = exports.getScoreComments = exports.createScoreComment = exports.deleteComment = exports.updateComment = exports.getCommentsByContestant = exports.getCommentsForScore = exports.createComment = exports.CommentaryController = void 0;
const container_1 = require("../config/container");
const CommentaryService_1 = require("../services/CommentaryService");
const responseHelpers_1 = require("../utils/responseHelpers");
class CommentaryController {
    commentaryService;
    constructor() {
        this.commentaryService = container_1.container.resolve(CommentaryService_1.CommentaryService);
    }
    createComment = async (req, res, next) => {
        try {
            const { scoreId, criterionId, contestantId, comment, isPrivate } = req.body;
            const scoreComment = await this.commentaryService.create({
                scoreId,
                criterionId,
                contestantId,
                judgeId: req.user.id,
                comment,
                isPrivate
            });
            return (0, responseHelpers_1.sendSuccess)(res, scoreComment, 'Comment created', 201);
        }
        catch (error) {
            next(error);
        }
    };
    getCommentsForScore = async (req, res, next) => {
        try {
            const { scoreId } = req.params;
            const comments = await this.commentaryService.getCommentsForScore(scoreId, req.user.role);
            return (0, responseHelpers_1.sendSuccess)(res, comments);
        }
        catch (error) {
            next(error);
        }
    };
    getCommentsByContestant = async (req, res, next) => {
        try {
            const { contestantId } = req.params;
            const comments = await this.commentaryService.getCommentsByContestant(contestantId, req.user.role);
            return (0, responseHelpers_1.sendSuccess)(res, comments);
        }
        catch (error) {
            next(error);
        }
    };
    updateComment = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { comment, isPrivate } = req.body;
            const updatedComment = await this.commentaryService.update(id, { comment, isPrivate }, req.user.id, req.user.role);
            return (0, responseHelpers_1.sendSuccess)(res, updatedComment, 'Comment updated');
        }
        catch (error) {
            next(error);
        }
    };
    deleteComment = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.commentaryService.delete(id, req.user.id, req.user.role);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Comment deleted');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CommentaryController = CommentaryController;
const controller = new CommentaryController();
exports.createComment = controller.createComment;
exports.getCommentsForScore = controller.getCommentsForScore;
exports.getCommentsByContestant = controller.getCommentsByContestant;
exports.updateComment = controller.updateComment;
exports.deleteComment = controller.deleteComment;
exports.createScoreComment = controller.createComment;
exports.getScoreComments = controller.getCommentsForScore;
exports.updateScoreComment = controller.updateComment;
exports.deleteScoreComment = controller.deleteComment;
//# sourceMappingURL=commentaryController.js.map