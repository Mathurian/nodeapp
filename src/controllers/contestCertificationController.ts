import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { ContestCertificationService } from '../services/ContestCertificationService';
import { sendSuccess } from '../utils/responseHelpers';

export class ContestCertificationController {
  private contestCertificationService: ContestCertificationService;

  constructor() {
    this.contestCertificationService = container.resolve(ContestCertificationService);
  }

  getContestCertificationProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contestId } = req.params;
      const progress = await this.contestCertificationService.getCertificationProgress(contestId!);
      return sendSuccess(res, progress);
    } catch (error) {
      return next(error);
    }
  };

  certifyContest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contestId } = req.params;
      const certification = await this.contestCertificationService.certifyContest(
        contestId!,
        req.user!.id,
        req.user!.role,
        req.user!.tenantId
      );
      return sendSuccess(res, certification, 'Contest certified successfully');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new ContestCertificationController();
export const getContestCertificationProgress = controller.getContestCertificationProgress;
export const certifyContest = controller.certifyContest;
