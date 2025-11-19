import { injectable, inject } from 'tsyringe';
import { PrismaClient, LogLevel, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';

interface ErrorLogEntry {
  message: string;
  stack?: string;
  level?: LogLevel;
  context?: string;
  userId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
  tenantId?: string;
}

type ErrorLogWithDetails = Prisma.ErrorLogGetPayload<{}>;

/**
 * Error Log Service
 *
 * Centralized error logging to database for monitoring and debugging.
 * Provides error tracking, statistics, and resolution management.
 *
 * Features:
 * - Database error persistence
 * - Error categorization by level
 * - Error resolution tracking
 * - Statistical analysis
 * - Auto-cleanup of old errors
 *
 * @example
 * ```typescript
 * // Log an error
 * await errorLogService.logError({
 *   message: 'Database connection failed',
 *   stack: error.stack,
 *   level: 'ERROR',
 *   context: 'DatabaseService',
 *   tenantId: 'tenant_id'
 * });
 *
 * // Get error statistics
 * const stats = await errorLogService.getStatistics('tenant_id');
 * ```
 */
@injectable()
export class ErrorLogService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Log an error to database
   */
  async logErrorToDatabase(entry: ErrorLogEntry): Promise<ErrorLogWithDetails> {
    try {
      const errorLog = await this.prisma.errorLog.create({
        data: {
          message: entry.message,
          stack: entry.stack || null,
          level: entry.level || LogLevel.ERROR,
          context: entry.context || null,
          userId: entry.userId || null,
          path: entry.path || null,
          method: entry.method || null,
          statusCode: entry.statusCode || null,
          metadata: entry.metadata ? JSON.parse(JSON.stringify(entry.metadata)) : null,
          tenantId: entry.tenantId || null,
        },
      });

      return errorLog;
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('Failed to log error to database:', error);
      console.error('Original error:', entry.message);
      throw error;
    }
  }

  /**
   * Log from caught exception
   */
  async logException(
    error: Error,
    context?: string,
    metadata?: Record<string, any>,
    tenantId?: string
  ): Promise<ErrorLogWithDetails> {
    return await this.logErrorToDatabase({
      message: error.message,
      stack: error.stack,
      level: LogLevel.ERROR,
      context,
      metadata,
      tenantId,
    });
  }

  /**
   * Log HTTP error
   */
  async logHttpError(params: {
    error: Error;
    path: string;
    method: string;
    statusCode: number;
    userId?: string;
    tenantId?: string;
    metadata?: Record<string, any>;
  }): Promise<ErrorLogWithDetails> {
    return await this.logErrorToDatabase({
      message: params.error.message,
      stack: params.error.stack,
      level: LogLevel.ERROR,
      path: params.path,
      method: params.method,
      statusCode: params.statusCode,
      userId: params.userId,
      tenantId: params.tenantId,
      metadata: params.metadata,
    });
  }

  /**
   * Get error statistics
   */
  async getStatistics(tenantId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: Prisma.ErrorLogWhereInput = {
      createdAt: { gte: startDate },
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const errors = await this.prisma.errorLog.findMany({
      where,
      select: {
        level: true,
        context: true,
        path: true,
        statusCode: true,
        resolved: true,
        createdAt: true,
      },
    });

    const stats = {
      total: errors.length,
      byLevel: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
      byPath: {} as Record<string, number>,
      byStatusCode: {} as Record<string, number>,
      resolved: 0,
      unresolved: 0,
      byDay: {} as Record<string, number>,
    };

    errors.forEach((error) => {
      // Count by level
      stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;

      // Count by context
      if (error.context) {
        stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
      }

      // Count by path
      if (error.path) {
        stats.byPath[error.path] = (stats.byPath[error.path] || 0) + 1;
      }

      // Count by status code
      if (error.statusCode) {
        const code = error.statusCode.toString();
        stats.byStatusCode[code] = (stats.byStatusCode[code] || 0) + 1;
      }

      // Count resolved vs unresolved
      if (error.resolved) {
        stats.resolved++;
      } else {
        stats.unresolved++;
      }

      // Count by day
      const day = error.createdAt.toISOString().split('T')[0];
      stats.byDay[((day as string) as string)] = ((stats.byDay as any)[((day as string) as string)] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(params: {
    tenantId?: string;
    level?: LogLevel;
    resolved?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ErrorLogWhereInput = {};

    if (params.tenantId) {
      where.tenantId = params.tenantId;
    }

    if (params.level) {
      where.level = params.level;
    }

    if (params.resolved !== undefined) {
      where.resolved = params.resolved;
    }

    const [errors, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return {
      errors,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
  }

  /**
   * Mark error as resolved
   */
  async resolveError(
    errorId: string,
    resolvedBy: string
  ): Promise<ErrorLogWithDetails> {
    return await this.prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });
  }

  /**
   * Mark multiple errors as resolved
   */
  async resolveMultiple(
    errorIds: string[],
    resolvedBy: string
  ): Promise<number> {
    const result = await this.prisma.errorLog.updateMany({
      where: { id: { in: errorIds } },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
      },
    });

    return result.count;
  }

  /**
   * Delete old resolved errors
   */
  async deleteOldResolvedErrors(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.errorLog.deleteMany({
      where: {
        resolved: true,
        resolvedAt: { lt: cutoffDate },
      },
    });

    this.logInfo('Old resolved errors deleted', { count: result.count });

    return result.count;
  }

  /**
   * Get error trends
   */
  async getErrorTrends(tenantId?: string, days: number = 30) {
    const stats = await this.getStatistics(tenantId, days);

    // Calculate daily averages
    const dailyData = Object.entries(stats.byDay).map(([date, count]) => ({
      date,
      count,
    }));

    // Sort by date
    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate trend (simple linear regression would go here)
    const avgErrorsPerDay = stats.total / days;

    return {
      dailyData,
      avgErrorsPerDay,
      totalErrors: stats.total,
      resolvedErrors: stats.resolved,
      unresolvedErrors: stats.unresolved,
      resolutionRate: stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0,
      byLevel: stats.byLevel,
      topContexts: Object.entries(stats.byContext)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([context, count]) => ({ context, count })),
      topPaths: Object.entries(stats.byPath)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, count]) => ({ path, count })),
    };
  }
}
