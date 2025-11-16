/**
 * Deduction Service
 * Business logic for deduction requests and approvals
 */

import { injectable, inject } from 'tsyringe';
import { BaseService, NotFoundError, ValidationError } from './BaseService';
import {
  DeductionRepository,
  CreateDeductionData,
  DeductionFilters,
  DeductionWithRelations
} from '../repositories/DeductionRepository';
import { prisma } from '../config/database';

interface ApprovalStatus {
  hasHeadJudgeApproval: boolean;
  hasTallyMasterApproval: boolean;
  hasAuditorApproval: boolean;
  hasBoardApproval: boolean;
  isFullyApproved: boolean;
  approvalCount: number;
  requiredApprovals: number;
}

@injectable()
export class DeductionService extends BaseService {
  constructor(
    @inject('DeductionRepository') private deductionRepo: DeductionRepository
  ) {
    super();
  }

  /**
   * Create a new deduction request
   */
  async createDeductionRequest(
    data: CreateDeductionData
  ): Promise<DeductionWithRelations> {
    this.validateRequired(data, [
      'contestantId',
      'categoryId',
      'amount',
      'reason',
      'requestedBy'
    ]);

    if (data.amount <= 0) {
      throw new ValidationError('Deduction amount must be greater than 0');
    }

    // Verify contestant and category exist
    const [contestant, category] = await Promise.all([
      prisma.contestant.findUnique({ where: { id: data.contestantId } }),
      prisma.category.findUnique({ where: { id: data.categoryId } })
    ]);

    if (!contestant) {
      throw new NotFoundError('Contestant', data.contestantId);
    }

    if (!category) {
      throw new NotFoundError('Category', data.categoryId);
    }

    return await this.deductionRepo.createDeduction(data);
  }

  /**
   * Get pending deductions for a user's role
   */
  async getPendingDeductions(
    userRole: string,
    userId: string
  ): Promise<Array<DeductionWithRelations & { approvalStatus: ApprovalStatus }>> {
    let categoryIds: string[] | undefined;

    // Role-based filtering
    if (userRole === 'JUDGE') {
      // Get categories assigned to this judge through CategoryJudge
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          judge: {
            include: {
              categoryJudges: {
                select: { categoryId: true }
              }
            }
          }
        }
      });

      if (user?.judge) {
        categoryIds = user.judge.categoryJudges.map((cj: any) => cj.categoryId);
      } else {
        categoryIds = [];
      }
    }

    const deductions = await this.deductionRepo.findPendingWithRelations(categoryIds);

    // Add approval status to each deduction
    return deductions.map(deduction => ({
      ...deduction,
      approvalStatus: this.calculateApprovalStatus(deduction.approvals, userId)
    }));
  }

  /**
   * Approve a deduction request
   */
  async approveDeduction(
    id: string,
    approvedBy: string,
    userRole: string,
    signature: string,
    notes?: string
  ): Promise<{
    approval: any;
    isFullyApproved: boolean;
    message: string;
  }> {
    this.validateRequired({ id, approvedBy, signature }, [
      'id',
      'approvedBy',
      'signature'
    ]);

    // Find deduction request
    const deductionRequest = await this.deductionRepo.findByIdWithRelations(id);

    if (!deductionRequest) {
      throw new NotFoundError('Deduction request', id);
    }

    if (deductionRequest.status !== 'PENDING') {
      throw new ValidationError('Deduction request is not pending');
    }

    // Check if user has already approved
    const hasApproved = await this.deductionRepo.hasUserApproved(id, approvedBy);
    if (hasApproved) {
      throw new ValidationError('You have already approved this deduction');
    }

    // Check if user is a head judge
    let isHeadJudge = false;
    if (userRole === 'JUDGE') {
      const user = await prisma.user.findUnique({
        where: { id: approvedBy },
        include: { judge: true }
      });
      if (user?.judge) {
        isHeadJudge = user.judge.isHeadJudge;
      }
    }

    // Create approval
    const approval = await this.deductionRepo.createApproval(
      id,
      approvedBy,
      userRole,
      isHeadJudge
    );

    // Check if all required approvals are met
    const allApprovals = await this.deductionRepo.getApprovals(id);
    const approvalStatus = this.calculateApprovalStatus(allApprovals, approvedBy);

    if (approvalStatus.isFullyApproved) {
      // All approvals received, apply deduction
      await this.deductionRepo.updateStatus(id, 'APPROVED');

      await this.deductionRepo.applyDeductionToScores(
        deductionRequest.contestantId,
        deductionRequest.categoryId,
        deductionRequest.amount,
        deductionRequest.reason
      );
    }

    return {
      approval,
      isFullyApproved: approvalStatus.isFullyApproved,
      message: 'Deduction approved successfully'
    };
  }

  /**
   * Reject a deduction request
   */
  async rejectDeduction(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<void> {
    this.validateRequired({ id, reason }, ['id', 'reason']);

    const deductionRequest = await this.deductionRepo.findById(id);

    if (!deductionRequest) {
      throw new NotFoundError('Deduction request', id);
    }

    if (deductionRequest.status !== 'PENDING') {
      throw new ValidationError('Deduction request is not pending');
    }

    await this.deductionRepo.updateStatus(id, 'REJECTED', {
      rejectionReason: reason,
      rejectedBy,
      rejectedAt: new Date()
    });
  }

  /**
   * Get approval status for a deduction
   */
  async getApprovalStatus(
    id: string
  ): Promise<DeductionWithRelations & { approvalStatus: ApprovalStatus }> {
    const deductionRequest = await this.deductionRepo.findByIdWithRelations(id);

    if (!deductionRequest) {
      throw new NotFoundError('Deduction request', id);
    }

    const approvalStatus = this.calculateApprovalStatus(
      deductionRequest.approvals,
      ''
    );

    return {
      ...deductionRequest,
      approvalStatus
    };
  }

  /**
   * Get deduction history with filters
   */
  async getDeductionHistory(
    filters: DeductionFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    deductions: DeductionWithRelations[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { deductions, total } = await this.deductionRepo.findWithFilters(
      filters,
      page,
      limit
    );

    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    return {
      deductions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Calculate approval status
   */
  private calculateApprovalStatus(
    approvals: any[],
    _currentUserId: string
  ): ApprovalStatus {
    const hasHeadJudgeApproval = approvals.some(a => a.isHeadJudge);
    const hasTallyMasterApproval = approvals.some(a => a.role === 'TALLY_MASTER');
    const hasAuditorApproval = approvals.some(a => a.role === 'AUDITOR');
    const hasBoardApproval = approvals.some(a =>
      ['BOARD', 'ORGANIZER', 'ADMIN'].includes(a.role)
    );

    const isFullyApproved =
      hasHeadJudgeApproval &&
      hasTallyMasterApproval &&
      hasAuditorApproval &&
      hasBoardApproval;

    return {
      hasHeadJudgeApproval,
      hasTallyMasterApproval,
      hasAuditorApproval,
      hasBoardApproval,
      isFullyApproved,
      approvalCount: approvals.length,
      requiredApprovals: 4
    };
  }
}
