/**
 * Deduction Repository
 * Handles data access for deduction requests and approvals
 */

import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { DeductionRequest, DeductionApproval } from '@prisma/client';
import { prisma } from '../config/database';

export interface DeductionWithRelations extends DeductionRequest {
  contestant: {
    id: string;
    name: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
  };
  requestedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  approvals: Array<
    DeductionApproval & {
      approver: {
        id: string;
        name: string;
        email: string;
        role: string;
      };
    }
  >;
}

export interface CreateDeductionData {
  contestantId: string;
  categoryId: string;
  amount: number;
  reason: string;
  requestedBy: string;
}

export interface DeductionFilters {
  status?: string;
  categoryId?: string;
  contestantId?: string;
}

@injectable()
export class DeductionRepository extends BaseRepository<DeductionRequest> {
  constructor() {
    super(prisma);
  }

  protected override getModelName(): string {
    return 'deductionRequest';
  }

  /**
   * Find all pending deductions with relations
   */
  async findPendingWithRelations(categoryIds?: string[]): Promise<DeductionWithRelations[]> {
    const whereClause: any = { status: 'PENDING' };

    if (categoryIds && categoryIds.length > 0) {
      whereClause.categoryId = { in: categoryIds };
    }

    return this.getModel().findMany({
      where: whereClause,
      include: {
        contestant: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true }
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find deduction by ID with all relations
   */
  async findByIdWithRelations(id: string): Promise<DeductionWithRelations | null> {
    return this.getModel().findUnique({
      where: { id },
      include: {
        contestant: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true }
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  /**
   * Create deduction request with relations
   */
  async createDeduction(data: CreateDeductionData): Promise<DeductionWithRelations> {
    return this.getModel().create({
      data: {
        contestantId: data.contestantId,
        categoryId: data.categoryId,
        amount: data.amount,
        reason: data.reason,
        requestedById: data.requestedBy,
        status: 'PENDING'
      },
      include: {
        contestant: {
          select: { id: true, name: true, email: true }
        },
        category: {
          select: { id: true, name: true }
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true }
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      }
    });
  }

  /**
   * Find deductions with filters and pagination
   */
  async findWithFilters(
    filters: DeductionFilters,
    page: number,
    limit: number
  ): Promise<{ deductions: DeductionWithRelations[]; total: number }> {
    const whereClause: any = {};

    if (filters.status) whereClause.status = filters.status;
    if (filters.categoryId) whereClause.categoryId = filters.categoryId;
    if (filters.contestantId) whereClause.contestantId = filters.contestantId;

    const skip = (page - 1) * limit;

    const [deductions, total] = await Promise.all([
      this.getModel().findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          contestant: {
            select: { id: true, name: true, email: true }
          },
          category: {
            select: { id: true, name: true }
          },
          requestedBy: {
            select: { id: true, name: true, email: true, role: true }
          },
          approvals: {
            include: {
              approvedBy: {
                select: { id: true, name: true, email: true, role: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.getModel().count({ where: whereClause })
    ]);

    return { deductions, total };
  }

  /**
   * Get all approvals for a deduction request
   */
  async getApprovals(requestId: string): Promise<DeductionApproval[]> {
    return prisma.deductionApproval.findMany({
      where: { requestId },
      // include removed - no approver relation in schema
      orderBy: { approvedAt: 'asc' }
    }) as any;
  }

  /**
   * Create approval for a deduction request
   */
  async createApproval(
    requestId: string,
    approvedById: string,
    role: string,
    isHeadJudge?: boolean
  ): Promise<DeductionApproval> {
    return prisma.deductionApproval.create({
      data: {
        requestId,
        approvedById,
        role,
        isHeadJudge: isHeadJudge || false
      }
      // include removed - no approver relation in schema
    }) as any;
  }

  /**
   * Check if user already approved
   */
  async hasUserApproved(requestId: string, userId: string): Promise<boolean> {
    const approval = await prisma.deductionApproval.findFirst({
      where: {
        requestId,
        approvedById: userId
      }
    });
    return !!approval;
  }

  /**
   * Update deduction status
   */
  async updateStatus(id: string, status: string, additionalData?: any): Promise<DeductionRequest> {
    return this.getModel().update({
      where: { id },
      data: {
        status,
        ...additionalData
      }
    });
  }

  /**
   * Note: Apply deduction to scores - currently not implemented as Score model
   * doesn't have deduction fields. This would need schema migration first.
   */
  async applyDeductionToScores(
    _contestantId: string,
    _categoryId: string,
    _amount: number,
    _reason: string
  ): Promise<number> {
    // TODO: Add deduction fields to Score model in schema first
    // For now, just mark the deduction as approved - actual score adjustment
    // will need to be handled separately
    return 0;
  }
}
