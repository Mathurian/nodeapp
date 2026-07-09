/**
 * Data Wipe Service
 * Provides explicit, high-risk data wiping operations with strict safeguards.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { isDefaultTenant } from '../utils/tenantSegregationPolicy';

export interface DataWipeSummary {
  scope: 'GLOBAL' | 'EVENT' | 'TENANT';
  eventId?: string;
  tenantId?: string;
  counts: Record<string, number>;
  dryRun: boolean;
}

type TenantWipeScope = 'ALL' | 'EVENTS' | 'USERS' | 'SCORES';

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
      if (!scope.eventId && categoryIds.length === 0) {
        await executor.$executeRawUnsafe(
          `
          DELETE FROM score_governance_approvals
          WHERE "requestId" IN (
            SELECT id
            FROM score_governance_requests
            WHERE "tenantId" = $1
          )
          `,
          scope.tenantId
        );

        await executor.$executeRawUnsafe(
          `
          DELETE FROM score_governance_requests
          WHERE "tenantId" = $1
          `,
          scope.tenantId
        );
        return;
      }

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

  private mergeCounts(target: Record<string, number>, source: Record<string, number>): void {
    for (const [key, value] of Object.entries(source)) {
      target[key] = (target[key] || 0) + value;
    }
  }

  private async purgeUsers(
    tx: Prisma.TransactionClient,
    where: Prisma.UserWhereInput,
    tenantId?: string
  ): Promise<void> {
    const users = await tx.user.findMany({
      where,
      select: {
        id: true,
        judgeId: true,
        contestantId: true,
      },
    });

    const userIds = users.map((user) => user.id);
    if (userIds.length === 0) {
      return;
    }

    const judgeIds = Array.from(
      new Set(users.map((user) => user.judgeId).filter((id): id is string => Boolean(id)))
    );
    const contestantIds = Array.from(
      new Set(users.map((user) => user.contestantId).filter((id): id is string => Boolean(id)))
    );

    await tx.scoreDelegationGrant.deleteMany({
      where: {
        OR: [
          { delegateUserId: { in: userIds } },
          { grantedById: { in: userIds } },
          { revokedById: { in: userIds } },
        ],
      },
    });

    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.notificationDigest.deleteMany({ where: { userId: { in: userIds } } });
    await tx.notificationPreference.deleteMany({ where: { userId: { in: userIds } } });
    await tx.pushSubscription.deleteMany({ where: { userId: { in: userIds } } });
    await tx.savedSearch.deleteMany({ where: { userId: { in: userIds } } });
    await tx.searchHistory.deleteMany({ where: { userId: { in: userIds } } });
    await tx.rateLimitConfig.deleteMany({ where: { userId: { in: userIds } } });
    await tx.roleAssignment.deleteMany({ where: { userId: { in: userIds } } });
    await tx.reportInstance.deleteMany({ where: { generatedById: { in: userIds } } });
    await tx.categoryCertification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.contestCertification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.certification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.deductionApproval.deleteMany({ where: { approvedById: { in: userIds } } });

    await tx.activityLog.updateMany({
      where: { userId: { in: userIds } },
      data: { userId: null },
    });
    await tx.performanceLog.updateMany({
      where: { userId: { in: userIds } },
      data: { userId: null },
    });
    await tx.systemSetting.updateMany({
      where: { updatedBy: { in: userIds } },
      data: { updatedBy: null },
    });
    await tx.categoryType.updateMany({
      where: { createdById: { in: userIds } },
      data: { createdById: null },
    });
    await tx.eventTemplate.updateMany({
      where: { createdBy: { in: userIds } },
      data: { createdBy: null },
    });
    await tx.judgeUncertificationRequest.updateMany({
      where: { requestedBy: { in: userIds } },
      data: { requestedBy: null },
    });
    await tx.judgeUncertificationRequest.updateMany({
      where: { approvedBy: { in: userIds } },
      data: { approvedBy: null },
    });
    await tx.judgeUncertificationRequest.updateMany({
      where: { rejectedBy: { in: userIds } },
      data: { rejectedBy: null },
    });
    await tx.scoreRemovalRequest.updateMany({
      where: { requestedBy: { in: userIds } },
      data: { requestedBy: null },
    });
    await tx.scoreRemovalRequest.updateMany({
      where: { tallySignedBy: { in: userIds } },
      data: { tallySignedBy: null },
    });
    await tx.scoreRemovalRequest.updateMany({
      where: { auditorSignedBy: { in: userIds } },
      data: { auditorSignedBy: null },
    });
    await tx.scoreRemovalRequest.updateMany({
      where: { boardSignedBy: { in: userIds } },
      data: { boardSignedBy: null },
    });

    if (contestantIds.length > 0) {
      await tx.contestant.deleteMany({ where: { id: { in: contestantIds } } });
    }
    if (judgeIds.length > 0) {
      await tx.judge.deleteMany({ where: { id: { in: judgeIds } } });
    }

    await tx.user.deleteMany({ where: { id: { in: userIds } } });

    if (tenantId) {
      await tx.contestant.deleteMany({
        where: {
          tenantId,
          users: { none: {} },
        },
      });
      await tx.judge.deleteMany({
        where: {
          tenantId,
          users: { none: {} },
        },
      });
    }
  }

  private async getTenantScopeSummary(tenantId: string): Promise<Record<string, number>> {
    const [
      events,
      contests,
      categories,
      scores,
      files,
      assignments,
      deductions,
      nonAdminUsers,
      judges,
      contestants,
      notifications,
      roleAssignments,
      certifications,
      scoreFiles,
    ] = await Promise.all([
      this.prisma.event.count({ where: { tenantId } }),
      this.prisma.contest.count({ where: { tenantId } }),
      this.prisma.category.count({ where: { tenantId } }),
      this.prisma.score.count({ where: { tenantId } }),
      this.prisma.file.count({ where: { tenantId } }),
      this.prisma.assignment.count({ where: { tenantId } }),
      this.prisma.deductionRequest.count({ where: { tenantId } }),
      this.prisma.user.count({
        where: {
          tenantId,
          role: { notIn: ['SUPER_ADMIN', 'ADMIN'] }
        }
      }),
      this.prisma.judge.count({ where: { tenantId } }),
      this.prisma.contestant.count({ where: { tenantId } }),
      this.prisma.notification.count({ where: { tenantId } }),
      this.prisma.roleAssignment.count({ where: { tenantId } }),
      this.prisma.categoryCertification.count({ where: { tenantId } }),
      this.prisma.scoreFile.count({ where: { tenantId } }),
    ]);

    return {
      events,
      contests,
      categories,
      scores,
      files,
      assignments,
      deductionRequests: deductions,
      nonAdminUsers,
      judges,
      contestants,
      notifications,
      roleAssignments,
      categoryCertifications: certifications,
      scoreFiles,
    };
  }

  private async wipeTenantEvents(
    tenantId: string,
    userId: string,
    userRole: string,
    isSuperAdmin: boolean,
    dryRun: boolean
  ): Promise<Record<string, number>> {
    const eventIds = await this.prisma.event.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'asc' }
    });

    const aggregate: Record<string, number> = { events: eventIds.length };
    for (const event of eventIds) {
      const summary = await this.wipeEventData(
        event.id,
        userId,
        userRole,
        tenantId,
        isSuperAdmin,
        dryRun
      );
      this.mergeCounts(aggregate, summary.counts);
    }

    return aggregate;
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

      await this.purgeUsers(tx, {
        role: {
          notIn: ['SUPER_ADMIN', 'ADMIN'],
        },
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

  /**
   * Legacy compatibility + tenant-safe wipe endpoint.
   * Never performs global cross-tenant wipes.
   */
  async wipeTenantScopedData(
    scope: TenantWipeScope,
    userId: string,
    userRole: string,
    tenantId: string | undefined,
    isSuperAdmin: boolean,
    dryRun: boolean
  ): Promise<DataWipeSummary> {
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      throw this.forbiddenError('You do not have permission to wipe data');
    }
    if (!tenantId) {
      throw this.forbiddenError('Tenant context is required');
    }
    if (isDefaultTenant(tenantId, null)) {
      throw this.forbiddenError('Default tenant data wipe is blocked for safety');
    }

    const normalizedScope = String(scope || 'ALL').toUpperCase() as TenantWipeScope;
    if (!['ALL', 'EVENTS', 'USERS', 'SCORES'].includes(normalizedScope)) {
      throw this.validationError('Invalid scope. Must be ALL, EVENTS, USERS, or SCORES.');
    }

    const counts = await this.getTenantScopeSummary(tenantId);
    if (dryRun) {
      return {
        scope: 'TENANT',
        tenantId,
        counts,
        dryRun: true,
      };
    }

    if (normalizedScope === 'EVENTS') {
      await this.wipeTenantEvents(tenantId, userId, userRole, isSuperAdmin, false);
    }

    if (normalizedScope === 'SCORES') {
      await this.prisma.$transaction(async (tx) => {
        await tx.scoreFile.deleteMany({ where: { tenantId } });
        await tx.scoreComment.deleteMany({ where: { tenantId } });
        await tx.score.deleteMany({ where: { tenantId } });
        await tx.judgeComment.deleteMany({ where: { tenantId } });
        await tx.certification.deleteMany({ where: { tenantId } });
        await tx.categoryCertification.deleteMany({ where: { tenantId } });
        await tx.contestCertification.deleteMany({ where: { tenantId } });
        await tx.judgeCertification.deleteMany({ where: { tenantId } });
        await tx.judgeContestantCertification.deleteMany({ where: { tenantId } });
        await tx.reviewContestantCertification.deleteMany({ where: { tenantId } });
        await tx.reviewJudgeScoreCertification.deleteMany({ where: { tenantId } });
        await tx.judgeScoreRemovalRequest.deleteMany({ where: { tenantId } });
        await tx.judgeUncertificationRequest.deleteMany({ where: { tenantId } });
        await tx.scoreRemovalRequest.deleteMany({ where: { tenantId } });
        await this.purgeScoreGovernance(tx, { tenantId });
        await tx.deductionApproval.deleteMany({ where: { tenantId } });
        await tx.deductionRequest.deleteMany({ where: { tenantId } });
        await tx.overallDeduction.deleteMany({ where: { tenantId } });
      });
    }

    if (normalizedScope === 'USERS') {
      await this.prisma.$transaction(async (tx) => {
        await this.purgeUsers(tx, {
          tenantId,
          role: { notIn: ['SUPER_ADMIN', 'ADMIN'] },
        }, tenantId);
      });
    }

    if (normalizedScope === 'ALL') {
      await this.wipeTenantEvents(tenantId, userId, userRole, isSuperAdmin, false);
      await this.prisma.$transaction(async (tx) => {
        await tx.file.deleteMany({ where: { tenantId } });
        await tx.scoreFile.deleteMany({ where: { tenantId } });
        await tx.scoreComment.deleteMany({ where: { tenantId } });
        await tx.assignment.deleteMany({ where: { tenantId } });
        await tx.roleAssignment.deleteMany({ where: { tenantId } });
        await tx.notification.deleteMany({ where: { tenantId } });
        await tx.notificationDigest.deleteMany({ where: { tenantId } });
        await tx.notificationPreference.deleteMany({ where: { tenantId } });
        await tx.pushSubscription.deleteMany({ where: { tenantId } });
        await tx.savedSearch.deleteMany({ where: { tenantId } });
        await tx.searchHistory.deleteMany({ where: { tenantId } });
        await this.purgeUsers(tx, {
          tenantId,
          role: { notIn: ['SUPER_ADMIN', 'ADMIN'] },
        }, tenantId);
      });
    }

    this.logInfo('Tenant scoped data wipe executed', {
      userId,
      userRole,
      tenantId,
      scope: normalizedScope
    });

    return {
      scope: 'TENANT',
      tenantId,
      counts,
      dryRun: false,
    };
  }
}
