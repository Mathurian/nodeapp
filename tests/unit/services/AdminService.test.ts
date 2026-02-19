import 'reflect-metadata';
import { AdminService } from '../../../src/services/AdminService';
import { PrismaClient } from '@prisma/client';
import { mockDeep, DeepMockProxy, mockReset } from 'jest-mock-extended';

jest.mock('child_process');
jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock CacheService
jest.mock('../../../src/services/CacheService', () => ({
  CacheService: jest.fn().mockImplementation(() => ({
    getStats: jest.fn().mockResolvedValue({ keys: 10 }),
    flushAll: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock tsyringe container
jest.mock('tsyringe', () => ({
  injectable: () => () => {},
  inject: () => () => {},
  container: {
    resolve: jest.fn().mockReturnValue({
      getStats: jest.fn().mockResolvedValue({ keys: 10 }),
      flushAll: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('AdminService', () => {
  let adminService: AdminService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    adminService = new AdminService(prismaMock as unknown as PrismaClient);
    prismaMock.tenant.findMany.mockResolvedValue([{ id: 'tenant-1' }] as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(prismaMock);
  });

  describe('getDashboardStats', () => {
    it('should return comprehensive dashboard statistics', async () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');

      prismaMock.user.count
        .mockResolvedValueOnce(150) // totalUsers
        .mockResolvedValueOnce(25); // activeUsers

      prismaMock.event.count.mockResolvedValue(10);
      prismaMock.contest.count.mockResolvedValue(30);
      prismaMock.category.count.mockResolvedValue(100);
      prismaMock.score.count.mockResolvedValue(5000);

      prismaMock.backupLog.findFirst.mockResolvedValue({
        id: 'backup1',
        status: 'COMPLETED',
        createdAt: mockDate,
      } as any);

      prismaMock.$queryRaw.mockResolvedValue([{ size: '50 MB' }]);

      const result = await adminService.getDashboardStats();

      expect(result).toMatchObject({
        totalUsers: 150,
        totalEvents: 10,
        totalContests: 30,
        totalCategories: 100,
        totalScores: 5000,
        activeUsers: 25,
        pendingCertifications: 0, // Certifications logic is disabled in service
        certificationBreakdown: {
          judge: 0,
          tallyMaster: 0,
          auditor: 0,
          board: 0,
        },
        systemHealth: 'HEALTHY',
        lastBackup: mockDate.toISOString(),
        databaseSize: '50 MB',
      });

      expect(result.uptime).toBeDefined();
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should handle database size query failure gracefully', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.event.count.mockResolvedValue(5);
      prismaMock.contest.count.mockResolvedValue(15);
      prismaMock.category.count.mockResolvedValue(50);
      prismaMock.score.count.mockResolvedValue(1000);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw
        .mockRejectedValueOnce(new Error('Database size query failed')) // First query fails
        .mockResolvedValue([{ result: 1 }]); // Health check succeeds
      prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('Fallback also failed'));

      const result = await adminService.getDashboardStats();

      expect(result.databaseSize).toBe('N/A');
      expect(result.systemHealth).toBe('HEALTHY');
    });

    it('should set system health to CRITICAL when database is unreachable', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.event.count.mockResolvedValue(5);
      prismaMock.contest.count.mockResolvedValue(15);
      prismaMock.category.count.mockResolvedValue(50);
      prismaMock.score.count.mockResolvedValue(1000);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ size: '50 MB' }]) // Database size query
        .mockRejectedValueOnce(new Error('Connection failed')); // Health check query

      const result = await adminService.getDashboardStats();

      expect(result.systemHealth).toBe('CRITICAL');
    });

    it('should format uptime correctly', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.event.count.mockResolvedValue(1);
      prismaMock.contest.count.mockResolvedValue(2);
      prismaMock.category.count.mockResolvedValue(5);
      prismaMock.score.count.mockResolvedValue(50);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw.mockResolvedValue([{ size: '10 MB' }]);

      const result = await adminService.getDashboardStats();

      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe('string');
    });

    it('should handle null last backup', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.event.count.mockResolvedValue(1);
      prismaMock.contest.count.mockResolvedValue(2);
      prismaMock.category.count.mockResolvedValue(5);
      prismaMock.score.count.mockResolvedValue(50);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw.mockResolvedValue([{ size: '10 MB' }]);

      const result = await adminService.getDashboardStats();

      expect(result.lastBackup).toBeNull();
    });

    it('should throw error when critical data fetch fails', async () => {
      prismaMock.user.count.mockRejectedValue(new Error('Database connection failed'));

      await expect(adminService.getDashboardStats()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getSystemHealth', () => {
    it('should return healthy system status', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ status: 1 }]);

      const result = await adminService.getSystemHealth();

      expect(result).toMatchObject({
        database: 'healthy',
      });
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
    });

    it('should return unhealthy database status on query failure', async () => {
      prismaMock.$queryRaw.mockResolvedValue(null);

      const result = await adminService.getSystemHealth();

      expect(result.database).toBe('unhealthy');
    });
  });

  describe('clearCache', () => {
    it('should return success message with cleared keys count', async () => {
      const result = await adminService.clearCache();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cache cleared');
      expect(result.keysCleared).toBeDefined();
    });
  });

  describe('getActivityLogs', () => {
    it('should retrieve paginated activity logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          userId: 'user1',
          action: 'LOGIN',
          resourceType: 'USER',
          resourceId: 'user1',
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          user: {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            role: 'ADMIN',
          },
        },
      ];

      prismaMock.activityLog.findMany.mockResolvedValue(mockLogs as any);
      prismaMock.activityLog.count.mockResolvedValue(1);

      const result = await adminService.getActivityLogs();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'log1',
        userId: 'user1',
        action: 'LOGIN',
        resourceType: 'USER',
        resource: 'USER',
        resourceId: 'user1',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
      expect(result.pagination).toBeDefined();
    });

    it('should handle logs without user association', async () => {
      const mockLog = {
        id: 'log1',
        userId: null,
        action: 'SYSTEM_EVENT',
        resourceType: 'SYSTEM',
        resourceId: null,
        details: {},
        ipAddress: null,
        userAgent: null,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        user: null,
      };

      prismaMock.activityLog.findMany.mockResolvedValue([mockLog as any]);
      prismaMock.activityLog.count.mockResolvedValue(1);

      const result = await adminService.getActivityLogs();

      expect(result.data[0].user).toBeNull();
    });

    it('should throw error when activity log retrieval fails', async () => {
      prismaMock.activityLog.findMany.mockRejectedValue(new Error('Database error'));

      await expect(adminService.getActivityLogs()).rejects.toThrow('Database error');
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs using activity logs', async () => {
      const mockLogs = [
        {
          id: 'log1',
          userId: 'user1',
          action: 'UPDATE',
          resourceType: 'USER',
          resourceId: 'user1',
          details: { changes: ['role'] },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          user: {
            id: 'user1',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'ADMIN',
          },
        },
      ];

      prismaMock.activityLog.findMany.mockResolvedValue(mockLogs as any);
      prismaMock.activityLog.count.mockResolvedValue(1);

      const result = await adminService.getAuditLogs(50);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('getDatabaseTables', () => {
    it('should retrieve database tables with row counts', async () => {
      const mockTables = [
        { name: 'users' },
        { name: 'events' },
        { name: 'contests' },
      ];

      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce(mockTables) // Table names query
        .mockResolvedValueOnce([{ count: BigInt(150) }]) // users count
        .mockResolvedValueOnce([{ count: BigInt(10) }]) // events count
        .mockResolvedValueOnce([{ count: BigInt(30) }]); // contests count

      const result = await adminService.getDatabaseTables();

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'users',
        rowCount: 150,
        size: 'N/A',
      });
    });
  });

  describe('getTableStructure', () => {
    it('should retrieve table structure with columns and constraints', async () => {
      const mockColumns = [
        {
          column_name: 'id',
          data_type: 'uuid',
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: 'NO',
          column_default: 'gen_random_uuid()',
        },
      ];

      const mockPrimaryKeys = [{ column_name: 'id' }];
      const mockForeignKeys = [
        {
          column_name: 'eventId',
          foreign_table_name: 'events',
          foreign_column_name: 'id',
        },
      ];

      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce(mockColumns) // Columns
        .mockResolvedValueOnce(mockPrimaryKeys) // Primary keys
        .mockResolvedValueOnce(mockForeignKeys); // Foreign keys

      const result = await adminService.getTableStructure('users');

      expect(result).toMatchObject({
        tableName: 'users',
        primaryKeys: ['id'],
        columnCount: 1,
      });
    });

    it('should reject invalid table names', async () => {
      await expect(adminService.getTableStructure('users; DROP TABLE users;')).rejects.toThrow(
        'Invalid table name'
      );
    });
  });

  describe('getTableData', () => {
    it('should retrieve paginated table data', async () => {
      const mockRows = [
        { id: 'user1', name: 'John Doe', email: 'john@example.com' },
      ];

      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(100) }]) // Total count
        .mockResolvedValueOnce(mockRows); // Rows

      const result = await adminService.getTableData('users', 1, 50);

      expect(result).toMatchObject({
        tableName: 'users',
        rows: mockRows,
        columns: ['id', 'name', 'email'],
        pagination: {
          page: 1,
          limit: 50,
          totalRows: 100,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
        rowCount: 100,
      });
    });

    it('should reject invalid table names', async () => {
      await expect(adminService.getTableData('users; DELETE FROM users')).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should apply tenant filter when super admin is explicitly tenant-scoped', async () => {
      const scopedRows = [
        { id: 'scoped-user-1', tenantId: 'tenant-scope-1', email: 'scoped@example.com' },
      ];

      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce([{ has_column: true }]) // tableHasTenantIdColumn
        .mockResolvedValueOnce([{ count: BigInt(1) }]) // scoped count
        .mockResolvedValueOnce(scopedRows as any); // scoped rows

      const result = await adminService.getTableData(
        'users',
        1,
        50,
        undefined,
        'asc',
        {
          tenantId: 'tenant-scope-1',
          isSuperAdmin: true,
          forceTenantScope: true
        }
      );

      expect(result.rowCount).toBe(1);
      expect(result.rows).toEqual(scopedRows);

      const countSql = String(prismaMock.$queryRawUnsafe.mock.calls[1]?.[0] || '');
      const rowsSql = String(prismaMock.$queryRawUnsafe.mock.calls[2]?.[0] || '');
      expect(countSql).toContain('WHERE "tenantId" = $1');
      expect(rowsSql).toContain('WHERE "tenantId" = $1');
      expect(prismaMock.$queryRawUnsafe.mock.calls[1]?.[1]).toBe('tenant-scope-1');
      expect(prismaMock.$queryRawUnsafe.mock.calls[2]?.[1]).toBe('tenant-scope-1');
    });
  });

  describe('executeDatabaseQuery', () => {
    it('should be disabled for security reasons', async () => {
      await expect(
        adminService.executeDatabaseQuery('SELECT * FROM users')
      ).rejects.toThrow('Direct SQL query execution is disabled');
    });

    it('should reject all queries including SELECT', async () => {
      await expect(
        adminService.executeDatabaseQuery('SELECT id FROM users WHERE id = 1')
      ).rejects.toThrow('Direct SQL query execution is disabled');
    });
  });
});
