/**
 * Data Wipe Service
 * Provides explicit, high-risk data wiping operations with strict safeguards.
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

export interface DataWipeSummary {
  scope: 'GLOBAL' | 'EVENT';
  eventId?: string;
  tenantId?: string;
  counts: Record<string, number>;
  dryRun: boolean;
}

@injectable()
export class DataWipeService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private async purgeScoreGovernance(
    executor: { $executeRawUnsafe: (...args: any[]) => Promise<unknown> },
    scope?: { tenantId?: string; eventId?: string; categoryIds?: string[] }
  ): Promise<void> {
    try {
      if (!scope?.tenantId) {
        await executor.$executeRawUnsafe('DELETE FROM score_governance_approvals');
        await executor.$executeRawUnsafe('DELETE FROM score_governance_requests');
        return;
      }

      const categoryIds = scope.categoryIds || [];
      await executor.$executeRawUnsafe(
        `
        DELETE FROM score_governance_approvals
        WHERE "requestId" IN (
          SELECT id
          FROM score_governance_requests
          WHERE "tenantId" = $1
            AND ("eventId" = $2 OR "categoryId" = ANY($3::text[]))
        )
        `,
        scope.tenantId,
        scope.eventId || '',
        categoryIds
      );

      await executor.$executeRawUnsafe(
        `
        DELETE FROM score_governance_requests
        WHERE "tenantId" = $1
          AND ("eventId" = $2 OR "categoryId" = ANY($3::text[]))
        `,
        scope.tenantId,
        scope.eventId || '',
        categoryIds
      );
    } catch (error: any) {
      // Older environments may not include governance tables yet.
      if (error?.code !== '42P01') {
        throw error;
      }
    }
  }

  private async getGlobalWipeSummary(): Promise<Record<string, number>> {
    const [
      events,
      contests,
      categories,
      scores,
      files,
      assignments,
      deductions,
    ] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.contest.count(),
      this.prisma.category.count(),
      this.prisma.score.count(),
      this.prisma.file.count(),
      this.prisma.assignment.count(),
      this.prisma.deductionRequest.count(),
    ]);

    return {
      events,
      contests,
      categories,
      scores,
      files,
      assignments,
      deductionRequests: deductions,
    };
  }

  private async getEventWipeSummary(eventId: string, tenantId: string): Promise<Record<string, number>> {
    const contests = await this.prisma.contest.findMany({
      where: { eventId, tenantId },
      select: { id: true }
    });
    const contestIds = contests.map((c) => c.id);

    const categories = await this.prisma.category.findMany({
      where: { contestId: { in: contestIds }, tenantId },
      select: { id: true }
    });
    const categoryIds = categories.map((c) => c.id);

    const [
      scoreCount,
      commentCount,
      certCount,
      assignmentCount,
      deductionCount,
    ] = await Promise.all([
      this.prisma.score.count({ where: { tenantId, categoryId: { in: categoryIds } } }),
      this.prisma.judgeComment.count({ where: { tenantId, categoryId: { in: categoryIds } } }),
      this.prisma.categoryCertification.count({ where: { tenantId, categoryId: { in: categoryIds } } }),
      this.prisma.assignment.count({ where: { tenantId, eventId } }),
      this.prisma.deductionRequest.count({ where: { tenantId, categoryId: { in: categoryIds } } }),
    ]);

    return {
      contests: contestIds.length,
      categories: categoryIds.length,
      scores: scoreCount,
      judgeComments: commentCount,
      categoryCertifications: certCount,
      assignments: assignmentCount,
      deductionRequests: deductionCount,
      events: 1,
    };
  }

  /**
   * Wipe all event/contest/user data.
   * STRICTLY SUPER_ADMIN only. Requires dual confirmation.
   */
  async wipeAllData(
    userId: string,
    userRole: string,
    confirmation: string,
    secondaryConfirmation: string,
    dryRun: boolean
  ): Promise<DataWipeSummary> {
    if (userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only SUPER_ADMIN can wipe all data');
    }

    if (confirmation !== 'WIPE_ALL_DATA') {
      throw this.validationError('Invalid confirmation. Type "WIPE_ALL_DATA" to confirm.');
    }

    if (secondaryConfirmation !== 'I_UNDERSTAND_THIS_IS_IRREVERSIBLE') {
      throw this.validationError('Invalid secondary confirmation for global wipe.');
    }

    const counts = await this.getGlobalWipeSummary();
    if (dryRun) {
      return {
        scope: 'GLOBAL',
        counts,
        dryRun: true,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({});
      await tx.score.deleteMany({});
      await tx.judgeComment.deleteMany({});
      await tx.certification.deleteMany({});
      await tx.categoryCertification.deleteMany({});
      await tx.contestCertification.deleteMany({});
      await tx.judgeCertification.deleteMany({});
      await tx.judgeContestantCertification.deleteMany({});
      await tx.reviewContestantCertification.deleteMany({});
      await tx.reviewJudgeScoreCertification.deleteMany({});
      await tx.judgeScoreRemovalRequest.deleteMany({});
      await tx.judgeUncertificationRequest.deleteMany({});
      await this.purgeScoreGovernance(tx);
      await tx.deductionApproval.deleteMany({});
      await tx.deductionRequest.deleteMany({});
      await tx.overallDeduction.deleteMany({});
      await tx.assignment.deleteMany({});
      await tx.roleAssignment.deleteMany({});
      await tx.categoryContestant.deleteMany({});
      await tx.categoryJudge.deleteMany({});
      await tx.contestContestant.deleteMany({});
      await tx.contestJudge.deleteMany({});
      await tx.criterion.deleteMany({});
      await tx.category.deleteMany({});
      await tx.contest.deleteMany({});
      await tx.event.deleteMany({});
      await tx.contestant.deleteMany({});
      await tx.judge.deleteMany({});

      // Preserve admin/super-admin identity, invalidate others.
      await tx.user.updateMany({
        where: {
          role: {
            notIn: ['SUPER_ADMIN', 'ADMIN']
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
    return {
      scope: 'GLOBAL',
      counts,
      dryRun: false,
    };
  }

  /**
   * Wipe data for a specific event with tenant ownership enforcement.
   */
  async wipeEventData(
    eventId: string,
    userId: string,
    userRole: string,
    tenantId: string | undefined,
    isSuperAdmin: boolean,
    dryRun: boolean
  ): Promise<DataWipeSummary> {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to wipe event data');
    }
    if (!isSuperAdmin && !tenantId) {
      throw this.forbiddenError('Tenant context is required for event wipe');
    }

    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(isSuperAdmin ? {} : { tenantId })
      },
      select: { id: true, tenantId: true }
    });

    if (!event) {
      throw this.notFoundError('Event', eventId);
    }

    const targetTenantId = event.tenantId;
    const counts = await this.getEventWipeSummary(eventId, targetTenantId);
    if (dryRun) {
      return {
        scope: 'EVENT',
        eventId,
        tenantId: targetTenantId,
        counts,
        dryRun: true,
      };
    }

    await this.prisma.$transaction(async (tx) => {
      const contests = await tx.contest.findMany({
        where: { eventId, tenantId: targetTenantId },
        select: { id: true }
      });
      const contestIds = contests.map((c) => c.id);

      const categories = await tx.category.findMany({
        where: { contestId: { in: contestIds }, tenantId: targetTenantId },
        select: { id: true }
      });
      const categoryIds = categories.map((c) => c.id);

      await tx.score.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.judgeComment.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.certification.deleteMany({ where: { tenantId: targetTenantId, eventId } });
      await tx.categoryCertification.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.contestCertification.deleteMany({ where: { tenantId: targetTenantId, contestId: { in: contestIds } } });
      await tx.judgeScoreRemovalRequest.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await this.purgeScoreGovernance(tx, {
        tenantId: targetTenantId,
        eventId,
        categoryIds,
      });
      await tx.deductionRequest.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.assignment.deleteMany({ where: { tenantId: targetTenantId, eventId } });
      await tx.roleAssignment.deleteMany({ where: { tenantId: targetTenantId, eventId } });
      await tx.categoryContestant.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.categoryJudge.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.contestContestant.deleteMany({ where: { tenantId: targetTenantId, contestId: { in: contestIds } } });
      await tx.contestJudge.deleteMany({ where: { tenantId: targetTenantId, contestId: { in: contestIds } } });
      await tx.criterion.deleteMany({ where: { tenantId: targetTenantId, categoryId: { in: categoryIds } } });
      await tx.category.deleteMany({ where: { tenantId: targetTenantId, contestId: { in: contestIds } } });
      await tx.contest.deleteMany({ where: { tenantId: targetTenantId, eventId } });
      await tx.event.deleteMany({ where: { id: eventId, tenantId: targetTenantId } });
    });

    this.logInfo('Event data wiped', { eventId, userId, tenantId: targetTenantId });
    return {
      scope: 'EVENT',
      eventId,
      tenantId: targetTenantId,
      counts,
      dryRun: false,
    };
  }
}
