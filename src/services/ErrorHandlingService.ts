import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { createLogger } from '../utils/logger';
import { PrismaClient, LogLevel, Prisma } from '@prisma/client';

const logger = createLogger('ErrorHandlingService');

@injectable()
export class ErrorHandlingService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  override async logError(error: unknown, context?: Record<string, unknown>) {
    // Extract error message and stack trace
    let errorMessage: string;
    let stackTrace: string | null = null;

    if (error instanceof Error) {
      errorMessage = error.message;
      stackTrace = error.stack || null;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error === null) {
      errorMessage = 'null';
    } else if (error === undefined) {
      errorMessage = 'undefined';
    } else {
      errorMessage = String(error);
    }

    // Log to console first
    logger.error('Error logged', { error, context });

    // Log to database ErrorLog table
    try {
      const tenantId = context?.['tenantId'] as string | undefined;
      const userId = context?.['userId'] as string | undefined;
      const pathValue = context?.['path'] as string | undefined;
      const method = context?.['method'] as string | undefined;
      const statusCode = context?.['statusCode'] as number | undefined;

      await this.prisma.errorLog.create({
        data: {
          message: errorMessage,
          stack: stackTrace,
          level: LogLevel.ERROR,
          context: context ? JSON.stringify(context) : null,
          userId: userId || null,
          path: pathValue || null,
          method: method || null,
          statusCode: statusCode || null,
          tenantId: tenantId || null,
          metadata: context ? (context as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    } catch (dbError) {
      // If database logging fails, log to console but don't throw
      logger.error('Failed to log error to database', { error: dbError });
    }

    return {
      logged: true,
      timestamp: new Date(),
      error: errorMessage
    };
  }

  async getErrorStats(tenantIdParam?: string) {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Build where clause
      const where: Record<string, unknown> = {};
      if (tenantIdParam) {
        where['tenantId'] = tenantIdParam;
      }

      // Get total error count
      const total = await this.prisma.errorLog.count({ where });

      // Get last 24 hours count
      const last24HoursCount = await this.prisma.errorLog.count({
        where: {
          ...where,
          createdAt: { gte: last24Hours },
        },
      });

      // Get errors by level
      const byLevel = await this.prisma.errorLog.groupBy({
        by: ['level'],
        where,
        _count: { level: true },
      });

      // Get errors by level for last 24 hours
      const byLevelLast24Hours = await this.prisma.errorLog.groupBy({
        by: ['level'],
        where: {
          ...where,
          createdAt: { gte: last24Hours },
        },
        _count: { level: true },
      });

      // Format byType object
      const byType: Record<string, number> = {};
      byLevel.forEach((item) => {
        byType[item.level] = item._count.level;
      });

      const byTypeLast24Hours: Record<string, number> = {};
      byLevelLast24Hours.forEach((item) => {
        byTypeLast24Hours[item.level] = item._count.level;
      });

      return {
        total,
        last24Hours: last24HoursCount,
        byType,
        byTypeLast24Hours,
        resolved: await this.prisma.errorLog.count({
          where: { ...where, resolved: true },
        }),
        unresolved: await this.prisma.errorLog.count({
          where: { ...where, resolved: false },
        }),
      };
    } catch (error) {
      logger.error('Failed to get error statistics', { error });
      return {
        total: 0,
        last24Hours: 0,
        byType: {},
        byTypeLast24Hours: {},
        resolved: 0,
        unresolved: 0,
      };
    }
  }
}
