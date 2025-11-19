import { PrismaClient, Prisma, BackupLog } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface BackupLogData {
  type: 'full' | 'incremental' | 'pitr_base';
  status: 'running' | 'success' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // seconds
  size?: bigint | number; // bytes
  location: string;
  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  successRate: number;
  lastBackupTime?: Date;
  lastBackupStatus?: string;
  totalSize: bigint;
  averageDuration: number;
  backupHealth: 'healthy' | 'warning' | 'critical';
  issues: string[];
}

export interface BackupHealthCheck {
  isHealthy: boolean;
  issues: string[];
  lastBackup?: {
    type: string;
    status: string;
    timestamp: Date;
    ageHours: number;
  };
  recentFailures: number;
  diskSpace?: {
    available: number;
    used: number;
    total: number;
  };
}

class BackupMonitoringService extends EventEmitter {
  private static instance: BackupMonitoringService;

  private constructor() {
    super();
  }

  public static getInstance(): BackupMonitoringService {
    if (!BackupMonitoringService.instance) {
      BackupMonitoringService.instance = new BackupMonitoringService();
    }
    return BackupMonitoringService.instance;
  }

  /**
   * Log a backup execution
   */
  async logBackup(data: BackupLogData, tenantId: string = 'default_tenant'): Promise<BackupLog> {
    try {
      const backupLog = await prisma.backupLog.create({
        data: {
          tenantId,
          type: data.type,
          status: data.status,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          duration: data.duration,
          size: data.size ? BigInt(data.size) : null,
          location: data.location,
          errorMessage: data.errorMessage,
          metadata: data.metadata || {},
        },
      });

      // Emit event for real-time monitoring
      this.emit('backup:logged', backupLog);

      // Check for issues and emit alerts
      if (data.status === 'failed') {
        this.emit('backup:failed', backupLog);
        await this.handleBackupFailure(backupLog);
      } else if (data.status === 'success') {
        this.emit('backup:success', backupLog);
      }

      return backupLog;
    } catch (error) {
      console.error('Failed to log backup:', error);
      throw error;
    }
  }

  /**
   * Update an existing backup log
   */
  async updateBackupLog(id: string, data: Partial<BackupLogData>): Promise<BackupLog> {
    try {
      const updateData: Prisma.BackupLogUpdateInput = {};

      if (data.status) updateData.status = data.status;
      if (data.completedAt) updateData.completedAt = data.completedAt;
      if (data.duration) updateData.duration = data.duration;
      if (data.size !== undefined) updateData.size = BigInt(data.size);
      if (data.errorMessage) updateData.errorMessage = data.errorMessage;
      if (data.metadata) updateData.metadata = data.metadata;

      const backupLog = await prisma.backupLog.update({
        where: { id },
        data: updateData,
      });

      this.emit('backup:updated', backupLog);
      return backupLog;
    } catch (error) {
      console.error('Failed to update backup log:', error);
      throw error;
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(options: {
    limit?: number;
    offset?: number;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{ backups: BackupLog[]; total: number }> {
    const { limit = 50, offset = 0, type, status, startDate, endDate } = options;

    const where: Prisma.BackupLogWhereInput = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startedAt = {};
      if (startDate) where.startedAt.gte = startDate;
      if (endDate) where.startedAt.lte = endDate;
    }

    const [backups, total] = await Promise.all([
      prisma.backupLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.backupLog.count({ where }),
    ]);

    return { backups, total };
  }

  /**
   * Get latest backup
   */
  async getLatestBackup(type?: string): Promise<BackupLog | null> {
    const where = type ? { type } : {};

    return prisma.backupLog.findFirst({
      where,
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(days: number = 30): Promise<BackupStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const backups = await prisma.backupLog.findMany({
      where: {
        startedAt: {
          gte: startDate,
        },
      },
    });

    const totalBackups = backups.length;
    const successfulBackups = backups.filter((b) => b.status === 'success').length;
    const failedBackups = backups.filter((b) => b.status === 'failed').length;
    const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;

    const lastBackup = await this.getLatestBackup();

    const totalSize = backups
      .filter((b) => b.size !== null)
      .reduce((sum, b) => sum + BigInt(b.size || 0), BigInt(0));

    const completedBackups = backups.filter((b) => b.duration !== null);
    const averageDuration =
      completedBackups.length > 0
        ? completedBackups.reduce((sum, b) => sum + (b.duration || 0), 0) / completedBackups.length
        : 0;

    // Determine backup health
    const issues: string[] = [];
    let backupHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check if last backup is too old (> 25 hours)
    if (lastBackup) {
      const ageHours = (Date.now() - lastBackup.startedAt.getTime()) / (1000 * 60 * 60);
      if (ageHours > 25) {
        issues.push(`Last backup is ${ageHours.toFixed(1)} hours old (expected: < 25 hours)`);
        backupHealth = 'critical';
      }
    } else {
      issues.push('No backups found');
      backupHealth = 'critical';
    }

    // Check success rate
    if (successRate < 90) {
      issues.push(`Low success rate: ${successRate.toFixed(1)}% (expected: > 90%)`);
      backupHealth = backupHealth === 'critical' ? 'critical' : 'warning';
    }

    // Check recent failures
    const recentBackups = backups.slice(0, 5);
    const recentFailures = recentBackups.filter((b) => b.status === 'failed').length;
    if (recentFailures >= 2) {
      issues.push(`${recentFailures} failures in last 5 backups`);
      backupHealth = 'critical';
    }

    return {
      totalBackups,
      successfulBackups,
      failedBackups,
      successRate,
      lastBackupTime: lastBackup?.startedAt,
      lastBackupStatus: lastBackup?.status,
      totalSize,
      averageDuration,
      backupHealth,
      issues,
    };
  }

  /**
   * Check backup health
   */
  async checkBackupHealth(): Promise<BackupHealthCheck> {
    const lastBackup = await this.getLatestBackup();
    const issues: string[] = [];
    let isHealthy = true;

    // Check last backup age
    let lastBackupInfo;
    if (lastBackup) {
      const ageMs = Date.now() - lastBackup.startedAt.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);

      lastBackupInfo = {
        type: lastBackup.type,
        status: lastBackup.status,
        timestamp: lastBackup.startedAt,
        ageHours,
      };

      if (ageHours > 25) {
        issues.push(`Last backup is ${ageHours.toFixed(1)} hours old`);
        isHealthy = false;
      }

      if (lastBackup.status === 'failed') {
        issues.push('Last backup failed');
        isHealthy = false;
      }
    } else {
      issues.push('No backups found');
      isHealthy = false;
    }

    // Check recent failures
    const recentBackups = await prisma.backupLog.findMany({
      where: {
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    const recentFailures = recentBackups.filter((b) => b.status === 'failed').length;
    if (recentFailures > 2) {
      issues.push(`${recentFailures} failures in last 10 backups`);
      isHealthy = false;
    }

    return {
      isHealthy,
      issues,
      lastBackup: lastBackupInfo,
      recentFailures,
    };
  }

  /**
   * Handle backup failure - send alerts
   */
  private async handleBackupFailure(backupLog: BackupLog): Promise<void> {
    try {
      // Log to console for immediate visibility
      console.error('Backup failed:', {
        type: backupLog.type,
        error: backupLog.errorMessage,
        timestamp: backupLog.startedAt,
      });

      // Check if this is a repeated failure
      const recentFailures = await prisma.backupLog.count({
        where: {
          status: 'failed',
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      });

      if (recentFailures >= 3) {
        console.error('CRITICAL: Multiple backup failures detected');
        this.emit('backup:critical', { failures: recentFailures });
      }
    } catch (error) {
      console.error('Failed to handle backup failure:', error);
    }
  }

  /**
   * Cleanup old backup logs
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.backupLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get backup size trend
   */
  async getBackupSizeTrend(days: number = 30): Promise<Array<{ date: string; size: number }>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const backups = await prisma.backupLog.findMany({
      where: {
        startedAt: {
          gte: startDate,
        },
        status: 'success',
        size: {
          not: null,
        },
      },
      orderBy: { startedAt: 'asc' },
      select: {
        startedAt: true,
        size: true,
      },
    });

    return backups.map((b) => ({
      date: b.startedAt.toISOString().split('T')[0] || '',
      size: Number(b.size) / (1024 * 1024 * 1024), // Convert to GB
    }));
  }

  /**
   * Detect backup size anomalies
   */
  async detectSizeAnomalies(): Promise<{
    hasAnomaly: boolean;
    details?: {
      currentSize: number;
      averageSize: number;
      deviation: number;
    };
  }> {
    const recentBackups = await prisma.backupLog.findMany({
      where: {
        type: 'full',
        status: 'success',
        size: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    if (recentBackups.length < 5) {
      return { hasAnomaly: false };
    }

    const latest = recentBackups[0];
    if (!latest) {
      return { hasAnomaly: false };
    }

    const previous = recentBackups.slice(1);

    const averageSize =
      previous.reduce((sum, b) => sum + Number(b.size), 0) / previous.length;
    const currentSize = Number(latest.size);
    const deviation = ((currentSize - averageSize) / averageSize) * 100;

    // Flag if size is > 2x or < 50% of average
    const hasAnomaly = Math.abs(deviation) > 100;

    return {
      hasAnomaly,
      details: {
        currentSize,
        averageSize,
        deviation,
      },
    };
  }
}

export default BackupMonitoringService;
