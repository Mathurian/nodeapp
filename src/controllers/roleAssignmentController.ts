import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { RoleAssignmentService } from '../services/RoleAssignmentService';
import { successResponse, sendSuccess } from '../utils/responseHelpers';

export class RoleAssignmentController {
  private roleAssignmentService: RoleAssignmentService;

  constructor() {
    this.roleAssignmentService = container.resolve(RoleAssignmentService);
  }

  getAllRoleAssignments = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, contestId, eventId, categoryId } = req.query;
      const assignments = await this.roleAssignmentService.getAll({
        role: role as string | undefined,
        contestId: contestId as string | undefined,
        eventId: eventId as string | undefined,
        categoryId: categoryId as string | undefined
      });
      return sendSuccess(res, assignments);
    } catch (error) {
      return next(error);
    }
  };

  createRoleAssignment = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, role, contestId, eventId, categoryId, notes } = req.body;
      const assignment = await this.roleAssignmentService.create({
        userId,
        role,
        contestId,
        eventId,
        categoryId,
        notes,
        assignedBy: req.user!.id
      });
      return sendSuccess(res, assignment, 'Role assignment created', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateRoleAssignment = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes, isActive } = req.body;
      const assignment = await this.roleAssignmentService.update(id, { notes, isActive });
      return sendSuccess(res, assignment, 'Role assignment updated');
    } catch (error) {
      return next(error);
    }
  };

  deleteRoleAssignment = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.roleAssignmentService.delete(id);
      return sendSuccess(res, null, 'Role assignment deleted');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new RoleAssignmentController();
export const getAllRoleAssignments = controller.getAllRoleAssignments;
export const createRoleAssignment = controller.createRoleAssignment;
export const updateRoleAssignment = controller.updateRoleAssignment;
export const deleteRoleAssignment = controller.deleteRoleAssignment;
