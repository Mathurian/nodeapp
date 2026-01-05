/**
 * PermissionAuditService Unit Tests
 * Tests for Phase 2.2 - Add Permission Audit Trail
 *
 * Verifies that:
 * - Permission changes are logged correctly
 * - Permission checks are audited
 * - Bulk operations are tracked
 * - History queries work correctly
 * - Statistics and summaries are accurate
 * - Export functionality works
 */

import 'reflect-metadata';
import { PermissionAuditService } from '../../../src/services/PermissionAuditService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('PermissionAuditService - Audit Trail Tests', () => {
  let service: PermissionAuditService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockResource = 'events';
  const mockOperation = 'create';
  const mockRole = 'JUDGE';

  const createMockAuditLog = (overrides: any = {}) => ({
    id: 'log-123',
    action: 'permission.granted',
    resourceType: 'Permission',
    resourceId: 'events:create',
    userId: mockUserId,
    logLevel: 'INFO',
    details: {
      resource: mockResource,
      operation: mockOperation,
      granted: true,
      role: mockRole,
      reason: 'Test reason',
      timestamp: new Date().toISOString()
    },
    createdAt: new Date(),
    tenantId: mockTenantId,
    ...overrides
  });

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new PermissionAuditService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('logPermissionChange', () => {
    it('should log permission granted event', async () => {
      const mockLog = createMockAuditLog();
      mockPrisma.activityLog.create.mockResolvedValue(mockLog as any);

      const result = await service.logPermissionChange({
        resource: mockResource,
        operation: mockOperation,
        granted: true,
        role: mockRole,
        changedBy: mockUserId,
        reason: 'Test reason',
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'permission.granted',
          resourceType: 'Permission',
          resourceId: 'events:create',
          userId: mockUserId,
          logLevel: 'INFO',
          tenantId: mockTenantId
        })
      });

      expect(result.action).toBe('permission.granted');
      expect(result.details).toMatchObject({
        resource: mockResource,
        operation: mockOperation,
        granted: true,
        role: mockRole
      });
    });

    it('should log permission revoked event', async () => {
      const mockLog = createMockAuditLog({ action: 'permission.revoked' });
      mockPrisma.activityLog.create.mockResolvedValue(mockLog as any);

      const result = await service.logPermissionChange({
        resource: mockResource,
        operation: mockOperation,
        granted: false,
        role: mockRole,
        changedBy: mockUserId,
        reason: 'Security policy',
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'permission.revoked'
        })
      });
    });

    it('should include metadata in audit log', async () => {
      const mockLog = createMockAuditLog();
      mockPrisma.activityLog.create.mockResolvedValue(mockLog as any);

      await service.logPermissionChange({
        resource: mockResource,
        operation: mockOperation,
        granted: true,
        role: mockRole,
        changedBy: mockUserId,
        tenantId: mockTenantId,
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0'
          })
        })
      });
    });

    it('should format resourceId correctly', async () => {
      const mockLog = createMockAuditLog();
      mockPrisma.activityLog.create.mockResolvedValue(mockLog as any);

      await service.logPermissionChange({
        resource: 'contests',
        operation: 'delete',
        granted: true,
        role: mockRole,
        changedBy: mockUserId,
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceId: 'contests:delete'
        })
      });
    });
  });

  describe('logPermissionCheck', () => {
    it('should log denied permission check', async () => {
      mockPrisma.activityLog.create.mockResolvedValue(createMockAuditLog() as any);

      await service.logPermissionCheck(
        mockUserId,
        mockRole,
        mockResource,
        mockOperation,
        false, // denied
        mockTenantId
      );

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'permission.check.denied',
          logLevel: 'WARNING',
          details: expect.objectContaining({
            resource: mockResource,
            operation: mockOperation,
            role: mockRole,
            allowed: false
          })
        })
      });
    });

    it('should NOT log allowed permission checks', async () => {
      await service.logPermissionCheck(
        mockUserId,
        mockRole,
        mockResource,
        mockOperation,
        true, // allowed
        mockTenantId
      );

      expect(mockPrisma.activityLog.create).not.toHaveBeenCalled();
    });

    it('should include metadata in permission check log', async () => {
      mockPrisma.activityLog.create.mockResolvedValue(createMockAuditLog() as any);

      await service.logPermissionCheck(
        mockUserId,
        mockRole,
        mockResource,
        mockOperation,
        false,
        mockTenantId,
        { requestPath: '/api/events', method: 'POST' }
      );

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.objectContaining({
            requestPath: '/api/events',
            method: 'POST'
          })
        })
      });
    });
  });

  describe('logBulkPermissionChange', () => {
    it('should log multiple permission changes', async () => {
      const changes = [
        { resource: 'events', operation: 'create', granted: true, role: 'JUDGE' },
        { resource: 'events', operation: 'update', granted: true, role: 'JUDGE' },
        { resource: 'events', operation: 'delete', granted: false, role: 'JUDGE' }
      ];

      mockPrisma.activityLog.createMany.mockResolvedValue({ count: 3 });

      const count = await service.logBulkPermissionChange(
        changes,
        mockUserId,
        'Bulk permission update',
        mockTenantId
      );

      expect(count).toBe(3);
      expect(mockPrisma.activityLog.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'permission.granted',
            resourceId: 'events:create',
            details: expect.objectContaining({ bulkOperation: true })
          }),
          expect.objectContaining({
            action: 'permission.granted',
            resourceId: 'events:update'
          }),
          expect.objectContaining({
            action: 'permission.revoked',
            resourceId: 'events:delete'
          })
        ])
      });
    });

    it('should handle empty bulk changes', async () => {
      mockPrisma.activityLog.createMany.mockResolvedValue({ count: 0 });

      const count = await service.logBulkPermissionChange(
        [],
        mockUserId,
        'Empty bulk',
        mockTenantId
      );

      expect(count).toBe(0);
    });
  });

  describe('getPermissionHistory', () => {
    it('should return paginated permission history', async () => {
      const mockLogs = [
        createMockAuditLog({ id: 'log-1' }),
        createMockAuditLog({ id: 'log-2' })
      ];

      mockPrisma.activityLog.count.mockResolvedValue(10);
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.getPermissionHistory({
        tenantId: mockTenantId,
        limit: 2,
        offset: 0
      });

      expect(result.entries).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('should filter by role', async () => {
      mockPrisma.activityLog.count.mockResolvedValue(5);
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      await service.getPermissionHistory({
        role: 'JUDGE',
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            details: expect.objectContaining({
              path: ['role'],
              equals: 'JUDGE'
            })
          })
        })
      );
    });

    it('should filter by resource', async () => {
      mockPrisma.activityLog.count.mockResolvedValue(3);
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      await service.getPermissionHistory({
        resource: 'events',
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalled();
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrisma.activityLog.count.mockResolvedValue(20);
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      await service.getPermissionHistory({
        startDate,
        endDate,
        tenantId: mockTenantId
      });

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate
            }
          })
        })
      );
    });

    it('should use default limit and offset', async () => {
      mockPrisma.activityLog.count.mockResolvedValue(150);
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      const result = await service.getPermissionHistory({
        tenantId: mockTenantId
      });

      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });
  });

  describe('getPermissionHistoryByRole', () => {
    it('should return history for specific role', async () => {
      const mockLogs = [createMockAuditLog(), createMockAuditLog()];

      mockPrisma.activityLog.count.mockResolvedValue(2);
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.getPermissionHistoryByRole(
        'JUDGE',
        mockTenantId
      );

      expect(result).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      mockPrisma.activityLog.count.mockResolvedValue(50);
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      await service.getPermissionHistoryByRole('JUDGE', mockTenantId, 25);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25
        })
      );
    });
  });

  describe('getRecentPermissionDenials', () => {
    it('should return denials from last 24 hours by default', async () => {
      const mockDenials = [
        createMockAuditLog({ action: 'permission.check.denied' }),
        createMockAuditLog({ action: 'permission.check.denied' })
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(mockDenials as any);

      const result = await service.getRecentPermissionDenials(mockTenantId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'permission.check.denied'
          })
        })
      );
    });

    it('should filter by custom time window', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([createMockAuditLog()] as any);

      await service.getRecentPermissionDenials(mockTenantId, 48);

      const callArgs = mockPrisma.activityLog.findMany.mock.calls[0][0];
      const since = (callArgs?.where as any)?.createdAt?.gte;

      // Verify it's approximately 48 hours ago
      const expectedTime = Date.now() - 48 * 60 * 60 * 1000;
      expect(Math.abs(since.getTime() - expectedTime)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('getPermissionDenialStats', () => {
    it('should aggregate denial statistics', async () => {
      const mockDenials = [
        {
          userId: 'user-1',
          details: { role: 'JUDGE', resource: 'events', operation: 'delete' }
        },
        {
          userId: 'user-1',
          details: { role: 'JUDGE', resource: 'events', operation: 'delete' }
        },
        {
          userId: 'user-2',
          details: { role: 'CONTESTANT', resource: 'scores', operation: 'update' }
        }
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(mockDenials as any);

      const stats = await service.getPermissionDenialStats(mockTenantId);

      expect(stats.totalDenials).toBe(3);
      expect(stats.denialsByRole['JUDGE']).toBe(2);
      expect(stats.denialsByRole['CONTESTANT']).toBe(1);
      expect(stats.denialsByResource['events']).toBe(2);
      expect(stats.denialsByResource['scores']).toBe(1);
      expect(stats.denialsByUser['user-1']).toBe(2);
      expect(stats.denialsByUser['user-2']).toBe(1);
    });

    it('should identify top denied operations', async () => {
      const mockDenials = [
        { userId: 'user-1', details: { role: 'JUDGE', resource: 'events', operation: 'delete' } },
        { userId: 'user-2', details: { role: 'JUDGE', resource: 'events', operation: 'delete' } },
        { userId: 'user-3', details: { role: 'JUDGE', resource: 'events', operation: 'delete' } },
        { userId: 'user-4', details: { role: 'CONTESTANT', resource: 'scores', operation: 'view' } }
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(mockDenials as any);

      const stats = await service.getPermissionDenialStats(mockTenantId);

      expect(stats.topDeniedOperations[0]).toEqual({
        resource: 'events',
        operation: 'delete',
        count: 3
      });
      expect(stats.topDeniedOperations[1]).toEqual({
        resource: 'scores',
        operation: 'view',
        count: 1
      });
    });

    it('should handle empty denials', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);

      const stats = await service.getPermissionDenialStats(mockTenantId);

      expect(stats.totalDenials).toBe(0);
      expect(stats.denialsByRole).toEqual({});
      expect(stats.topDeniedOperations).toEqual([]);
    });
  });

  describe('getAuditSummary', () => {
    it('should provide summary statistics', async () => {
      const mockLogs = [
        { action: 'permission.granted', userId: 'user-1', details: { role: 'JUDGE', resource: 'events' } },
        { action: 'permission.granted', userId: 'user-1', details: { role: 'JUDGE', resource: 'contests' } },
        { action: 'permission.revoked', userId: 'user-2', details: { role: 'CONTESTANT', resource: 'scores' } },
        { action: 'permission.check.denied', userId: 'user-3', details: { role: 'EMCEE', resource: 'admin' } }
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const summary = await service.getAuditSummary(mockTenantId, startDate, endDate);

      expect(summary.totalChanges).toBe(4);
      expect(summary.grantsCount).toBe(2);
      expect(summary.revokesCount).toBe(1);
      expect(summary.denialsCount).toBe(1);
      expect(summary.uniqueUsers).toBe(3);
      expect(summary.changesByRole['JUDGE']).toBe(2);
      expect(summary.changesByResource['events']).toBe(1);
    });

    it('should handle empty logs', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);

      const summary = await service.getAuditSummary(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(summary.totalChanges).toBe(0);
      expect(summary.grantsCount).toBe(0);
      expect(summary.uniqueUsers).toBe(0);
    });
  });

  describe('exportAuditLogs', () => {
    const mockLogs = [
      createMockAuditLog({
        createdAt: new Date('2024-01-01T10:00:00Z'),
        details: {
          role: 'JUDGE',
          resource: 'events',
          operation: 'create',
          granted: true,
          reason: 'User promotion'
        }
      })
    ];

    it('should export logs as JSON', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.exportAuditLogs(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        'json'
      );

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
    });

    it('should export logs as CSV', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.exportAuditLogs(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        'csv'
      );

      const lines = result.split('\n');
      expect(lines[0]).toContain('Timestamp');
      expect(lines[0]).toContain('Action');
      expect(lines.length).toBeGreaterThan(1); // Header + at least one data row
    });

    it('should escape CSV special characters', async () => {
      const logsWithSpecialChars = [
        createMockAuditLog({
          details: {
            reason: 'Contains "quotes" and, commas'
          }
        })
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(logsWithSpecialChars as any);

      const result = await service.exportAuditLogs(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        'csv'
      );

      expect(result).toContain('""'); // Escaped quotes
    });

    it('should default to JSON format', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await service.exportAuditLogs(
        mockTenantId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe('deleteOldAuditLogs', () => {
    it('should delete logs older than specified date', async () => {
      const olderThan = new Date('2023-01-01');
      mockPrisma.activityLog.deleteMany.mockResolvedValue({ count: 100 });

      const deleted = await service.deleteOldAuditLogs(mockTenantId, olderThan);

      expect(deleted).toBe(100);
      expect(mockPrisma.activityLog.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          action: { startsWith: 'permission.' },
          createdAt: { lt: olderThan }
        }
      });
    });

    it('should return 0 when no logs deleted', async () => {
      mockPrisma.activityLog.deleteMany.mockResolvedValue({ count: 0 });

      const deleted = await service.deleteOldAuditLogs(
        mockTenantId,
        new Date('2020-01-01')
      );

      expect(deleted).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null details gracefully', async () => {
      const logsWithNullDetails = [
        { userId: 'user-1', details: null },
        { userId: 'user-2', details: {} }
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(logsWithNullDetails as any);

      const stats = await service.getPermissionDenialStats(mockTenantId);

      expect(stats.totalDenials).toBe(2);
      expect(stats.denialsByRole['unknown']).toBe(2);
    });

    it('should handle missing optional fields in audit logs', async () => {
      mockPrisma.activityLog.create.mockResolvedValue(createMockAuditLog() as any);

      await service.logPermissionChange({
        resource: mockResource,
        operation: mockOperation,
        granted: true,
        role: mockRole,
        changedBy: mockUserId,
        tenantId: mockTenantId
        // No reason provided
      });

      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: expect.not.objectContaining({ reason: expect.anything() })
        })
      });
    });
  });
});
