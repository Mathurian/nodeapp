/**
 * Data Wipe Service
 * Provides ability to completely wipe all event/contest/user data
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

@injectable()
export class DataWipeService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Wipe all event, contest, contestant, judge, organizer, and board data
   * WARNING: This is irreversible!
   */
  async wipeAllData(userId: string, userRole: string, confirmation: string): Promise<void> {
    // Only admin can wipe all data
    if (userRole !== 'ADMIN') {
      throw this.forbiddenError('Only administrators can wipe all data');
    }

    // Require explicit confirmation
    if (confirmation !== 'WIPE_ALL_DATA') {
      throw this.validationError('Invalid confirmation. Type "WIPE_ALL_DATA" to confirm.');
    }

    // Use transactions to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Delete in order to respect foreign key constraints

      // Note: scoreFile model doesn't exist in schema
      // await tx.scoreFile.deleteMany({});

      // Delete files
      await tx.file.deleteMany({});

      // Delete scores
      await tx.score.deleteMany({});

      // Delete judge comments
      await tx.judgeComment.deleteMany({});

      // Delete certifications
      await tx.certification.deleteMany({});
      await tx.categoryCertification.deleteMany({});
      await tx.contestCertification.deleteMany({});
      await tx.judgeCertification.deleteMany({});
      await tx.judgeContestantCertification.deleteMany({});
      await tx.reviewContestantCertification.deleteMany({});
      await tx.reviewJudgeScoreCertification.deleteMany({});

      // Delete score removal requests
      await tx.judgeScoreRemovalRequest.deleteMany({});
      await tx.judgeUncertificationRequest.deleteMany({});

      // Delete deductions
      await tx.deductionRequest.deleteMany({});
      await tx.deductionApproval.deleteMany({});
      await tx.overallDeduction.deleteMany({});

      // Delete assignments
      await tx.assignment.deleteMany({});
      await tx.roleAssignment.deleteMany({});

      // Delete category contestants and judges
      await tx.categoryContestant.deleteMany({});
      await tx.categoryJudge.deleteMany({});
      await tx.contestContestant.deleteMany({});
      await tx.contestJudge.deleteMany({});

      // Delete criteria
      await tx.criterion.deleteMany({});

      // Delete categories
      await tx.category.deleteMany({});

      // Delete contests
      await tx.contest.deleteMany({});

      // Delete events
      await tx.event.deleteMany({});

      // Delete contestants (but keep users)
      await tx.contestant.deleteMany({});

      // Delete judges (but keep users)
      await tx.judge.deleteMany({});

      // Note: We keep User records but can optionally deactivate non-admin users
      // This is safer than deleting users entirely
      await tx.user.updateMany({
        where: {
          role: {
            not: 'ADMIN'
          }
        },
        data: {
          isActive: false,
          judgeId: null,
          contestantId: null
        }
      });
    });

    this.logInfo('All event/contest/user data wiped', { userId });
  }

  /**
   * Wipe data for a specific event
   */
  async wipeEventData(eventId: string, userId: string, userRole: string): Promise<void> {
    if (!['ADMIN', 'ORGANIZER'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to wipe event data');
    }

    await this.prisma.$transaction(async (tx) => {
      // Get all contests for this event
      const contests = await tx.contest.findMany({
        where: { eventId },
        select: { id: true }
      });

      const contestIds = contests.map(c => c.id);

      // Get all categories for these contests
      const categories = await tx.category.findMany({
        where: { contestId: { in: contestIds } },
        select: { id: true }
      });

      const categoryIds = categories.map(c => c.id);

      // Note: scoreFile model does not exist in schema
      // await tx.scoreFile.deleteMany({
      //   where: {
      //     score: {
      //       categoryId: { in: categoryIds }
      //     }
      //   }
      // });

      // Delete scores
      await tx.score.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      // Delete other related data
      await tx.judgeComment.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.certification.deleteMany({
        where: { eventId }
      });

      await tx.categoryCertification.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.contestCertification.deleteMany({
        where: {
          contestId: { in: contestIds }
        }
      });

      await tx.judgeScoreRemovalRequest.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.deductionRequest.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.assignment.deleteMany({
        where: { eventId }
      });

      await tx.roleAssignment.deleteMany({
        where: { eventId }
      });

      await tx.categoryContestant.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.categoryJudge.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.contestContestant.deleteMany({
        where: {
          contestId: { in: contestIds }
        }
      });

      await tx.contestJudge.deleteMany({
        where: {
          contestId: { in: contestIds }
        }
      });

      await tx.criterion.deleteMany({
        where: {
          categoryId: { in: categoryIds }
        }
      });

      await tx.category.deleteMany({
        where: {
          contestId: { in: contestIds }
        }
      });

      await tx.contest.deleteMany({
        where: { eventId }
      });

      await tx.event.delete({
        where: { id: eventId }
      });
    });

    this.logInfo('Event data wiped', { eventId, userId });
  }
}


