import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class ErrorHandlingController {
  private errorHandlingService: ErrorHandlingService;
  private prisma: PrismaClient;

  constructor() {
    this.errorHandlingService = container.resolve(ErrorHandlingService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  logError = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, context } = req.body;
      const result = this.errorHandlingService.logError(error, context);
      return sendSuccess(res, result, 'Error logged');
    } catch (error) {
      return next(error);
    }
  };

  getErrorStats = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = this.errorHandlingService.getErrorStats();
      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  getErrorStatistics = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const days = parseInt(req.query['days'] as string) || 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get error logs from activity log (action='ERROR')
      const errorLogs = await this.prisma.activityLog.findMany({
        where: {
          action: 'ERROR',
          createdAt: { gte: since }
        },
        select: {
          action: true,
          resourceType: true,
          createdAt: true,
          details: true
        }
      });

      // Calculate statistics
      const stats = {
        total: errorLogs.length,
        byType: errorLogs.reduce((acc: Record<string, number>, log) => {
          const type = log.resourceType || 'UNKNOWN';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byDay: errorLogs.reduce((acc: Record<string, number>, log) => {
          const day = log.createdAt.toISOString().split('T')[0]!;
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        timeRange: { days, since }
      };

      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  getErrorDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const skip = (page - 1) * limit;

      if (id) {
        // Get specific error details
        const errorLog: any = await this.prisma.activityLog.findUnique({
          where: { id },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          } as any
        } as any);

        if (!errorLog) {
          return sendSuccess(res, {}, 'Error log not found', 404);
        }

        return sendSuccess(res, errorLog);
      }

      // Get all error logs with pagination
      const [errorLogs, total]: any = await Promise.all([
        this.prisma.activityLog.findMany({
          where: { action: 'ERROR' },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          } as any,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        } as any),
        this.prisma.activityLog.count({ where: { action: 'ERROR' } })
      ]);

      return sendSuccess(res, {
        errors: errorLogs,
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

  markErrorResolved = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      // Get existing error log first
      const existing = await this.prisma.activityLog.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendSuccess(res, {}, 'Error log not found', 404);
      }

      // Update activity log with resolution details
      const errorLog = await this.prisma.activityLog.update({
        where: { id },
        data: {
          details: {
            ...(typeof existing.details === 'object' && existing.details !== null ? existing.details : {}),
            resolved: true,
            resolvedAt: new Date().toISOString(),
            resolution: resolution || 'Resolved'
          } as any
        }
      });

      return sendSuccess(res, errorLog, 'Error marked as resolved');
    } catch (error) {
      return next(error);
    }
  };

  getErrorTrends = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const days = parseInt(req.query['days'] as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const errorLogs = await this.prisma.activityLog.findMany({
        where: {
          action: 'ERROR',
          createdAt: { gte: since }
        },
        select: {
          createdAt: true,
          resourceType: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Group by day
      const trendsByDay = errorLogs.reduce((acc: Record<string, { total: number; byType: Record<string, number> }>, log) => {
        const day = log.createdAt.toISOString().split('T')[0]!;
        if (!acc[day]) {
          acc[day] = { total: 0, byType: {} };
        }
        acc[day].total++;
        const type = log.resourceType || 'UNKNOWN';
        acc[day].byType[type] = (acc[day].byType[type] || 0) + 1;
        return acc;
      }, {} as Record<string, { total: number; byType: Record<string, number> }>);

      // Calculate moving average
      const dailyTotals = Object.values(trendsByDay).map((d: any) => d.total);
      const movingAverage = dailyTotals.length > 0
        ? dailyTotals.reduce((a: number, b: number) => a + b, 0) / dailyTotals.length
        : 0;

      return sendSuccess(res, {
        trends: trendsByDay,
        summary: {
          totalErrors: errorLogs.length,
          daysAnalyzed: days,
          movingAverage: parseFloat(movingAverage.toFixed(2)),
          peakDay: Object.entries(trendsByDay).reduce((max: any, [day, data]: any) => {
            return data.total > (max?.total || 0) ? { day, ...data } : max;
          }, null)
        }
      });
    } catch (error) {
      return next(error);
    }
  };

  cleanupErrorLogs = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { olderThanDays } = req.body;

      if (!olderThanDays) {
        return sendSuccess(res, {}, 'olderThanDays parameter is required', 400);
      }

      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const result = await this.prisma.activityLog.deleteMany({
        where: {
          action: 'ERROR',
          createdAt: { lt: cutoffDate }
        }
      });

      return sendSuccess(res, {
        deleted: result.count,
        cutoffDate
      }, `Deleted ${result.count} error logs older than ${olderThanDays} days`);
    } catch (error) {
      return next(error);
    }
  };

  exportErrorLogs = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const format = (req.query['format'] as string) || 'json';
      const limit = parseInt(req.query['limit'] as string) || 1000;
      const days = parseInt(req.query['days'] as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const errorLogs: any = await this.prisma.activityLog.findMany({
        where: {
          action: 'ERROR',
          createdAt: { gte: since }
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
        take: limit,
        orderBy: { createdAt: 'desc' }
      } as any);

      if (format === 'csv') {
        const headers = ['ID', 'User', 'Type', 'Details', 'IP Address', 'Date'];
        const rows = errorLogs.map((log: any) => [
          log.id,
          log.user?.name || 'System',
          log.resourceType || 'UNKNOWN',
          JSON.stringify(log.details),
          log.ipAddress || 'N/A',
          log.createdAt
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: any) => row.map((cell: any) => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="error-logs-${Date.now()}.csv"`);
        return res.send(csvContent);
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="error-logs-${Date.now()}.json"`);
      return res.send(JSON.stringify(errorLogs, null, 2));
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new ErrorHandlingController();
export const logError = controller.logError;
export const getErrorStats = controller.getErrorStats;
export const getErrorStatistics = controller.getErrorStatistics;
export const getErrorDetails = controller.getErrorDetails;
export const markErrorResolved = controller.markErrorResolved;
export const getErrorTrends = controller.getErrorTrends;
export const cleanupErrorLogs = controller.cleanupErrorLogs;
export const exportErrorLogs = controller.exportErrorLogs;
