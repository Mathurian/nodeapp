/**
 * Restriction Controller
 * Handles HTTP requests for contestant view restrictions and edit locks
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { RestrictionService } from '../services/RestrictionService';
import { sendSuccess } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';

export class RestrictionController {
  private restrictionService: RestrictionService;

  constructor() {
    this.restrictionService = container.resolve(RestrictionService);
  }

  /**
   * Set contestant view restriction
   */
  setContestantViewRestriction = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'restriction');
    try {
      const { eventId, contestId, restricted, releaseDate } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.restrictionService.setContestantViewRestriction(
        { eventId, contestId, restricted, releaseDate: releaseDate ? new Date(releaseDate) : undefined },
        req.user.id,
        req.user.role
      );

      log.info('Contestant view restriction set', { eventId, contestId, restricted });
      sendSuccess(res, null, 'Contestant view restriction updated successfully');
    } catch (error) {
      log.error('Set contestant view restriction error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Check if contestant can view
   */
  canContestantView = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'restriction');
    try {
      const { eventId, contestId } = req.query;

      const canView = await this.restrictionService.canContestantView(
        eventId as string,
        contestId as string
      );

      sendSuccess(res, { canView });
    } catch (error) {
      log.error('Check contestant view error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Lock/unlock event or contest for editing
   */
  lockEventContest = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'restriction');
    try {
      const { eventId, contestId, locked, verifiedBy } = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      await this.restrictionService.lockEventContest(
        { eventId, contestId, locked, verifiedBy },
        req.user.id,
        req.user.role
      );

      log.info('Event/contest lock updated', { eventId, contestId, locked });
      sendSuccess(res, null, locked ? 'Event/contest locked successfully' : 'Event/contest unlocked successfully');
    } catch (error) {
      log.error('Lock event/contest error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Check if event/contest is locked
   */
  isLocked = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'restriction');
    try {
      const { eventId, contestId } = req.query;

      const locked = await this.restrictionService.isLocked(
        eventId as string,
        contestId as string
      );

      sendSuccess(res, { locked });
    } catch (error) {
      log.error('Check lock status error', { error: (error as Error).message });
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new RestrictionController();

export const setContestantViewRestriction = controller.setContestantViewRestriction;
export const canContestantView = controller.canContestantView;
export const lockEventContest = controller.lockEventContest;
export const isLocked = controller.isLocked;


