import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env';


class ScheduledBackupService {
  private prisma: PrismaClient;
  private jobs: Map<string, any>;
  private isRunning: boolean;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
    this.jobs = new Map();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('Scheduled backup service is already running')
      return
    }

    this.isRunning = true
    console.log('Starting scheduled backup service...')

    // Load backup settings from database
    await this.loadBackupSettings()
  }

  async stop() {
    if (!this.isRunning) {
      console.log('Scheduled backup service is not running')
      return
    }

    // Stop all cron jobs
    this.jobs.forEach((job: any, key: string) => {
      job.stop();
      console.log(`Stopped backup job: ${key}`);
    });

    this.jobs.clear()
    this.isRunning = false
    console.log('Scheduled backup service stopped')
  }

  async loadBackupSettings() {
    try {
      // Skip in test environment
      if (env.isTest()) {
        return;
      }

      const settings: any = await this.prisma.backupSetting.findMany()
      for (const setting of settings) {
        if (setting.enabled) {
          await this.scheduleBackup(setting)
        }
      }
    } catch (error) {
      // Only log errors in non-test environments
      if (!env.isTest()) {
        console.error('Error loading backup settings:', error)
      }
    }
  }

  async scheduleBackup(setting: any): Promise<void> {
    const jobKey = `${setting.backupType}_${setting.frequency}`
    
    // Stop existing job if it exists
    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey).stop()
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
        console.warn(`Unknown backup frequency: ${setting.frequency}`)
        return
    }

    // Create cron job
    const job = cron.schedule(cronExpression, async () => {
      console.log(`Running scheduled ${setting.backupType} backup...`)
      await this.runScheduledBackup(setting)
    })

    this.jobs.set(jobKey, job)
    console.log(`Scheduled ${setting.backupType} backup: ${cronExpression}`)
  }

  async runScheduledBackup(setting: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `scheduled-backup-${setting.backupType.toLowerCase()}-${timestamp}.sql`
      const filepath = path.join('backups', filename)

      // Ensure backups directory exists
      if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups', { recursive: true })
      }

      // Create backup log entry
      const backupLog: any = await this.prisma.backupLog.create({
        data: {
          tenantId: 'default_tenant',
          type: setting.backupType,
          location: filepath,
          size: 0,
          status: 'running',
          startedAt: new Date(),
          errorMessage: null
        }
      })

      // Parse DATABASE_URL to extract connection details
      const dbUrl = new URL(env.get('DATABASE_URL'));
      const host = dbUrl.hostname;
      const port = dbUrl.port || '5432';
      const database = dbUrl.pathname.slice(1).split('?')[0];
      const username = dbUrl.username;
      const password = dbUrl.password || '';

      // Create backup based on type
      let command
      switch (setting.backupType) {
        case 'FULL':
          command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        case 'SCHEMA':
          command = `PGPASSWORD="${password}" pg_dump --schema-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        case 'DATA':
          command = `PGPASSWORD="${password}" pg_dump --data-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`
          break
        default:
          await this.prisma.backupLog.update({
            where: { id: backupLog.id },
            data: {
              status: 'failed',
              errorMessage: 'Invalid backup type',
              completedAt: new Date(),
              duration: 0
            }
          })
          return
      }

      exec(command, async (error: any, _stdout: string, _stderr: string) => {
        if (error) {
          console.error('Scheduled backup error:', error)
          await this.prisma.backupLog.update({
            where: { id: backupLog.id },
            data: {
              status: 'failed',
              errorMessage: error.message,
              completedAt: new Date(),
              duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000)
            }
          })
          return
        }

        // Update backup log with success
        const stats = fs.statSync(filepath)
        await this.prisma.backupLog.update({
          where: { id: backupLog.id },
          data: {
            status: 'success',
            size: stats.size,
            errorMessage: null,
            completedAt: new Date(),
            duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000)
          }
        })

        console.log(`Scheduled ${setting.backupType} backup completed: ${filename}`)

        // Clean up old backups based on retention policy
        await this.cleanupOldBackups(setting)
      })

    } catch (error) {
      console.error('Error running scheduled backup:', error)
    }
  }

  async cleanupOldBackups(setting: any): Promise<void> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - setting.retentionDays)

      // Find old backup files
      const oldBackups: any = await this.prisma.backupLog.findMany({
        where: {
          type: setting.backupType,
          createdAt: {
            lt: cutoffDate
          },
          status: 'success'
        }
      })

      for (const backup of oldBackups) {
        // Delete physical file if it exists
        if (fs.existsSync(backup.location)) {
          fs.unlinkSync(backup.location)
        }

        // Delete database record
        await this.prisma.backupLog.delete({
          where: { id: backup.id }
        })

        console.log(`Cleaned up old backup: ${backup.location}`)
      }

    } catch (error) {
      console.error('Error cleaning up old backups:', error)
    }
  }

  async updateBackupSchedule(setting: any): Promise<void> {
    const jobKey = `${setting.backupType}_${setting.frequency}`
    
    // Stop existing job
    if (this.jobs.has(jobKey)) {
      this.jobs.get(jobKey).stop()
      this.jobs.delete(jobKey)
    }

    // Schedule new job if enabled
    if (setting.enabled) {
      await this.scheduleBackup(setting)
    }
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
      const setting: any = await this.prisma.backupSetting.findUnique({
        where: { id: settingId }
      })

      if (!setting) {
        throw new Error('Backup setting not found')
      }

      await this.runScheduledBackup(setting)
      return { success: true, message: 'Manual backup completed' }
    } catch (error) {
      console.error('Error running manual backup:', error)
      const errorObj = error as { message?: string };
      return { success: false, error: errorObj.message || 'Unknown error' };
    }
  }

  // Method to get all active backup schedules
  getActiveSchedules(): Array<{backupType: string, frequency: string, isActive: boolean}> {
    const schedules: Array<{backupType: string, frequency: string, isActive: boolean}> = [];
    this.jobs.forEach((_job: any, key: string) => {
      const [backupType, frequency] = key.split('_');
      schedules.push({ backupType, frequency, isActive: true });
    });
    return schedules;
  }
}

export default ScheduledBackupService;
export { ScheduledBackupService };
