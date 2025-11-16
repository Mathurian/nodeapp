import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AssignmentService, AssignmentFilters } from '../services/AssignmentService';
import { sendSuccess, successResponse, sendError } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

/**
 * Assignments Controller
 * Handles judge assignments to categories/contests/events
 */
export class AssignmentsController {
  private assignmentService: AssignmentService;
  private prisma: PrismaClient;

  constructor() {
    this.assignmentService = container.resolve(AssignmentService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get all assignments
   */
  getAllAssignments = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    try {
      const filters: AssignmentFilters = {
        status: req.query.status as string,
        judgeId: req.query.judgeId as string,
        categoryId: req.query.categoryId as string,
        contestId: req.query.contestId as string,
        eventId: req.query.eventId as string,
      };

      const assignments = await this.assignmentService.getAllAssignments(filters);
      return sendSuccess(res, assignments, 'Assignments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create assignment
   */
  createAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id || '';
      const assignment = await this.assignmentService.createAssignment(req.body, userId);

      successResponse(res, assignment, 'Assignment created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get assignment by ID
   */
  getAssignmentById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const assignment = await this.assignmentService.getAssignmentById(id);

      res.json(assignment);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update assignment
   */
  updateAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const assignment = await this.assignmentService.updateAssignment(id, req.body);

      successResponse(res, assignment, 'Assignment updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete assignment
   */
  deleteAssignment = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      await this.assignmentService.deleteAssignment(id);

      successResponse(res, null, 'Assignment deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get assignments for a judge
   */
  getAssignmentsForJudge = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { judgeId } = req.params;
      const assignments = await this.assignmentService.getAssignmentsForJudge(judgeId);

      res.json(assignments);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get assignments for a category
   */
  getAssignmentsForCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const assignments = await this.assignmentService.getAssignmentsForCategory(categoryId);

      res.json(assignments);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Bulk assign judges to category
   */
  bulkAssignJudges = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const { judgeIds } = req.body;
      const userId = req.user?.id || '';

      const assignedCount = await this.assignmentService.bulkAssignJudges(
        categoryId,
        judgeIds,
        userId
      );

      successResponse(
        res,
        { assignedCount },
        `${assignedCount} judge(s) assigned successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Remove all assignments for a category
   */
  removeAllAssignmentsForCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { categoryId } = req.params;
      const removedCount = await this.assignmentService.removeAllAssignmentsForCategory(categoryId);

      successResponse(
        res,
        { removedCount },
        `${removedCount} assignment(s) removed successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  getJudgeAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for getAssignmentsForJudge - delegate to that method
      return this.getAssignmentsForJudge(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  getJudges = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const judges = await this.assignmentService.getJudges();
      return sendSuccess(res, judges, 'Judges retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const categories = await this.assignmentService.getCategories();
      return sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  assignJudge = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for createAssignment - delegate to that method
      return this.createAssignment(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  removeAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for deleteAssignment - delegate to that method
      return this.deleteAssignment(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  getContestants = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const contestants = await this.assignmentService.getContestants();
      return sendSuccess(res, contestants, 'Contestants retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  assignContestantToCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const log = createRequestLogger(req, 'assignments');
    try {
      const { categoryId, contestId, contestantId } = req.body;
      
      if (!contestantId) {
        log.warn('Assign contestant failed: missing contestantId', { categoryId, contestId, contestantId });
        return sendError(res, 'contestantId is required', 400);
      }

      // If contestId is provided, assign to all categories in the contest
      if (contestId && !categoryId) {
        log.debug('Assigning contestant to all categories in contest', { contestId, contestantId });
        const categories = await this.assignmentService.getCategories();
        const contestCategories = categories.filter((cat: any) => cat.contest?.id === contestId);

        if (contestCategories.length === 0) {
          return sendError(res, 'No categories found for the specified contest', 400);
        }

        const results = [];
        const errors = [];

        for (const category of contestCategories) {
          try {
            const assignment = await this.assignmentService.assignContestantToCategory(category.id, contestantId);
            results.push(assignment);
          } catch (error: any) {
            // Skip if already assigned, otherwise collect error
            if (!error.message?.includes('already assigned')) {
              errors.push({ categoryId: category.id, error: error.message });
            }
          }
        }

        if (results.length === 0 && errors.length > 0) {
          return sendError(res, `Failed to assign contestant: ${errors[0].error}`, 400);
        }

        log.info('Contestant assigned to contest successfully', { contestId, contestantId, categoryCount: results.length });
        return sendSuccess(res, { assignments: results, errors }, `Contestant assigned to ${results.length} categories successfully`, 201);
      }

      // If categoryId is provided, assign to specific category
      if (!categoryId) {
        log.warn('Assign contestant failed: missing categoryId or contestId', { categoryId, contestId, contestantId });
        return sendError(res, 'Either categoryId or contestId is required', 400);
      }
      
      log.debug('Assigning contestant to category', { categoryId, contestantId });
      const assignment = await this.assignmentService.assignContestantToCategory(categoryId, contestantId);
      log.info('Contestant assigned to category successfully', { categoryId, contestantId });
      return sendSuccess(res, assignment, 'Contestant assigned to category successfully', 201);
    } catch (error: any) {
      log.error('Assign contestant to category error', { 
        error: error.message, 
        categoryId: req.body?.categoryId,
        contestId: req.body?.contestId,
        contestantId: req.body?.contestantId,
        stack: error.stack 
      });
      next(error);
    }
  };

  removeContestantFromCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId, contestantId } = req.params;
      await this.assignmentService.removeContestantFromCategory(categoryId, contestantId);
      return sendSuccess(res, null, 'Contestant removed from category successfully');
    } catch (error) {
      next(error);
    }
  };

  getCategoryContestants = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      const contestants = await this.assignmentService.getCategoryContestants(categoryId);
      return sendSuccess(res, contestants, 'Category contestants retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAllContestantAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = {
        categoryId: req.query.categoryId as string | undefined,
        contestId: req.query.contestId as string | undefined,
      };
      const assignments = await this.assignmentService.getAllContestantAssignments(filters);
      return sendSuccess(res, assignments, 'Contestant assignments retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new AssignmentsController();

export const getAllAssignments = controller.getAllAssignments;
export const createAssignment = controller.createAssignment;
export const getAssignmentById = controller.getAssignmentById;
export const updateAssignment = controller.updateAssignment;
export const deleteAssignment = controller.deleteAssignment;
export const getAssignmentsForJudge = controller.getAssignmentsForJudge;
export const getAssignmentsForCategory = controller.getAssignmentsForCategory;
export const bulkAssignJudges = controller.bulkAssignJudges;
export const removeAllAssignmentsForCategory = controller.removeAllAssignmentsForCategory;
export const getJudgeAssignments = controller.getJudgeAssignments;
export const getJudges = controller.getJudges;
export const getCategories = controller.getCategories;
export const assignJudge = controller.assignJudge;
export const removeAssignment = controller.removeAssignment;
export const getContestants = controller.getContestants;
export const assignContestantToCategory = controller.assignContestantToCategory;
export const removeContestantFromCategory = controller.removeContestantFromCategory;
export const getCategoryContestants = controller.getCategoryContestants;
export const getAllContestantAssignments = controller.getAllContestantAssignments;
