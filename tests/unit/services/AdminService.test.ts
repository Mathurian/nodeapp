import { AdminService } from '../../../src/services/AdminService';
import { PrismaClient } from '@prisma/client';
import { mock, mockDeep, DeepMockProxy } from 'jest-mock-extended';

jest.mock('child_process');
jest.mock('../../../src/utils/logger', () => ({
  logger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('AdminService', () => {
  let adminService: AdminService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    adminService = new AdminService(prismaMock as unknown as PrismaClient);
    jest.clearAllMocks();
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

      prismaMock.contest.findMany.mockResolvedValue([
        {
          id: 'contest1',
          name: 'Contest 1',
          eventId: 'event1',
          categories: [
            {
              id: 'cat1',
              name: 'Category 1',
              contestId: 'contest1',
              certifications: [{ id: 'cert1', categoryId: 'cat1', certifiedAt: null }],
            },
          ],
        } as any,
      ]);

      prismaMock.category.findMany.mockResolvedValue([
        {
          id: 'cat1',
          name: 'Category 1',
          certifications: [{ id: 'cert1', categoryId: 'cat1', certifiedAt: null }],
        } as any,
      ]);

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
        pendingCertifications: 2,
        certificationBreakdown: {
          judge: 2,
          tallyMaster: 0,
          auditor: 0,
          board: 0,
        },
        systemHealth: 'HEALTHY',
        lastBackup: mockDate.toISOString(),
        databaseSize: '50 MB',
      });

      expect(result.uptime).toBeDefined();
      expect(result.uptimeSeconds).toBeGreaterThan(0);
    });

    it('should handle database size query failure gracefully', async () => {
      prismaMock.user.count.mockResolvedValue(100);
      prismaMock.event.count.mockResolvedValue(5);
      prismaMock.contest.count.mockResolvedValue(15);
      prismaMock.category.count.mockResolvedValue(50);
      prismaMock.score.count.mockResolvedValue(1000);
      prismaMock.contest.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw.mockRejectedValue(new Error('Database size query failed'));

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
      prismaMock.contest.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw
        .mockResolvedValueOnce([{ size: '50 MB' }]) // Database size query
        .mockRejectedValueOnce(new Error('Connection failed')); // Health check query

      const result = await adminService.getDashboardStats();

      expect(result.systemHealth).toBe('CRITICAL');
    });

    it('should format uptime correctly for different durations', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.event.count.mockResolvedValue(1);
      prismaMock.contest.count.mockResolvedValue(2);
      prismaMock.category.count.mockResolvedValue(5);
      prismaMock.score.count.mockResolvedValue(50);
      prismaMock.contest.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);
      prismaMock.backupLog.findFirst.mockResolvedValue(null);
      prismaMock.$queryRaw.mockResolvedValue([{ size: '10 MB' }]);

      const result = await adminService.getDashboardStats();

      expect(result.uptime).toMatch(/^(\d+d \d+h \d+m|\d+h \d+m|\d+m|\d+s)$/);
    });

    it('should handle null last backup', async () => {
      prismaMock.user.count.mockResolvedValue(10);
      prismaMock.event.count.mockResolvedValue(1);
      prismaMock.contest.count.mockResolvedValue(2);
      prismaMock.category.count.mockResolvedValue(5);
      prismaMock.score.count.mockResolvedValue(50);
      prismaMock.contest.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);
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
    it('should return success message', async () => {
      const result = await adminService.clearCache();

      expect(result).toEqual({
        success: true,
        message: 'Cache cleared',
      });
    });
  });

  describe('getActivityLogs', () => {
    it('should retrieve activity logs with default limit', async () => {
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
        {
          id: 'log2',
          userId: 'user2',
          action: 'CREATE',
          resourceType: 'EVENT',
          resourceId: 'event1',
          details: { eventName: 'Test Event' },
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-01-15T09:00:00Z'),
          user: {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            role: 'ORGANIZER',
          },
        },
      ];

      prismaMock.activityLog.findMany.mockResolvedValue(mockLogs as any);

      const result = await adminService.getActivityLogs();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'log1',
        userId: 'user1',
        action: 'LOGIN',
        resourceType: 'USER',
        resource: 'USER',
        resourceId: 'user1',
        createdAt: '2024-01-15T10:00:00.000Z',
      });
      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });

    it('should retrieve activity logs with custom limit', async () => {
      prismaMock.activityLog.findMany.mockResolvedValue([]);

      await adminService.getActivityLogs(50);

      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
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

      const result = await adminService.getActivityLogs();

      expect(result[0].user).toBeNull();
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

      const result = await adminService.getAuditLogs(50);

      expect(result).toHaveLength(1);
      expect(prismaMock.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
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
      expect(result[1]).toMatchObject({
        name: 'events',
        rowCount: 10,
      });
    });

    it('should handle table query failure and use fallback', async () => {
      prismaMock.$queryRawUnsafe
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValue([{ count: BigInt(0) }]);

      const result = await adminService.getDatabaseTables();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('rowCount');
    });

    it('should handle individual table count failures', async () => {
      const mockTables = [{ name: 'invalid_table' }];

      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce(mockTables)
        .mockRejectedValueOnce(new Error('Table does not exist'));

      const result = await adminService.getDatabaseTables();

      expect(result[0]).toMatchObject({
        name: 'invalid_table',
        rowCount: 0,
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
        {
          column_name: 'name',
          data_type: 'varchar',
          character_maximum_length: 255,
          numeric_precision: null,
          numeric_scale: null,
          is_nullable: 'YES',
          column_default: null,
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
        columns: mockColumns,
        primaryKeys: ['id'],
        foreignKeys: [
          {
            column_name: 'eventId',
            foreign_table_name: 'events',
            foreign_column_name: 'id',
          },
        ],
        columnCount: 2,
      });
    });

    it('should reject invalid table names', async () => {
      await expect(adminService.getTableStructure('users; DROP TABLE users;')).rejects.toThrow(
        'Invalid table name'
      );
      await expect(adminService.getTableStructure('../etc/passwd')).rejects.toThrow(
        'Invalid table name'
      );
      await expect(adminService.getTableStructure('table-name')).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should throw error when table structure query fails', async () => {
      prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('Query failed'));

      await expect(adminService.getTableStructure('users')).rejects.toThrow('Query failed');
    });
  });

  describe('getTableData', () => {
    it('should retrieve paginated table data', async () => {
      const mockRows = [
        { id: 'user1', name: 'John Doe', email: 'john@example.com' },
        { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
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

    it('should support custom ordering', async () => {
      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(50) }])
        .mockResolvedValueOnce([]);

      await adminService.getTableData('users', 1, 20, 'name', 'desc');

      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "name" DESC')
      );
    });

    it('should handle second page navigation', async () => {
      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(100) }])
        .mockResolvedValueOnce([]);

      const result = await adminService.getTableData('users', 2, 50);

      expect(result.pagination).toMatchObject({
        page: 2,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should reject invalid table names', async () => {
      await expect(adminService.getTableData('users; DELETE FROM users')).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should handle empty result sets', async () => {
      prismaMock.$queryRawUnsafe
        .mockResolvedValueOnce([{ count: BigInt(0) }])
        .mockResolvedValueOnce([]);

      const result = await adminService.getTableData('empty_table');

      expect(result.rows).toEqual([]);
      expect(result.columns).toEqual([]);
      expect(result.rowCount).toBe(0);
    });

    it('should throw error when data retrieval fails', async () => {
      prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('Query error'));

      await expect(adminService.getTableData('users')).rejects.toThrow('Query error');
    });
  });

  describe('executeDatabaseQuery', () => {
    it('should execute valid SELECT query', async () => {
      const mockRows = [
        { id: 'user1', name: 'John', role: 'ADMIN' },
        { id: 'user2', name: 'Jane', role: 'JUDGE' },
      ];

      prismaMock.$queryRawUnsafe.mockResolvedValue(mockRows);

      const result = await adminService.executeDatabaseQuery(
        'SELECT id, name, role FROM users WHERE role = \'ADMIN\''
      );

      expect(result).toMatchObject({
        rows: mockRows,
        columns: ['id', 'name', 'role'],
        rowCount: 2,
      });
    });

    it('should add LIMIT to query if not present', async () => {
      prismaMock.$queryRawUnsafe.mockResolvedValue([]);

      await adminService.executeDatabaseQuery('SELECT * FROM users', 50);

      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50')
      );
    });

    it('should reject non-SELECT queries', async () => {
      await expect(adminService.executeDatabaseQuery('DELETE FROM users')).rejects.toThrow(
        'Only SELECT queries are allowed'
      );

      await expect(
        adminService.executeDatabaseQuery('UPDATE users SET role = \'ADMIN\'')
      ).rejects.toThrow('Only SELECT queries are allowed');

      await expect(
        adminService.executeDatabaseQuery('INSERT INTO users VALUES (1, \'test\')')
      ).rejects.toThrow('Only SELECT queries are allowed');

      await expect(adminService.executeDatabaseQuery('DROP TABLE users')).rejects.toThrow(
        'Only SELECT queries are allowed'
      );
    });

    it('should reject queries with dangerous keywords', async () => {
      await expect(
        adminService.executeDatabaseQuery('SELECT * FROM users; DROP TABLE users')
      ).rejects.toThrow('Query contains forbidden keyword: DROP');

      await expect(
        adminService.executeDatabaseQuery('SELECT * FROM users WHERE name = \'DELETE\'')
      ).rejects.toThrow('Query contains forbidden keyword: DELETE');

      await expect(
        adminService.executeDatabaseQuery('SELECT * FROM users; TRUNCATE TABLE logs')
      ).rejects.toThrow('Query contains forbidden keyword: TRUNCATE');
    });

    it('should handle query execution errors', async () => {
      prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('Syntax error'));

      await expect(
        adminService.executeDatabaseQuery('SELECT * FROM invalid_syntax WHERE')
      ).rejects.toThrow('Syntax error');
    });

    it('should handle empty result sets', async () => {
      prismaMock.$queryRawUnsafe.mockResolvedValue([]);

      const result = await adminService.executeDatabaseQuery('SELECT * FROM users WHERE id = \'none\'');

      expect(result).toMatchObject({
        rows: [],
        columns: [],
        rowCount: 0,
      });
    });
  });
});
