import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { DatabaseBrowserService } from '../services/DatabaseBrowserService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class DatabaseBrowserController {
  private databaseBrowserService: DatabaseBrowserService;
  private prisma: PrismaClient;

  constructor() {
    this.databaseBrowserService = container.resolve(DatabaseBrowserService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getTables = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await this.databaseBrowserService.getTables();
      return sendSuccess(res, tables);
    } catch (error) {
      return next(error);
    }
  };

  getTableData = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const { page, limit } = req.query;
      const result = await this.databaseBrowserService.getTableData(
        tableName,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 50
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getTableSchema = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const schema = await this.databaseBrowserService.getTableSchema(tableName);
      return sendSuccess(res, schema);
    } catch (error) {
      return next(error);
    }
  };

  executeQuery = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query } = req.body;

      if (!query) {
        return sendSuccess(res, {}, 'Query is required', 400);
      }

      // Security: Only allow SELECT queries for safety
      const trimmedQuery = query.trim().toUpperCase();
      if (!trimmedQuery.startsWith('SELECT')) {
        return sendSuccess(res, {}, 'Only SELECT queries are allowed for security reasons', 403);
      }

      // Execute raw query using Prisma
      const result = await this.prisma.$queryRawUnsafe(query);

      // Log query execution
      await this.prisma.activityLog.create({
        data: {
          action: 'DATABASE_QUERY',
          resourceType: 'DATABASE',
          userId: req.user?.id || null,
          ipAddress: req.ip || null,
          details: JSON.stringify({ query })
        }
      });

      return sendSuccess(res, {
        rows: result,
        count: Array.isArray(result) ? result.length : 0
      });
    } catch (error) {
      return next(error);
    }
  };

  getQueryHistory = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [queries, total] = await Promise.all([
        this.prisma.activityLog.findMany({
          where: {
            action: 'DATABASE_QUERY'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.activityLog.count({
          where: { action: 'DATABASE_QUERY' }
        })
      ]);

      return sendSuccess(res, {
        queries,
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
}

const controller = new DatabaseBrowserController();
export const getTables = controller.getTables;
export const getTableData = controller.getTableData;
export const getTableSchema = controller.getTableSchema;
export const executeQuery = controller.executeQuery;
export const getQueryHistory = controller.getQueryHistory;
