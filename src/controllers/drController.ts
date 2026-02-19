/**
 * DR (Disaster Recovery) Controller
 * Handles HTTP requests for disaster recovery automation
 */

import { Request, Response, NextFunction } from 'express';
import { DRAutomationService, type BackupScheduleInput } from '../services/DRAutomationService';
import { sendError, sendSuccess } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';

const normalizeBackupType = (backupType?: unknown, legacyType?: unknown): string => {
  const direct = String(backupType || '').trim().toLowerCase();
  if (direct) {
    if (direct === 'full' || direct === 'schema' || direct === 'data') return direct;
    if (direct === 'backup_restore') return 'schema';
    if (direct === 'data_replication') return 'data';
    if (direct === 'failover') return 'full';
  }

  const legacy = String(legacyType || '').trim().toUpperCase();
  if (legacy === 'BACKUP_RESTORE') return 'schema';
  if (legacy === 'DATA_REPLICATION') return 'data';
  if (legacy === 'FAILOVER') return 'full';

  return 'full';
};

const normalizeFrequency = (frequency?: unknown, backupFrequency?: unknown): string => {
  const value = String(frequency ?? backupFrequency ?? '').trim().toLowerCase();
  if (value === 'hourly' || value === '1 hour') return 'hourly';
  if (value === 'daily' || value === '1 day') return 'daily';
  if (value === 'weekly' || value === '1 week') return 'weekly';
  if (value === 'monthly' || value === '1 month') return 'monthly';
  return 'daily';
};

const getRequestPrisma = (req: Request, res: Response) => {
  if (!req.prisma) {
    res.status(500).json({
      success: false,
      error: 'Database context not initialized',
    });
    return null;
  }
  return req.prisma;
};

/**
 * Get DR configuration
 */
export const getDRConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const config = await DRAutomationService.getDRConfig(tenantId, requestPrisma);
    sendSuccess(res, config);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update DR configuration
 */
export const updateDRConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    const config = await DRAutomationService.updateDRConfig(id, req.body, requestPrisma);
    sendSuccess(res, config, 'DR configuration updated successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Create backup schedule
 */
export const createBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const raw = req.body || {};
    const name = String(raw.name || '').trim();

    if (!name) {
      sendError(res, 'Plan name is required', 400);
      return;
    }

    const retentionDays = Number(raw.retentionDays ?? 30);
    if (!Number.isFinite(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
      sendError(res, 'retentionDays must be between 1 and 3650', 400);
      return;
    }

    const schedule = await DRAutomationService.createBackupSchedule({
      name,
      backupType: normalizeBackupType(raw.backupType, raw.type),
      frequency: normalizeFrequency(raw.frequency, raw.backupFrequency),
      enabled: raw.enabled !== false,
      retentionDays,
      targets: Array.isArray(raw.targets) ? raw.targets : [],
      compression: raw.compression !== false,
      encryption: Boolean(raw.encryption),
      tenantId
    }, requestPrisma);
    sendSuccess(res, schedule, 'Backup schedule created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update backup schedule
 */
export const updateBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    const raw = req.body || {};
    const updateData: Partial<BackupScheduleInput> = {};

    if (raw.name !== undefined) {
      const name = String(raw.name || '').trim();
      if (!name) {
        sendError(res, 'Plan name cannot be empty', 400);
        return;
      }
      updateData.name = name;
    }

    if (raw.backupType !== undefined || raw.type !== undefined) {
      updateData.backupType = normalizeBackupType(raw.backupType, raw.type);
    }

    if (raw.frequency !== undefined || raw.backupFrequency !== undefined) {
      updateData.frequency = normalizeFrequency(raw.frequency, raw.backupFrequency);
    }

    if (raw.enabled !== undefined) updateData.enabled = Boolean(raw.enabled);
    if (raw.targets !== undefined) updateData.targets = Array.isArray(raw.targets) ? raw.targets : [];
    if (raw.compression !== undefined) updateData.compression = Boolean(raw.compression);
    if (raw.encryption !== undefined) updateData.encryption = Boolean(raw.encryption);

    if (raw.retentionDays !== undefined) {
      const retentionDays = Number(raw.retentionDays);
      if (!Number.isFinite(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
        sendError(res, 'retentionDays must be between 1 and 3650', 400);
        return;
      }
      updateData.retentionDays = retentionDays;
    }

    const schedule = await DRAutomationService.updateBackupSchedule(id, updateData, requestPrisma);
    sendSuccess(res, schedule, 'Backup schedule updated successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete backup schedule
 */
export const deleteBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    await DRAutomationService.deleteBackupSchedule(id, requestPrisma);
    sendSuccess(res, null, 'Backup schedule deleted successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * List backup schedules
 */
export const listBackupSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const schedules = await DRAutomationService.listBackupSchedules(tenantId, requestPrisma);
    sendSuccess(res, schedules);
  } catch (error) {
    return next(error);
  }
};

/**
 * Create backup target
 */
export const createBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const target = await DRAutomationService.createBackupTarget({
      ...req.body,
      tenantId
    }, requestPrisma);
    sendSuccess(res, target, 'Backup target created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * Update backup target
 */
export const updateBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    const target = await DRAutomationService.updateBackupTarget(id, req.body, requestPrisma);
    sendSuccess(res, target, 'Backup target updated successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Delete backup target
 */
export const deleteBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    await DRAutomationService.deleteBackupTarget(id, requestPrisma);
    sendSuccess(res, null, 'Backup target deleted successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * List backup targets
 */
export const listBackupTargets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const targets = await DRAutomationService.listBackupTargets(tenantId, requestPrisma);
    sendSuccess(res, targets);
  } catch (error) {
    return next(error);
  }
};

/**
 * Verify backup target
 */
export const verifyBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const id = getRequiredParam(req, 'id');
    const verified = await DRAutomationService.verifyBackupTarget(id, requestPrisma);
    sendSuccess(res, { verified }, verified ? 'Backup target verified successfully' : 'Backup target verification failed');
  } catch (error) {
    return next(error);
  }
};

/**
 * Execute backup manually
 */
export const executeBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const scheduleId = String(req.body?.scheduleId || req.body?.planId || '').trim();
    if (!scheduleId) {
      sendError(res, 'scheduleId is required', 400);
      return;
    }
    const result = await DRAutomationService.executeBackup(scheduleId, requestPrisma);

    if (result.success) {
      sendSuccess(res, result, 'Backup executed successfully');
    } else {
      res.status(500).json({ error: result.error || 'Backup failed' });
    }
  } catch (error) {
    return next(error);
  }
};

/**
 * Execute DR test
 */
export const executeDRTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    let backupId = String(req.body?.backupId || '').trim();
    const testType = String(req.body?.testType || 'restore');

    // Backward compatibility with legacy DR UI that sends planId/scheduleId.
    if (!backupId) {
      const scheduleId = String(req.body?.scheduleId || req.body?.planId || '').trim();
      if (scheduleId) {
        const backupResult = await DRAutomationService.executeBackup(scheduleId, requestPrisma);
        if (!backupResult.success || !backupResult.backupId) {
          res.status(500).json({ error: backupResult.error || 'Unable to prepare backup for DR test' });
          return;
        }
        backupId = backupResult.backupId;
      }
    }

    if (!backupId) {
      sendError(res, 'backupId (or planId/scheduleId) is required', 400);
      return;
    }

    const result = await DRAutomationService.executeDRTest(backupId, testType, requestPrisma);
    sendSuccess(res, result, 'DR test executed successfully');
  } catch (error) {
    return next(error);
  }
};

/**
 * Get DR metrics
 */
export const getDRMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const { metricType, days } = req.query;
    const metrics = await DRAutomationService.getDRMetrics(
      tenantId,
      metricType as string | undefined,
      days ? parseInt(days as string) : 30,
      requestPrisma
    );
    sendSuccess(res, metrics);
  } catch (error) {
    return next(error);
  }
};

/**
 * Get DR dashboard
 */
export const getDRDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const dashboard = await DRAutomationService.getDRDashboard(tenantId, requestPrisma);
    sendSuccess(res, dashboard);
  } catch (error) {
    return next(error);
  }
};

/**
 * Check RTO/RPO violations
 */
export const checkRTORPO = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;
    const tenantId = req.tenantId;
    const violations = await DRAutomationService.checkRTORPOViolations(tenantId, requestPrisma);
    sendSuccess(res, violations);
  } catch (error) {
    return next(error);
  }
};
