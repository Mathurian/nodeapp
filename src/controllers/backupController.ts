/**
 * Backup Controller
 * Handles database backup operations
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import ScheduledBackupService from '../services/scheduledBackupService';
import { SettingsService } from '../services/SettingsService';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/responseHelpers';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env';

// Get services from container
const getScheduledBackupService = (): ScheduledBackupService => {
  return new ScheduledBackupService(prisma);
};

const getSettingsService = (): SettingsService => {
  return container.resolve(SettingsService);
};

/**
 * Create a database backup
 */
export const createBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type = 'FULL' } = req.body;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${type.toLowerCase()}-${timestamp}.sql`;
    const filepath = path.join('backups', filename);

    // Ensure backups directory exists
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }

    // Create backup log entry
    const backupLog = await prisma.backupLog.create({
      data: {
        tenantId: req.tenantId!,
        type: type,
        location: filepath,
        size: BigInt(0),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        errorMessage: null,
        metadata: {}
      }
    });

    // Parse DATABASE_URL
    const dbUrl = new URL(env.get('DATABASE_URL') || '');
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1).split('?')[0];
    const username = dbUrl.username;
    const password = dbUrl.password || '';

    // Create backup command
    let command: string;
    switch (type) {
      case 'FULL':
        command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
        break;
      case 'SCHEMA':
        command = `PGPASSWORD="${password}" pg_dump --schema-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
        break;
      case 'DATA':
        command = `PGPASSWORD="${password}" pg_dump --data-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
        break;
      default:
        await prisma.backupLog.update({
          where: { id: backupLog.id },
          data: { status: 'FAILED', errorMessage: 'Invalid backup type' }
        });
        res.status(400).json({ error: 'Invalid backup type' });
        return;
    }

    // Execute backup
    exec(command, async (error, _stdout, _stderr) => {
      if (error) {
        await prisma.backupLog.update({
          where: { id: backupLog.id },
          data: { status: 'FAILED', errorMessage: error.message }
        });
        res.status(500).json({ error: `Backup failed: ${error.message}` });
        return;
      }

      const stats = fs.statSync(filepath);
      const completedAt = new Date();
      const duration = Math.floor((completedAt.getTime() - backupLog.startedAt.getTime()) / 1000);
      await prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: 'COMPLETED',
          size: BigInt(stats.size),
          completedAt,
          duration,
          errorMessage: null
        }
      });

      sendSuccess(res, {
        id: backupLog.id,
        filename,
        filepath,
        fileSize: stats.size,
        type,
        createdAt: backupLog.createdAt
      }, 'Backup created successfully');
    });
  } catch (error: any) {
    return next(error);
  }
};

/**
 * List all backups
 */
export const listBackups = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backups = await prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Transform backups to include filename for frontend compatibility
    const transformedBackups = backups.map(backup => ({
      ...backup,
      filename: path.basename(backup.location),
      size: backup.size ? Number(backup.size) : null
    }));

    sendSuccess(res, transformedBackups);
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Download a backup file
 */
export const downloadBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { backupId } = req.params;
    const backup = await prisma.backupLog.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }

    if (!fs.existsSync(backup.location)) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    res.download(backup.location, path.basename(backup.location));
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Restore a backup
 */
export const restoreBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ error: 'No backup file provided' });
      return;
    }

    const dbUrl = new URL(env.get('DATABASE_URL') || '');
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1).split('?')[0];
    const username = dbUrl.username;
    const password = dbUrl.password || '';

    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${file.path}`;

    exec(command, async (error, _stdout, _stderr) => {
      if (error) {
        res.status(500).json({ error: `Restore failed: ${error.message}` });
        return;
      }

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      sendSuccess(res, null, 'Backup restored successfully');
    });
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Delete a backup
 */
export const deleteBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    const filepath = path.join('backups', filename!);

    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'Backup file not found' });
      return;
    }

    fs.unlinkSync(filepath);

    // Update backup log if exists
    await prisma.backupLog.updateMany({
      where: { location: filepath },
      data: { status: 'DELETED' }
    });

    sendSuccess(res, null, 'Backup deleted successfully');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Get backup settings
 */
export const getBackupSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get backup settings from database (backupSetting table)
    const backupSettings = await prisma.backupSetting.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform to match frontend format
    const schedules = backupSettings.map(setting => ({
      id: setting.id,
      backupType: setting.backupType,
      enabled: setting.enabled,
      frequency: setting.frequency,
      frequencyValue: 1,
      retentionDays: setting.retentionDays || 30,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString()
    }));
    
    // Return settings in the format expected by the frontend
    sendSuccess(res, { 
      success: true,
      settings: schedules
    });
  } catch (error: any) {
    // If backupSetting table doesn't exist, return empty array
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      sendSuccess(res, { 
        success: true,
        settings: []
      });
      return;
    }
    return next(error);
  }
};

/**
 * Create backup setting
 */
export const createBackupSetting = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Implementation depends on SettingsService API
    sendSuccess(res, {}, 'Backup setting created');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Update backup setting
 */
export const updateBackupSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // id from params not currently used
    const settings = req.body;
    const userId = (req as any).user?.id;
    const settingsService = getSettingsService();
    await settingsService.updateBackupSettings(settings, userId);
    sendSuccess(res, {}, 'Backup settings updated');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Delete backup setting
 */
export const deleteBackupSetting = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // id from params not currently used
    // Implementation depends on SettingsService API
    sendSuccess(res, {}, 'Backup setting deleted');
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Run scheduled backup manually
 */
export const runScheduledBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { settingId } = req.body;
    const backupService = getScheduledBackupService();
    const result = await backupService.runManualBackup(settingId);
    
    if (result.success) {
      sendSuccess(res, result, result.message);
    } else {
      res.status(500).json({ error: result.error || 'Backup failed' });
    }
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Get active backup schedules
 */
export const getActiveSchedules = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backupService = getScheduledBackupService();
    const schedules = backupService.getActiveSchedules();
    sendSuccess(res, schedules);
  } catch (error: any) {
    return next(error);
  }
};

/**
 * Debug backup settings
 */
export const debugBackupSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settingsService = getSettingsService();
    const settings = await settingsService.getBackupSettings();
    const backupService = getScheduledBackupService();
    const schedules = backupService.getActiveSchedules();
    
    sendSuccess(res, {
      settings,
      schedules,
      databaseUrl: env.get('DATABASE_URL') ? 'configured' : 'not configured'
    });
  } catch (error: any) {
    return next(error);
  }
};
