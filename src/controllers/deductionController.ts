/**
 * Deduction Controller
 * Handles HTTP requests for deduction requests and approvals
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { DeductionService } from '../services/DeductionService';
import { sendSuccess, sendCreated } from '../utils/responseHelpers';

export class DeductionController {
  private deductionService: DeductionService;

  constructor() {
    this.deductionService = container.resolve(DeductionService);
  }

  /**
   * Create deduction request
   */
  createDeductionRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { contestantId, categoryId, amount, reason } = req.body;
      const requestedBy = req.user!.id;

      const deduction = await this.deductionService.createDeductionRequest({
        contestantId,
        categoryId,
        amount: parseFloat(amount),
        reason,
        requestedBy
      });

      sendCreated(res, deduction, 'Deduction request created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get pending deductions
   */
  getPendingDeductions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userRole = req.user!.role;
      const userId = req.user!.id;

      const deductions = await this.deductionService.getPendingDeductions(
        userRole,
        userId
      );

      sendSuccess(res, deductions, 'Pending deductions retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Approve deduction
   */
  approveDeduction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { signature, notes } = req.body;
      const approvedBy = req.user!.id;
      const userRole = req.user!.role;

      const result = await this.deductionService.approveDeduction(
        id,
        approvedBy,
        userRole,
        signature,
        notes
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Reject deduction
   */
  rejectDeduction = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const rejectedBy = req.user!.id;

      await this.deductionService.rejectDeduction(id, rejectedBy, reason);

      sendSuccess(res, null, 'Deduction rejected successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get approval status
   */
  getApprovalStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = req.params.id as string;

      const status = await this.deductionService.getApprovalStatus(id);

      sendSuccess(res, status, 'Approval status retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get deduction history
   */
  getDeductionHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = '1', limit = '50', status, categoryId, contestantId } = req.query;

      const result = await this.deductionService.getDeductionHistory(
        {
          status: status as string,
          categoryId: categoryId as string,
          contestantId: contestantId as string
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      sendSuccess(res, result, 'Deduction history retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Create instance and export methods
const controller = new DeductionController();

export const createDeductionRequest = controller.createDeductionRequest;
export const getPendingDeductions = controller.getPendingDeductions;
export const approveDeduction = controller.approveDeduction;
export const rejectDeduction = controller.rejectDeduction;
export const getApprovalStatus = controller.getApprovalStatus;
export const getDeductionHistory = controller.getDeductionHistory;
