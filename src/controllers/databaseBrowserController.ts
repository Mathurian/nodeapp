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

  getTableData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const { page, limit } = req.query;
      const result = await this.databaseBrowserService.getTableData(
        tableName!,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 50
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getTableSchema = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const schema = await this.databaseBrowserService.getTableSchema(tableName!);
      return sendSuccess(res, schema);
    } catch (error) {
      return next(error);
    }
  };

  executeQuery = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      // SECURITY FIX: Direct database query execution has been disabled
      // due to SQL injection vulnerability (P0-1)

      logger.warn('Database query endpoint access attempt', {
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Log the attempt
      await this.prisma.activityLog.create({
        data: {
          action: 'DATABASE_QUERY_ATTEMPT_BLOCKED',
          resourceType: 'DATABASE',
          userId: req.user?.id || null,
          ipAddress: req.ip || null,
          userAgent: req.get('user-agent') || null,
          logLevel: 'WARN',
          details: {
            message: 'Direct database query execution is disabled for security',
            path: req.path,
            method: req.method
          }
        }
      });

      return res.status(403).json({
        error: 'Feature disabled',
        message: 'Direct database query execution has been disabled for security. Please use Prisma Studio or contact your system administrator.',
        alternativeSolutions: [
          'Use Prisma Studio for database browsing',
          'Use predefined report endpoints',
          'Contact system administrator for custom queries'
        ]
      });
    } catch (error) {
      return next(error);
    }
  };

  getQueryHistory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const skip = (page - 1) * limit;

      const [queries, total]: any = await Promise.all([
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
          } as any,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        } as any),
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
