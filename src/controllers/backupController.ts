/**
 * Backup Controller
 * Handles database backup operations
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import ScheduledBackupService from '../services/scheduledBackupService';
import { SettingsService } from '../services/SettingsService';
import BackupTransferService, { BackupTarget } from '../services/BackupTransferService';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/responseHelpers';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
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

const execFileAsync = promisify(execFile);

const uploadToRuntimeRemoteTarget = async (
  filepath: string,
  runtimeSettings: Record<string, string>
): Promise<{ success: boolean; error?: string }> => {
  const remoteType = String(runtimeSettings['backup_remote_type'] || '').trim().toLowerCase();
  if (remoteType === 'rclone') {
    const remote = String(runtimeSettings['backup_rclone_remote'] || '').trim();
    if (!remote) {
      return { success: false, error: 'RCLONE_REMOTE is not configured' };
    }

    let tempDir: string | null = null;
    try {
      await execFileAsync('rclone', ['version'], { timeout: 10000 });
      const args = ['copy', path.resolve(filepath), `${remote}/${path.basename(filepath)}`];
      const provider = String(runtimeSettings['backup_rclone_provider'] || 'generic').trim().toLowerCase();
      const authMode = String(runtimeSettings['backup_rclone_auth_mode'] || 'existing_remote').trim().toLowerCase();
      const remoteName = remote.includes(':') ? remote.split(':')[0]?.trim() : '';

      if (provider === 'google_drive' && remoteName) {
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'backup-rclone-'));
        const configPath = path.join(tempDir, 'rclone.conf');
        const configLines: string[] = [`[${remoteName}]`, 'type = drive', 'scope = drive'];

        if (authMode === 'oauth_connect') {
          const tokenPayload = String(runtimeSettings['backup_google_drive_oauth_tokens'] || '').trim();
          if (!tokenPayload) {
            return { success: false, error: 'Google Drive OAuth token is missing' };
          }
          const clientId = String(runtimeSettings['backup_google_oauth_client_id'] || '').trim();
          const clientSecret = String(runtimeSettings['backup_google_oauth_client_secret'] || '').trim();
          if (clientId) configLines.push(`client_id = ${clientId}`);
          if (clientSecret) configLines.push(`client_secret = ${clientSecret}`);
          configLines.push(`token = ${tokenPayload}`);
        } else if (authMode === 'service_account') {
          const serviceAccountJson = String(runtimeSettings['backup_rclone_service_account_json'] || '').trim();
          if (!serviceAccountJson) {
            return { success: false, error: 'Google service account JSON is missing' };
          }
          const serviceAccountPath = path.join(tempDir, 'service-account.json');
          await fsp.writeFile(serviceAccountPath, serviceAccountJson, { encoding: 'utf-8', mode: 0o600 });
          await fsp.chmod(serviceAccountPath, 0o600);
          configLines.push(`service_account_file = ${serviceAccountPath}`);
        }

        const rootFolderId = String(runtimeSettings['backup_rclone_drive_root_folder_id'] || '').trim();
        const teamDrive = String(runtimeSettings['backup_rclone_drive_team_drive'] || '').trim();
        if (rootFolderId) configLines.push(`root_folder_id = ${rootFolderId}`);
        if (teamDrive) configLines.push(`team_drive = ${teamDrive}`);

        await fsp.writeFile(configPath, `${configLines.join('\n')}\n`, { encoding: 'utf-8', mode: 0o600 });
        await fsp.chmod(configPath, 0o600);
        args.push('--config', configPath);
      }

      await execFileAsync('rclone', args, { timeout: 120000 });
      return { success: true };
    } catch (error: unknown) {
      const err = error as { stderr?: string; stdout?: string; message?: string };
      const details = String(err?.stderr || err?.stdout || err?.message || 'Unknown error').trim();
      return { success: false, error: details || 'rclone upload failed' };
    } finally {
      if (tempDir) {
        await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  const configPath = path.resolve(process.cwd(), 'config/backup.config.sh');
  const absoluteFilePath = path.resolve(filepath);
  const remotePath = path.basename(filepath);
  const envMap: Record<string, string> = {
    REMOTE_BACKUP_ENABLED: String(runtimeSettings['backup_remote_enabled'] || 'false'),
    REMOTE_BACKUP_TYPE: String(runtimeSettings['backup_remote_type'] || ''),
    REMOTE_BACKUP_HOST: String(runtimeSettings['backup_remote_host'] || ''),
    REMOTE_BACKUP_PORT: String(runtimeSettings['backup_remote_port'] || ''),
    REMOTE_BACKUP_USER: String(runtimeSettings['backup_remote_user'] || ''),
    REMOTE_BACKUP_PATH: String(runtimeSettings['backup_remote_path'] || ''),
    RCLONE_REMOTE: String(runtimeSettings['backup_rclone_remote'] || ''),
    S3_BUCKET: String(runtimeSettings['backup_s3_bucket'] || ''),
    S3_REGION: String(runtimeSettings['backup_s3_region'] || ''),
    AWS_ACCESS_KEY_ID: String(runtimeSettings['backup_s3_access_key_id'] || ''),
    AWS_SECRET_ACCESS_KEY: String(runtimeSettings['backup_s3_secret_access_key'] || ''),
  };
  const exportLines = Object.entries(envMap)
    .map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
    .join('\n');
  const bashScript = [
    'set -euo pipefail',
    `source ${JSON.stringify(configPath)}`,
    exportLines,
    'if [[ "${REMOTE_BACKUP_ENABLED:-false}" != "true" ]]; then',
    '  echo "REMOTE_BACKUP_ENABLED is false" >&2',
    '  exit 2',
    'fi',
    `upload_to_remote ${JSON.stringify(absoluteFilePath)} ${JSON.stringify(remotePath)}`,
  ].join('\n');

  try {
    await execFileAsync('/bin/bash', ['-lc', bashScript], { timeout: 120000 });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const details = String(err?.stderr || err?.stdout || err?.message || 'Unknown error').trim();
    return { success: false, error: details || 'Runtime remote upload failed' };
  }
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
      const tenantId = req.tenantId || null;
      const rawTargets = await prisma.backupTarget.findMany({
        where: {
          enabled: true,
          OR: [{ tenantId }, { tenantId: null }],
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
        runtimeBackupSettings = await settingsService.getBackupSettings(tenantId);
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
        tenantId: req.tenantId!,
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
  } catch (error: unknown) {
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

    const dbUrl = new URL(env.get('DATABASE_URL'));
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

    const backupById = await prisma.backupLog.findUnique({
      where: { id: backupIdOrFilename },
    });

    const backup = backupById || await prisma.backupLog.findFirst({
      where: { OR: [{ location: backupIdOrFilename }, { location: path.join('backups', backupIdOrFilename) }] },
    });

    const fallbackPath = path.join('backups', backupIdOrFilename);
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
