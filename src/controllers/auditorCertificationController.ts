import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AuditorCertificationService } from '../services/AuditorCertificationService';
import { sendSuccess } from '../utils/responseHelpers';

export class AuditorCertificationController {
  private auditorCertificationService: AuditorCertificationService;

  constructor() {
    this.auditorCertificationService = container.resolve(AuditorCertificationService);
  }

  getFinalCertificationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId } = req.params;
      const status = await this.auditorCertificationService.getFinalCertificationStatus(categoryId);
      return sendSuccess(res, status);
    } catch (error) {
      return next(error);
    }
  };

  submitFinalCertification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId } = req.params;
      const { confirmation1, confirmation2 } = req.body;
      const certification = await this.auditorCertificationService.submitFinalCertification(
        categoryId,
        req.user!.id,
        req.user!.role,
        { confirmation1, confirmation2 }
      );
      return sendSuccess(res, certification, 'Final certification completed successfully. All scores are now permanently locked.');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new AuditorCertificationController();
export const getFinalCertificationStatus = controller.getFinalCertificationStatus;
export const submitFinalCertification = controller.submitFinalCertification;
