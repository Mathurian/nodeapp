import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { DatabaseBrowserService } from '../services/DatabaseBrowserService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('DatabaseBrowserController');

export class DatabaseBrowserController {
  private databaseBrowserService: DatabaseBrowserService;
  private prisma: PrismaClient;

  constructor() {
    this.databaseBrowserService = container.resolve(DatabaseBrowserService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  private getScopedPrisma(req: Request): PrismaClient {
    return (req.prisma as PrismaClient | undefined) || this.prisma;
  }

  getTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tables = await this.databaseBrowserService.getTables(this.getScopedPrisma(req));
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
        limit ? parseInt(limit as string) : 50,
        this.getScopedPrisma(req)
      );
      return sendSuccess(res, result);
    } catch (error) {
      return next(error);
    }
  };

  getTableSchema = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tableName } = req.params;
      const schema = await this.databaseBrowserService.getTableSchema(
        tableName!,
        this.getScopedPrisma(req)
      );
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

      const prismaClient = this.getScopedPrisma(req);

      // Log the attempt
      await prismaClient.activityLog.create({
        data: {
          action: 'DATABASE_QUERY_ATTEMPT_BLOCKED',
          resourceType: 'DATABASE',
          userId: req.user?.id || null,
          tenantId: req.tenantId || req.user?.tenantId || null,
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
      const prismaClient = this.getScopedPrisma(req);
      const whereClause = {
        action: 'DATABASE_QUERY',
        ...(req.tenantId ? { tenantId: req.tenantId } : {})
      };

      const [queries, total]: any = await Promise.all([
        prismaClient.activityLog.findMany({
          where: whereClause as any,
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
        prismaClient.activityLog.count({ where: whereClause as any })
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

  /**
   * Get a single record by ID
   * SUPER_ADMIN only
   */
  getRecord = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tableName, recordId } = req.params;

      if (!tableName || !recordId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Table name and record ID are required'
        });
      }

      const record = await this.databaseBrowserService.getRecord(
        tableName,
        recordId,
        this.getScopedPrisma(req)
      );
      return sendSuccess(res, record);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update a record by ID
   * SUPER_ADMIN only - all updates are logged
   */
  updateRecord = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tableName, recordId } = req.params;
      const data = req.body;

      if (!tableName || !recordId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Table name and record ID are required'
        });
      }

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Update data is required'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User ID is required for audit logging'
        });
      }

      logger.warn('Database record update', {
        tableName,
        recordId,
        userId,
        userRole: req.user?.role,
        updatedFields: Object.keys(data)
      });

      const updatedRecord = await this.databaseBrowserService.updateRecord(
        tableName,
        recordId,
        data,
        userId,
        this.getScopedPrisma(req),
        req.tenantId || req.user?.tenantId
      );

      return sendSuccess(res, updatedRecord, 'Record updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete a record by ID
   * SUPER_ADMIN only - all deletions are logged
   */
  deleteRecord = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tableName, recordId } = req.params;

      if (!tableName || !recordId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Table name and record ID are required'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User ID is required for audit logging'
        });
      }

      logger.warn('Database record deletion', {
        tableName,
        recordId,
        userId,
        userRole: req.user?.role
      });

      const result = await this.databaseBrowserService.deleteRecord(
        tableName,
        recordId,
        userId,
        this.getScopedPrisma(req),
        req.tenantId || req.user?.tenantId
      );

      return sendSuccess(res, result, 'Record deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create a new record
   * SUPER_ADMIN only - all creations are logged
   */
  createRecord = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { tableName } = req.params;
      const data = req.body;

      if (!tableName) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Table name is required'
        });
      }

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Record data is required'
        });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User ID is required for audit logging'
        });
      }

      logger.info('Database record creation', {
        tableName,
        userId,
        userRole: req.user?.role
      });

      const newRecord = await this.databaseBrowserService.createRecord(
        tableName,
        data,
        userId,
        this.getScopedPrisma(req),
        req.tenantId || req.user?.tenantId
      );

      return sendSuccess(res, newRecord, 'Record created successfully');
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
// SUPER_ADMIN only edit operations
export const getRecord = controller.getRecord;
export const updateRecord = controller.updateRecord;
export const deleteRecord = controller.deleteRecord;
export const createRecord = controller.createRecord;
