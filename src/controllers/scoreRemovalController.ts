import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { ScoreRemovalService } from '../services/ScoreRemovalService';
import { sendSuccess } from '../utils/responseHelpers';

export class ScoreRemovalController {
  private scoreRemovalService: ScoreRemovalService;

  constructor() {
    this.scoreRemovalService = container.resolve(ScoreRemovalService);
  }

  createScoreRemovalRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { judgeId, categoryId, reason } = req.body;
      const request = await this.scoreRemovalService.createRequest({
        judgeId,
        categoryId,
        reason,
        requestedBy: req.user!.id,
        userRole: req.user!.role,
        tenantId: req.user!.tenantId
      });
      return sendSuccess(res, request, 'Score removal request created. Awaiting co-signatures.');
    } catch (error) {
      return next(error);
    }
  };

  getScoreRemovalRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const requests = await this.scoreRemovalService.getAll(status as string | undefined, req.user!.tenantId);
      return sendSuccess(res, requests);
    } catch (error) {
      return next(error);
    }
  };

  getScoreRemovalRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const request = await this.scoreRemovalService.getById(id, req.user!.tenantId);
      return sendSuccess(res, request);
    } catch (error) {
      return next(error);
    }
  };

  signScoreRemovalRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { signatureName } = req.body;
      const result = await this.scoreRemovalService.signRequest(id, req.user!.tenantId, {
        signatureName,
        userId: req.user!.id,
        userRole: req.user!.role
      });
      return sendSuccess(res, result, 'Request signed successfully');
    } catch (error) {
      return next(error);
    }
  };

  executeScoreRemoval = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.scoreRemovalService.executeRemoval(id, req.user!.tenantId);
      return sendSuccess(res, result, 'Score removal executed successfully');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new ScoreRemovalController();
export const createScoreRemovalRequest = controller.createScoreRemovalRequest;
export const getScoreRemovalRequests = controller.getScoreRemovalRequests;
export const getScoreRemovalRequest = controller.getScoreRemovalRequest;
export const signScoreRemovalRequest = controller.signScoreRemovalRequest;
export const executeScoreRemoval = controller.executeScoreRemoval;
