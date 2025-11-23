import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { AdminService } from '../services/AdminService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient, Prisma, UserRole } from '@prisma/client';
import { parsePaginationQuery } from '../utils/pagination';
import { createLogger } from '../utils/logger';

const logger = createLogger('AdminController');

export class AdminController {
  private adminService: AdminService;
  private prisma: PrismaClient;

  constructor() {
    this.adminService = container.resolve(AdminService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Pass tenant context for tenant-scoped stats
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
      const isSuperAdmin = (req as any).isSuperAdmin;
      const userEmail = (req as any).user?.email;

      logger.debug('[AdminController.getDashboard]', {
        tenantId,
        isSuperAdmin,
        userEmail,
        willFilterByTenant: !isSuperAdmin,
        tenantIdToPass: !isSuperAdmin ? tenantId : undefined
      });

      const stats = await this.adminService.getDashboardStats(
        !isSuperAdmin ? tenantId : undefined
      );
      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  getSystemHealth = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await this.adminService.getSystemHealth();
      return sendSuccess(res, health);
    } catch (error) {
      return next(error);
    }
  };

  clearCache = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.adminService.clearCache();
      return sendSuccess(res, result, 'Cache cleared');
    } catch (error) {
      return next(error);
    }
  };

  getDatabaseTables = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await this.adminService.getDatabaseTables();
      return sendSuccess(res, tables);
    } catch (error) {
      return next(error);
    }
  };

  getTableStructure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const structure = await this.adminService.getTableStructure(tableName!);
      return sendSuccess(res, structure);
    } catch (error) {
      return next(error);
    }
  };

  getTableData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const { page = '1', limit = '50', orderBy, orderDirection = 'asc' } = req.query;
      const data = await this.adminService.getTableData(
        tableName!,
        parseInt(page as string),
        parseInt(limit as string),
        orderBy as string | undefined,
        orderDirection as string
      );
      return sendSuccess(res, data);
    } catch (error) {
      return next(error);
    }
  };

  executeDatabaseQuery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, limit = 100 } = req.body;
      const result = await this.adminService.executeDatabaseQuery(query, parseInt(limit));
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Pass tenant context for tenant-scoped stats
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
      const isSuperAdmin = (req as any).isSuperAdmin;

      const stats = await this.adminService.getDashboardStats(
        !isSuperAdmin ? tenantId : undefined
      );
      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paginationOptions = parsePaginationQuery(req.query);
      const result = await this.adminService.getActivityLogs(paginationOptions);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getActiveUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = parseInt(req.query['hours'] as string) || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Build where clause with tenant filtering (unless SUPER_ADMIN)
      const where: Prisma.UserWhereInput = {
        lastLoginAt: {
          gte: since
        }
      };

      // Only filter by tenant if not SUPER_ADMIN
      if (!req.isSuperAdmin && req.tenantId) {
        where.tenantId = req.tenantId;
      }

      const activeUsers = await this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLoginAt: true
        },
        orderBy: {
          lastLoginAt: 'desc'
        }
      });

      return sendSuccess(res, activeUsers);
    } catch (error) {
      return next(error);
    }
  };

  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const role = req.query['role'] as UserRole | undefined;
      const search = req.query['search'] as string | undefined;

      const skip = (page - 1) * limit;

      const where: Prisma.UserWhereInput = {};

      // Only filter by tenant if not SUPER_ADMIN
      if (!req.isSuperAdmin && req.tenantId) {
        where.tenantId = req.tenantId;
      }

      if (role) {
        where.role = role;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count({ where })
      ]);

      return sendSuccess(res, {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  getEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const archived = req.query['archived'] === 'true';

      const skip = (page - 1) * limit;

      const where: Prisma.EventWhereInput = {};

      // Only filter by tenant if not SUPER_ADMIN
      if (!req.isSuperAdmin && req.tenantId) {
        where.tenantId = req.tenantId;
      }

      if (req.query['archived'] !== undefined) {
        where.archived = archived;
      }

      const [events, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true,
            archived: true,
            createdAt: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.event.count({ where })
      ]);

      return sendSuccess(res, {
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  getContests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const eventId = req.query['eventId'] as string | undefined;

      const skip = (page - 1) * limit;

      const where: Prisma.ContestWhereInput = {};

      // Only filter by tenant if not SUPER_ADMIN
      if (!req.isSuperAdmin && req.tenantId) {
        where.tenantId = req.tenantId;
      }

      if (eventId) {
        where.eventId = eventId;
      }

      const [contests, total] = await Promise.all([
        this.prisma.contest.findMany({
          where,
          include: {
            event: {
              select: {
                id: true,
                name: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.contest.count({ where })
      ]);

      return sendSuccess(res, {
        contests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const contestId = req.query['contestId'] as string | undefined;

      const skip = (page - 1) * limit;

      const where: Prisma.CategoryWhereInput = {};

      // Only filter by tenant if not SUPER_ADMIN
      if (!req.isSuperAdmin && req.tenantId) {
        where.tenantId = req.tenantId;
      }

      if (contestId) {
        where.contestId = contestId;
      }

      const [categories, total] = await Promise.all([
        this.prisma.category.findMany({
          where,
          include: {
            contest: {
              select: {
                id: true,
                name: true,
                event: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.category.count({ where })
      ]);

      return sendSuccess(res, {
        categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  getScores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const categoryId = req.query['categoryId'] as string | undefined;

      const skip = (page - 1) * limit;

      const where: Prisma.ScoreWhereInput = {};
      if (categoryId) {
        where.categoryId = categoryId;
      }

      const [scores, total] = await Promise.all([
        this.prisma.score.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true
              }
            },
            contestant: {
              select: {
                id: true,
                name: true
              }
            },
            judge: {
              select: {
                id: true,
                name: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.score.count({ where })
      ]);

      return sendSuccess(res, {
        scores,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  getActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paginationOptions = parsePaginationQuery(req.query);
      const result = await this.adminService.getActivityLogs(paginationOptions);
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query['limit'] as string) || 100;
      const logs = await this.adminService.getAuditLogs(limit);
      return sendSuccess(res, logs);
    } catch (error) {
      return next(error);
    }
  };

  exportAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const format = (req.query['format'] as string) || 'json';
      const limit = parseInt(req.query['limit'] as string) || 1000;

      const logsResult = await this.adminService.getAuditLogs(limit);
      const logs = Array.isArray(logsResult) ? logsResult : (logsResult as any).data || [];

      if (format === 'csv') {
        // Convert to CSV format
        const headers = ['ID', 'User', 'Action', 'Resource', 'ResourceID', 'IP Address', 'Date'];
        const rows = logs.map((log: any) => [
          log.id,
          log.user?.name || 'Unknown',
          log.action,
          log.resourceType,
          log.resourceId || 'N/A',
          log.ipAddress || 'N/A',
          log.createdAt
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csvContent);
      }

      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      return res.send(JSON.stringify(logs, null, 2));
    } catch (error) {
      return next(error);
    }
  };

  testConnection = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await this.adminService.getSystemHealth();
      return sendSuccess(res, health);
    } catch (error) {
      return next(error);
    }
  };

  forceLogoutAllUsers = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      // Increment sessionVersion for all users to invalidate their tokens
      await this.prisma.user.updateMany({
        data: {
          sessionVersion: {
            increment: 1
          }
        }
      });

      const count = await this.prisma.user.count();

      return sendSuccess(res, {
        success: true,
        message: `All ${count} users have been logged out`,
        usersAffected: count
      });
    } catch (error) {
      return next(error);
    }
  };

  forceLogoutUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      // Find user first
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return sendSuccess(res, {
          success: false,
          message: 'User not found'
        }, 'User not found', 404);
      }

      // Increment sessionVersion to invalidate all tokens
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          sessionVersion: {
            increment: 1
          }
        }
      });

      return sendSuccess(res, {
        success: true,
        message: `User ${user.name} has been logged out`,
        userId: user.id
      });
    } catch (error) {
      return next(error);
    }
  };

  getContestantScores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contestantId } = req.params;
      const categoryId = req.query['categoryId'] as string | undefined;

      const where: Prisma.ScoreWhereInput = {
        contestantId
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      const scores = await this.prisma.score.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              contest: {
                select: {
                  id: true,
                  name: true,
                  event: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          },
          judge: {
            select: {
              id: true,
              name: true
            }
          },
          contestant: {
            select: {
              id: true,
              name: true,
              contestantNumber: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ]
      });

      // Calculate statistics
      const stats = {
        totalScores: scores.length,
        certifiedScores: scores.filter(s => s.isCertified).length,
        averageScore: scores.length > 0
          ? scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length
          : 0,
        highestScore: scores.length > 0 ? Math.max(...scores.map(s => s.score || 0)) : 0,
        lowestScore: scores.length > 0 ? Math.min(...scores.map(s => s.score || 0)) : 0
      };

      return sendSuccess(res, {
        scores,
        stats
      });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new AdminController();
export const getDashboard = controller.getDashboard;
export const getSystemHealth = controller.getSystemHealth;
export const clearCache = controller.clearCache;
export const getDatabaseTables = controller.getDatabaseTables;
export const getTableStructure = controller.getTableStructure;
export const getTableData = controller.getTableData;
export const executeDatabaseQuery = controller.executeDatabaseQuery;
export const getStats = controller.getStats;
export const getLogs = controller.getLogs;
export const getActiveUsers = controller.getActiveUsers;
export const getUsers = controller.getUsers;
export const getEvents = controller.getEvents;
export const getContests = controller.getContests;
export const getCategories = controller.getCategories;
export const getScores = controller.getScores;
export const getActivityLogs = controller.getActivityLogs;
export const getAuditLogs = controller.getAuditLogs;
export const exportAuditLogs = controller.exportAuditLogs;
export const testConnection = controller.testConnection;
export const forceLogoutAllUsers = controller.forceLogoutAllUsers;
export const forceLogoutUser = controller.forceLogoutUser;
export const getContestantScores = controller.getContestantScores;
