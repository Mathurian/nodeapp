/**
 * DynamicPermissionService Unit Tests
 * Tests for Phase 4 - Dynamic CRUD Permissions System
 *
 * Verifies that:
 * - Permissions are loaded from database correctly
 * - Caching works as expected
 * - Permission updates are validated and logged
 * - Security restrictions are enforced
 * - Wildcard matching works correctly
 */

import 'reflect-metadata';
import { DynamicPermissionService } from '../../../src/services/DynamicPermissionService';
import { PrismaClient, UserRole } from '@prisma/client';
import { CacheService } from '../../../src/services/CacheService';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('DynamicPermissionService - Dynamic Permissions Tests', () => {
  let service: DynamicPermissionService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockCacheService: DeepMockProxy<CacheService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockRole: UserRole = 'JUDGE';

  const createMockPermission = (overrides: any = {}) => ({
    id: 'perm-123',
    role: mockRole,
    resource: 'events',
    operation: 'read',
    allowed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: mockUserId,
    tenantId: mockTenantId,
    ...overrides
  });

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    mockCacheService = mockDeep<CacheService>();
    service = new DynamicPermissionService(mockPrisma as any, mockCacheService as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
    mockReset(mockCacheService);
  });

  describe('getPermissions', () => {
    it('should return cached permissions if available', async () => {
      const cachedPermissions = JSON.stringify(['events:read', 'scores:write']);
      mockCacheService.get.mockResolvedValue(cachedPermissions);

      const result = await service.getPermissions(mockRole, mockTenantId);

      expect(result).toEqual(['events:read', 'scores:write']);
      expect(mockCacheService.get).toHaveBeenCalledWith(`permissions:${mockTenantId}:${mockRole}`);
      expect(mockPrisma.rolePermission.findMany).not.toHaveBeenCalled();
    });

    it('should load from database if cache miss', async () => {
      const mockPerms = [
        { resource: 'events', operation: 'read' },
        { resource: 'scores', operation: 'write' }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      const result = await service.getPermissions(mockRole, mockTenantId);

      expect(result).toEqual(['events:read', 'scores:write']);
      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith({
        where: { role: mockRole, tenantId: mockTenantId, allowed: true },
        select: { resource: true, operation: true }
      });
    });

    it('should cache loaded permissions', async () => {
      const mockPerms = [
        { resource: 'events', operation: 'read' }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      await service.getPermissions(mockRole, mockTenantId);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `permissions:${mockTenantId}:${mockRole}`,
        JSON.stringify(['events:read']),
        300 // TTL
      );
    });

    it('should handle wildcard operations', async () => {
      const mockPerms = [
        { resource: 'events', operation: '*' }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      const result = await service.getPermissions(mockRole, mockTenantId);

      expect(result).toEqual(['events:*']);
    });

    it('should only return allowed permissions', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue([] as any);

      await service.getPermissions(mockRole, mockTenantId);

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ allowed: true })
        })
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true for exact permission match', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(['events:read']));

      const result = await service.hasPermission(mockRole, 'events', 'read', mockTenantId);

      expect(result).toBe(true);
    });

    it('should return true for wildcard resource match', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(['events:*']));

      const result = await service.hasPermission(mockRole, 'events', 'create', mockTenantId);

      expect(result).toBe(true);
    });

    it('should return true for global wildcard', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(['*:*']));

      const result = await service.hasPermission(mockRole, 'anything', 'anything', mockTenantId);

      expect(result).toBe(true);
    });

    it('should return false when permission not granted', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(['events:read']));

      const result = await service.hasPermission(mockRole, 'scores', 'write', mockTenantId);

      expect(result).toBe(false);
    });
  });

  describe('updatePermission', () => {
    it('should allow SUPER_ADMIN to update permissions', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((callback: any) =>
        typeof callback === 'function' ? callback(mockPrisma) : Promise.resolve(callback)
      );

      await service.updatePermission({
        role: 'JUDGE',
        resource: 'events',
        operation: 'create',
        allowed: true,
        userId: mockUserId,
        userRole: 'SUPER_ADMIN',
        tenantId: mockTenantId
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should DENY non-admin users from updating permissions', async () => {
      await expect(
        service.updatePermission({
          role: 'JUDGE',
          resource: 'events',
          operation: 'create',
          allowed: true,
          userId: mockUserId,
          userRole: 'JUDGE',
          tenantId: mockTenantId
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should prevent removing own admin permissions', async () => {
      await expect(
        service.updatePermission({
          role: 'ADMIN',
          resource: 'users',
          operation: 'manage',
          allowed: false,
          userId: mockUserId,
          userRole: 'ADMIN',
          tenantId: mockTenantId
        })
      ).rejects.toThrow('Cannot remove your own admin permissions');
    });

    it('should prevent non-SUPER_ADMIN from granting SUPER_ADMIN permissions', async () => {
      await expect(
        service.updatePermission({
          role: 'SUPER_ADMIN',
          resource: 'system',
          operation: 'manage',
          allowed: true,
          userId: mockUserId,
          userRole: 'ADMIN',
          tenantId: mockTenantId
        })
      ).rejects.toThrow('Only SUPER_ADMIN can grant SUPER_ADMIN permissions');
    });

    it('should create audit log when updating permission', async () => {
      const existingPerm = createMockPermission({ allowed: false });

      mockPrisma.rolePermission.findUnique.mockResolvedValue(existingPerm as any);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      await service.updatePermission({
        role: 'JUDGE',
        resource: 'events',
        operation: 'create',
        allowed: true,
        userId: mockUserId,
        userRole: 'SUPER_ADMIN',
        tenantId: mockTenantId,
        reason: 'Grant permission'
      });

      const transactionCalls = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionCalls).toHaveLength(2); // Upsert + audit log
    });

    it('should invalidate cache after update', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      await service.updatePermission({
        role: 'JUDGE',
        resource: 'events',
        operation: 'create',
        allowed: true,
        userId: mockUserId,
        userRole: 'SUPER_ADMIN',
        tenantId: mockTenantId
      });

      expect(mockCacheService.del).toHaveBeenCalledWith(`permissions:${mockTenantId}:JUDGE`);
    });
  });

  describe('bulkUpdatePermissions', () => {
    it('should update multiple permissions', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      const count = await service.bulkUpdatePermissions({
        permissions: [
          { role: 'JUDGE', resource: 'events', operation: 'read', allowed: true },
          { role: 'JUDGE', resource: 'scores', operation: 'write', allowed: true }
        ],
        userId: mockUserId,
        userRole: 'SUPER_ADMIN',
        tenantId: mockTenantId,
        reason: 'Bulk grant'
      });

      expect(count).toBe(2);
    });

    it('should invalidate cache for all affected roles', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      await service.bulkUpdatePermissions({
        permissions: [
          { role: 'JUDGE', resource: 'events', operation: 'read', allowed: true },
          { role: 'CONTESTANT', resource: 'scores', operation: 'read', allowed: true }
        ],
        userId: mockUserId,
        userRole: 'SUPER_ADMIN',
        tenantId: mockTenantId,
        reason: 'Bulk grant'
      });

      expect(mockCacheService.del).toHaveBeenCalledWith(`permissions:${mockTenantId}:JUDGE`);
      expect(mockCacheService.del).toHaveBeenCalledWith(`permissions:${mockTenantId}:CONTESTANT`);
    });
  });

  describe('getPermissionDetails', () => {
    it('should return full permission details', async () => {
      const mockPerms = [
        createMockPermission({ resource: 'events', operation: 'read', allowed: true }),
        createMockPermission({ resource: 'scores', operation: 'write', allowed: false })
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      const result = await service.getPermissionDetails('JUDGE', mockTenantId);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('resource');
      expect(result[0]).toHaveProperty('allowed');
      expect(result[0]).toHaveProperty('createdAt');
    });

    it('should sort results by resource and operation', async () => {
      mockPrisma.rolePermission.findMany.mockResolvedValue([] as any);

      await service.getPermissionDetails('JUDGE', mockTenantId);

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ resource: 'asc' }, { operation: 'asc' }]
        })
      );
    });
  });

  describe('clonePermissions', () => {
    it('should clone permissions from source to target role', async () => {
      const sourcePerms = [
        { resource: 'events', operation: 'read', allowed: true },
        { resource: 'scores', operation: 'write', allowed: true }
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(sourcePerms as any);
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      const count = await service.clonePermissions(
        'JUDGE',
        'EMCEE',
        mockUserId,
        'SUPER_ADMIN',
        mockTenantId
      );

      expect(count).toBe(2);
    });

    it('should only allow SUPER_ADMIN and ADMIN to clone', async () => {
      await expect(
        service.clonePermissions(
          'JUDGE',
          'EMCEE',
          mockUserId,
          'ORGANIZER',
          mockTenantId
        )
      ).rejects.toThrow('Only SUPER_ADMIN/ADMIN can clone permissions');
    });
  });

  describe('comparePermissions', () => {
    it('should identify permissions unique to each role', async () => {
      mockCacheService.get.mockImplementation((key: string) => {
        if (key.includes('JUDGE')) {
          return Promise.resolve(JSON.stringify(['events:read', 'scores:write']));
        }
        if (key.includes('CONTESTANT')) {
          return Promise.resolve(JSON.stringify(['events:read', 'profile:write']));
        }
        return Promise.resolve(null);
      });

      mockPrisma.rolePermission.findMany
        .mockResolvedValueOnce([
          { resource: 'events', operation: 'read', allowed: true },
          { resource: 'scores', operation: 'write', allowed: true }
        ] as any)
        .mockResolvedValueOnce([
          { resource: 'events', operation: 'read', allowed: true },
          { resource: 'profile', operation: 'write', allowed: true }
        ] as any);

      const result = await service.comparePermissions('JUDGE', 'CONTESTANT', mockTenantId);

      expect(result.common).toContain('events:read');
      expect(result.role1Only).toContain('scores:write');
      expect(result.role2Only).toContain('profile:write');
    });
  });

  describe('getPermissionStats', () => {
    it('should aggregate permission statistics', async () => {
      const mockPerms = [
        { role: 'JUDGE', resource: 'events', allowed: true },
        { role: 'JUDGE', resource: 'scores', allowed: true },
        { role: 'CONTESTANT', resource: 'events', allowed: true },
        { role: 'CONTESTANT', resource: 'scores', allowed: false }
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      const stats = await service.getPermissionStats(mockTenantId);

      expect(stats.totalPermissions).toBe(4);
      expect(stats.allowedCount).toBe(3);
      expect(stats.deniedCount).toBe(1);
      expect(stats.permissionsByRole['JUDGE']).toBe(2);
      expect(stats.permissionsByRole['CONTESTANT']).toBe(2);
    });

    it('should identify most common resources', async () => {
      const mockPerms = [
        { role: 'JUDGE', resource: 'events', allowed: true },
        { role: 'CONTESTANT', resource: 'events', allowed: true },
        { role: 'JUDGE', resource: 'events', allowed: true },
        { role: 'CONTESTANT', resource: 'scores', allowed: true }
      ];

      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      const stats = await service.getPermissionStats(mockTenantId);

      expect(stats.mostCommonResources[0].resource).toBe('events');
      expect(stats.mostCommonResources[0].count).toBe(3);
    });
  });

  describe('deletePermission', () => {
    it('should allow SUPER_ADMIN to delete permissions', async () => {
      const existingPerm = createMockPermission();
      mockPrisma.rolePermission.findUnique.mockResolvedValue(existingPerm as any);
      mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

      await service.deletePermission(
        'JUDGE',
        'events',
        'read',
        mockUserId,
        'SUPER_ADMIN',
        mockTenantId
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if permission not found', async () => {
      mockPrisma.rolePermission.findUnique.mockResolvedValue(null);

      await expect(
        service.deletePermission(
          'JUDGE',
          'events',
          'read',
          mockUserId,
          'SUPER_ADMIN',
          mockTenantId
        )
      ).rejects.toThrow('Permission not found');
    });

    it('should prevent non-admin from deleting permissions', async () => {
      await expect(
        service.deletePermission(
          'JUDGE',
          'events',
          'read',
          mockUserId,
          'ORGANIZER',
          mockTenantId
        )
      ).rejects.toThrow('Only SUPER_ADMIN/ADMIN can delete permissions');
    });
  });

  describe('warmCache', () => {
    it('should load permissions for all roles', async () => {
      const mockPerms = [
        { resource: 'events', operation: 'read' }
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue(mockPerms as any);

      await service.warmCache(mockTenantId);

      // Should load all 9 roles
      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledTimes(9);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permission list', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockPrisma.rolePermission.findMany.mockResolvedValue([]);

      const result = await service.getPermissions(mockRole, mockTenantId);

      expect(result).toEqual([]);
    });

    it('should handle concurrent permission checks', async () => {
      mockCacheService.get.mockResolvedValue(JSON.stringify(['events:read']));

      const promises = [
        service.hasPermission(mockRole, 'events', 'read', mockTenantId),
        service.hasPermission(mockRole, 'events', 'read', mockTenantId),
        service.hasPermission(mockRole, 'events', 'read', mockTenantId)
      ];

      const results = await Promise.all(promises);

      expect(results.every(r => r === true)).toBe(true);
    });
  });
});
