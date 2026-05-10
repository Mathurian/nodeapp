import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { CommentaryService } from '../services/CommentaryService';
import { sendSuccess, sendUnauthorized, sendForbidden } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';
import {
  getOfflineWriteTimeoutMs,
  matchOfflineWriteOwnershipRoute,
} from '../config/offlineWriteOwnership.config';
import { createCommentaryViewerContext } from '../utils/commentaryAccess';

export class CommentaryController {
  private commentaryService: CommentaryService;

  constructor() {
    this.commentaryService = container.resolve(CommentaryService);
  }

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { scoreId, criterionId, contestantId, comment, isPrivate } = req.body;
      const judgeId = req.user.judgeId || req.user.judge?.id;
      if (!judgeId) {
        sendForbidden(res, 'User must be assigned as a judge to create commentary');
        return;
      }
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const scoreComment = await this.commentaryService.create({
        scoreId,
        criterionId,
        contestantId,
        judgeId,
        comment,
        isPrivate,
      }, timeoutMs);
      return sendSuccess(res, scoreComment, 'Comment created', 201);
    } catch (error) {
      return next(error);
    }
  };

  getCommentsForScore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const scoreId = getRequiredParam(req, 'scoreId');
      const comments = await this.commentaryService.getCommentsForScore(
        scoreId,
        createCommentaryViewerContext(req.user),
      );
      return sendSuccess(res, comments);
    } catch (error) {
      return next(error);
    }
  };

  getCommentsByContestant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const contestantId = getRequiredParam(req, 'contestantId');
      const comments = await this.commentaryService.getCommentsByContestant(
        contestantId,
        createCommentaryViewerContext(req.user),
      );
      return sendSuccess(res, comments);
    } catch (error) {
      return next(error);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = getRequiredParam(req, 'id');
      const { comment, isPrivate } = req.body;
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const updatedComment = await this.commentaryService.update(
        id,
        { comment, isPrivate },
        req.user.id,
        req.user.role,
        timeoutMs,
      );
      return sendSuccess(res, updatedComment, 'Comment updated');
    } catch (error) {
      return next(error);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const id = getRequiredParam(req, 'id');
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      await this.commentaryService.delete(id, req.user.id, req.user.role, timeoutMs);
      return sendSuccess(res, null, 'Comment deleted');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new CommentaryController();
export const createComment = controller.createComment;
export const getCommentsForScore = controller.getCommentsForScore;
export const getCommentsByContestant = controller.getCommentsByContestant;
export const updateComment = controller.updateComment;
export const deleteComment = controller.deleteComment;

export const createScoreComment = controller.createComment;
export const getScoreComments = controller.getCommentsForScore;
export const updateScoreComment = controller.updateComment;
export const deleteScoreComment = controller.deleteComment;
