/**
 * Backup Controller
 * Handles database backup operations
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import ScheduledBackupService from '../services/scheduledBackupService';
import { SettingsService } from '../services/SettingsService';
import BackupTransferService, { BackupTarget } from '../services/BackupTransferService';
import { uploadToRuntimeRemoteTarget } from '../services/runtimeBackupUploadService';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/responseHelpers';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { env } from '../config/env';

type BackupTypeBase = 'FULL' | 'SCHEMA' | 'DATA';
type BackupDeliveryMode = 'LOCAL' | 'REMOTE';

const normalizeStoredBackupType = (rawType: string): { backupType: BackupTypeBase; deliveryMode: BackupDeliveryMode } => {
  const upper = String(rawType || '').toUpperCase();
  if (upper.endsWith('_REMOTE')) {
    return { backupType: upper.replace(/_REMOTE$/, '') as BackupTypeBase, deliveryMode: 'REMOTE' };
  }
  if (upper.endsWith('_LOCAL')) {
    return { backupType: upper.replace(/_LOCAL$/, '') as BackupTypeBase, deliveryMode: 'LOCAL' };
  }
  return { backupType: upper as BackupTypeBase, deliveryMode: 'LOCAL' };
};

const encodeStoredBackupType = (backupType: string, deliveryMode?: string): string => {
  const base = String(backupType || '').toUpperCase();
  const mode = String(deliveryMode || 'LOCAL').toUpperCase();
  if (!['FULL', 'SCHEMA', 'DATA'].includes(base)) {
    return base;
  }
  if (mode === 'REMOTE') {
    return `${base}_REMOTE`;
  }
  return `${base}_LOCAL`;
};

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
    const { type = 'FULL', destination = 'LOCAL' } = req.body as {
      type?: 'FULL' | 'SCHEMA' | 'DATA';
      destination?: 'LOCAL' | 'OFF_SITE' | 'BOTH';
    };
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.isSuperAdmin === true;
    const requestedTenantId = (req.query['tenantId'] as string | undefined) || undefined;
    const effectiveTenantId = isSuperAdmin
      ? (requestedTenantId ?? req.tenantId ?? req.user?.tenantId ?? null)
      : (req.tenantId || req.user?.tenantId || null);
    const logTenantId = effectiveTenantId || req.user?.tenantId || req.tenantId || '';
    if (!logTenantId) {
      res.status(400).json({ error: 'Unable to resolve tenant context for backup operation.' });
      return;
    }
    const normalizedDestination = String(destination || 'LOCAL').toUpperCase() as 'LOCAL' | 'OFF_SITE' | 'BOTH';
    if (!['LOCAL', 'OFF_SITE', 'BOTH'].includes(normalizedDestination)) {
      res.status(400).json({ error: 'Invalid backup destination. Use LOCAL, OFF_SITE, or BOTH.' });
      return;
    }

    const shouldReplicateOffsite = normalizedDestination === 'OFF_SITE' || normalizedDestination === 'BOTH';
    let offsiteTargets: BackupTarget[] = [];
    let useRuntimeOffsiteTarget = false;
    let runtimeBackupSettings: Record<string, string> = {};
    if (shouldReplicateOffsite) {
      const targetTenantFilter = effectiveTenantId
        ? { OR: [{ tenantId: effectiveTenantId }, { tenantId: null }] }
        : { tenantId: null };
      const rawTargets = await prisma.backupTarget.findMany({
        where: {
          enabled: true,
          ...targetTenantFilter,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      });
      offsiteTargets = rawTargets.map((target) => ({
        id: target.id,
        name: target.name,
        type: target.type as BackupTarget['type'],
        config: target.config as unknown as BackupTarget['config'],
        enabled: target.enabled,
        priority: target.priority,
      }));

      if (offsiteTargets.length === 0) {
        const settingsService = getSettingsService();
        runtimeBackupSettings = await settingsService.getBackupSettings(effectiveTenantId);
        const remoteEnabled = String(runtimeBackupSettings['backup_remote_enabled'] || 'false') === 'true';
        if (!remoteEnabled) {
          res.status(400).json({
            error: 'No enabled off-site backup target found. Configure a backup target or enable remote backup settings.',
          });
          return;
        }
        useRuntimeOffsiteTarget = true;
      }
    }

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
        tenantId: logTenantId,
        type: type,
        location: filepath,
        size: BigInt(0),
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        errorMessage: null,
        metadata: {
          destination: normalizedDestination,
          offsite: {
            attempted: shouldReplicateOffsite,
            successCount: 0,
            failedCount: 0,
          },
        }
      }
    });

    // Parse DATABASE_URL
    const dbUrl = new URL(env.get('DATABASE_URL'));
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1).split('?')[0];
    const username = dbUrl.username;
    const password = dbUrl.password || '';
    const tenantScopeId = isSuperAdmin ? null : logTenantId;
    const pgOptionsParts = [
      '-c app.tenant_rls_mode=enforce',
      `-c app.is_super_admin=${isSuperAdmin ? 'true' : 'false'}`,
    ];
    if (tenantScopeId) {
      pgOptionsParts.push(`-c app.tenant_id=${tenantScopeId}`);
    }
    const pgOptions = pgOptionsParts.join(' ');

    // Create backup command
    let command: string;
    switch (type) {
      case 'FULL':
        command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
        break;
      case 'SCHEMA':
        command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security --schema-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
        break;
      case 'DATA':
        command = `PGOPTIONS="${pgOptions}" PGPASSWORD="${password}" pg_dump --enable-row-security --data-only -h ${host} -p ${port} -U ${username} -d ${database} -f ${filepath}`;
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
      let finalStatus = 'COMPLETED';
      let finalErrorMessage: string | null = null;
      const offsiteResults: Array<{ targetId: string; targetName: string; success: boolean; error?: string }> = [];

      if (shouldReplicateOffsite) {
        if (offsiteTargets.length > 0) {
          for (const target of offsiteTargets) {
            const result = await BackupTransferService.uploadToTarget(filepath, target);
            offsiteResults.push({
              targetId: target.id,
              targetName: target.name,
              success: result.success,
              error: result.error,
            });
          }
        } else if (useRuntimeOffsiteTarget) {
          const runtimeResult = await uploadToRuntimeRemoteTarget(filepath, runtimeBackupSettings);
          offsiteResults.push({
            targetId: 'runtime-config',
            targetName: 'Runtime remote backup settings',
            success: runtimeResult.success,
            error: runtimeResult.error,
          });
        }
        const successCount = offsiteResults.filter((r) => r.success).length;
        const failedCount = offsiteResults.length - successCount;

        if (normalizedDestination === 'OFF_SITE' && successCount === 0) {
          finalStatus = 'FAILED';
          finalErrorMessage = 'Off-site backup transfer failed for all configured targets.';
        } else if (failedCount > 0) {
          finalErrorMessage = `Backup completed with partial off-site transfer failures (${failedCount}/${offsiteResults.length}).`;
        }
      }

      // Remote-only runs should not retain local backup artifacts after successful transfer.
      let localCopyDeleted = false;
      if (normalizedDestination === 'OFF_SITE' && finalStatus === 'COMPLETED') {
        try {
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          localCopyDeleted = true;
        } catch (cleanupError) {
          finalErrorMessage = finalErrorMessage
            ? `${finalErrorMessage} Local cleanup failed: ${(cleanupError as Error).message}`
            : `Local cleanup failed: ${(cleanupError as Error).message}`;
        }
      }

      await prisma.backupLog.update({
        where: { id: backupLog.id },
        data: {
          status: finalStatus,
          size: BigInt(stats.size),
          completedAt,
          duration,
          errorMessage: finalErrorMessage,
          metadata: {
            destination: normalizedDestination,
            offsite: {
              attempted: shouldReplicateOffsite,
              successCount: offsiteResults.filter((r) => r.success).length,
              failedCount: offsiteResults.filter((r) => !r.success).length,
              results: offsiteResults,
            },
            localCopyDeleted,
          },
        }
      });

      sendSuccess(res, {
        id: backupLog.id,
        filename,
        filepath,
        fileSize: stats.size,
        type,
        destination: normalizedDestination,
        offsiteResults,
        createdAt: backupLog.createdAt
      }, finalStatus === 'COMPLETED' ? 'Backup created successfully' : 'Backup created but off-site transfer failed');
    });
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * List all backups
 */
export const listBackups = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestedTenantId = req.query['tenantId'] as string | undefined;
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.isSuperAdmin === true;
    const effectiveTenantId = isSuperAdmin ? requestedTenantId : (req.tenantId || req.user?.tenantId);

    const backups = await prisma.backupLog.findMany({
      where: effectiveTenantId ? { tenantId: effectiveTenantId } : undefined,
      orderBy: { createdAt: 'desc' }
    });

    // Transform backups to include filename for frontend compatibility
    const transformedBackups = backups.map(backup => ({
      ...backup,
      filename: path.basename(backup.location),
      size: backup.size ? Number(backup.size) : null
    }));

    sendSuccess(res, transformedBackups);
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * Download a backup file
 */
export const downloadBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backupId = req.params['backupId'];
    if (!backupId) {
      res.status(400).json({ error: 'Backup identifier is required' });
      return;
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.isSuperAdmin === true;
    const requestedTenantId = req.query['tenantId'] as string | undefined;
    const effectiveTenantId = isSuperAdmin ? requestedTenantId : (req.tenantId || req.user?.tenantId);

    const backup = await prisma.backupLog.findFirst({
      where: {
        id: backupId,
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      },
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
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * Restore a backup
 */
export const restoreBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    let restorePath = uploadedFile?.path;
    let removeUploadedFile = false;

    if (restorePath) {
      removeUploadedFile = true;
    } else {
      const backupId = req.params['backupId'];
      if (!backupId) {
        res.status(400).json({ error: 'No backup file provided' });
        return;
      }

      const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.isSuperAdmin === true;
      const requestedTenantId = req.query['tenantId'] as string | undefined;
      const effectiveTenantId = isSuperAdmin ? requestedTenantId : (req.tenantId || req.user?.tenantId);

      const backup = await prisma.backupLog.findFirst({
        where: {
          id: backupId,
          ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
        },
      });

      if (!backup) {
        res.status(404).json({ error: 'Backup not found' });
        return;
      }

      if (!fs.existsSync(backup.location)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
      }

      restorePath = backup.location;
    }

    const dbUrl = new URL(env.get('DATABASE_URL'));
    const host = dbUrl.hostname;
    const port = dbUrl.port || '5432';
    const database = dbUrl.pathname.slice(1).split('?')[0];
    const username = dbUrl.username;
    const password = dbUrl.password || '';

    const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${restorePath}`;

    exec(command, async (error, _stdout, _stderr) => {
      if (error) {
        res.status(500).json({ error: `Restore failed: ${error.message}` });
        return;
      }

      if (removeUploadedFile && restorePath && fs.existsSync(restorePath)) {
        fs.unlinkSync(restorePath);
      }

      sendSuccess(res, null, 'Backup restored successfully');
    });
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * Delete a backup
 */
export const deleteBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const backupIdOrFilename = req.params['filename'] || req.params['id'];
    if (!backupIdOrFilename) {
      res.status(400).json({ error: 'Backup identifier is required' });
      return;
    }

    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN' || req.isSuperAdmin === true;
    const requestedTenantId = req.query['tenantId'] as string | undefined;
    const effectiveTenantId = isSuperAdmin ? requestedTenantId : (req.tenantId || req.user?.tenantId);
    const normalizedFilename = path.basename(backupIdOrFilename);
    const fallbackPath = path.join('backups', normalizedFilename);

    const backup = await prisma.backupLog.findFirst({
      where: {
        OR: [
          { id: backupIdOrFilename },
          { location: backupIdOrFilename },
          { location: path.join('backups', normalizedFilename) },
        ],
        ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      },
    });

    if (!isSuperAdmin && !backup) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }

    const filepath = backup?.location || fallbackPath;
    const existedOnDisk = fs.existsSync(filepath);

    if (existedOnDisk) {
      fs.unlinkSync(filepath);
    }

    if (backup) {
      await prisma.backupLog.update({
        where: { id: backup.id },
        data: {
          status: 'DELETED',
          errorMessage: backup.errorMessage || null,
          metadata: {
            ...((backup.metadata as Record<string, unknown>) || {}),
            deletedAt: new Date().toISOString(),
            deletedBy: req.user?.id || null,
            existedOnDisk,
          },
        },
      });
    } else if (!existedOnDisk) {
      res.status(404).json({ error: 'Backup not found' });
      return;
    }

    sendSuccess(res, null, 'Backup deleted successfully');
  } catch (error: unknown) {
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
      ...normalizeStoredBackupType(setting.backupType),
      enabled: setting.enabled,
      frequency: setting.frequency,
      frequencyValue: setting.frequencyValue ?? null,
      retentionDays: setting.retentionDays || 30,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString()
    }));
    
    // Return settings in the format expected by the frontend
    sendSuccess(res, {
      success: true,
      scope: 'platform',
      settings: schedules
    });
  } catch (error: unknown) {
    // If backupSetting table doesn't exist, return empty array
    const errorObj = error as { code?: string; message?: string };
    if (errorObj.code === 'P2021' || errorObj.message?.includes('does not exist')) {
      sendSuccess(res, {
        success: true,
        scope: 'platform',
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
    const {
      backupType,
      deliveryMode,
      frequency,
      frequencyValue,
      retentionDays,
      enabled,
    } = _req.body || {};

    if (!backupType || !frequency) {
      res.status(400).json({ error: 'backupType and frequency are required' });
      return;
    }

    const created = await prisma.backupSetting.create({
      data: {
        backupType: encodeStoredBackupType(String(backupType), String(deliveryMode || 'LOCAL')),
        frequency: String(frequency).toUpperCase(),
        frequencyValue: frequencyValue != null ? Number(frequencyValue) : null,
        retentionDays: retentionDays != null ? Number(retentionDays) : 30,
        enabled: Boolean(enabled),
      }
    });

    sendSuccess(res, created, 'Backup setting created');
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * Update backup setting
 */
export const updateBackupSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Setting id is required' });
      return;
    }
    const {
      backupType,
      deliveryMode,
      frequency,
      frequencyValue,
      retentionDays,
      enabled,
    } = req.body || {};

    const current = await prisma.backupSetting.findUnique({
      where: { id },
      select: { backupType: true }
    });
    if (!current) {
      res.status(404).json({ error: 'Backup setting not found' });
      return;
    }
    const currentNormalized = normalizeStoredBackupType(current.backupType);
    const nextBackupType = backupType ?? currentNormalized.backupType;
    const nextDeliveryMode = deliveryMode ?? currentNormalized.deliveryMode;

    const updated = await prisma.backupSetting.update({
      where: { id },
      data: {
        ...((backupType != null || deliveryMode != null) ? { backupType: encodeStoredBackupType(String(nextBackupType), String(nextDeliveryMode)) } : {}),
        ...(frequency != null ? { frequency: String(frequency).toUpperCase() } : {}),
        ...(frequencyValue !== undefined ? { frequencyValue: frequencyValue != null ? Number(frequencyValue) : null } : {}),
        ...(retentionDays !== undefined ? { retentionDays: Number(retentionDays) } : {}),
        ...(enabled !== undefined ? { enabled: Boolean(enabled) } : {}),
      }
    });

    sendSuccess(res, updated, 'Backup settings updated');
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * Delete backup setting
 */
export const deleteBackupSetting = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params['id'];
    if (!id) {
      res.status(400).json({ error: 'Setting id is required' });
      return;
    }
    await prisma.backupSetting.delete({ where: { id } });
    sendSuccess(res, { id }, 'Backup setting deleted');
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    return next(error);
  }
};
