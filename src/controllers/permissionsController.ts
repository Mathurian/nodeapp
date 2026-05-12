/**
 * Permissions Controller
 * Manages role-based permissions via GUI
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { DynamicPermissionService } from '../services/DynamicPermissionService';
import { UserRole } from '@prisma/client';
import { createLogger } from '../utils/logger';
import { sendSuccess, sendError, sendForbidden } from '../utils/responseHelpers';
import { PERMISSIONS } from '../middleware/permissions';
import { PermissionScopeLevel } from '@prisma/client';

const logger = createLogger('permissions');

const buildFallbackPermissions = (
  tenantId: string,
  createdBy: string,
  roleFilter?: UserRole,
  excludeSuperAdmin = false
) => {
  const now = new Date();
  const rows: Array<{
    id: string;
    role: UserRole;
    resource: string;
    operation: string;
    allowed: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tenantId: string;
  }> = [];

  for (const [roleKey, tokens] of Object.entries(PERMISSIONS)) {
    const role = roleKey as UserRole;
    if (excludeSuperAdmin && role === 'SUPER_ADMIN') continue;
    if (roleFilter && role !== roleFilter) continue;

    for (const token of tokens) {
      const raw = String(token || '').trim();
      if (!raw) continue;
      const [resource, operation] = raw === '*' ? ['*', '*'] : raw.split(':');
      if (!resource || !operation) continue;

      rows.push({
        id: `fallback-${tenantId}-${role}-${resource}-${operation}`,
        role,
        resource,
        operation,
        allowed: true,
        createdAt: now,
        updatedAt: now,
        createdBy,
        tenantId,
      });
    }
  }

  return rows;
};

const buildFallbackScopes = (
  tenantId: string,
  roleFilter: UserRole | undefined,
  excludeSuperAdmin: boolean,
  service: DynamicPermissionService
) => {
  const roles = ([
    'SUPER_ADMIN',
    'ADMIN',
    'ORGANIZER',
    'BOARD',
    'TALLY_MASTER',
    'AUDITOR',
    'JUDGE',
    'EMCEE',
    'CONTESTANT',
  ] satisfies UserRole[])
    .filter((role) => !excludeSuperAdmin || role !== 'SUPER_ADMIN')
    .filter((role) => !roleFilter || role === roleFilter);

  return service
    .getScopeDetails(tenantId, undefined, !excludeSuperAdmin)
    .then((scopes) => scopes.filter((scope) => roles.includes(scope.role)));
};

/**
 * Get all permissions (optionally filtered by role)
 * SUPER_ADMIN can see all permissions across all tenants
 * Other users see only their tenant's permissions
 */
export const getAllPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const isSuperAdmin = (req as any).isSuperAdmin;
    const tenantId = (req as any).tenantId;
    const effectiveTenantId = tenantId || req.user?.tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    // Use req.prisma for SUPER_ADMIN to bypass tenant filtering
    const prisma = isSuperAdmin ? (req as any).prisma : (req as any).prisma;

    // Build where clause
    const whereClause: any = {};
    const roleFilter = req.query['role'] as UserRole | undefined;

    // Non-SUPER_ADMIN users can only see their tenant's permissions
    if (!isSuperAdmin) {
      if (!effectiveTenantId) {
        return sendError(res, 'Tenant context is required', 400);
      }
      whereClause.tenantId = effectiveTenantId;
      if (roleFilter) {
        if (roleFilter === 'SUPER_ADMIN') {
          return sendForbidden(res, 'Access to SUPER_ADMIN permissions is restricted');
        }
        whereClause.role = roleFilter;
      } else {
        whereClause.role = { not: 'SUPER_ADMIN' };
      }
    } else if (roleFilter) {
      // SUPER_ADMIN can filter by any role, including SUPER_ADMIN
      whereClause.role = roleFilter;
    }

    const service = container.resolve(DynamicPermissionService);
    let permissions = await prisma.rolePermission.findMany({
      where: whereClause,
      select: {
        id: true,
        role: true,
        resource: true,
        operation: true,
        allowed: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        tenantId: true
      },
      orderBy: [
        { role: 'asc' },
        { resource: 'asc' },
        { operation: 'asc' }
      ]
    });

    // Bootstrap defaults when no dynamic rows exist yet.
    if (permissions.length === 0 && effectiveTenantId && req.user?.id) {
      await service.initializeDefaultsForTenant(effectiveTenantId, req.user.id);
      permissions = await prisma.rolePermission.findMany({
        where: whereClause,
        select: {
          id: true,
          role: true,
          resource: true,
          operation: true,
          allowed: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          tenantId: true
        },
        orderBy: [
          { role: 'asc' },
          { resource: 'asc' },
          { operation: 'asc' }
        ]
      });
    }

    // Final fallback: synthesize matrix from static permissions if DB remains empty.
    if (permissions.length === 0 && effectiveTenantId && req.user?.id) {
      permissions = buildFallbackPermissions(
        effectiveTenantId,
        req.user.id,
        roleFilter,
        !isSuperAdmin
      );
    }

    logger.info('Fetched all permissions', {
      userId: req.user.id,
      role: req.user.role,
      isSuperAdmin,
      tenantId: effectiveTenantId,
      count: permissions.length,
      roleFilter
    });

    return sendSuccess(res, permissions, 'Permissions retrieved successfully');
  } catch (error) {
    logger.error('Error fetching all permissions', { error });
    return next(error);
  }
};

/**
 * Get permission statistics
 * SUPER_ADMIN sees stats across all tenants
 * Other users see only their tenant's stats
 */
export const getPermissionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const isSuperAdmin = (req as any).isSuperAdmin;
    const tenantId = (req as any).tenantId;
    const effectiveTenantId = tenantId || req.user?.tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    const service = container.resolve(DynamicPermissionService);

    // Ensure tenant has initial permission rows for GUI stats.
    if (!effectiveTenantId) {
      return sendError(res, 'Tenant context is required', 400);
    }
    if (req.user?.id) {
      await service.initializeDefaultsForTenant(effectiveTenantId, req.user.id);
    }

    // For SUPER_ADMIN, we need to aggregate stats across all tenants
    if (isSuperAdmin) {
      const prisma = (req as any).prisma;

      const allPermissions = await prisma.rolePermission.findMany({
        select: {
          role: true,
          resource: true,
          allowed: true
        }
      });

      const fallbackPermissions = allPermissions.length === 0 && effectiveTenantId && req.user?.id
        ? buildFallbackPermissions(effectiveTenantId, req.user.id)
        : [];
      const statSource = allPermissions.length > 0 ? allPermissions : fallbackPermissions;

      const stats = {
        totalPermissions: statSource.length,
        permissionsByRole: {} as Record<string, number>,
        allowedCount: 0,
        deniedCount: 0
      };

      statSource.forEach((perm: any) => {
        stats.permissionsByRole[perm.role] = (stats.permissionsByRole[perm.role] || 0) + 1;
        if (perm.allowed) {
          stats.allowedCount++;
        } else {
          stats.deniedCount++;
        }
      });

      return sendSuccess(res, stats, 'Permission statistics retrieved successfully');
    } else {
      // Non-SUPER_ADMIN: use service with tenant filtering
      let stats = await service.getPermissionStats(effectiveTenantId);
      if (stats.totalPermissions === 0 && req.user?.id) {
        const fallback = buildFallbackPermissions(effectiveTenantId, req.user.id, undefined, true);
        const permissionsByRole: Record<string, number> = {};
        for (const row of fallback) {
          permissionsByRole[row.role] = (permissionsByRole[row.role] || 0) + 1;
        }
        stats = {
          ...stats,
          totalPermissions: fallback.length,
          allowedCount: fallback.length,
          deniedCount: 0,
          permissionsByRole,
        };
      }
      return sendSuccess(res, stats, 'Permission statistics retrieved successfully');
    }
  } catch (error) {
    logger.error('Error fetching permission stats', { error });
    return next(error);
  }
};

export const getAllPermissionScopes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const isSuperAdmin = (req as any).isSuperAdmin;
    const tenantId = (req as any).tenantId;
    const effectiveTenantId = tenantId || req.user?.tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    if (!effectiveTenantId) {
      return sendError(res, 'Tenant context is required', 400);
    }

    const roleFilter = req.query['role'] as UserRole | undefined;
    if (!isSuperAdmin && roleFilter === 'SUPER_ADMIN') {
      return sendForbidden(res, 'Access to SUPER_ADMIN permission scopes is restricted');
    }

    const service = container.resolve(DynamicPermissionService);
    if (req.user.id) {
      await service.initializeDefaultsForTenant(effectiveTenantId, req.user.id);
    }

    let scopes = await service.getScopeDetails(
      effectiveTenantId,
      roleFilter,
      isSuperAdmin
    );

    if (!isSuperAdmin) {
      scopes = scopes.filter((scope) => scope.role !== 'SUPER_ADMIN');
    }

    if (scopes.length === 0) {
      scopes = await buildFallbackScopes(
        effectiveTenantId,
        roleFilter,
        !isSuperAdmin,
        service
      );
    }

    logger.info('Fetched permission scopes', {
      userId: req.user.id,
      role: req.user.role,
      tenantId: effectiveTenantId,
      count: scopes.length,
      roleFilter,
    });

    return sendSuccess(res, scopes, 'Permission scopes retrieved successfully');
  } catch (error) {
    logger.error('Error fetching permission scopes', { error });
    return next(error);
  }
};

/**
 * Get permission audit logs for the active tenant scope
 */
export const getPermissionAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    const prisma = (req as any).prisma;
    const tenantId = (req as any).tenantId || req.user.tenantId;

    if (!tenantId) {
      return sendError(res, 'Tenant context is required', 400);
    }

    const role = (req.query['role'] as UserRole | undefined) || undefined;
    const resource = String(req.query['resource'] || '').trim() || undefined;
    const changedBy = String(req.query['changedBy'] || '').trim() || undefined;
    const startDateRaw = String(req.query['startDate'] || '').trim();
    const endDateRaw = String(req.query['endDate'] || '').trim();
    const page = Math.max(parseInt(String(req.query['page'] || '1'), 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query['limit'] || '50'), 10) || 50, 1),
      200
    );

    const whereClause: any = {
      tenantId,
    };

    if (role) {
      whereClause.role = role;
    }

    if (resource) {
      whereClause.resource = {
        contains: resource,
        mode: 'insensitive',
      };
    }

    if (startDateRaw || endDateRaw) {
      whereClause.changedAt = {};

      if (startDateRaw) {
        const startDate = new Date(startDateRaw);
        if (Number.isNaN(startDate.getTime())) {
          return sendError(res, 'Invalid startDate', 400);
        }
        whereClause.changedAt.gte = startDate;
      }

      if (endDateRaw) {
        const endDate = new Date(endDateRaw);
        if (Number.isNaN(endDate.getTime())) {
          return sendError(res, 'Invalid endDate', 400);
        }
        whereClause.changedAt.lte = endDate;
      }
    }

    if (changedBy) {
      const matchingUsers = await prisma.user.findMany({
        where: {
          tenantId,
          OR: [
            {
              id: changedBy,
            },
            {
              email: {
                contains: changedBy,
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: changedBy,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      const changedByIds = Array.from(
        new Set([changedBy, ...matchingUsers.map((user: { id: string }) => user.id)]),
      );

      whereClause.changedBy = {
        in: changedByIds,
      };
    }

    const [logs, total] = await Promise.all([
      prisma.permissionAuditLog.findMany({
        where: whereClause,
        orderBy: {
          changedAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.permissionAuditLog.count({
        where: whereClause,
      }),
    ]);

    const changedByIds = Array.from(
      new Set(
        logs
          .map((log: { changedBy: string }) => String(log.changedBy || '').trim())
          .filter(Boolean),
      ),
    );

    const changedByUsers = changedByIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: changedByIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const changedByUserMap = new Map(
      changedByUsers.map((changedByUser: { id: string; name: string | null; email: string | null }) => [
        changedByUser.id,
        {
          name: changedByUser.name || changedByUser.email || 'Unknown User',
          email: changedByUser.email || '',
        },
      ]),
    );

    const data = logs.map((log: any) => ({
      ...log,
      changedByUser: changedByUserMap.get(log.changedBy) || undefined,
    }));

    logger.info('Fetched permission audit logs', {
      userId: req.user.id,
      tenantId,
      count: data.length,
      total,
      page,
      limit,
      role,
      resource,
      changedBy,
    });

    return res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error('Error fetching permission audit logs', { error });
    return next(error);
  }
};

/**
 * Update a single permission
 */
export const updatePermission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { role, resource, operation, allowed, reason } = req.body;
    const tenantId = (req as any).tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    // Validate inputs
    if (!role || !resource || !operation || allowed === undefined) {
      return sendError(res, 'Missing required fields: role, resource, operation, allowed', 400);
    }

    const service = container.resolve(DynamicPermissionService);

    await service.updatePermission({
      role,
      resource,
      operation,
      allowed,
      userId: req.user.id,
      userRole: req.user.role,
      tenantId,
      reason
    });

    logger.info('Permission updated', {
      role,
      resource,
      operation,
      allowed,
      userId: req.user.id,
      tenantId
    });

    return sendSuccess(res, null, 'Permission updated successfully');
  } catch (error) {
    logger.error('Error updating permission', { error });
    return next(error);
  }
};

export const updatePermissionScope = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { role, resource, scope, reason } = req.body;
    const tenantId = (req as any).tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    if (!tenantId) {
      return sendError(res, 'Tenant context is required', 400);
    }

    if (!role || !resource || !scope) {
      return sendError(res, 'Missing required fields: role, resource, scope', 400);
    }

    if (!Object.values(PermissionScopeLevel).includes(scope as PermissionScopeLevel)) {
      return sendError(res, 'Invalid scope value', 400);
    }

    const service = container.resolve(DynamicPermissionService);
    await service.updateResourceScope({
      role,
      resource,
      scope,
      userId: req.user.id,
      userRole: req.user.role,
      tenantId,
      reason,
    });

    logger.info('Permission scope updated', {
      role,
      resource,
      scope,
      userId: req.user.id,
      tenantId,
    });

    return sendSuccess(res, null, 'Permission scope updated successfully');
  } catch (error) {
    logger.error('Error updating permission scope', { error });
    return next(error);
  }
};

/**
 * Warm permission cache
 */
export const warmCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const tenantId = (req as any).tenantId;

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    const service = container.resolve(DynamicPermissionService);
    await service.warmCache(tenantId);

    logger.info('Permission cache warmed', {
      userId: req.user.id,
      tenantId
    });

    return sendSuccess(res, null, 'Permission cache warmed successfully');
  } catch (error) {
    logger.error('Error warming permission cache', { error });
    return next(error);
  }
};

/**
 * Export permissions to CSV
 */
export const exportPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isSuperAdmin = (req as any).isSuperAdmin;
    const tenantId = (req as any).tenantId;
    const roleFilter = req.query['role'] as UserRole | undefined;

    if (!req.user) {
      sendForbidden(res, 'Authentication required');
      return;
    }

    const prisma = isSuperAdmin ? (req as any).prisma : (req as any).prisma;

    const whereClause: any = {};
    if (!isSuperAdmin) {
      whereClause.tenantId = tenantId;
    }
    if (roleFilter) {
      whereClause.role = roleFilter;
    }

    const permissions = await prisma.rolePermission.findMany({
      where: whereClause,
      select: {
        role: true,
        resource: true,
        operation: true,
        allowed: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { role: 'asc' },
        { resource: 'asc' },
        { operation: 'asc' }
      ]
    });

    // Build CSV
    const headers = ['Role', 'Resource', 'Operation', 'Allowed', 'Tenant ID', 'Created At', 'Updated At'];
    const rows = permissions.map((p: any) => [
      p.role,
      p.resource,
      p.operation,
      p.allowed ? 'true' : 'false',
      p.tenantId,
      p.createdAt.toISOString(),
      p.updatedAt.toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: string[]) => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="permissions-${roleFilter || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

    logger.info('Permissions exported', {
      userId: req.user.id,
      count: permissions.length,
      roleFilter
    });
  } catch (error) {
    logger.error('Error exporting permissions', { error });
    next(error);
  }
};
