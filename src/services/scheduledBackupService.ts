import { PrismaClient } from '@prisma/client';
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
import { getTenantSegregationConfig } from '../utils/tenantSegregationPolicy';
import {
  BackupScheduleFrequency,
  BackupScheduleOverride,
  BackupTypeBase,
  applyScheduleOverride,
  buildScheduleIdentity,
  encodeStoredBackupType,
  isValidScheduleFrequency,
  normalizeStoredBackupType,
  parseScheduleOverrides,
  sortBackupScheduleRows,
} from '../utils/backupScheduleConfig';
import { withTenantDbRlsContext } from '../utils/prismaRlsContext';

const logger = createLogger('ScheduledBackupService');

type ScheduledScope = 'platform' | 'tenant';
type ScheduleSource = 'global' | 'tenant_override';

interface ScheduledBackupDefinition {
  id: string;
  backupType: string;
  frequency: BackupScheduleFrequency;
  frequencyValue: number | null;
  retentionDays: number;
  enabled: boolean;
  tenantId: string | null;
  scope: ScheduledScope;
  source: ScheduleSource;
}

interface ActiveScheduleSummary {
  backupType: string;
  frequency: string;
  isActive: boolean;
  tenantId: string | null;
  scope: ScheduledScope;
  source: ScheduleSource;
}

class ScheduledBackupService {
  private prisma: PrismaClient;
  private jobs: Map<string, ReturnType<typeof cron.schedule>>;
  private jobSummaries: Map<string, ActiveScheduleSummary>;
  private isRunning: boolean;
  private settingsRefreshInterval: NodeJS.Timeout | null;
  private systemTenantId: string | null;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
    this.jobs = new Map();
    this.jobSummaries = new Map();
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

  private isDefaultTenant(tenantId: string, tenantSlug: string): boolean {
    const segregationConfig = getTenantSegregationConfig();
    const normalizedId = String(tenantId || '').trim().toLowerCase();
    const normalizedSlug = String(tenantSlug || '').trim().toLowerCase();
    return (
      segregationConfig.defaultTenantIds.map((value) => String(value || '').trim().toLowerCase()).includes(normalizedId) ||
      segregationConfig.defaultTenantSlugs.map((value) => String(value || '').trim().toLowerCase()).includes(normalizedSlug)
    );
  }

  private parseFrequency(rawValue: string, fallback: BackupScheduleFrequency): BackupScheduleFrequency {
    const upper = String(rawValue || '').toUpperCase();
    return isValidScheduleFrequency(upper) ? upper : fallback;
  }

  private asBaseType(rawType: string): BackupTypeBase {
    const normalized = String(rawType || '').toUpperCase();
    if (normalized === 'FULL' || normalized === 'SCHEMA' || normalized === 'DATA') {
      return normalized;
    }
    return 'FULL';
  }

  private toDefinition(
    id: string,
    storedType: string,
    frequency: string,
    frequencyValue: number | null,
    retentionDays: number,
    enabled: boolean,
    tenantId: string | null,
    scope: ScheduledScope,
    source: ScheduleSource
  ): ScheduledBackupDefinition {
    return {
      id,
      backupType: storedType,
      frequency: this.parseFrequency(frequency, 'DAILY'),
      frequencyValue,
      retentionDays: Number(retentionDays || 30),
      enabled: Boolean(enabled),
      tenantId,
      scope,
      source,
    };
  }

  private async loadScheduledDefinitions(): Promise<ScheduledBackupDefinition[]> {
    const [globalSettings, tenants, allOverrideRows] = await this.withSystemDbContext(async db =>
      Promise.all([
        db.backupSetting.findMany({
          orderBy: [{ backupType: 'asc' }, { createdAt: 'asc' }],
        }),
        db.tenant.findMany({
          where: { isActive: true },
          select: { id: true, slug: true },
        }),
        db.systemSetting.findMany({
          where: {
            category: 'backup',
            key: { startsWith: 'backup_schedule_' },
            tenantId: { not: null },
          },
          select: { tenantId: true, key: true, value: true },
        }),
      ])
    );

    const globalRows = sortBackupScheduleRows(
      globalSettings.map((setting) => ({
        id: setting.id,
        ...normalizeStoredBackupType(setting.backupType),
        enabled: Boolean(setting.enabled),
        frequency: this.parseFrequency(setting.frequency, 'DAILY'),
        frequencyValue: setting.frequencyValue ?? null,
        retentionDays: Number(setting.retentionDays || 30),
      }))
    );

    const definitions: ScheduledBackupDefinition[] = globalRows.map((row) =>
      this.toDefinition(
        row.id || buildScheduleIdentity(row.backupType, row.deliveryMode),
        encodeStoredBackupType(row.backupType, row.deliveryMode),
        row.frequency,
        row.frequencyValue,
        row.retentionDays,
        row.enabled,
        null,
        'platform',
        'global'
      )
    );

    const tenantOverrideRowsByTenant = new Map<string, Array<{ key: string; value: string }>>();
    for (const row of allOverrideRows) {
      if (!row.tenantId) continue;
      const existing = tenantOverrideRowsByTenant.get(row.tenantId) || [];
      existing.push({ key: row.key, value: row.value });
      tenantOverrideRowsByTenant.set(row.tenantId, existing);
    }

    for (const tenant of tenants) {
      if (!tenant.id || this.isDefaultTenant(tenant.id, tenant.slug)) {
        continue;
      }
      const tenantOverrides = parseScheduleOverrides(tenantOverrideRowsByTenant.get(tenant.id) || []);
      for (const globalRow of globalRows) {
        const storedType = encodeStoredBackupType(globalRow.backupType, globalRow.deliveryMode);
        const override: BackupScheduleOverride | undefined = tenantOverrides.get(storedType);
        const merged = applyScheduleOverride(globalRow, override);
        definitions.push(
          this.toDefinition(
            `tenant-${tenant.id}-${storedType.toLowerCase()}`,
            storedType,
            merged.frequency,
            merged.frequencyValue,
            merged.retentionDays,
            merged.enabled,
            tenant.id,
            'tenant',
            override ? 'tenant_override' : 'global'
          )
        );
      }
    }

    return definitions;
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
    this.jobSummaries.clear()
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

      const definitions = await this.loadScheduledDefinitions();
      for (const definition of definitions) {
        if (definition.enabled) {
          await this.scheduleBackup(definition);
        }
      }
    } catch (error) {
      // Only log errors in non-test environments
      if (!env.isTest()) {
        logger.error('Error loading backup settings', { error })
      }
    }
  }

  private buildCronExpression(setting: ScheduledBackupDefinition): string | null {
    switch (setting.frequency) {
      case 'MINUTES':
        return `*/${setting.frequencyValue || 60} * * * *`; // Every N minutes
      case 'HOURS':
        return `0 */${setting.frequencyValue || 1} * * *`; // Every N hours
      case 'DAILY':
        return `0 ${setting.frequencyValue || 2} * * *`; // Daily at specified hour
      case 'WEEKLY':
        return `0 ${setting.frequencyValue || 2} * * 0`; // Weekly on Sunday at specified hour
      case 'MONTHLY':
        return `0 ${setting.frequencyValue || 2} 1 * *`; // Monthly on 1st at specified hour
      default:
        return null;
    }
  }

  async scheduleBackup(setting: ScheduledBackupDefinition): Promise<void> {
    const scopePrefix = setting.tenantId ? `tenant:${setting.tenantId}` : 'platform';
    const jobKey = `${scopePrefix}:${setting.id}:${setting.backupType}:${setting.frequency}`
    
    // Stop existing job if it exists
    const existingJob = this.jobs.get(jobKey);
    if (existingJob) {
      existingJob.stop();
    }

    const cronExpression = this.buildCronExpression(setting);
    if (!cronExpression) {
      logger.warn(`Unknown backup frequency: ${setting.frequency}`)
      return
    }

    // Create cron job
    const job = cron.schedule(cronExpression, async () => {
      logger.info(`Running scheduled ${setting.backupType} backup...`, {
        tenantId: setting.tenantId || undefined,
        scope: setting.scope,
        source: setting.source,
      })
      await this.runScheduledBackup(setting)
    })

    this.jobs.set(jobKey, job)
    this.jobSummaries.set(jobKey, {
      backupType: setting.backupType,
      frequency: setting.frequency,
      isActive: true,
      tenantId: setting.tenantId,
      scope: setting.scope,
      source: setting.source,
    });
    logger.info(`Scheduled ${setting.backupType} backup`, {
      cronExpression,
      tenantId: setting.tenantId || undefined,
      scope: setting.scope,
      source: setting.source,
    })
  }

  async runScheduledBackup(setting: ScheduledBackupDefinition): Promise<void> {
    try {
      const rawType = String(setting.backupType || '').toUpperCase();
      const isRemoteMode = rawType.endsWith('_REMOTE');
      const baseType = (rawType.endsWith('_LOCAL') || rawType.endsWith('_REMOTE'))
        ? rawType.replace(/_(LOCAL|REMOTE)$/, '')
        : rawType;
      const normalizedBaseType = this.asBaseType(baseType);
      const scopeTag = setting.tenantId ? `tenant-${setting.tenantId}` : 'platform';

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `scheduled-backup-${scopeTag}-${normalizedBaseType.toLowerCase()}-${timestamp}.sql`
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
              type: normalizedBaseType,
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
      const logTenantId = setting.tenantId || systemTenantId;
      let backupLog;
      try {
        backupLog = await createBackupLog(logTenantId);
      } catch (error) {
        const isTenantFkFailure = (error as { code?: string })?.code === 'P2003';
        if (!isTenantFkFailure) {
          throw error;
        }
        logger.warn('Scheduled backup tenant FK error, refreshing default tenant resolution', {
          tenantId: logTenantId,
        });
        if (!setting.tenantId) {
          systemTenantId = await this.ensureSystemTenantId(true);
          backupLog = await createBackupLog(systemTenantId);
        } else {
          throw error;
        }
      }

      // Parse DATABASE_URL to extract connection details
      const dbUrl = new URL(env.get('DATABASE_URL'));
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1).split('?')[0];
      const username = dbUrl.username;
      const password = dbUrl.password || '';
      const pgOptionsParts = [
        '-c app.tenant_rls_mode=enforce',
        `-c app.is_super_admin=${setting.tenantId ? 'false' : 'true'}`,
      ];
      if (setting.tenantId) {
        pgOptionsParts.push(`-c app.tenant_id=${setting.tenantId}`);
      }
      const pgOptions = pgOptionsParts.join(' ');

      // Create backup based on type
      let command
        switch (normalizedBaseType) {
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
          const targetTenantId = setting.tenantId || systemTenantId;
          const targets = await this.withSystemDbContext(async db =>
            db.backupTarget.findMany({
              where: {
                enabled: true,
                OR: [{ tenantId: targetTenantId }, { tenantId: null }],
              },
              orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
            })
          );
          if (targets.length === 0) {
            const runtimeSettings = await this.getRuntimeBackupSettings(targetTenantId);
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
                scope: setting.scope,
                source: setting.source,
                tenantId: setting.tenantId,
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
          await this.cleanupOldBackups({
            baseType: normalizedBaseType,
            retentionDays: setting.retentionDays,
            tenantId: logTenantId,
          })
        }
      })

    } catch (error) {
      logger.error('Error running scheduled backup', { error })
    }
  }

  async cleanupOldBackups(params: { baseType: BackupTypeBase; retentionDays: number; tenantId: string }): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - params.retentionDays)

      // Find old backup files
      const oldBackups = await this.withSystemDbContext(async db =>
        db.backupLog.findMany({
          where: {
            tenantId: params.tenantId,
            type: params.baseType,
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

  async updateBackupSchedule(_setting: ScheduledBackupDefinition): Promise<void> {
    await this.reloadSettings();
  }

  async reloadSettings() {
    // Stop all existing jobs
    this.jobs.forEach((job) => {
      job.stop()
    })
    this.jobs.clear()
    this.jobSummaries.clear()

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

      const definition = this.toDefinition(
        setting.id,
        setting.backupType,
        setting.frequency,
        setting.frequencyValue ?? null,
        setting.retentionDays,
        setting.enabled,
        null,
        'platform',
        'global'
      );

      await this.runScheduledBackup(definition)
      return { success: true, message: 'Manual backup completed' }
    } catch (error) {
      logger.error('Error running manual backup', { error })
      const errorObj = error as { message?: string };
      return { success: false, error: errorObj.message || 'Unknown error' };
    }
  }

  // Method to get all active backup schedules
  getActiveSchedules(): Array<ActiveScheduleSummary> {
    return Array.from(this.jobSummaries.values());
  }
}

export default ScheduledBackupService;
export { ScheduledBackupService };
