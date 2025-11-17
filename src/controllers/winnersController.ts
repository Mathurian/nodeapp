import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { WinnerService } from '../services/WinnerService';
import { sendSuccess } from '../utils/responseHelpers';

export class WinnersController {
  private winnerService: WinnerService;

  constructor() {
    this.winnerService = container.resolve(WinnerService);
  }

  /**
   * Get winners by category
   */
  getWinnersByCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.winnerService.getWinnersByCategory(
        categoryId,
        user.role
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get winners by contest
   */
  getWinnersByContest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { contestId } = req.params;
      const { includeCategoryBreakdown = true } = req.query;
      const user = (req as any).user;

      if (!contestId) {
        res.status(400).json({ error: 'Contest ID is required' });
        return;
      }

      const result = await this.winnerService.getWinnersByContest(
        contestId,
        user.role,
        Boolean(includeCategoryBreakdown)
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Sign winners for a category
   */
  signWinners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { categoryId } = req.body;
      const user = (req as any).user;
      const ipAddress = req.ip;
      const userAgent = req.get('user-agent');

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.winnerService.signWinners(
        categoryId,
        user.id,
        user.role,
        ipAddress,
        userAgent
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get signature status
   */
  getSignatureStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.winnerService.getSignatureStatus(categoryId, user.id);

      sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get certification progress
   */
  getCertificationProgress = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.winnerService.getCertificationProgress(categoryId);

      sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get role-specific certification status
   */
  getRoleCertificationStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId, role } = req.params;

      if (!categoryId || !role) {
        res.status(400).json({ error: 'Category ID and role are required' });
        return;
      }

      const result = await this.winnerService.getRoleCertificationStatus(
        categoryId,
        role
      );

      sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Certify scores
   */
  certifyScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { categoryId } = req.body;
      const user = (req as any).user;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const result = await this.winnerService.certifyScores(
        categoryId,
        user.id,
        user.role
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get winners (general query)
   */
  getWinners = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId, contestId } = req.query;

      const result = await this.winnerService.getWinners(
        eventId as string | undefined,
        contestId as string | undefined
      );

      sendSuccess(res, result, result.message || 'Winners retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and methods
const controller = new WinnersController();
export const getWinners = controller.getWinners;
export const getWinnersByCategory = controller.getWinnersByCategory;
export const getWinnersByContest = controller.getWinnersByContest;
export const signWinners = controller.signWinners;
export const getSignatureStatus = controller.getSignatureStatus;
export const getCertificationProgress = controller.getCertificationProgress;
export const getRoleCertificationStatus = controller.getRoleCertificationStatus;
export const certifyScores = controller.certifyScores;
