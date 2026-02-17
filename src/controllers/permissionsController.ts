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

const logger = createLogger('permissions');

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
      whereClause.tenantId = tenantId;
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

    // Bootstrap defaults for tenant-scoped admins/organizers if table is empty.
    if (!isSuperAdmin && permissions.length === 0 && tenantId && req.user?.id) {
      await service.initializeDefaultsForTenant(tenantId, req.user.id);
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

    logger.info('Fetched all permissions', {
      userId: req.user.id,
      role: req.user.role,
      isSuperAdmin,
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

    if (!req.user) {
      return sendForbidden(res, 'Authentication required');
    }

    const service = container.resolve(DynamicPermissionService);

    // Ensure tenant has initial permission rows for GUI stats.
    if (!isSuperAdmin && tenantId && req.user?.id) {
      await service.initializeDefaultsForTenant(tenantId, req.user.id);
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

      const stats = {
        totalPermissions: allPermissions.length,
        permissionsByRole: {} as Record<string, number>,
        allowedCount: 0,
        deniedCount: 0
      };

      allPermissions.forEach((perm: any) => {
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
      const stats = await service.getPermissionStats(tenantId);
      return sendSuccess(res, stats, 'Permission statistics retrieved successfully');
    }
  } catch (error) {
    logger.error('Error fetching permission stats', { error });
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
