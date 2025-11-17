/**
 * Contests Controller - TypeScript Implementation
 * Thin controller layer delegating business logic to ContestService
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { ContestService } from '../services/ContestService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../utils/responseHelpers';

export class ContestsController {
  private contestService: ContestService;

  constructor() {
    this.contestService = container.resolve(ContestService);
  }

  /**
   * Get contest by ID
   */
  getContestById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.getContestWithDetails(id);
      return sendSuccess(res, contest, 'Contest retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contests by event
   */
  getContestsByEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;
      const { includeArchived } = req.query;
      if (!eventId) {
        return sendError(res, 'Event ID is required', 400);
      }
      // When viewing contests for a specific event, allow showing archived contests
      const contests = await this.contestService.getContestsByEventId(
        eventId, 
        includeArchived === 'true', 
        true // forEventView = true
      );
      return sendSuccess(res, contests, 'Contests retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create contest
   */
  createContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.params;
      if (!eventId) {
        return sendError(res, 'Event ID is required', 400);
      }
      const { name, description, contestantNumberingMode } = req.body;

      const contest = await this.contestService.createContest({
        eventId,
        name,
        description,
        contestantNumberingMode,
      });

      return sendCreated(res, contest, 'Contest created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update contest
   */
  updateContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const { name, description, contestantNumberingMode } = req.body;

      const contest = await this.contestService.updateContest(id, {
        name,
        description,
        contestantNumberingMode,
      });

      return sendSuccess(res, contest, 'Contest updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete contest
   */
  deleteContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      await this.contestService.deleteContest(id);
      return sendNoContent(res);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Archive contest
   */
  archiveContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.archiveContest(id);
      return sendSuccess(res, contest, 'Contest archived successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Reactivate contest (unarchive)
   */
  reactivateContest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const contest = await this.contestService.unarchiveContest(id);
      return sendSuccess(res, contest, 'Contest reactivated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get archived contests
   */
  getArchivedContests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { eventId } = req.query;
      const contests = eventId
        ? await this.contestService.getContestsByEventId(eventId as string, true, true) // forEventView = true
        : []; // Return empty array if no eventId specified

      return sendSuccess(res, contests, 'Archived contests retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get contest statistics
   */
  getContestStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendError(res, 'Contest ID is required', 400);
      }
      const stats = await this.contestService.getContestStats(id);
      return sendSuccess(res, stats, 'Contest statistics retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search contests
   */
  searchContests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== 'string') {
        return sendError(res, 'Search query is required', 400);
      }
      const contests = await this.contestService.searchContests(query);
      return sendSuccess(res, contests, 'Search results retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and individual methods
const controller = new ContestsController();
export const getContestById = controller.getContestById;
export const getContestsByEvent = controller.getContestsByEvent;
export const createContest = controller.createContest;
export const updateContest = controller.updateContest;
export const deleteContest = controller.deleteContest;
export const archiveContest = controller.archiveContest;
export const reactivateContest = controller.reactivateContest;
export const getArchivedContests = controller.getArchivedContests;
export const getContestStats = controller.getContestStats;
export const searchContests = controller.searchContests;
