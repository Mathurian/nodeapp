/**
 * Board Certification Service
 * Implements Stage 4 of the multi-stage certification workflow
 * Board members review and approve after all Auditors have signed
 */

import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { PrismaClient, Prisma, CategoryCertification } from '@prisma/client';

// Type definitions
type CategoryWithCertifications = Prisma.CategoryGetPayload<{
  include: {
    categoryCertifications: true;
    contest: {
      select: {
        id: true;
        name: true;
        event: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

type AuditorAssignment = Prisma.AuditorAssignmentGetPayload<{
  select: {
    id: true;
    auditorId: true;
    categoryId: true;
  };
}>;

interface BoardCertificationStatus {
  canCertify: boolean;
  reason?: string;
  auditorCertifications: {
    total: number;
    completed: number;
    pending: number;
  };
  category: {
    id: string;
    name: string;
    boardApproved: boolean;
  };
}

@injectable()
export class BoardCertificationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Get board certification status for a category
   * Checks if all Auditors have signed and Board can proceed with final approval
   */
  async getBoardCertificationStatus(
    categoryId: string,
    tenantId: string
  ): Promise<BoardCertificationStatus> {
    try {
      // Get category with certifications
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          categoryCertifications: true,
          contest: {
            select: {
              id: true,
              name: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }) as CategoryWithCertifications | null;

      if (!category) {
        throw this.notFoundError('Category', categoryId);
      }

      // Get all assigned Auditors for this category
      const assignedAuditors = await this.prisma.auditorAssignment.findMany({
        where: {
          categoryId,
          tenantId,
        },
        select: {
          id: true,
          auditorId: true,
          categoryId: true,
        },
      }) as AuditorAssignment[];

      // Get all Auditor certifications for this category
      const auditorCertifications = category.categoryCertifications.filter(
        (cert) => cert.role === 'AUDITOR'
      );

      const totalAuditors = assignedAuditors.length;
      const completedAuditors = auditorCertifications.length;
      const pendingAuditors = totalAuditors - completedAuditors;

      // Check if Board has already approved
      const boardCertification = category.categoryCertifications.find(
        (cert) => cert.role === 'BOARD'
      );

      let canCertify = false;
      let reason: string | undefined;

      if (boardCertification) {
        reason = 'Board has already approved this category';
      } else if (totalAuditors === 0) {
        reason = 'No Auditors assigned to this category';
      } else if (completedAuditors < totalAuditors) {
        reason = `Not all Auditors have signed. ${pendingAuditors} pending out of ${totalAuditors}.`;
      } else {
        canCertify = true;
      }

      return {
        canCertify,
        reason,
        auditorCertifications: {
          total: totalAuditors,
          completed: completedAuditors,
          pending: pendingAuditors,
        },
        category: {
          id: category.id,
          name: category.name,
          boardApproved: category.boardApproved,
        },
      };
    } catch (error) {
      this.handleError(error, { method: 'getBoardCertificationStatus', categoryId });
    }
  }

  /**
   * Submit Board certification (Stage 4 - Final Approval)
   * Creates a BOARD CategoryCertification record and marks category as boardApproved
   */
  async submitBoardCertification(
    categoryId: string,
    userId: string,
    tenantId: string,
    signatureName?: string,
    comments?: string
  ): Promise<CategoryCertification> {
    try {
      // Get status to verify all prerequisites are met
      const status = await this.getBoardCertificationStatusInternal(categoryId, tenantId);

      if (!status.canCertify) {
        throw this.badRequestError(
          status.reason || 'Cannot certify. Not all required certifications are complete.'
        );
      }

      // Check if Board has already certified
      const existingCert = await this.prisma.categoryCertification.findUnique({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId,
            role: 'BOARD',
          },
        },
      });

      if (existingCert) {
        throw this.conflictError('Board has already certified this category');
      }

      // Create Board certification and update category in a transaction
      const [certification] = await this.prisma.$transaction([
        // Create Board certification record
        this.prisma.categoryCertification.create({
          data: {
            categoryId,
            role: 'BOARD',
            userId,
            tenantId,
            signatureName,
            comments,
            certifiedAt: new Date(),
          },
        }),

        // Mark category as board approved
        this.prisma.category.update({
          where: { id: categoryId },
          data: {
            boardApproved: true,
            approvedAt: new Date(),
            approvedBy: userId,
          },
        }),
      ]);

      this.logInfo('Board certification submitted successfully', {
        categoryId,
        userId,
        certificationId: certification.id,
      });

      return certification;
    } catch (error) {
      this.handleError(error, { method: 'submitBoardCertification', categoryId, userId });
    }
  }

  /**
   * Get all categories pending Board approval
   * Returns categories where all Auditors have signed but Board has not yet approved
   */
  async getPendingBoardApprovals(tenantId: string): Promise<CategoryWithCertifications[]> {
    try {
      // Get all categories with certifications
      const categories = await this.prisma.category.findMany({
        where: {
          tenantId,
          boardApproved: false,
          deletedAt: null,
        },
        include: {
          categoryCertifications: true,
          contest: {
            select: {
              id: true,
              name: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }) as CategoryWithCertifications[];

      // Filter to only include categories ready for Board approval
      const pendingCategories: CategoryWithCertifications[] = [];

      for (const category of categories) {
        const status = await this.getBoardCertificationStatusInternal(category.id, tenantId);
        if (status.canCertify) {
          pendingCategories.push(category);
        }
      }

      return pendingCategories;
    } catch (error) {
      this.handleError(error, { method: 'getPendingBoardApprovals', tenantId });
    }
  }

  /**
   * Get all categories that have been Board approved
   */
  async getApprovedCategories(tenantId: string): Promise<CategoryWithCertifications[]> {
    try {
      const categories = await this.prisma.category.findMany({
        where: {
          tenantId,
          boardApproved: true,
          deletedAt: null,
        },
        include: {
          categoryCertifications: true,
          contest: {
            select: {
              id: true,
              name: true,
              event: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          approvedAt: 'desc',
        },
      }) as CategoryWithCertifications[];

      return categories;
    } catch (error) {
      this.handleError(error, { method: 'getApprovedCategories', tenantId });
    }
  }

  /**
   * Revoke Board certification (admin only - for corrections)
   * Removes Board certification and resets boardApproved status
   */
  async revokeBoardCertification(
    categoryId: string,
    userId: string,
    tenantId: string,
    reason: string
  ): Promise<void> {
    try {
      // Get existing Board certification
      const certification = await this.prisma.categoryCertification.findUnique({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId,
            role: 'BOARD',
          },
        },
      });

      if (!certification) {
        throw this.notFoundError('Board certification', categoryId);
      }

      // Delete certification and reset category status in a transaction
      await this.prisma.$transaction([
        this.prisma.categoryCertification.delete({
          where: { id: certification.id },
        }),
        this.prisma.category.update({
          where: { id: categoryId },
          data: {
            boardApproved: false,
            approvedAt: null,
            approvedBy: null,
          },
        }),
      ]);

      this.logWarn('Board certification revoked', {
        categoryId,
        revokedBy: userId,
        reason,
      });
    } catch (error) {
      this.handleError(error, { method: 'revokeBoardCertification', categoryId });
    }
  }

  /**
   * Internal helper to get certification status without exposing full details
   */
  private async getBoardCertificationStatusInternal(
    categoryId: string,
    tenantId: string
  ): Promise<BoardCertificationStatus> {
    return this.getBoardCertificationStatus(categoryId, tenantId);
  }
}
