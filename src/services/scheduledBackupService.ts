import { PrismaClient, BackupSetting } from '@prisma/client';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env';
import { createLogger } from '../utils/logger';
import BackupTransferService, { BackupTarget } from './BackupTransferService';
import { SettingsService } from './SettingsService';
import { uploadToRuntimeRemoteTarget } from './runtimeBackupUploadService';
import { resolveDefaultTenantId } from '../utils/defaultTenantResolver';
import { withTenantDbRlsContext } from '../utils/prismaRlsContext';

const logger = createLogger('ScheduledBackupService');


class ScheduledBackupService {
  private prisma: PrismaClient;
  private jobs: Map<string, ReturnType<typeof cron.schedule>>;
  private isRunning: boolean;
  private settingsRefreshInterval: NodeJS.Timeout | null;
  private systemTenantId: string | null;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
    this.jobs = new Map();
    this.isRunning = false;
    this.settingsRefreshInterval = null;
    this.systemTenantId = null;
  }

  private async withSystemDbContext<T>(
    operation: (db: PrismaClient) => Promise<T>
  ): Promise<T> {
    return withTenantDbRlsContext(
      this.prisma,
      { tenantId: null, isSuperAdmin: true },
      async tx => operation(tx)
    );
  }

  private async ensureSystemTenantId(forceRefresh: boolean = false): Promise<string> {
    if (!forceRefresh && this.systemTenantId) {
      return this.systemTenantId;
    }

    const resolvedTenantId = await this.withSystemDbContext(async db => resolveDefaultTenantId(db));
    if (resolvedTenantId !== this.systemTenantId) {
      logger.info('Resolved scheduled backup system tenant', { tenantId: resolvedTenantId });
    }
    this.systemTenantId = resolvedTenantId;
    return resolvedTenantId;
  }

  private async getRuntimeBackupSettings(tenantId: string): Promise<Record<string, string>> {
    return this.withSystemDbContext(async db => {
      const settingsService = new SettingsService(db);
      return settingsService.getBackupSettings(tenantId);
    });
  }

  async start() {
    if (this.isRunning) {
      logger.info('Scheduled backup service is already running')
      return
    }

    this.isRunning = true
    logger.info('Starting scheduled backup service...')

    await this.ensureSystemTenantId();

    // Load backup settings from database
    await this.reloadSettings()

    // Periodically refresh schedules so UI changes take effect without restart
    this.settingsRefreshInterval = setInterval(() => {
      void this.reloadSettings().catch((error) => {
        logger.error('Failed to refresh backup schedules', { error });
      });
    }, 60 * 1000);
  }

  async stop() {
    if (!this.isRunning) {
      logger.info('Scheduled backup service is not running')
      return
    }

    // Stop all cron jobs
    this.jobs.forEach((job: ReturnType<typeof cron.schedule>, key: string) => {
      job.stop();
      logger.info(`Stopped backup job: ${key}`);
    });

    this.jobs.clear()
    if (this.settingsRefreshInterval) {
      clearInterval(this.settingsRefreshInterval);
      this.settingsRefreshInterval = null;
    }
    this.isRunning = false
    logger.info('Scheduled backup service stopped')
  }

  async loadBackupSettings() {
    try {
      // Skip in test environment
      if (env.isTest()) {
        return;
      }

      const settings = await this.withSystemDbContext(async db => db.backupSetting.findMany())
      for (const setting of settings) {
        if (setting.enabled) {
          await this.scheduleBackup(setting)
        }
      }
    } catch (error) {
      // Only log errors in non-test environments
      if (!env.isTest()) {
        logger.error('Error loading backup settings', { error })
      }
    }
  }

  async scheduleBackup(setting: BackupSetting): Promise<void> {
    const jobKey = `${setting.id}_${setting.backupType}_${setting.frequency}`
    
    // Stop existing job if it exists
    const existingJob = this.jobs.get(jobKey);
    if (existingJob) {
      existingJob.stop();
    }

    // Create cron expression based on frequency
    let cronExpression
    switch (setting.frequency) {
      case 'MINUTES':
        cronExpression = `*/${setting.frequencyValue || 60} * * * *` // Every N minutes
        break
      case 'HOURS':
        cronExpression = `0 */${setting.frequencyValue || 1} * * *` // Every N hours
        break
      case 'DAILY':
        cronExpression = `0 ${setting.frequencyValue || 2} * * *` // Daily at specified hour
        break
      case 'WEEKLY':
        cronExpression = `0 ${setting.frequencyValue || 2} * * 0` // Weekly on Sunday at specified hour
        break
      case 'MONTHLY':
        cronExpression = `0 ${setting.frequencyValue || 2} 1 * *` // Monthly on 1st at specified hour
        break
      default:
        logger.warn(`Unknown backup frequency: ${setting.frequency}`)
        return
    }

    // Create cron job
    const job = cron.schedule(cronExpression, async () => {
      logger.info(`Running scheduled ${setting.backupType} backup...`)
      await this.runScheduledBackup(setting)
    })

    this.jobs.set(jobKey, job)
    logger.info(`Scheduled ${setting.backupType} backup`, { cronExpression })
  }

  async runScheduledBackup(setting: BackupSetting): Promise<void> {
    try {
      const rawType = String(setting.backupType || '').toUpperCase();
      const isRemoteMode = rawType.endsWith('_REMOTE');
      const baseType = (rawType.endsWith('_LOCAL') || rawType.endsWith('_REMOTE'))
        ? rawType.replace(/_(LOCAL|REMOTE)$/, '')
        : rawType;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `scheduled-backup-${baseType.toLowerCase()}-${timestamp}.sql`
      const filepath = path.join('backups', filename)

      // Ensure backups directory exists
      if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups', { recursive: true })
      }

      // Create backup log entry
      const createBackupLog = async (tenantId: string) =>
        this.withSystemDbContext(async db =>
          db.backupLog.create({
            data: {
              tenantId,
              type: baseType,
              location: filepath,
              size: 0,
              status: 'running',
              startedAt: new Date(),
              errorMessage: null,
              metadata: {
                scheduled: true,
                deliveryMode: isRemoteMode ? 'REMOTE' : 'LOCAL',
              }
            }
          })
        );

      let systemTenantId = await this.ensureSystemTenantId();
      let backupLog;
      try {
        backupLog = await createBackupLog(systemTenantId);
      } catch (error) {
        const isTenantFkFailure = (error as { code?: string })?.code === 'P2003';
        if (!isTenantFkFailure) {
          throw error;
        }
        logger.warn('Scheduled backup tenant FK error, refreshing default tenant resolution', {
          tenantId: systemTenantId,
        });
        systemTenantId = await this.ensureSystemTenantId(true);
        backupLog = await createBackupLog(systemTenantId);
      }

      // Parse DATABASE_URL to extract connection details
      const dbUrl = new URL(env.get('DATABASE_URL'));
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1).split('?')[0];
      const username = dbUrl.username;
      const password = dbUrl.password || '';
      const pgOptions = '-c app.tenant_rls_mode=enforce -c app.is_super_admin=true';

      // Create backup based on type
      let command
      switch (baseType) {
        case 'FULL':
          command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        case 'SCHEMA':
          command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security --schema-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        case 'DATA':
          command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security --data-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        default:
          await this.withSystemDbContext(async db =>
            db.backupLog.update({
              where: { id: backupLog.id },
              data: {
                status: 'failed',
                errorMessage: 'Invalid backup type',
                completedAt: new Date(),
                duration: 0
              }
            })
          )
          return
      }

      exec(command, async (error: unknown, _stdout: string, _stderr: string) => {
        if (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Scheduled backup error', { error: errorMessage })
          await this.withSystemDbContext(async db =>
            db.backupLog.update({
              where: { id: backupLog.id },
              data: {
                status: 'failed',
                errorMessage: errorMessage,
                completedAt: new Date(),
                duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000)
              }
            })
          )
          return
        }

        // Update backup log with success
        const stats = fs.statSync(filepath)
        let finalStatus = 'success'
        let finalError: string | null = null
        let remoteResults: Array<{ targetId: string; targetName: string; success: boolean; error?: string }> = []

        if (isRemoteMode) {
          const targets = await this.withSystemDbContext(async db =>
            db.backupTarget.findMany({
              where: {
                enabled: true,
                OR: [{ tenantId: systemTenantId }, { tenantId: null }],
              },
              orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
            })
          );
          if (targets.length === 0) {
            const runtimeSettings = await this.getRuntimeBackupSettings(systemTenantId);
            const remoteEnabled = String(runtimeSettings['backup_remote_enabled'] || 'false') === 'true';
            if (!remoteEnabled) {
              finalStatus = 'failed'
              finalError = 'No enabled off-site backup targets configured and runtime remote backup is disabled.'
            } else {
              const runtimeResult = await uploadToRuntimeRemoteTarget(filepath, runtimeSettings);
              remoteResults.push({
                targetId: 'runtime-config',
                targetName: 'Runtime remote backup settings',
                success: runtimeResult.success,
                error: runtimeResult.error,
              });
              if (!runtimeResult.success) {
                finalStatus = 'failed'
                finalError = runtimeResult.error || 'Off-site transfer failed for runtime remote backup settings.'
              }
            }
          } else {
            const mappedTargets: BackupTarget[] = targets.map((target) => ({
              id: target.id,
              name: target.name,
              type: target.type as BackupTarget['type'],
              config: target.config as unknown as BackupTarget['config'],
              enabled: target.enabled,
              priority: target.priority,
            }));
            for (const target of mappedTargets) {
              const result = await BackupTransferService.uploadToTarget(filepath, target);
              remoteResults.push({
                targetId: target.id,
                targetName: target.name,
                success: result.success,
                error: result.error,
              });
            }
            if (!remoteResults.some((r) => r.success)) {
              finalStatus = 'failed'
              finalError = 'Off-site transfer failed for all targets.'
            } else if (remoteResults.some((r) => !r.success)) {
              finalError = `Off-site transfer partial failures (${remoteResults.filter((r) => !r.success).length}/${remoteResults.length}).`
            }
          }
        }

        await this.withSystemDbContext(async db =>
          db.backupLog.update({
            where: { id: backupLog.id },
            data: {
              status: finalStatus,
              size: stats.size,
              errorMessage: finalError,
              completedAt: new Date(),
              duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000),
              metadata: {
                scheduled: true,
                deliveryMode: isRemoteMode ? 'REMOTE' : 'LOCAL',
                remoteResults,
              }
            }
          })
        )

        if (isRemoteMode) {
          try {
            fs.unlinkSync(filepath);
          } catch {
            // ignore temporary file cleanup failures
          }
        }

        logger.info(`Scheduled ${setting.backupType} backup completed`, { filename, mode: isRemoteMode ? 'REMOTE' : 'LOCAL' })

        // Clean up old backups based on retention policy
        if (!isRemoteMode) {
          await this.cleanupOldBackups(setting)
        }
      })

    } catch (error) {
      logger.error('Error running scheduled backup', { error })
    }
  }

  async cleanupOldBackups(setting: BackupSetting): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - setting.retentionDays)

      // Find old backup files
      const oldBackups = await this.withSystemDbContext(async db =>
        db.backupLog.findMany({
          where: {
            type: setting.backupType,
            createdAt: {
              lt: cutoffDate
            },
            status: 'success'
          }
        })
      )

      for (const backup of oldBackups) {
        // Delete physical file if it exists
        if (fs.existsSync(backup.location)) {
          fs.unlinkSync(backup.location)
        }

        // Delete database record
        await this.withSystemDbContext(async db =>
          db.backupLog.delete({
            where: { id: backup.id }
          })
        )

        logger.info(`Cleaned up old backup`, { location: backup.location })
      }

    } catch (error) {
      logger.error('Error cleaning up old backups', { error })
    }
  }

  async updateBackupSchedule(_setting: BackupSetting): Promise<void> {
    await this.reloadSettings();
  }

  async reloadSettings() {
    // Stop all existing jobs
    this.jobs.forEach((job) => {
      job.stop()
    })
    this.jobs.clear()

    // Reload settings from database
    await this.loadBackupSettings();
  }

  // Method to manually trigger a backup (for testing/debugging)
  async runManualBackup(settingId: string): Promise<{success: boolean, message?: string, error?: string}> {
    try {
      const setting = await this.withSystemDbContext(async db =>
        db.backupSetting.findUnique({
          where: { id: settingId }
        })
      )

      if (!setting) {
        throw new Error('Backup setting not found')
      }

      await this.runScheduledBackup(setting)
      return { success: true, message: 'Manual backup completed' }
    } catch (error) {
      logger.error('Error running manual backup', { error })
      const errorObj = error as { message?: string };
      return { success: false, error: errorObj.message || 'Unknown error' };
    }
  }

  // Method to get all active backup schedules
  getActiveSchedules(): Array<{backupType: string, frequency: string, isActive: boolean}> {
    const schedules: Array<{backupType: string, frequency: string, isActive: boolean}> = [];
    this.jobs.forEach((_job: ReturnType<typeof cron.schedule>, key: string) => {
      const [backupType, frequency] = key.split('_');
      schedules.push({ backupType: backupType ?? '', frequency: frequency ?? '', isActive: true });
    });
    return schedules;
  }
}

export default ScheduledBackupService;
export { ScheduledBackupService };
