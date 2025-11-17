import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ResultsService } from '../services/ResultsService';
import { createRequestLogger } from '../utils/logger';
import { UserRole } from '@prisma/client';

/**
 * Controller for managing results and score aggregations
 * Handles retrieval of results with role-based access control
 */
export class ResultsController {
  private resultsService: ResultsService;

  constructor() {
    this.resultsService = container.resolve(ResultsService);
  }

  /**
   * Get all results with role-based filtering and pagination
   */
  getAllResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const userRole = req.user?.role as UserRole;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;
      const page = parseInt(req.query.page as string) || 1;

      const { results, total } = await this.resultsService.getAllResults({
        userRole,
        userId,
        offset,
        limit,
      });

      res.json({
        results,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      log.error('Get results error:', error);
      return next(error);
    }
  };

  /**
   * Get all categories with related data
   */
  getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const categories = await this.resultsService.getCategories();
      res.json(categories);
    } catch (error) {
      log.error('Get categories error:', error);
      return next(error);
    }
  };

  /**
   * Get results for a specific contestant
   */
  getContestantResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const { contestantId } = req.params;
      const userRole = req.user?.role as UserRole;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const results = await this.resultsService.getContestantResults({
        contestantId,
        userRole,
        userId,
      });

      res.json(results);
    } catch (error) {
      log.error('Get contestant results error:', error);
      if (error instanceof Error && error.message === 'Access denied. You can only view your own results.') {
        res.status(403).json({ error: error.message });
        return;
      }
      return next(error);
    }
  };

  /**
   * Get results for a specific category with rankings
   */
  getCategoryResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const { categoryId } = req.params;
      const userRole = req.user?.role as UserRole;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const results = await this.resultsService.getCategoryResults({
        categoryId,
        userRole,
        userId,
      });

      res.json(results);
    } catch (error) {
      log.error('Get category results error:', error);
      if (error instanceof Error) {
        if (error.message === 'Category not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Not assigned to this category') {
          res.status(403).json({ error: error.message });
          return;
        }
      }
      return next(error);
    }
  };

  /**
   * Get results for a specific contest
   */
  getContestResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const { contestId } = req.params;
      const userRole = req.user?.role as UserRole;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const results = await this.resultsService.getContestResults({
        contestId,
        userRole,
        userId,
      });

      res.json(results);
    } catch (error) {
      log.error('Get contest results error:', error);
      if (error instanceof Error) {
        if (error.message === 'Contest not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Not assigned to this contest') {
          res.status(403).json({ error: error.message });
          return;
        }
      }
      return next(error);
    }
  };

  /**
   * Get results for a specific event
   */
  getEventResults = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'results');
    try {
      const { eventId } = req.params;
      const userRole = req.user?.role as UserRole;
      const userId = req.user?.id;

      if (!userRole || !userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const results = await this.resultsService.getEventResults({
        eventId,
        userRole,
        userId,
      });

      res.json(results);
    } catch (error) {
      log.error('Get event results error:', error);
      if (error instanceof Error) {
        if (error.message === 'Event not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Not assigned to this event') {
          res.status(403).json({ error: error.message });
          return;
        }
      }
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new ResultsController();
export const getAllResults = controller.getAllResults;
export const getCategories = controller.getCategories;
export const getContestantResults = controller.getContestantResults;
export const getCategoryResults = controller.getCategoryResults;
export const getContestResults = controller.getContestResults;
export const getEventResults = controller.getEventResults;
