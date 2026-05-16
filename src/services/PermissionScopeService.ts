import {
  PermissionScopeLevel,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import {
  ADMIN_FIXED_SCOPE_ROLES,
  getAllowedScopeOptions,
  getDefaultResourceScope,
  isScopeEditable,
  SCOPE_CAPABLE_RESOURCES,
} from '../config/defaultPermissionScopes';
import { BaseService } from './BaseService';

export interface ResourceScopeDetail {
  role: UserRole;
  resource: string;
  operation: string | null;
  scope: PermissionScopeLevel;
  source: 'DEFAULT' | 'RESOURCE' | 'OPERATION';
  editable: boolean;
  allowedOptions: PermissionScopeLevel[];
}

export interface UpdateResourceScopeDTO {
  role: UserRole;
  resource: string;
  operation?: string | null;
  scope?: PermissionScopeLevel;
  inherit?: boolean;
  tenantId: string;
  userId: string;
  userRole: UserRole;
  reason?: string;
}

export interface ResolvedResourceScope {
  level: PermissionScopeLevel;
  tenantWide: boolean;
  eventIds: string[];
  contestIds: string[];
  categoryIds: string[];
}

type AssignmentScopeRow = {
  eventId: string | null;
  contestId: string | null;
  categoryId: string | null;
};

@injectable()
export class PermissionScopeService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  private normalizeOperation(operation?: string | null): string | null {
    const normalized = String(operation || '').trim().toLowerCase();
    return normalized || null;
  }

  isScopeCapableResource(resource: string): boolean {
    return SCOPE_CAPABLE_RESOURCES.includes(resource as (typeof SCOPE_CAPABLE_RESOURCES)[number]);
  }

  async getResourceScope(
    role: UserRole,
    resource: string,
    tenantId: string,
    operation?: string | null
  ): Promise<PermissionScopeLevel> {
    if (!this.isScopeCapableResource(resource)) {
      return PermissionScopeLevel.TENANT;
    }

    if (ADMIN_FIXED_SCOPE_ROLES.includes(role)) {
      return PermissionScopeLevel.TENANT;
    }

    const normalizedOperation = this.normalizeOperation(operation);
    if (normalizedOperation) {
      const operationOverride = await this.prisma.rolePermissionScope.findFirst({
        where: {
          tenantId,
          role,
          resource,
          operation: normalizedOperation,
        },
        select: {
          scope: true,
        },
      });

      if (operationOverride?.scope) {
        return operationOverride.scope;
      }
    }

    const existing = await this.prisma.rolePermissionScope.findFirst({
      where: {
        tenantId,
        role,
        resource,
        operation: null,
      },
      select: {
        scope: true,
      },
    });

    return existing?.scope || getDefaultResourceScope(role, resource) || PermissionScopeLevel.TENANT;
  }

  async getScopeDetailsForTenant(
    tenantId: string,
    roleFilter?: UserRole,
    includeSuperAdmin = true
  ): Promise<ResourceScopeDetail[]> {
    const roles = (roleFilter
      ? [roleFilter]
      : ([
          'SUPER_ADMIN',
          'ADMIN',
          'ORGANIZER',
          'BOARD',
          'TALLY_MASTER',
          'AUDITOR',
          'JUDGE',
          'EMCEE',
          'CONTESTANT',
        ] satisfies UserRole[]))
      .filter((role) => includeSuperAdmin || role !== 'SUPER_ADMIN');

    const overrides = await this.prisma.rolePermissionScope.findMany({
      where: {
        tenantId,
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      select: {
        role: true,
        resource: true,
        operation: true,
        scope: true,
      },
    });

    const resourceOverrideMap = new Map(
      overrides
        .filter((row) => !row.operation)
        .map((row) => [`${row.role}:${row.resource}`, row.scope])
    );
    const operationOverrides = overrides.filter((row) => Boolean(row.operation));

    const details: ResourceScopeDetail[] = [];
    for (const role of roles) {
      for (const resource of SCOPE_CAPABLE_RESOURCES) {
        const defaultScope = getDefaultResourceScope(role, resource);
        const key = `${role}:${resource}`;
        const override = resourceOverrideMap.get(key);
        const effectiveScope = override || defaultScope;
        if (!effectiveScope) continue;
        details.push({
          role,
          resource,
          operation: null,
          scope: effectiveScope,
          source: override ? 'RESOURCE' : 'DEFAULT',
          editable: isScopeEditable(role, resource),
          allowedOptions: getAllowedScopeOptions(role, resource),
        });
      }
    }

    operationOverrides.forEach((override) => {
      details.push({
        role: override.role,
        resource: override.resource,
        operation: this.normalizeOperation(override.operation),
        scope: override.scope,
        source: 'OPERATION',
        editable: isScopeEditable(override.role, override.resource),
        allowedOptions: getAllowedScopeOptions(override.role, override.resource),
      });
    });

    return details.sort((left, right) => {
      if (left.role !== right.role) return left.role.localeCompare(right.role);
      if (left.resource !== right.resource) return left.resource.localeCompare(right.resource);
      if (left.operation === right.operation) return 0;
      if (!left.operation) return -1;
      if (!right.operation) return 1;
      return left.operation.localeCompare(right.operation);
    });
  }

  async updateResourceScope(dto: UpdateResourceScopeDTO): Promise<void> {
    if (!['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(dto.userRole)) {
      throw this.forbiddenError('Insufficient permissions to modify resource scopes');
    }

    if (!this.isScopeCapableResource(dto.resource)) {
      throw this.createBadRequestError(`Resource "${dto.resource}" does not support configurable scope`);
    }

    const normalizedOperation = this.normalizeOperation(dto.operation);
    const isOperationOverride = Boolean(normalizedOperation);

    if (!isScopeEditable(dto.role, dto.resource)) {
      throw this.forbiddenError(`Scope for ${dto.role} on ${dto.resource} is fixed in v1`);
    }

    if (normalizedOperation === '*') {
      throw this.createBadRequestError('Wildcard operations cannot have scope overrides');
    }

    if (dto.role === 'SUPER_ADMIN' && dto.userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only SUPER_ADMIN can view or modify SUPER_ADMIN scopes');
    }

    if (!dto.inherit && !dto.scope) {
      throw this.createBadRequestError('A scope value is required when not inheriting');
    }

    const allowedOptions = getAllowedScopeOptions(dto.role, dto.resource);
    if (dto.scope && !allowedOptions.includes(dto.scope)) {
      throw this.createBadRequestError(
        `Scope "${dto.scope}" is not allowed for ${dto.role} on ${dto.resource}`
      );
    }

    const existing = await this.prisma.rolePermissionScope.findFirst({
      where: {
        tenantId: dto.tenantId,
        role: dto.role,
        resource: dto.resource,
        operation: normalizedOperation,
      },
    });

    if (dto.inherit) {
      if (!isOperationOverride) {
        throw this.createBadRequestError('Only operation-specific scope overrides can be cleared to inherit');
      }

      if (!existing) {
        return;
      }

      await this.prisma.$transaction([
        this.prisma.rolePermissionScope.delete({
          where: {
            id: existing.id,
          },
        }),
        this.prisma.permissionAuditLog.create({
          data: {
            role: dto.role,
            resource: dto.resource,
            operation: normalizedOperation!,
            previousVal: null,
            newVal: false,
            previousScope: existing.scope,
            newScope: null,
            changeType: 'OPERATION_SCOPE',
            changedBy: dto.userId,
            tenantId: dto.tenantId,
            reason: dto.reason || 'Reverted to inherited resource scope',
          },
        }),
      ]);

      return;
    }

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    if (existing) {
      writes.push(
        this.prisma.rolePermissionScope.update({
          where: {
            id: existing.id,
          },
          data: {
            scope: dto.scope!,
            updatedAt: new Date(),
          },
        })
      );
    } else {
      writes.push(
        this.prisma.rolePermissionScope.create({
          data: {
            tenantId: dto.tenantId,
            role: dto.role,
            resource: dto.resource,
            operation: normalizedOperation,
            scope: dto.scope!,
            createdBy: dto.userId,
          },
        })
      );
    }

    writes.push(
      this.prisma.permissionAuditLog.create({
        data: {
          role: dto.role,
          resource: dto.resource,
          operation: normalizedOperation || 'scope',
          previousVal: null,
          newVal: false,
          previousScope: existing?.scope || null,
          newScope: dto.scope!,
          changeType: isOperationOverride ? 'OPERATION_SCOPE' : 'RESOURCE_SCOPE',
          changedBy: dto.userId,
          tenantId: dto.tenantId,
          reason: dto.reason,
        },
      })
    );

    await this.prisma.$transaction(writes);
  }

  async initializeDefaultsForTenant(tenantId: string, createdBy: string): Promise<number> {
    const records = Object.entries({
      SUPER_ADMIN: null,
      ADMIN: null,
      ORGANIZER: null,
      BOARD: null,
      TALLY_MASTER: null,
      AUDITOR: null,
      JUDGE: null,
      EMCEE: null,
      CONTESTANT: null,
    })
      .flatMap(([role]) =>
        SCOPE_CAPABLE_RESOURCES.flatMap((resource) => {
          const scope = getDefaultResourceScope(role as UserRole, resource);
          if (!scope) return [];
          return [{
            tenantId,
            role: role as UserRole,
            resource,
            operation: null,
            scope,
            createdBy,
          }];
        })
      );

    if (records.length === 0) return 0;

    const created = await this.prisma.rolePermissionScope.createMany({
      data: records,
      skipDuplicates: true,
    });

    return created.count;
  }

  async resolveUserScope(
    role: UserRole,
    resource: string,
    tenantId: string,
    user: {
      id: string;
      judgeId?: string | null;
      judge?: { id: string } | null;
    },
    operation?: string | null
  ): Promise<ResolvedResourceScope> {
    const level = await this.getResourceScope(role, resource, tenantId, operation);

    if (level === PermissionScopeLevel.TENANT) {
      return {
        level,
        tenantWide: true,
        eventIds: [],
        contestIds: [],
        categoryIds: [],
      };
    }

    if (role === 'BOARD') {
      const assignments = await this.prisma.roleAssignment.findMany({
        where: {
          tenantId,
          userId: user.id,
          role: 'BOARD',
          isActive: true,
        },
        select: {
          eventId: true,
          contestId: true,
          categoryId: true,
          contest: {
            select: {
              eventId: true,
            },
          },
          category: {
            select: {
              contestId: true,
              contest: {
                select: {
                  eventId: true,
                },
              },
            },
          },
        },
      });

      const eventIds =
        level === PermissionScopeLevel.EVENT
          ? assignments.flatMap((assignment) => [
              assignment.eventId,
              assignment.contest?.eventId,
              assignment.category?.contest?.eventId,
            ])
          : assignments
              .filter((assignment) => !assignment.contestId && !assignment.categoryId)
              .map((assignment) => assignment.eventId);

      return {
        level,
        tenantWide: false,
        eventIds: Array.from(
          new Set(
            eventIds.filter((value): value is string => Boolean(value))
          )
        ),
        contestIds:
          level === PermissionScopeLevel.ASSIGNMENT
            ? Array.from(
                new Set(
                  assignments
                    .flatMap((assignment) => [assignment.contestId, assignment.category?.contestId])
                    .filter((value): value is string => Boolean(value))
                )
              )
            : [],
        categoryIds:
          level === PermissionScopeLevel.ASSIGNMENT
            ? Array.from(
                new Set(
                  assignments
                    .map((assignment) => assignment.categoryId)
                    .filter((value): value is string => Boolean(value))
                )
              )
            : [],
      };
    }

    if (role === 'JUDGE') {
      let judgeId = user.judgeId || user.judge?.id || null;
      if (!judgeId) {
        const userRecord = await this.prisma.user.findFirst({
          where: {
            id: user.id,
            tenantId,
          },
          select: {
            judgeId: true,
          },
        });
        judgeId = userRecord?.judgeId || null;
      }

      if (!judgeId) {
        return this.emptyResolvedScope(level);
      }

      const assignments = await this.prisma.assignment.findMany({
        where: {
          tenantId,
          judgeId,
          status: {
            in: ['PENDING', 'ACTIVE', 'COMPLETED'],
          },
        },
        select: {
          eventId: true,
          contestId: true,
          categoryId: true,
        },
      });

      return this.scopeFromAssignmentRows(level, assignments);
    }

    if (role === 'TALLY_MASTER') {
      const assignments = await this.prisma.tallyMasterAssignment.findMany({
        where: {
          tenantId,
          userId: user.id,
          status: 'ACTIVE',
        },
        select: {
          eventId: true,
          contestId: true,
          categoryId: true,
        },
      });

      return this.scopeFromAssignmentRows(level, assignments);
    }

    if (role === 'AUDITOR') {
      const assignments = await this.prisma.auditorAssignment.findMany({
        where: {
          tenantId,
          userId: user.id,
          status: 'ACTIVE',
        },
        select: {
          eventId: true,
          contestId: true,
          categoryId: true,
        },
      });

      return this.scopeFromAssignmentRows(level, assignments);
    }

    return this.emptyResolvedScope(level);
  }

  private emptyResolvedScope(level: PermissionScopeLevel): ResolvedResourceScope {
    return {
      level,
      tenantWide: false,
      eventIds: [],
      contestIds: [],
      categoryIds: [],
    };
  }

  private scopeFromAssignmentRows(
    level: PermissionScopeLevel,
    rows: AssignmentScopeRow[]
  ): ResolvedResourceScope {
    const eventIds =
      level === PermissionScopeLevel.EVENT
        ? rows.map((row) => row.eventId)
        : rows
            .filter((row) => !row.contestId && !row.categoryId)
            .map((row) => row.eventId);

    return {
      level,
      tenantWide: false,
      eventIds: Array.from(
        new Set(eventIds.filter((value): value is string => Boolean(value)))
      ),
      contestIds:
        level === PermissionScopeLevel.ASSIGNMENT
          ? Array.from(
              new Set(
                rows
                  .map((row) => row.contestId)
                  .filter((value): value is string => Boolean(value))
              )
            )
          : [],
      categoryIds:
        level === PermissionScopeLevel.ASSIGNMENT
          ? Array.from(
              new Set(
                rows
                  .map((row) => row.categoryId)
                  .filter((value): value is string => Boolean(value))
              )
            )
          : [],
    };
  }
}
