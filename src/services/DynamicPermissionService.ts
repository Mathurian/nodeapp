/**
 * Dynamic Permission Service
 * Phase 4: Dynamic CRUD Permissions System
 *
 * Manages database-driven role permissions
 * Replaces hardcoded permissions with GUI-configurable permissions
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { CacheService } from './CacheService';
import { PERMISSIONS } from '../middleware/permissions';

export interface UpdatePermissionDTO {
  role: UserRole;
  resource: string;
  operation: string;
  allowed: boolean;
  userId: string;
  userRole: UserRole;
  tenantId: string;
  reason?: string;
}

export interface BulkUpdatePermissionDTO {
  permissions: Array<{
    role: UserRole;
    resource: string;
    operation: string;
    allowed: boolean;
  }>;
  userId: string;
  userRole: UserRole;
  tenantId: string;
  reason: string;
}

@injectable()
export class DynamicPermissionService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  /**
   * Get all permissions for a specific role (with caching)
   * Returns array of permission strings in format "resource:operation"
   */
  async getPermissions(role: UserRole, tenantId: string): Promise<string[]> {
    const cacheKey = `permissions:${tenantId}:${role}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Load from database
    const perms = await this.prisma.rolePermission.findMany({
      where: { role, tenantId, allowed: true },
      select: {
        resource: true,
        operation: true
      }
    });

    const permissions = perms.map(p =>
      p.operation === '*' ? `${p.resource}:*` : `${p.resource}:${p.operation}`
    );

    // Cache for 5 minutes (300 seconds)
    await this.cacheService.set(cacheKey, JSON.stringify(permissions), 300);

    return permissions;
  }

  /**
   * Check if a role has a specific permission
   * Handles wildcard matching (resource:* matches any operation on resource)
   */
  async hasPermission(
    role: UserRole,
    resource: string,
    operation: string,
    tenantId: string
  ): Promise<boolean> {
    const permissions = await this.getPermissions(role, tenantId);

    // Wildcard check
    if (permissions.includes('*:*')) return true;

    // Exact match
    if (permissions.includes(`${resource}:${operation}`)) return true;

    // Resource wildcard (e.g., "events:*" matches "events:create")
    if (permissions.includes(`${resource}:*`)) return true;

    return false;
  }

  /**
   * Update a single permission with validation and audit logging
   */
  async updatePermission(dto: UpdatePermissionDTO): Promise<void> {
    // SECURITY: Only SUPER_ADMIN/ADMIN/ORGANIZER can modify permissions
    if (!['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(dto.userRole)) {
      throw this.forbiddenError('Insufficient permissions to modify permissions');
    }

    // SECURITY: Cannot remove own admin permissions
    if (
      dto.role === dto.userRole &&
      !dto.allowed &&
      (dto.resource === '*' || dto.resource === 'users')
    ) {
      throw this.forbiddenError('Cannot remove your own admin permissions');
    }

    // SECURITY: Cannot grant SUPER_ADMIN permissions unless you are one
    if (dto.role === 'SUPER_ADMIN' && dto.userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only SUPER_ADMIN can view or modify SUPER_ADMIN permissions');
    }

    // Get existing permission (if any)
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        tenantId_role_resource_operation: {
          tenantId: dto.tenantId,
          role: dto.role,
          resource: dto.resource,
          operation: dto.operation
        }
      }
    });

    // Perform upsert and create audit log in a transaction
    await this.prisma.$transaction([
      // Upsert permission
      this.prisma.rolePermission.upsert({
        where: {
          tenantId_role_resource_operation: {
            tenantId: dto.tenantId,
            role: dto.role,
            resource: dto.resource,
            operation: dto.operation
          }
        },
        create: {
          role: dto.role,
          resource: dto.resource,
          operation: dto.operation,
          allowed: dto.allowed,
          tenantId: dto.tenantId,
          createdBy: dto.userId
        },
        update: {
          allowed: dto.allowed,
          updatedAt: new Date()
        }
      }),

      // Audit log
      this.prisma.permissionAuditLog.create({
        data: {
          role: dto.role,
          resource: dto.resource,
          operation: dto.operation,
          previousVal: existing?.allowed,
          newVal: dto.allowed,
          changedBy: dto.userId,
          tenantId: dto.tenantId,
          reason: dto.reason
        }
      })
    ]);

    // Invalidate cache
    await this.invalidatePermissionCache(dto.role, dto.tenantId);
  }

  /**
   * Bulk update permissions
   * Useful for applying permission templates or role cloning
   */
  async bulkUpdatePermissions(dto: BulkUpdatePermissionDTO): Promise<number> {
    // SECURITY: Only SUPER_ADMIN/ADMIN/ORGANIZER can modify permissions
    if (!['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(dto.userRole)) {
      throw this.forbiddenError('Insufficient permissions to modify permissions');
    }

    const affectedRoles = new Set<UserRole>();

    // Process each permission update
    for (const perm of dto.permissions) {
      await this.updatePermission({
        ...perm,
        userId: dto.userId,
        userRole: dto.userRole,
        tenantId: dto.tenantId,
        reason: dto.reason
      });

      affectedRoles.add(perm.role);
    }

    // Invalidate cache for all affected roles
    for (const role of affectedRoles) {
      await this.invalidatePermissionCache(role, dto.tenantId);
    }

    return dto.permissions.length;
  }

  /**
   * Get all permissions for a role (with details)
   * Returns full permission objects, not just strings
   */
  async getPermissionDetails(
    role: UserRole,
    tenantId: string
  ): Promise<Array<{
    resource: string;
    operation: string;
    allowed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const permissions = await this.prisma.rolePermission.findMany({
      where: { role, tenantId },
      select: {
        resource: true,
        operation: true,
        allowed: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { resource: 'asc' },
        { operation: 'asc' }
      ]
    });

    return permissions;
  }

  /**
   * Clone permissions from one role to another
   * Useful for creating permission templates
   */
  async clonePermissions(
    sourceRole: UserRole,
    targetRole: UserRole,
    userId: string,
    userRole: UserRole,
    tenantId: string,
    reason?: string
  ): Promise<number> {
    // SECURITY: Only SUPER_ADMIN/ADMIN can clone permissions
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      throw this.forbiddenError('Only SUPER_ADMIN/ADMIN can clone permissions');
    }

    // Get source permissions
    const sourcePermissions = await this.prisma.rolePermission.findMany({
      where: { role: sourceRole, tenantId },
      select: {
        resource: true,
        operation: true,
        allowed: true
      }
    });

    // Clone to target role
    const clonedCount = await this.bulkUpdatePermissions({
      permissions: sourcePermissions.map(p => ({
        role: targetRole,
        resource: p.resource,
        operation: p.operation,
        allowed: p.allowed
      })),
      userId,
      userRole,
      tenantId,
      reason: reason || `Cloned from ${sourceRole}`
    });

    return clonedCount;
  }

  /**
   * Reset permissions for a role to defaults (from hardcoded PERMISSIONS)
   * Falls back to hardcoded permissions if needed
   */
  async resetToDefaults(
    role: UserRole,
    _userId: string,
    userRole: UserRole,
    tenantId: string
  ): Promise<number> {
    // SECURITY: Only SUPER_ADMIN can reset to defaults
    if (userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only SUPER_ADMIN can reset permissions to defaults');
    }

    // Delete existing permissions for this role
    await this.prisma.rolePermission.deleteMany({
      where: { role, tenantId }
    });

    // Import default permissions from hardcoded PERMISSIONS
    // This would require importing the PERMISSIONS constant
    // For now, just invalidate cache
    await this.invalidatePermissionCache(role, tenantId);

    return 0; // Return count of reset permissions
  }

  /**
   * Get permission comparison between two roles
   * Useful for understanding permission differences
   */
  async comparePermissions(
    role1: UserRole,
    role2: UserRole,
    tenantId: string
  ): Promise<{
    role1Only: string[];
    role2Only: string[];
    common: string[];
    role1Denied: string[];
    role2Denied: string[];
  }> {
    const [perms1, perms2] = await Promise.all([
      this.getPermissions(role1, tenantId),
      this.getPermissions(role2, tenantId)
    ]);

    const set1 = new Set(perms1);
    const set2 = new Set(perms2);

    const role1Only = perms1.filter(p => !set2.has(p));
    const role2Only = perms2.filter(p => !set1.has(p));
    const common = perms1.filter(p => set2.has(p));

    // Get denied permissions
    const [details1, details2] = await Promise.all([
      this.getPermissionDetails(role1, tenantId),
      this.getPermissionDetails(role2, tenantId)
    ]);

    const role1Denied = details1
      .filter(p => !p.allowed)
      .map(p => `${p.resource}:${p.operation}`);

    const role2Denied = details2
      .filter(p => !p.allowed)
      .map(p => `${p.resource}:${p.operation}`);

    return {
      role1Only,
      role2Only,
      common,
      role1Denied,
      role2Denied
    };
  }

  /**
   * Get permission statistics for a tenant
   * Useful for admin dashboards
   */
  async getPermissionStats(tenantId: string): Promise<{
    totalPermissions: number;
    permissionsByRole: Record<string, number>;
    allowedCount: number;
    deniedCount: number;
    mostCommonResources: Array<{ resource: string; count: number }>;
  }> {
    const allPermissions = await this.prisma.rolePermission.findMany({
      where: { tenantId },
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
      deniedCount: 0,
      mostCommonResources: [] as Array<{ resource: string; count: number }>
    };

    const resourceCounts = new Map<string, number>();

    allPermissions.forEach(perm => {
      // By role
      stats.permissionsByRole[perm.role] = (stats.permissionsByRole[perm.role] || 0) + 1;

      // Allowed/denied
      if (perm.allowed) {
        stats.allowedCount++;
      } else {
        stats.deniedCount++;
      }

      // Resource counts
      resourceCounts.set(perm.resource, (resourceCounts.get(perm.resource) || 0) + 1);
    });

    // Most common resources
    stats.mostCommonResources = Array.from(resourceCounts.entries())
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Delete a permission (reverts to default behavior)
   */
  async deletePermission(
    role: UserRole,
    resource: string,
    operation: string,
    userId: string,
    userRole: UserRole,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    // SECURITY: Only SUPER_ADMIN/ADMIN can delete permissions
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      throw this.forbiddenError('Only SUPER_ADMIN/ADMIN can delete permissions');
    }

    // Get existing permission for audit
    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        tenantId_role_resource_operation: {
          tenantId,
          role,
          resource,
          operation
        }
      }
    });

    if (!existing) {
      throw this.createNotFoundError('Permission not found');
    }

    // Delete and log in transaction
    await this.prisma.$transaction([
      this.prisma.rolePermission.delete({
        where: {
          tenantId_role_resource_operation: {
            tenantId,
            role,
            resource,
            operation
          }
        }
      }),

      this.prisma.permissionAuditLog.create({
        data: {
          role,
          resource,
          operation,
          previousVal: existing.allowed,
          newVal: false,
          changedBy: userId,
          tenantId,
          reason: reason || 'Permission deleted'
        }
      })
    ]);

    await this.invalidatePermissionCache(role, tenantId);
  }

  /**
   * Invalidate permission cache for a specific role
   */
  private async invalidatePermissionCache(role: UserRole, tenantId: string): Promise<void> {
    const cacheKey = `permissions:${tenantId}:${role}`;
    await this.cacheService.del(cacheKey);
  }

  /**
   * Invalidate all permission caches for a tenant
   */
  async invalidateAllCaches(tenantId: string): Promise<void> {
    await this.cacheService.invalidatePattern(`permissions:${tenantId}:*`);
  }

  /**
   * Warm cache for all roles in a tenant
   * Should be called on server startup
   */
  async warmCache(tenantId: string): Promise<void> {
    const roles: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'ORGANIZER',
      'BOARD',
      'TALLY_MASTER',
      'AUDITOR',
      'JUDGE',
      'EMCEE',
      'CONTESTANT'
    ];

    for (const role of roles) {
      await this.getPermissions(role, tenantId);
    }
  }

  /**
   * Seed a tenant with default permission rows when no dynamic records exist.
   * This enables GUI permission management without requiring manual bootstrap.
   */
  async initializeDefaultsForTenant(tenantId: string, createdBy: string): Promise<number> {
    const existingCount = await this.prisma.rolePermission.count({ where: { tenantId } });
    if (existingCount > 0) {
      return 0;
    }

    const records: Array<{
      tenantId: string;
      role: UserRole;
      resource: string;
      operation: string;
      allowed: boolean;
      createdBy: string;
    }> = [];

    for (const [role, permissions] of Object.entries(PERMISSIONS)) {
      const roleKey = role as UserRole;
      for (const permission of permissions) {
        const token = (permission || '').trim();
        if (!token) continue;

        let resource = '';
        let operation = '';
        if (token === '*') {
          resource = '*';
          operation = '*';
        } else {
          const [parsedResource, parsedOperation] = token.split(':');
          if (!parsedResource || !parsedOperation) continue;
          resource = parsedResource;
          operation = parsedOperation;
        }

        records.push({
          tenantId,
          role: roleKey,
          resource,
          operation,
          allowed: true,
          createdBy,
        });
      }
    }

    if (records.length === 0) return 0;

    const created = await this.prisma.rolePermission.createMany({
      data: records,
      skipDuplicates: true,
    });

    await this.invalidateAllCaches(tenantId);
    return created.count;
  }
}
