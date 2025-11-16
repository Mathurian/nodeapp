import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { CommentaryService } from '../services/CommentaryService';
import { sendSuccess } from '../utils/responseHelpers';

export class CommentaryController {
  private commentaryService: CommentaryService;

  constructor() {
    this.commentaryService = container.resolve(CommentaryService);
  }

  createComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scoreId, criterionId, contestantId, comment, isPrivate } = req.body;
      const scoreComment = await this.commentaryService.create({
        scoreId,
        criterionId,
        contestantId,
        judgeId: req.user!.id,
        comment,
        isPrivate
      });
      return sendSuccess(res, scoreComment, 'Comment created', 201);
    } catch (error) {
      next(error);
    }
  };

  getCommentsForScore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { scoreId } = req.params;
      const comments = await this.commentaryService.getCommentsForScore(scoreId, req.user!.role);
      return sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  };

  getCommentsByContestant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contestantId } = req.params;
      const comments = await this.commentaryService.getCommentsByContestant(contestantId, req.user!.role);
      return sendSuccess(res, comments);
    } catch (error) {
      next(error);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { comment, isPrivate } = req.body;
      const updatedComment = await this.commentaryService.update(id, { comment, isPrivate }, req.user!.id, req.user!.role);
      return sendSuccess(res, updatedComment, 'Comment updated');
    } catch (error) {
      next(error);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.commentaryService.delete(id, req.user!.id, req.user!.role);
      return sendSuccess(res, null, 'Comment deleted');
    } catch (error) {
      next(error);
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
