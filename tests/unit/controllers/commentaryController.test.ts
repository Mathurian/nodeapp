/**
 * CommentaryController Unit Tests
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { CommentaryController } from '../../../src/controllers/commentaryController';
import { CommentaryService } from '../../../src/services/CommentaryService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/CommentaryService');

describe('CommentaryController', () => {
  let controller: CommentaryController;
  let mockService: jest.Mocked<CommentaryService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    mockService = {
      create: jest.fn(),
      getCommentsForScore: jest.fn(),
      getCommentsByContestant: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockService);

    controller = new CommentaryController();

    mockReq = {
      params: {},
      body: {},
      user: { id: 'user-1', role: 'JUDGE' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createComment', () => {
    it('should create comment successfully', async () => {
      mockReq.body = {
        scoreId: 'score-1',
        criterionId: 'crit-1',
        contestantId: 'cont-1',
        comment: 'Great performance',
        isPrivate: false
      };
      const mockComment = { id: 'comment-1', comment: 'Great performance' };
      mockService.create.mockResolvedValue(mockComment as any);

      await controller.createComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.create).toHaveBeenCalledWith({
        scoreId: 'score-1',
        criterionId: 'crit-1',
        contestantId: 'cont-1',
        judgeId: 'user-1',
        comment: 'Great performance',
        isPrivate: false
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockComment, 'Comment created', 201);
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { scoreId: 'score-1', comment: 'Test' };
      const error = new Error('Creation failed');
      mockService.create.mockRejectedValue(error);

      await controller.createComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCommentsForScore', () => {
    it('should get comments for score', async () => {
      mockReq.params = { scoreId: 'score-1' };
      const mockComments = [
        { id: 'comment-1', comment: 'Good' },
        { id: 'comment-2', comment: 'Excellent' }
      ];
      mockService.getCommentsForScore.mockResolvedValue(mockComments as any);

      await controller.getCommentsForScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCommentsForScore).toHaveBeenCalledWith('score-1', 'JUDGE');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockComments);
    });

    it('should pass user role to service', async () => {
      mockReq.params = { scoreId: 'score-1' };
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockService.getCommentsForScore.mockResolvedValue([]);

      await controller.getCommentsForScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCommentsForScore).toHaveBeenCalledWith('score-1', 'ADMIN');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { scoreId: 'score-1' };
      const error = new Error('Retrieval failed');
      mockService.getCommentsForScore.mockRejectedValue(error);

      await controller.getCommentsForScore(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCommentsByContestant', () => {
    it('should get comments by contestant', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      const mockComments = [
        { id: 'comment-1', comment: 'Performance feedback' }
      ];
      mockService.getCommentsByContestant.mockResolvedValue(mockComments as any);

      await controller.getCommentsByContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCommentsByContestant).toHaveBeenCalledWith('cont-1', 'JUDGE');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockComments);
    });

    it('should pass user role to service', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      mockReq.user = { id: 'tally-1', role: 'TALLY_MASTER' };
      mockService.getCommentsByContestant.mockResolvedValue([]);

      await controller.getCommentsByContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCommentsByContestant).toHaveBeenCalledWith('cont-1', 'TALLY_MASTER');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      const error = new Error('Retrieval failed');
      mockService.getCommentsByContestant.mockRejectedValue(error);

      await controller.getCommentsByContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      mockReq.params = { id: 'comment-1' };
      mockReq.body = { comment: 'Updated feedback', isPrivate: true };
      const mockUpdated = { id: 'comment-1', comment: 'Updated feedback', isPrivate: true };
      mockService.update.mockResolvedValue(mockUpdated as any);

      await controller.updateComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.update).toHaveBeenCalledWith(
        'comment-1',
        { comment: 'Updated feedback', isPrivate: true },
        'user-1',
        'JUDGE'
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockUpdated, 'Comment updated');
    });

    it('should pass user ID and role for authorization', async () => {
      mockReq.params = { id: 'comment-1' };
      mockReq.body = { comment: 'Update' };
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockService.update.mockResolvedValue({ id: 'comment-1' } as any);

      await controller.updateComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.update).toHaveBeenCalledWith(
        'comment-1',
        expect.anything(),
        'admin-1',
        'ADMIN'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'comment-1' };
      mockReq.body = { comment: 'Update' };
      const error = new Error('Update failed');
      mockService.update.mockRejectedValue(error);

      await controller.updateComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      mockReq.params = { id: 'comment-1' };
      mockService.delete.mockResolvedValue(undefined);

      await controller.deleteComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.delete).toHaveBeenCalledWith('comment-1', 'user-1', 'JUDGE');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Comment deleted');
    });

    it('should pass user ID and role for authorization', async () => {
      mockReq.params = { id: 'comment-1' };
      mockReq.user = { id: 'board-1', role: 'BOARD_MEMBER' };
      mockService.delete.mockResolvedValue(undefined);

      await controller.deleteComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.delete).toHaveBeenCalledWith('comment-1', 'board-1', 'BOARD_MEMBER');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'comment-1' };
      const error = new Error('Delete failed');
      mockService.delete.mockRejectedValue(error);

      await controller.deleteComment(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
