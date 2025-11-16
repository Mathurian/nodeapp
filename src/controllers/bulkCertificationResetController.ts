/**
 * Bulk Certification Reset Controller
 * Handles HTTP requests for bulk certification resets
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { BulkCertificationResetService, BulkCertificationResetDTO } from '../services/BulkCertificationResetService';
import { sendSuccess } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';

export class BulkCertificationResetController {
  private bulkCertificationResetService: BulkCertificationResetService;

  constructor() {
    this.bulkCertificationResetService = container.resolve(BulkCertificationResetService);
  }

  /**
   * Reset certifications in bulk
   */
  resetCertifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'bulkCertificationReset');
    try {
      const dto: BulkCertificationResetDTO = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await this.bulkCertificationResetService.resetCertifications(
        dto,
        req.user.id,
        req.user.role
      );

      log.info('Certifications reset', { dto, userId: req.user.id, resetCount: result.resetCount });
      sendSuccess(res, result, result.message);
    } catch (error) {
      log.error('Reset certifications error', { error: (error as Error).message });
      next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new BulkCertificationResetController();

export const resetCertifications = controller.resetCertifications;


