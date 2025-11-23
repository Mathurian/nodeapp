import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import { Request } from 'express';

interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  tenantId: string;
}

type AuditLogWithDetails = Prisma.AuditLogGetPayload<{}>;

/**
 * Audit Log Service
 *
 * Provides comprehensive audit logging for security and compliance.
 * Tracks all significant actions, changes, and access patterns.
 *
 * Features:
 * - Automatic request context extraction
 * - Entity change tracking
 * - User action logging
 * - IP and user agent tracking
 * - Searchable audit trail
 *
 * @example
 * ```typescript
 * // Log a user action
 * await auditLogService.log({
 *   action: 'user.login',
 *   entityType: 'User',
 *   entityId: user.id,
 *   userId: user.id,
 *   userName: user.name,
 *   tenantId: tenant.id
 * });
 *
 * // Log with changes
 * await auditLogService.logEntityChange({
 *   action: 'score.updated',
 *   entityType: 'Score',
 *   entityId: score.id,
 *   oldData: previousScore,
 *   newData: updatedScore,
 *   req,
 *   tenantId: tenant.id
 * });
 * ```
 */
@injectable()
export class AuditLogService extends BaseService {
  constructor(
    @inject('PrismaClient') private prisma: PrismaClient
  ) {
    super();
  }

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<AuditLogWithDetails> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId || null,
          userId: entry.userId || null,
          userName: entry.userName || null,
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          changes: entry.changes ? entry.changes as any : Prisma.DbNull,
          metadata: entry.metadata ? entry.metadata as any : Prisma.DbNull,
          tenantId: entry.tenantId,
        },
      });

      this.logInfo('Audit log created', { action: entry.action, entityType: entry.entityType });

      return auditLog;
    } catch (error) {
      this.logError('Failed to create audit log', error);
      throw error;
    }
  }

  /**
   * Log from Express request
   */
  async logFromRequest(
    action: string,
    entityType: string,
    entityId: string | undefined,
    req: Request,
    changes?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<AuditLogWithDetails> {
    const user = (req as any).user;
    const tenantId = (req as any).tenantId || 'default_tenant';

    return await this.log({
      action,
      entityType,
      entityId,
      userId: user?.id,
      userName: user?.name || user?.email,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
      changes,
      metadata,
      tenantId,
    });
  }

  /**
   * Log entity changes
   */
  async logEntityChange(params: {
    action: string;
    entityType: string;
    entityId: string;
    oldData: any;
    newData: any;
    req: Request;
    tenantId: string;
  }): Promise<AuditLogWithDetails> {
    const changes = this.calculateChanges(params.oldData, params.newData);

    return await this.logFromRequest(
      params.action,
      params.entityType,
      params.entityId,
      params.req,
      changes
    );
  }

  /**
   * Log user authentication
   */
  async logAuth(params: {
    action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'mfa_enabled' | 'mfa_disabled';
    userId?: string;
    userName?: string;
    req: Request;
    tenantId: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogWithDetails> {
    return await this.log({
      action: `auth.${params.action}`,
      entityType: 'User',
      entityId: params.userId,
      userId: params.userId,
      userName: params.userName,
      ipAddress: this.getClientIp(params.req),
      userAgent: params.req.headers['user-agent'],
      metadata: params.metadata,
      tenantId: params.tenantId,
    });
  }

  /**
   * Log file access
   */
  async logFileAccess(params: {
    action: 'upload' | 'download' | 'delete' | 'scan';
    fileName: string;
    fileId?: string;
    req: Request;
    tenantId: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogWithDetails> {
    return await this.logFromRequest(
      `file.${params.action}`,
      'File',
      params.fileId,
      params.req,
      undefined,
      { fileName: params.fileName, ...params.metadata }
    );
  }

  /**
   * Search audit logs
   */
  async search(params: {
    tenantId: string;
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.action) {
      where.action = { contains: params.action } as any;
    }

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) {
        where.timestamp.gte = params.startDate;
      }
      if (params.endDate) {
        where.timestamp.lte = params.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: params.limit || 100,
        skip: params.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        timestamp: { gte: startDate },
      },
    });

    const stats = {
      total: logs.length,
      byAction: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    logs.forEach((log) => {
      // Count by action
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

      // Count by entity type
      stats.byEntityType[log.entityType] =
        (stats.byEntityType[log.entityType] || 0) + 1;

      // Count by user
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      }

      // Count by day
      const day = log.timestamp.toISOString().split('T')[0];
      stats.byDay[((day as string) as string)] = ((stats.byDay as any)[((day as string) as string)] || 0) + 1;
    });

    return stats;
  }

  /**
   * Extract client IP from request
   */
  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Calculate changes between old and new data
   */
  private calculateChanges(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {};

    // Get all keys from both objects
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {}),
    ]);

    allKeys.forEach((key) => {
      // Skip certain fields
      if (['updatedAt', 'createdAt', 'password'].includes(key)) {
        return;
      }

      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    });

    return changes;
  }

  /**
   * Delete old audit logs (for cleanup/compliance)
   */
  async deleteOldLogs(tenantId: string, daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoffDate },
      },
    });

    this.logInfo('Old audit logs deleted', { count: result.count, tenantId });

    return result.count;
  }
}
