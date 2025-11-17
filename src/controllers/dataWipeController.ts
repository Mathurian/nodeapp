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
  wipeAllData = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'dataWipe');
    try {
      const { confirmation } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.dataWipeService.wipeAllData(
        req.user.id,
        req.user.role,
        confirmation
      );

      log.warn('All data wiped', { userId: req.user.id });
      sendSuccess(res, null, 'All data wiped successfully');
    } catch (error) {
      log.error('Wipe all data error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Wipe data for a specific event
   */
  wipeEventData = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'dataWipe');
    try {
      const { eventId } = req.params;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.dataWipeService.wipeEventData(
        eventId,
        req.user.id,
        req.user.role
      );

      log.warn('Event data wiped', { eventId, userId: req.user.id });
      sendSuccess(res, null, 'Event data wiped successfully');
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


