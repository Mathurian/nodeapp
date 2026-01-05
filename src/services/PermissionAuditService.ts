/**
 * Permission Audit Service
 * Phase 2.2 - Add Permission Audit Trail
 *
 * Tracks and logs all permission-related changes and decisions
 * Provides comprehensive audit trail for security and compliance
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';

export interface LogPermissionChangeDTO {
  resource: string;
  operation: string;
  granted: boolean;
  role: string;
  changedBy: string;
  reason?: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface GetPermissionHistoryDTO {
  role?: string;
  resource?: string;
  operation?: string;
  changedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  tenantId: string;
}

export interface PermissionAuditEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  logLevel: string;
  details: any;
  createdAt: Date;
  tenantId: string;
}

@injectable()
export class PermissionAuditService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Log a permission change event
   * Creates an audit log entry for permission grant/revoke operations
   */
  async logPermissionChange(dto: LogPermissionChangeDTO): Promise<PermissionAuditEntry> {
    const action = dto.granted ? 'permission.granted' : 'permission.revoked';
    const resourceId = `${dto.resource}:${dto.operation}`;

    const auditLog = await this.prisma.activityLog.create({
      data: {
        action,
        resourceType: 'Permission',
        resourceId,
        userId: dto.changedBy,
        logLevel: 'INFO',
        details: {
          resource: dto.resource,
          operation: dto.operation,
          granted: dto.granted,
          role: dto.role,
          reason: dto.reason,
          timestamp: new Date().toISOString(),
          ...dto.metadata
        },
        tenantId: dto.tenantId
      }
    });

    return auditLog as PermissionAuditEntry;
  }

  /**
   * Log a permission check event (for security monitoring)
   * Useful for detecting unauthorized access attempts
   */
  async logPermissionCheck(
    userId: string,
    userRole: string,
    resource: string,
    operation: string,
    allowed: boolean,
    tenantId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Only log denied checks to reduce volume
    if (!allowed) {
      await this.prisma.activityLog.create({
        data: {
          action: 'permission.check.denied',
          resourceType: 'Permission',
          resourceId: `${resource}:${operation}`,
          userId,
          logLevel: 'WARNING',
          details: {
            resource,
            operation,
            role: userRole,
            allowed,
            timestamp: new Date().toISOString(),
            ...metadata
          },
          tenantId
        }
      });
    }
  }

  /**
   * Log bulk permission changes
   * For scenarios where multiple permissions are modified at once
   */
  async logBulkPermissionChange(
    changes: Array<{
      resource: string;
      operation: string;
      granted: boolean;
      role: string;
    }>,
    changedBy: string,
    reason: string,
    tenantId: string
  ): Promise<number> {
    const logs = changes.map(change => ({
      action: change.granted ? 'permission.granted' : 'permission.revoked',
      resourceType: 'Permission',
      resourceId: `${change.resource}:${change.operation}`,
      userId: changedBy,
      logLevel: 'INFO',
      details: {
        resource: change.resource,
        operation: change.operation,
        granted: change.granted,
        role: change.role,
        reason,
        bulkOperation: true,
        timestamp: new Date().toISOString()
      },
      tenantId
    }));

    await this.prisma.activityLog.createMany({
      data: logs as any
    });

    return logs.length;
  }

  /**
   * Get permission change history with filtering
   * Supports pagination and multiple filter criteria
   */
  async getPermissionHistory(dto: GetPermissionHistoryDTO): Promise<{
    entries: PermissionAuditEntry[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = dto.limit || 100;
    const offset = dto.offset || 0;

    // Build where clause
    const where: Prisma.ActivityLogWhereInput = {
      tenantId: dto.tenantId,
      action: { startsWith: 'permission.' }
    };

    // Apply filters using JSON path queries
    if (dto.role) {
      where.details = {
        path: ['role'],
        equals: dto.role
      };
    }

    if (dto.resource) {
      where.details = where.details || {};
      (where.details as any).path = ['resource'];
      (where.details as any).equals = dto.resource;
    }

    if (dto.changedBy) {
      where.userId = dto.changedBy;
    }

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = dto.startDate;
      }
      if (dto.endDate) {
        where.createdAt.lte = dto.endDate;
      }
    }

    // Get total count
    const total = await this.prisma.activityLog.count({ where });

    // Get paginated results
    const entries = await this.prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    return {
      entries: entries as PermissionAuditEntry[],
      total,
      limit,
      offset
    };
  }

  /**
   * Get permission history for a specific role
   * Useful for reviewing all permission changes for a role
   */
  async getPermissionHistoryByRole(
    role: string,
    tenantId: string,
    limit: number = 100
  ): Promise<PermissionAuditEntry[]> {
    const result = await this.getPermissionHistory({
      role,
      tenantId,
      limit
    });

    return result.entries;
  }

  /**
   * Get permission history for a specific resource
   * Useful for understanding permission evolution for a resource
   */
  async getPermissionHistoryByResource(
    resource: string,
    tenantId: string,
    limit: number = 100
  ): Promise<PermissionAuditEntry[]> {
    const result = await this.getPermissionHistory({
      resource,
      tenantId,
      limit
    });

    return result.entries;
  }

  /**
   * Get recent permission denials
   * Security monitoring - detect potential unauthorized access attempts
   */
  async getRecentPermissionDenials(
    tenantId: string,
    hours: number = 24,
    limit: number = 100
  ): Promise<PermissionAuditEntry[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const denials = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        action: 'permission.check.denied',
        createdAt: { gte: since }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return denials as PermissionAuditEntry[];
  }

  /**
   * Get permission denial statistics
   * Useful for identifying patterns in unauthorized access attempts
   */
  async getPermissionDenialStats(
    tenantId: string,
    hours: number = 24
  ): Promise<{
    totalDenials: number;
    denialsByRole: Record<string, number>;
    denialsByResource: Record<string, number>;
    denialsByUser: Record<string, number>;
    topDeniedOperations: Array<{ resource: string; operation: string; count: number }>;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const denials = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        action: 'permission.check.denied',
        createdAt: { gte: since }
      },
      select: {
        userId: true,
        details: true
      }
    });

    const stats = {
      totalDenials: denials.length,
      denialsByRole: {} as Record<string, number>,
      denialsByResource: {} as Record<string, number>,
      denialsByUser: {} as Record<string, number>,
      topDeniedOperations: [] as Array<{ resource: string; operation: string; count: number }>
    };

    // Aggregate statistics
    const operationCounts = new Map<string, number>();

    denials.forEach(denial => {
      const details = denial.details as any;
      const role = details.role || 'unknown';
      const resource = details.resource || 'unknown';
      const operation = details.operation || 'unknown';
      const userId = denial.userId;

      // By role
      stats.denialsByRole[role] = (stats.denialsByRole[role] || 0) + 1;

      // By resource
      stats.denialsByResource[resource] = (stats.denialsByResource[resource] || 0) + 1;

      // By user
      stats.denialsByUser[userId] = (stats.denialsByUser[userId] || 0) + 1;

      // Operation counts
      const opKey = `${resource}:${operation}`;
      operationCounts.set(opKey, (operationCounts.get(opKey) || 0) + 1);
    });

    // Top denied operations
    stats.topDeniedOperations = Array.from(operationCounts.entries())
      .map(([key, count]) => {
        const [resource, operation] = key.split(':');
        return { resource, operation, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Get audit summary for a date range
   * High-level overview of permission activity
   */
  async getAuditSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalChanges: number;
    grantsCount: number;
    revokesCount: number;
    denialsCount: number;
    uniqueUsers: number;
    changesByRole: Record<string, number>;
    changesByResource: Record<string, number>;
  }> {
    const logs = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        action: { startsWith: 'permission.' },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        action: true,
        userId: true,
        details: true
      }
    });

    const summary = {
      totalChanges: logs.length,
      grantsCount: 0,
      revokesCount: 0,
      denialsCount: 0,
      uniqueUsers: new Set<string>(),
      changesByRole: {} as Record<string, number>,
      changesByResource: {} as Record<string, number>
    };

    logs.forEach(log => {
      summary.uniqueUsers.add(log.userId);

      if (log.action === 'permission.granted') {
        summary.grantsCount++;
      } else if (log.action === 'permission.revoked') {
        summary.revokesCount++;
      } else if (log.action === 'permission.check.denied') {
        summary.denialsCount++;
      }

      const details = log.details as any;
      if (details.role) {
        summary.changesByRole[details.role] = (summary.changesByRole[details.role] || 0) + 1;
      }
      if (details.resource) {
        summary.changesByResource[details.resource] = (summary.changesByResource[details.resource] || 0) + 1;
      }
    });

    return {
      ...summary,
      uniqueUsers: summary.uniqueUsers.size
    };
  }

  /**
   * Export audit logs for compliance
   * Returns audit logs in a format suitable for external review
   */
  async exportAuditLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await this.prisma.activityLog.findMany({
      where: {
        tenantId,
        action: { startsWith: 'permission.' },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    // CSV format
    const headers = ['Timestamp', 'Action', 'User', 'Role', 'Resource', 'Operation', 'Granted', 'Reason'];
    const rows = logs.map(log => {
      const details = log.details as any;
      return [
        log.createdAt.toISOString(),
        log.action,
        log.userId,
        details.role || '',
        details.resource || '',
        details.operation || '',
        details.granted !== undefined ? details.granted : '',
        details.reason || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Delete old audit logs (for cleanup)
   * Useful for managing audit log storage
   */
  async deleteOldAuditLogs(
    tenantId: string,
    olderThan: Date
  ): Promise<number> {
    const result = await this.prisma.activityLog.deleteMany({
      where: {
        tenantId,
        action: { startsWith: 'permission.' },
        createdAt: { lt: olderThan }
      }
    });

    return result.count;
  }
}
