import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AssignmentService, AssignmentFilters } from '../services/AssignmentService';
import { sendSuccess, successResponse, sendError } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { getRequiredParam } from '../utils/routeHelpers';

/**
 * Assignments Controller
 * Handles judge assignments to categories/contests/events
 */
export class AssignmentsController {
  private assignmentService: AssignmentService;

  constructor() {
    this.assignmentService = container.resolve(AssignmentService);
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
        status: req.query['status'] as string,
        judgeId: req.query['judgeId'] as string,
        categoryId: req.query['categoryId'] as string,
        contestId: req.query['contestId'] as string,
        eventId: req.query['eventId'] as string,
      };

      const assignments = await this.assignmentService.getAllAssignments(filters);
      return sendSuccess(res, assignments, 'Assignments retrieved successfully');
    } catch (error) {
      return next(error);
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
      return next(error);
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
      const id = getRequiredParam(req, 'id');
      const assignment = await this.assignmentService.getAssignmentById(id);

      res.json(assignment);
    } catch (error) {
      return next(error);
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
      const id = getRequiredParam(req, 'id');
      const assignment = await this.assignmentService.updateAssignment(id, req.body);

      successResponse(res, assignment, 'Assignment updated successfully');
    } catch (error) {
      return next(error);
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
      const id = getRequiredParam(req, 'id');
      await this.assignmentService.deleteAssignment(id);

      successResponse(res, null, 'Assignment deleted successfully');
    } catch (error) {
      return next(error);
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
      const judgeId = getRequiredParam(req, 'judgeId');
      const assignments = await this.assignmentService.getAssignmentsForJudge(judgeId);

      res.json(assignments);
    } catch (error) {
      return next(error);
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
      const categoryId = getRequiredParam(req, 'categoryId');
      const assignments = await this.assignmentService.getAssignmentsForCategory(categoryId);

      res.json(assignments);
    } catch (error) {
      return next(error);
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
      const categoryId = getRequiredParam(req, 'categoryId');
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
      return next(error);
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
      const categoryId = getRequiredParam(req, 'categoryId');
      const removedCount = await this.assignmentService.removeAllAssignmentsForCategory(categoryId);

      successResponse(
        res,
        { removedCount },
        `${removedCount} assignment(s) removed successfully`
      );
    } catch (error) {
      return next(error);
    }
  };

  getJudgeAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for getAssignmentsForJudge - delegate to that method
      return this.getAssignmentsForJudge(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  getJudges = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const judges = await this.assignmentService.getJudges();
      return sendSuccess(res, judges, 'Judges retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCategories = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const categories = await this.assignmentService.getCategories();
      return sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  assignJudge = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for createAssignment - delegate to that method
      return this.createAssignment(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  removeAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // This is an alias for deleteAssignment - delegate to that method
      return this.deleteAssignment(req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  getContestants = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const contestants = await this.assignmentService.getContestants();
      return sendSuccess(res, contestants, 'Contestants retrieved successfully');
    } catch (error) {
      return next(error);
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
          return sendError(res, `Failed to assign contestant: ${errors[0]?.error}`, 400);
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
      return next(error);
    }
  };

  removeContestantFromCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const categoryId = getRequiredParam(req, 'categoryId');
      const contestantId = getRequiredParam(req, 'contestantId');
      await this.assignmentService.removeContestantFromCategory(categoryId, contestantId);
      return sendSuccess(res, null, 'Contestant removed from category successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCategoryContestants = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const categoryId = getRequiredParam(req, 'categoryId');
      const contestants = await this.assignmentService.getCategoryContestants(categoryId);
      return sendSuccess(res, contestants, 'Category contestants retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  getAllContestantAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = {
        categoryId: req.query['categoryId'] as string | undefined,
        contestId: req.query['contestId'] as string | undefined,
      };
      const assignments = await this.assignmentService.getAllContestantAssignments(filters);
      return sendSuccess(res, assignments, 'Contestant assignments retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  // Tally Master Assignment Methods
  getTallyMasterAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = {
        eventId: req.query['eventId'] as string | undefined,
        contestId: req.query['contestId'] as string | undefined,
        categoryId: req.query['categoryId'] as string | undefined,
      };
      const assignments = await this.assignmentService.getTallyMasterAssignments(filters);
      return sendSuccess(res, assignments, 'Tally master assignments retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  createTallyMasterAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { userId, eventId, contestId, categoryId, notes } = req.body;
      const assignedBy = req.user?.id;

      if (!assignedBy) {
        return sendError(res, 'User not authenticated', 401);
      }

      const assignment = await this.assignmentService.createTallyMasterAssignment({
        userId,
        eventId,
        contestId,
        categoryId,
        notes,
        assignedBy,
      });

      return sendSuccess(res, assignment, 'Tally master assignment created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  removeTallyMasterAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const assignmentId = getRequiredParam(req, 'id');
      await this.assignmentService.removeTallyMasterAssignment(assignmentId);
      return sendSuccess(res, null, 'Tally master assignment removed successfully');
    } catch (error) {
      return next(error);
    }
  };

  // Auditor Assignment Methods
  getAuditorAssignments = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const filters = {
        eventId: req.query['eventId'] as string | undefined,
        contestId: req.query['contestId'] as string | undefined,
        categoryId: req.query['categoryId'] as string | undefined,
      };
      const assignments = await this.assignmentService.getAuditorAssignments(filters);
      return sendSuccess(res, assignments, 'Auditor assignments retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  createAuditorAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { userId, eventId, contestId, categoryId, notes } = req.body;
      const assignedBy = req.user?.id;

      if (!assignedBy) {
        return sendError(res, 'User not authenticated', 401);
      }

      const assignment = await this.assignmentService.createAuditorAssignment({
        userId,
        eventId,
        contestId,
        categoryId,
        notes,
        assignedBy,
      });

      return sendSuccess(res, assignment, 'Auditor assignment created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  removeAuditorAssignment = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const assignmentId = getRequiredParam(req, 'id');
      await this.assignmentService.removeAuditorAssignment(assignmentId);
      return sendSuccess(res, null, 'Auditor assignment removed successfully');
    } catch (error) {
      return next(error);
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
export const getTallyMasterAssignments = controller.getTallyMasterAssignments;
export const createTallyMasterAssignment = controller.createTallyMasterAssignment;
export const removeTallyMasterAssignment = controller.removeTallyMasterAssignment;
export const getAuditorAssignments = controller.getAuditorAssignments;
export const createAuditorAssignment = controller.createAuditorAssignment;
export const removeAuditorAssignment = controller.removeAuditorAssignment;
