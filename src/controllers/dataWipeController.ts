/**
 * Data Wipe Controller
 * Handles HTTP requests for data wiping operations
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { DataWipeService } from '../services/DataWipeService';
import { sendSuccess } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';

export class DataWipeController {
  private dataWipeService: DataWipeService;

  constructor() {
    this.dataWipeService = container.resolve(DataWipeService);
  }

  /**
   * Wipe all event/contest/user data
   */
  wipeAllData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'dataWipe');
    try {
      const { confirmation, secondaryConfirmation, dryRun } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await this.dataWipeService.wipeAllData(
        req.user.id,
        req.user.role,
        confirmation,
        secondaryConfirmation,
        Boolean(dryRun)
      );

      log.warn('All data wipe executed', { userId: req.user.id, dryRun: Boolean(dryRun) });
      sendSuccess(
        res,
        result,
        Boolean(dryRun) ? 'Dry-run completed. No data was deleted.' : 'All data wiped successfully'
      );
    } catch (error) {
      log.error('Wipe all data error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Wipe data for a specific event
   */
  wipeEventData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'dataWipe');
    try {
      const { eventId } = req.params;
      const { dryRun } = req.body || {};

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await this.dataWipeService.wipeEventData(
        eventId!,
        req.user.id,
        req.user.role,
        req.tenantId || req.user.tenantId,
        req.isSuperAdmin === true || req.user.role === 'SUPER_ADMIN',
        Boolean(dryRun)
      );

      log.warn('Event data wipe executed', { eventId, userId: req.user.id, dryRun: Boolean(dryRun) });
      sendSuccess(
        res,
        result,
        Boolean(dryRun) ? 'Event dry-run completed. No data was deleted.' : 'Event data wiped successfully'
      );
    } catch (error) {
      log.error('Wipe event data error', { error: (error as Error).message });
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new DataWipeController();

export const wipeAllData = controller.wipeAllData;
export const wipeEventData = controller.wipeEventData;

