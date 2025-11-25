/**
 * Deduction Repository
 * Handles data access for deduction requests and approvals
 */

import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { DeductionRequest, DeductionApproval, DeductionStatus } from '@prisma/client';
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
  tenantId: string;
}

export interface DeductionFilters {
  status?: string;
  categoryId?: string;
  contestantId?: string;
  tenantId: string;
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
  async findPendingWithRelations(tenantId: string, categoryIds?: string[]): Promise<DeductionWithRelations[]> {
    const whereClause: Record<string, unknown> = {
      status: 'PENDING',
      tenantId
    };

    if (categoryIds && categoryIds.length > 0) {
      whereClause['categoryId'] = { in: categoryIds };
    }

    return this.prisma.deductionRequest.findMany({
      where: whereClause,
      // @ts-expect-error - Relations not defined in Prisma schema but expected by interface
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
  override async findByIdWithRelations(id: string, tenantId: unknown): Promise<DeductionWithRelations | null> {
    const tenantIdStr = tenantId as string;
    return (this.prisma.deductionRequest.findFirst({
      where: {
        id,
        tenantId: tenantIdStr
      },
      // @ts-expect-error - Relations not defined in Prisma schema but expected by interface
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
    }) as unknown) as Promise<DeductionWithRelations | null>;
  }

  /**
   * Create deduction request with relations
   */
  async createDeduction(data: CreateDeductionData): Promise<DeductionWithRelations> {
    return (this.prisma.deductionRequest.create({
      data: {
        contestantId: data.contestantId,
        categoryId: data.categoryId,
        amount: data.amount,
        reason: data.reason,
        requestedById: data.requestedBy,
        status: 'PENDING',
        tenantId: data.tenantId
      },
      // @ts-expect-error - Relations not defined in Prisma schema but expected by interface
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
    }) as unknown) as Promise<DeductionWithRelations>;
  }

  /**
   * Find deductions with filters and pagination
   */
  async findWithFilters(
    filters: DeductionFilters,
    page: number,
    limit: number
  ): Promise<{ deductions: DeductionWithRelations[]; total: number }> {
    const whereClause: Record<string, unknown> = {
      tenantId: filters.tenantId
    };

    if (filters['status']) whereClause['status'] = filters['status'];
    if (filters['categoryId']) whereClause['categoryId'] = filters['categoryId'];
    if (filters['contestantId']) whereClause['contestantId'] = filters['contestantId'];

    const skip = (page - 1) * limit;

    const [deductions, total] = await Promise.all([
      (this.prisma.deductionRequest.findMany({
        where: whereClause,
        skip,
        take: limit,
        // @ts-expect-error - Relations not defined in Prisma schema but expected by interface
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
      }) as unknown) as Promise<DeductionWithRelations[]>,
      this.prisma.deductionRequest.count({ where: whereClause })
    ]);

    return { deductions, total };
  }

  /**
   * Get all approvals for a deduction request
   */
  async getApprovals(requestId: string, tenantId: string): Promise<DeductionApproval[]> {
    return prisma.deductionApproval.findMany({
      where: {
        requestId,
        tenantId
      },
      // include removed - no approver relation in schema
      orderBy: { approvedAt: 'asc' }
    });
  }

  /**
   * Create approval for a deduction request
   */
  async createApproval(
    requestId: string,
    approvedById: string,
    role: string,
    tenantId: string,
    isHeadJudge?: boolean
  ): Promise<DeductionApproval> {
    return prisma.deductionApproval.create({
      data: {
        requestId,
        approvedById,
        role,
        tenantId,
        isHeadJudge: isHeadJudge || false
      }
    });
  }

  /**
   * Check if user already approved
   */
  async hasUserApproved(requestId: string, userId: string, tenantId: string): Promise<boolean> {
    const approval = await prisma.deductionApproval.findFirst({
      where: {
        requestId,
        approvedById: userId,
        tenantId
      }
    });
    return !!approval;
  }

  /**
   * Update deduction status
   */
  async updateStatus(id: string, status: string, _tenantId: string, additionalData?: Record<string, unknown>): Promise<DeductionRequest> {
    return this.prisma.deductionRequest.update({
      where: { id },
      data: {
        status: status as DeductionStatus,
        ...additionalData
      }
    });
  }

  /**
   * Apply deduction to scores by creating/updating OverallDeduction record
   * This deduction will be applied during score calculation
   */
  async applyDeductionToScores(
    contestantId: string,
    categoryId: string,
    amount: number,
    reason: string
  ): Promise<number> {
    try {
      // Get tenantId from category
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { tenantId: true },
      });

      if (!category) {
        throw new Error(`Category ${categoryId} not found`);
      }

      // Create or update OverallDeduction record
      // This will be used during score calculation to adjust final scores
      await prisma.overallDeduction.upsert({
        where: {
          tenantId_categoryId_contestantId: {
            tenantId: category.tenantId,
            categoryId,
            contestantId,
          },
        },
        create: {
          tenantId: category.tenantId,
          categoryId,
          contestantId,
          deduction: amount,
          reason,
        },
        update: {
          deduction: amount,
          reason,
          updatedAt: new Date(),
        },
      });

      // Return the number of affected scores (all scores for this contestant in this category)
      const affectedScoresCount = await prisma.score.count({
        where: {
          categoryId,
          contestantId,
        },
      });

      return affectedScoresCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to apply deduction: ${errorMessage}`);
    }
  }
}
