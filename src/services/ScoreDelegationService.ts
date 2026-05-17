import { PrismaClient, UserRole } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { BaseService } from './BaseService';
import { SCORING_SETTINGS_KEYS } from '../config/scoringSettings';

type DelegateActor = {
  id: string;
  role: UserRole;
  tenantId: string;
  judgeId?: string | null;
  judge?: { id?: string | null } | null;
};

type ScoreDelegationCoverageMode = 'SELECTED_JUDGES' | 'ALL_JUDGES_IN_SCOPE';
type ScoreDelegationScopeLevel = 'CATEGORY' | 'CONTEST' | 'EVENT' | 'TENANT';
type ScoreEntryMode = 'SELF' | 'DELEGATED';
type GrantWithRelations = any;

export interface CreateScoreDelegationGrantDTO {
  tenantId: string;
  delegateUserId: string;
  grantedById: string;
  scopeLevel: ScoreDelegationScopeLevel;
  coverageMode: ScoreDelegationCoverageMode;
  judgeIds?: string[];
  categoryId?: string | null;
  contestId?: string | null;
  eventId?: string | null;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  reason?: string;
}

export interface ListScoreDelegationGrantOptions {
  activeOnly?: boolean;
  delegateUserId?: string;
}

export interface DelegatedJudgeOption {
  judgeId: string;
  judgeName: string;
  judgeEmail: string | null;
  grantIds: string[];
  coverageModes: ScoreDelegationCoverageMode[];
}

export interface DelegatedJudgeContext {
  judgeId: string;
  entryMode: ScoreEntryMode;
  delegationGrantId: string | null;
}

export interface DelegatedJudgeCertificationContext {
  judgeId: string;
  certificationMode: 'SELF' | 'DELEGATED';
  delegationGrantId: string | null;
}

type CategoryContext = {
  id: string;
  contestId: string;
  contest: {
    eventId: string;
  };
};

@injectable()
export class ScoreDelegationService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private getActorJudgeId(actor: Pick<DelegateActor, 'judgeId' | 'judge'>): string | null {
    return actor.judgeId || actor.judge?.id || null;
  }

  private includeConfig() {
    return {
      judges: {
        include: {
          judge: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      delegateUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      grantedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      revokedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          name: true,
        },
      },
      contest: {
        select: {
          id: true,
          name: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    } as const;
  }

  private async getCategoryContext(categoryId: string, tenantId: string): Promise<CategoryContext> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        contestId: true,
        contest: {
          select: {
            eventId: true,
          },
        },
      },
    });

    if (!category) {
      throw this.notFoundError('Category', categoryId);
    }

    return category;
  }

  private scopeMatchesCategory(grant: Pick<GrantWithRelations, 'scopeLevel' | 'categoryId' | 'contestId' | 'eventId'>, category: CategoryContext): boolean {
    switch (grant.scopeLevel) {
      case 'CATEGORY':
        return grant.categoryId === category.id;
      case 'CONTEST':
        return grant.contestId === category.contestId;
      case 'EVENT':
        return grant.eventId === category.contest.eventId;
      case 'TENANT':
        return true;
      default:
        return false;
    }
  }

  private grantCoversJudge(grant: GrantWithRelations, judgeId: string): boolean {
    if (grant.coverageMode === 'ALL_JUDGES_IN_SCOPE') {
      return true;
    }

    return grant.judges.some((entry: any) => entry.judgeId === judgeId);
  }

  private async assertScopeTargetExists(dto: CreateScoreDelegationGrantDTO): Promise<void> {
    if (dto.scopeLevel === 'CATEGORY') {
      if (!dto.categoryId) {
        throw this.createBadRequestError('categoryId is required for category-scoped delegation grants');
      }
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId: dto.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!category) {
        throw this.notFoundError('Category', dto.categoryId);
      }
      return;
    }

    if (dto.scopeLevel === 'CONTEST') {
      if (!dto.contestId) {
        throw this.createBadRequestError('contestId is required for contest-scoped delegation grants');
      }
      const contest = await this.prisma.contest.findFirst({
        where: { id: dto.contestId, tenantId: dto.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!contest) {
        throw this.notFoundError('Contest', dto.contestId);
      }
      return;
    }

    if (dto.scopeLevel === 'EVENT') {
      if (!dto.eventId) {
        throw this.createBadRequestError('eventId is required for event-scoped delegation grants');
      }
      const event = await this.prisma.event.findFirst({
        where: { id: dto.eventId, tenantId: dto.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!event) {
        throw this.notFoundError('Event', dto.eventId);
      }
      return;
    }
  }

  async isDelegateJudgeCertificationAllowed(tenantId: string): Promise<boolean> {
    const tenantSetting = await this.prisma.systemSetting.findFirst({
      where: {
        key: SCORING_SETTINGS_KEYS.ALLOW_DELEGATE_JUDGE_CERTIFICATION,
        tenantId,
      },
      select: {
        value: true,
      },
    });

    const globalSetting = !tenantSetting
      ? await this.prisma.systemSetting.findFirst({
          where: {
            key: SCORING_SETTINGS_KEYS.ALLOW_DELEGATE_JUDGE_CERTIFICATION,
            tenantId: null,
          },
          select: {
            value: true,
          },
        })
      : null;

    const rawValue = tenantSetting?.value ?? globalSetting?.value ?? null;
    const normalized = String(rawValue || '').trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }

  async listGrants(
    tenantId: string,
    actor: DelegateActor,
    options: ListScoreDelegationGrantOptions = {},
  ): Promise<GrantWithRelations[]> {
    const manageAll = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(actor.role);
    const where: any = {
      tenantId,
      ...(manageAll && options.delegateUserId ? { delegateUserId: options.delegateUserId } : {}),
      ...(!manageAll ? { delegateUserId: actor.id } : {}),
    };

    const now = new Date();
    if (options.activeOnly) {
      where.status = 'ACTIVE';
      where.startsAt = { lte: now };
      where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
    }

    return await this.prisma.scoreDelegationGrant.findMany({
      where,
      include: this.includeConfig(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createGrant(dto: CreateScoreDelegationGrantDTO): Promise<GrantWithRelations> {
    if (dto.coverageMode === 'SELECTED_JUDGES' && (!dto.judgeIds || dto.judgeIds.length === 0)) {
      throw this.createBadRequestError('At least one judge must be selected when coverageMode is SELECTED_JUDGES');
    }

    if (dto.coverageMode === 'ALL_JUDGES_IN_SCOPE' && dto.judgeIds?.length) {
      throw this.createBadRequestError('judgeIds cannot be provided when coverageMode is ALL_JUDGES_IN_SCOPE');
    }

    await this.assertScopeTargetExists(dto);

    const delegateUser = await this.prisma.user.findFirst({
      where: {
        id: dto.delegateUserId,
        tenantId: dto.tenantId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    if (!delegateUser) {
      throw this.notFoundError('Delegate user', dto.delegateUserId);
    }

    if (dto.judgeIds?.length) {
      const judgeCount = await this.prisma.judge.count({
        where: {
          tenantId: dto.tenantId,
          id: { in: dto.judgeIds },
        },
      });
      if (judgeCount !== new Set(dto.judgeIds).size) {
        throw this.createBadRequestError('One or more selected judges are invalid for this tenant');
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= startsAt) {
      throw this.createBadRequestError('expiresAt must be after startsAt');
    }

    return await this.prisma.scoreDelegationGrant.create({
      data: {
        tenantId: dto.tenantId,
        delegateUserId: dto.delegateUserId,
        grantedById: dto.grantedById,
        scopeLevel: dto.scopeLevel,
        coverageMode: dto.coverageMode,
        categoryId: dto.scopeLevel === 'CATEGORY' ? dto.categoryId || null : null,
        contestId: dto.scopeLevel === 'CONTEST' ? dto.contestId || null : null,
        eventId: dto.scopeLevel === 'EVENT' ? dto.eventId || null : null,
        startsAt,
        expiresAt,
        reason: dto.reason?.trim() || null,
        judges: dto.coverageMode === 'SELECTED_JUDGES'
          ? {
              create: Array.from(new Set(dto.judgeIds || [])).map((judgeId) => ({
                judgeId,
              })),
            }
          : undefined,
      },
      include: this.includeConfig(),
    });
  }

  async revokeGrant(
    id: string,
    tenantId: string,
    revokedById: string,
    reason?: string,
  ): Promise<GrantWithRelations> {
    const existing = await this.prisma.scoreDelegationGrant.findFirst({
      where: { id, tenantId },
      include: this.includeConfig(),
    });

    if (!existing) {
      throw this.notFoundError('Score delegation grant', id);
    }

    if (existing.status !== 'ACTIVE') {
      return existing;
    }

    return await this.prisma.scoreDelegationGrant.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedById,
        revokedAt: new Date(),
        reason: reason?.trim() || existing.reason,
      },
      include: this.includeConfig(),
    });
  }

  async getEligibleJudgesForDelegate(
    delegateUserId: string,
    tenantId: string,
    categoryId: string,
    actorRole?: UserRole,
  ): Promise<DelegatedJudgeOption[]> {
    const category = await this.getCategoryContext(categoryId, tenantId);
    const rows = await this.prisma.assignment.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        OR: [
          { categoryId: category.id },
          { contestId: category.contestId, categoryId: null },
        ],
      },
      select: {
        judgeId: true,
        judge: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (actorRole === 'SUPER_ADMIN' || actorRole === 'ADMIN') {
      return rows
        .filter((row) => Boolean(row.judge))
        .map((row) => ({
          judgeId: row.judgeId,
          judgeName: row.judge?.name || 'Judge',
          judgeEmail: row.judge?.email || null,
          grantIds: [],
          coverageModes: ['ALL_JUDGES_IN_SCOPE' as ScoreDelegationCoverageMode],
        }))
        .sort((left, right) => left.judgeName.localeCompare(right.judgeName));
    }

    const grants = await this.listGrants(
      tenantId,
      { id: delegateUserId, role: actorRole || 'JUDGE', tenantId },
      { activeOnly: true },
    );

    const eligible = grants.filter((grant) => this.scopeMatchesCategory(grant, category));
    if (eligible.length === 0) {
      return [];
    }

    const options = new Map<string, DelegatedJudgeOption>();

    rows.forEach((row) => {
      if (!row.judge) return;

      const matchingGrants = eligible.filter((grant) => this.grantCoversJudge(grant, row.judgeId));
      if (matchingGrants.length === 0) return;

      const existing = options.get(row.judgeId);
      if (existing) {
        matchingGrants.forEach((grant) => {
          if (!existing.grantIds.includes(grant.id)) {
            existing.grantIds.push(grant.id);
          }
          if (!existing.coverageModes.includes(grant.coverageMode)) {
            existing.coverageModes.push(grant.coverageMode);
          }
        });
        return;
      }

      options.set(row.judgeId, {
        judgeId: row.judgeId,
        judgeName: row.judge.name,
        judgeEmail: row.judge.email,
        grantIds: matchingGrants.map((grant) => grant.id),
        coverageModes: Array.from(new Set(matchingGrants.map((grant) => grant.coverageMode))),
      });
    });

    return Array.from(options.values()).sort((left, right) => left.judgeName.localeCompare(right.judgeName));
  }

  async validateDelegatedAccess(
    delegateUserId: string,
    tenantId: string,
    representedJudgeId: string,
    categoryId: string,
  ): Promise<{ grant: GrantWithRelations; category: CategoryContext }> {
    const category = await this.getCategoryContext(categoryId, tenantId);

    await this.assertRepresentedJudgeAssignedToCategory(tenantId, representedJudgeId, category);

    const grants = await this.prisma.scoreDelegationGrant.findMany({
      where: {
        tenantId,
        delegateUserId,
        status: 'ACTIVE',
        startsAt: { lte: new Date() },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: this.includeConfig(),
      orderBy: [{ createdAt: 'desc' }],
    });

    const matchingGrant = grants.find(
      (grant: any) =>
        this.scopeMatchesCategory(grant, category) && this.grantCoversJudge(grant, representedJudgeId),
    );

    if (!matchingGrant) {
      throw this.forbiddenError('No active score delegation grant covers this judge and category');
    }

    return { grant: matchingGrant, category };
  }

  private async assertRepresentedJudgeAssignedToCategory(
    tenantId: string,
    representedJudgeId: string,
    category: CategoryContext,
  ): Promise<void> {
    const representedJudge = await this.prisma.judge.findFirst({
      where: {
        id: representedJudgeId,
        tenantId,
      },
      select: {
        id: true,
      },
    });
    if (!representedJudge) {
      throw this.notFoundError('Judge', representedJudgeId);
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: {
        tenantId,
        judgeId: representedJudgeId,
        status: { in: ['ACTIVE', 'COMPLETED', 'PENDING'] },
        OR: [
          { categoryId: category.id },
          { contestId: category.contestId, categoryId: null },
        ],
      },
      select: { id: true },
    });

    if (!assignment) {
      throw this.forbiddenError('Represented judge is not assigned to this category');
    }
  }

  async resolveActingJudgeContext(
    actor: DelegateActor,
    tenantId: string,
    categoryId: string,
    representedJudgeId?: string | null,
  ): Promise<DelegatedJudgeContext> {
    const actorJudgeId = this.getActorJudgeId(actor);
    const normalizedRepresentedJudgeId = representedJudgeId?.trim() || null;

    if (!normalizedRepresentedJudgeId || normalizedRepresentedJudgeId === actorJudgeId) {
      if (!actorJudgeId) {
        throw this.createBadRequestError('representedJudgeId is required when the current user is not linked to a judge');
      }

      return {
        judgeId: actorJudgeId,
        entryMode: 'SELF',
        delegationGrantId: null,
      };
    }

    if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') {
      const category = await this.getCategoryContext(categoryId, tenantId);
      await this.assertRepresentedJudgeAssignedToCategory(tenantId, normalizedRepresentedJudgeId, category);
      return {
        judgeId: normalizedRepresentedJudgeId,
        entryMode: 'DELEGATED',
        delegationGrantId: null,
      };
    }

    const { grant } = await this.validateDelegatedAccess(
      actor.id,
      tenantId,
      normalizedRepresentedJudgeId,
      categoryId,
    );

    return {
      judgeId: normalizedRepresentedJudgeId,
      entryMode: 'DELEGATED',
      delegationGrantId: grant.id,
    };
  }

  async resolveCertificationContext(
    actor: DelegateActor,
    tenantId: string,
    categoryId: string,
    representedJudgeId?: string | null,
  ): Promise<DelegatedJudgeCertificationContext | null> {
    const actorJudgeId = this.getActorJudgeId(actor);
    const normalizedRepresentedJudgeId = representedJudgeId?.trim() || null;

    if (!normalizedRepresentedJudgeId) {
      if (!actorJudgeId) {
        return null;
      }

      return {
        judgeId: actorJudgeId,
        certificationMode: 'SELF',
        delegationGrantId: null,
      };
    }

    if (normalizedRepresentedJudgeId === actorJudgeId) {
      return {
        judgeId: normalizedRepresentedJudgeId,
        certificationMode: 'SELF',
        delegationGrantId: null,
      };
    }

    const delegateCertificationAllowed = await this.isDelegateJudgeCertificationAllowed(tenantId);
    if (!delegateCertificationAllowed) {
      throw this.forbiddenError('Delegate certification on behalf of judges is not enabled for this tenant');
    }

    const { grant } = await this.validateDelegatedAccess(
      actor.id,
      tenantId,
      normalizedRepresentedJudgeId,
      categoryId,
    );

    return {
      judgeId: normalizedRepresentedJudgeId,
      certificationMode: 'DELEGATED',
      delegationGrantId: grant.id,
    };
  }
}
