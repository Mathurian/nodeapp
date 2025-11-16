/**
 * AdminController Unit Tests
 * Comprehensive test coverage for AdminController endpoints
 * Tests admin operations, dashboard, system health, database management
 */

import { Request, Response, NextFunction } from 'express';
import { AdminController } from '../../../src/controllers/adminController';
import { AdminService } from '../../../src/services/AdminService';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/AdminService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');

describe('AdminController', () => {
  let controller: AdminController;
  let mockAdminService: jest.Mocked<AdminService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    (createRequestLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    });

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    mockAdminService = {
      getDashboardStats: jest.fn(),
      getSystemHealth: jest.fn(),
      clearCache: jest.fn(),
      getDatabaseTables: jest.fn(),
      getTableStructure: jest.fn(),
      getTableData: jest.fn(),
      executeDatabaseQuery: jest.fn(),
      getActivityLogs: jest.fn(),
      getAuditLogs: jest.fn(),
    } as any;

    mockPrisma = mockDeep<PrismaClient>();

    (container.resolve as jest.Mock) = jest.fn((token) => {
      if (token === 'PrismaClient') return mockPrisma;
      if (token === AdminService) return mockAdminService;
      return mockAdminService;
    });

    controller = new AdminController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'admin-1', role: UserRole.ADMIN },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      const mockStats = {
        totalUsers: 50,
        totalEvents: 10,
        totalContests: 25,
        activeUsers: 15,
      };
      mockAdminService.getDashboardStats.mockResolvedValue(mockStats as any);

      await controller.getDashboard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getDashboardStats).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockAdminService.getDashboardStats.mockRejectedValue(error);

      await controller.getDashboard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const mockHealth = {
        database: 'healthy',
        redis: 'healthy',
        uptime: 3600,
      };
      mockAdminService.getSystemHealth.mockResolvedValue(mockHealth as any);

      await controller.getSystemHealth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getSystemHealth).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockHealth);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Health check failed');
      mockAdminService.getSystemHealth.mockRejectedValue(error);

      await controller.getSystemHealth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('clearCache', () => {
    it('should clear cache successfully', async () => {
      const mockResult = { cleared: true, keys: 100 };
      mockAdminService.clearCache.mockResolvedValue(mockResult as any);

      await controller.clearCache(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.clearCache).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Cache cleared');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Cache clear failed');
      mockAdminService.clearCache.mockRejectedValue(error);

      await controller.clearCache(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDatabaseTables', () => {
    it('should return list of database tables', async () => {
      const mockTables = ['users', 'events', 'contests', 'categories', 'scores'];
      mockAdminService.getDatabaseTables.mockResolvedValue(mockTables as any);

      await controller.getDatabaseTables(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getDatabaseTables).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockTables);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockAdminService.getDatabaseTables.mockRejectedValue(error);

      await controller.getDatabaseTables(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTableStructure', () => {
    it('should return table structure', async () => {
      mockReq.params = { tableName: 'users' };
      const mockStructure = {
        columns: [
          { name: 'id', type: 'uuid', nullable: false },
          { name: 'email', type: 'varchar', nullable: false },
        ],
      };
      mockAdminService.getTableStructure.mockResolvedValue(mockStructure as any);

      await controller.getTableStructure(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getTableStructure).toHaveBeenCalledWith('users');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStructure);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { tableName: 'users' };
      const error = new Error('Table not found');
      mockAdminService.getTableStructure.mockRejectedValue(error);

      await controller.getTableStructure(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getTableData', () => {
    it('should return paginated table data', async () => {
      mockReq.params = { tableName: 'users' };
      mockReq.query = { page: '2', limit: '25', orderBy: 'createdAt', orderDirection: 'desc' };
      const mockData = {
        data: [{ id: '1', email: 'test@example.com' }],
        total: 100,
      };
      mockAdminService.getTableData.mockResolvedValue(mockData as any);

      await controller.getTableData(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getTableData).toHaveBeenCalledWith('users', 2, 25, 'createdAt', 'desc');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockData);
    });

    it('should use default pagination values', async () => {
      mockReq.params = { tableName: 'users' };
      mockReq.query = {};
      mockAdminService.getTableData.mockResolvedValue({ data: [], total: 0 } as any);

      await controller.getTableData(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getTableData).toHaveBeenCalledWith('users', 1, 50, undefined, 'asc');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { tableName: 'users' };
      const error = new Error('Query failed');
      mockAdminService.getTableData.mockRejectedValue(error);

      await controller.getTableData(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('executeDatabaseQuery', () => {
    it('should execute database query', async () => {
      mockReq.body = { query: 'SELECT * FROM users LIMIT 10', limit: 50 };
      const mockResult = { rows: [{}, {}], count: 2 };
      mockAdminService.executeDatabaseQuery.mockResolvedValue(mockResult as any);

      await controller.executeDatabaseQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.executeDatabaseQuery).toHaveBeenCalledWith(
        'SELECT * FROM users LIMIT 10',
        50
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult);
    });

    it('should use default limit when not provided', async () => {
      mockReq.body = { query: 'SELECT * FROM users' };
      mockAdminService.executeDatabaseQuery.mockResolvedValue({ rows: [] } as any);

      await controller.executeDatabaseQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.executeDatabaseQuery).toHaveBeenCalledWith(
        'SELECT * FROM users',
        100
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { query: 'INVALID QUERY' };
      const error = new Error('Query execution failed');
      mockAdminService.executeDatabaseQuery.mockRejectedValue(error);

      await controller.executeDatabaseQuery(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getStats', () => {
    it('should return dashboard stats (alias)', async () => {
      const mockStats = { totalUsers: 50, totalEvents: 10 };
      mockAdminService.getDashboardStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getDashboardStats).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStats);
    });
  });

  describe('getLogs', () => {
    it('should return activity logs with custom limit', async () => {
      mockReq.query = { limit: '50' };
      const mockLogs = [{ id: '1', action: 'login' }];
      mockAdminService.getActivityLogs.mockResolvedValue(mockLogs as any);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getActivityLogs).toHaveBeenCalledWith(50);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockLogs);
    });

    it('should use default limit when not provided', async () => {
      mockReq.query = {};
      mockAdminService.getActivityLogs.mockResolvedValue([] as any);

      await controller.getLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getActivityLogs).toHaveBeenCalledWith(100);
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users within time window', async () => {
      mockReq.query = { hours: '12' };
      const mockUsers = [
        { id: '1', name: 'User 1', lastLoginAt: new Date() },
        { id: '2', name: 'User 2', lastLoginAt: new Date() },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);

      await controller.getActiveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            lastLoginAt: {
              gte: expect.any(Date),
            },
          },
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockUsers);
    });

    it('should use default 24 hours when not provided', async () => {
      mockReq.query = {};
      mockPrisma.user.findMany.mockResolvedValue([] as any);

      await controller.getActiveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it('should call next with error when query fails', async () => {
      mockReq.query = {};
      const error = new Error('Database error');
      mockPrisma.user.findMany.mockRejectedValue(error);

      await controller.getActiveUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockReq.query = { page: '2', limit: '25' };
      const mockUsers = [{ id: '1', name: 'User 1' }];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.count.mockResolvedValue(100);

      await controller.getUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        users: mockUsers,
        pagination: {
          page: 2,
          limit: 25,
          total: 100,
          totalPages: 4,
          hasMore: true,
        },
      });
    });

    it('should filter by role', async () => {
      mockReq.query = { role: 'JUDGE' };
      mockPrisma.user.findMany.mockResolvedValue([] as any);
      mockPrisma.user.count.mockResolvedValue(0);

      await controller.getUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'JUDGE' },
        })
      );
    });

    it('should search by name and email', async () => {
      mockReq.query = { search: 'john' };
      mockPrisma.user.findMany.mockResolvedValue([] as any);
      mockPrisma.user.count.mockResolvedValue(0);

      await controller.getUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
          },
        })
      );
    });
  });

  describe('getEvents', () => {
    it('should return paginated events', async () => {
      mockReq.query = { page: '1', limit: '50' };
      const mockEvents = [{ id: '1', name: 'Event 1' }];
      mockPrisma.event.findMany.mockResolvedValue(mockEvents as any);
      mockPrisma.event.count.mockResolvedValue(10);

      await controller.getEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.event.findMany).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        events: mockEvents,
        pagination: expect.any(Object),
      });
    });

    it('should filter by archived status', async () => {
      mockReq.query = { archived: 'true' };
      mockPrisma.event.findMany.mockResolvedValue([] as any);
      mockPrisma.event.count.mockResolvedValue(0);

      await controller.getEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { archived: true },
        })
      );
    });
  });

  describe('getContests', () => {
    it('should return paginated contests', async () => {
      mockReq.query = { page: '1', limit: '50' };
      const mockContests = [{ id: '1', name: 'Contest 1' }];
      mockPrisma.contest.findMany.mockResolvedValue(mockContests as any);
      mockPrisma.contest.count.mockResolvedValue(25);

      await controller.getContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.contest.findMany).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        contests: mockContests,
        pagination: expect.any(Object),
      });
    });

    it('should filter by eventId', async () => {
      mockReq.query = { eventId: 'event-1' };
      mockPrisma.contest.findMany.mockResolvedValue([] as any);
      mockPrisma.contest.count.mockResolvedValue(0);

      await controller.getContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.contest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'event-1' },
        })
      );
    });
  });

  describe('getCategories', () => {
    it('should return paginated categories', async () => {
      mockReq.query = { page: '1', limit: '50' };
      const mockCategories = [{ id: '1', name: 'Category 1' }];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories as any);
      mockPrisma.category.count.mockResolvedValue(30);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findMany).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        categories: mockCategories,
        pagination: expect.any(Object),
      });
    });

    it('should filter by contestId', async () => {
      mockReq.query = { contestId: 'contest-1' };
      mockPrisma.category.findMany.mockResolvedValue([] as any);
      mockPrisma.category.count.mockResolvedValue(0);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contestId: 'contest-1' },
        })
      );
    });
  });

  describe('getScores', () => {
    it('should return paginated scores', async () => {
      mockReq.query = { page: '1', limit: '50' };
      const mockScores = [{ id: '1', score: 95 }];
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);
      mockPrisma.score.count.mockResolvedValue(200);

      await controller.getScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.findMany).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        scores: mockScores,
        pagination: expect.any(Object),
      });
    });

    it('should filter by categoryId and contestId', async () => {
      mockReq.query = { categoryId: 'cat-1', contestId: 'contest-1' };
      mockPrisma.score.findMany.mockResolvedValue([] as any);
      mockPrisma.score.count.mockResolvedValue(0);

      await controller.getScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat-1', contestId: 'contest-1' },
        })
      );
    });
  });

  describe('getActivityLogs', () => {
    it('should return activity logs', async () => {
      mockReq.query = { limit: '200' };
      const mockLogs = [{ id: '1', action: 'create' }];
      mockAdminService.getActivityLogs.mockResolvedValue(mockLogs as any);

      await controller.getActivityLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getActivityLogs).toHaveBeenCalledWith(200);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockLogs);
    });

    it('should use default limit', async () => {
      mockReq.query = {};
      mockAdminService.getActivityLogs.mockResolvedValue([] as any);

      await controller.getActivityLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getActivityLogs).toHaveBeenCalledWith(100);
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs', async () => {
      mockReq.query = { limit: '150' };
      const mockLogs = [{ id: '1', action: 'UPDATE', resourceType: 'USER' }];
      mockAdminService.getAuditLogs.mockResolvedValue(mockLogs as any);

      await controller.getAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(150);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockLogs);
    });

    it('should use default limit', async () => {
      mockReq.query = {};
      mockAdminService.getAuditLogs.mockResolvedValue([] as any);

      await controller.getAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(100);
    });
  });

  describe('exportAuditLogs', () => {
    it('should export audit logs as CSV', async () => {
      mockReq.query = { format: 'csv', limit: '500' };
      const mockLogs = [
        {
          id: '1',
          user: { name: 'Admin' },
          action: 'UPDATE',
          resourceType: 'USER',
          resourceId: 'user-1',
          ipAddress: '127.0.0.1',
          createdAt: '2025-11-13',
        },
      ];
      mockAdminService.getAuditLogs.mockResolvedValue(mockLogs as any);

      await controller.exportAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(500);
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('audit-logs-')
      );
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('ID,User,Action'));
    });

    it('should export audit logs as JSON by default', async () => {
      mockReq.query = { limit: '500' };
      const mockLogs = [{ id: '1', action: 'CREATE' }];
      mockAdminService.getAuditLogs.mockResolvedValue(mockLogs as any);

      await controller.exportAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(mockRes.send).toHaveBeenCalledWith(JSON.stringify(mockLogs, null, 2));
    });

    it('should use default limit', async () => {
      mockReq.query = {};
      mockAdminService.getAuditLogs.mockResolvedValue([] as any);

      await controller.exportAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith(1000);
    });

    it('should call next with error when service throws', async () => {
      mockReq.query = {};
      const error = new Error('Export failed');
      mockAdminService.getAuditLogs.mockRejectedValue(error);

      await controller.exportAuditLogs(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('testConnection', () => {
    it('should test database connection', async () => {
      const mockHealth = { database: 'connected' };
      mockAdminService.getSystemHealth.mockResolvedValue(mockHealth as any);

      await controller.testConnection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAdminService.getSystemHealth).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockHealth);
    });
  });

  describe('forceLogoutAllUsers', () => {
    it('should force logout all users', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 50 } as any);
      mockPrisma.user.count.mockResolvedValue(50);

      await controller.forceLogoutAllUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        data: {
          sessionVersion: {
            increment: 1,
          },
        },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        success: true,
        message: 'All 50 users have been logged out',
        usersAffected: 50,
      });
    });

    it('should handle zero users', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 0 } as any);
      mockPrisma.user.count.mockResolvedValue(0);

      await controller.forceLogoutAllUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        success: true,
        message: 'All 0 users have been logged out',
        usersAffected: 0,
      });
    });

    it('should call next with error when operation fails', async () => {
      const error = new Error('Database error');
      mockPrisma.user.updateMany.mockRejectedValue(error);

      await controller.forceLogoutAllUsers(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('forceLogoutUser', () => {
    it('should force logout specific user', async () => {
      mockReq.params = { userId: 'user-1' };
      const mockUser = { id: 'user-1', name: 'John Doe' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await controller.forceLogoutUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          sessionVersion: {
            increment: 1,
          },
        },
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        success: true,
        message: 'User John Doe has been logged out',
        userId: 'user-1',
      });
    });

    it('should return 404 when user not found', async () => {
      mockReq.params = { userId: 'user-1' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await controller.forceLogoutUser(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        {
          success: false,
          message: 'User not found',
        },
        'User not found',
        404
      );
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should call next with error when operation fails', async () => {
      mockReq.params = { userId: 'user-1' };
      const error = new Error('Database error');
      mockPrisma.user.findUnique.mockRejectedValue(error);

      await controller.forceLogoutUser(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestantScores', () => {
    it('should return contestant scores with statistics', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      const mockScores = [
        { id: '1', score: 95, isCertified: true },
        { id: '2', score: 88, isCertified: true },
        { id: '3', score: 92, isCertified: false },
      ];
      mockPrisma.score.findMany.mockResolvedValue(mockScores as any);

      await controller.getContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contestantId: 'cont-1' },
        })
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        scores: mockScores,
        stats: {
          totalScores: 3,
          certifiedScores: 2,
          averageScore: 91.66666666666667, // (95+88+92)/3
          highestScore: 95,
          lowestScore: 88,
        },
      });
    });

    it('should filter by categoryId', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      mockReq.query = { categoryId: 'cat-1' };
      mockPrisma.score.findMany.mockResolvedValue([] as any);

      await controller.getContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contestantId: 'cont-1', categoryId: 'cat-1' },
        })
      );
    });

    it('should handle zero scores', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      mockPrisma.score.findMany.mockResolvedValue([]);

      await controller.getContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {
        scores: [],
        stats: {
          totalScores: 0,
          certifiedScores: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
        },
      });
    });

    it('should call next with error when query fails', async () => {
      mockReq.params = { contestantId: 'cont-1' };
      const error = new Error('Database error');
      mockPrisma.score.findMany.mockRejectedValue(error);

      await controller.getContestantScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
