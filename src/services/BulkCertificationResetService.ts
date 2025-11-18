/**
 * Bulk Certification Reset Service
 * Resets the entire certification process in bulk
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

export interface BulkCertificationResetDTO {
  eventId?: string;
  contestId?: string;
  categoryId?: string;
  resetAll?: boolean; // If true, reset all certifications system-wide
}

@injectable()
export class BulkCertificationResetService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Reset certification process in bulk
   */
  async resetCertifications(
    dto: BulkCertificationResetDTO,
    userId: string,
    userRole: string
  ): Promise<{ resetCount: number; message: string }> {
    // Only admin, organizer, or board can reset certifications
    if (!['ADMIN', 'ORGANIZER', 'BOARD'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to reset certifications');
    }

    let resetCount = 0;

    if (dto.resetAll) {
      // Reset all certifications system-wide
      await this.prisma.$transaction(async (tx) => {
        // Reset category certifications
        resetCount += (await tx.categoryCertification.deleteMany({})).count;

        // Reset contest certifications
        resetCount += (await tx.contestCertification.deleteMany({})).count;

        // Reset certifications
        resetCount += (await tx.certification.deleteMany({})).count;

        // Reset judge certifications
        resetCount += (await tx.judgeCertification.deleteMany({})).count;

        // Reset judge contestant certifications
        resetCount += (await tx.judgeContestantCertification.deleteMany({})).count;

        // Reset review certifications
        resetCount += (await tx.reviewContestantCertification.deleteMany({})).count;
        resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({})).count;

        // Reset score certifications
        await tx.score.updateMany({
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null
          }
        });

        // Reset category totals certified
        await tx.category.updateMany({
          data: {
            totalsCertified: false
          }
        });
      });

      this.logInfo('All certifications reset', { userId });
      return {
        resetCount,
        message: `Reset ${resetCount} certification records system-wide`
      };
    } else if (dto.categoryId) {
      // Reset certifications for a specific category
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId }
      });

      if (!category) {
        throw this.createNotFoundError('Category not found');
      }

      await this.prisma.$transaction(async (tx) => {
        resetCount += (await tx.categoryCertification.deleteMany({
          where: { categoryId: dto.categoryId }
        })).count;

        resetCount += (await tx.judgeCertification.deleteMany({
          where: { categoryId: dto.categoryId }
        })).count;

        resetCount += (await tx.judgeContestantCertification.deleteMany({
          where: { categoryId: dto.categoryId }
        })).count;

        resetCount += (await tx.reviewContestantCertification.deleteMany({
          where: { categoryId: dto.categoryId }
        })).count;

        resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
          where: { categoryId: dto.categoryId }
        })).count;

        await tx.certification.updateMany({
          where: { categoryId: dto.categoryId },
          data: {
            status: 'PENDING',
            currentStep: 1,
            judgeCertified: false,
            tallyCertified: false,
            auditorCertified: false,
            boardApproved: false,
            certifiedAt: null,
            certifiedBy: null,
            rejectionReason: null,
            comments: null
          }
        });

        await tx.score.updateMany({
          where: { categoryId: dto.categoryId },
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null
          }
        });

        await tx.category.update({
          where: { id: dto.categoryId },
          data: {
            totalsCertified: false
          }
        });
      });

      this.logInfo('Category certifications reset', { categoryId: dto.categoryId, userId });
      return {
        resetCount,
        message: `Reset ${resetCount} certification records for category`
      };
    } else if (dto.contestId) {
      // Reset certifications for a specific contest
      const contest: any = await this.prisma.contest.findUnique({
        where: { id: dto.contestId },
        include: {
          categories: {
            select: { id: true }
          }
        } as any
      } as any);

      if (!contest) {
        throw this.createNotFoundError('Contest not found');
      }

      const categoryIds = contest.categories.map(c => c.id);

      await this.prisma.$transaction(async (tx) => {
        resetCount += (await tx.contestCertification.deleteMany({
          where: { contestId: dto.contestId }
        })).count;

        resetCount += (await tx.categoryCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.judgeCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.judgeContestantCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.reviewContestantCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        await tx.certification.updateMany({
          where: { contestId: dto.contestId },
          data: {
            status: 'PENDING',
            currentStep: 1,
            judgeCertified: false,
            tallyCertified: false,
            auditorCertified: false,
            boardApproved: false,
            certifiedAt: null,
            certifiedBy: null,
            rejectionReason: null,
            comments: null
          }
        });

        await tx.score.updateMany({
          where: {
            categoryId: { in: categoryIds }
          },
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null
          }
        });

        await tx.category.updateMany({
          where: {
            contestId: dto.contestId
          },
          data: {
            totalsCertified: false
          }
        });
      });

      this.logInfo('Contest certifications reset', { contestId: dto.contestId, userId });
      return {
        resetCount,
        message: `Reset ${resetCount} certification records for contest`
      };
    } else if (dto.eventId) {
      // Reset certifications for a specific event
      const event: any = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
        include: {
          contests: {
            include: {
              categories: {
                select: { id: true }
              }
            }
          }
        } as any
      } as any);

      if (!event) {
        throw this.createNotFoundError('Event not found');
      }

      const contestIds = event.contests.map(c => c.id);
      const categoryIds = event.contests.flatMap(c => c.categories.map(cat => cat.id));

      await this.prisma.$transaction(async (tx) => {
        resetCount += (await tx.contestCertification.deleteMany({
          where: {
            contestId: { in: contestIds }
          }
        })).count;

        resetCount += (await tx.categoryCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.judgeCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.judgeContestantCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.reviewContestantCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        resetCount += (await tx.reviewJudgeScoreCertification.deleteMany({
          where: {
            categoryId: { in: categoryIds }
          }
        })).count;

        await tx.certification.updateMany({
          where: { eventId: dto.eventId },
          data: {
            status: 'PENDING',
            currentStep: 1,
            judgeCertified: false,
            tallyCertified: false,
            auditorCertified: false,
            boardApproved: false,
            certifiedAt: null,
            certifiedBy: null,
            rejectionReason: null,
            comments: null
          }
        });

        await tx.score.updateMany({
          where: {
            categoryId: { in: categoryIds }
          },
          data: {
            isCertified: false,
            certifiedAt: null,
            certifiedBy: null
          }
        });

        await tx.category.updateMany({
          where: {
            contestId: { in: contestIds }
          },
          data: {
            totalsCertified: false
          }
        });
      });

      this.logInfo('Event certifications reset', { eventId: dto.eventId, userId });
      return {
        resetCount,
        message: `Reset ${resetCount} certification records for event`
      };
    } else {
      throw this.validationError('Either eventId, contestId, categoryId, or resetAll must be provided');
    }
  }
}


