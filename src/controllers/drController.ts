/**
 * DR (Disaster Recovery) Controller
 * Handles HTTP requests for disaster recovery automation
 */

import { Request, Response, NextFunction } from 'express';
import { DRAutomationService } from '../services/DRAutomationService';
import { sendSuccess } from '../utils/responseHelpers';

/**
 * Get DR configuration
 */
export const getDRConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const config = await DRAutomationService.getDRConfig(tenantId);
    sendSuccess(res, config);
  } catch (error) {
    next(error);
  }
};

/**
 * Update DR configuration
 */
export const updateDRConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const config = await DRAutomationService.updateDRConfig(id, req.body);
    sendSuccess(res, config, 'DR configuration updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Create backup schedule
 */
export const createBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const schedule = await DRAutomationService.createBackupSchedule({
      ...req.body,
      tenantId
    });
    sendSuccess(res, schedule, 'Backup schedule created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update backup schedule
 */
export const updateBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schedule = await DRAutomationService.updateBackupSchedule(id, req.body);
    sendSuccess(res, schedule, 'Backup schedule updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete backup schedule
 */
export const deleteBackupSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await DRAutomationService.deleteBackupSchedule(id);
    sendSuccess(res, null, 'Backup schedule deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * List backup schedules
 */
export const listBackupSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const schedules = await DRAutomationService.listBackupSchedules(tenantId);
    sendSuccess(res, schedules);
  } catch (error) {
    next(error);
  }
};

/**
 * Create backup target
 */
export const createBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const target = await DRAutomationService.createBackupTarget({
      ...req.body,
      tenantId
    });
    sendSuccess(res, target, 'Backup target created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update backup target
 */
export const updateBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const target = await DRAutomationService.updateBackupTarget(id, req.body);
    sendSuccess(res, target, 'Backup target updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete backup target
 */
export const deleteBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await DRAutomationService.deleteBackupTarget(id);
    sendSuccess(res, null, 'Backup target deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * List backup targets
 */
export const listBackupTargets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const targets = await DRAutomationService.listBackupTargets(tenantId);
    sendSuccess(res, targets);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify backup target
 */
export const verifyBackupTarget = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const verified = await DRAutomationService.verifyBackupTarget(id);
    sendSuccess(res, { verified }, verified ? 'Backup target verified successfully' : 'Backup target verification failed');
  } catch (error) {
    next(error);
  }
};

/**
 * Execute backup manually
 */
export const executeBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { scheduleId } = req.body;
    const result = await DRAutomationService.executeBackup(scheduleId);

    if (result.success) {
      sendSuccess(res, result, 'Backup executed successfully');
    } else {
      res.status(500).json({ error: result.error || 'Backup failed' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Execute DR test
 */
export const executeDRTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { backupId, testType } = req.body;
    const result = await DRAutomationService.executeDRTest(backupId, testType);
    sendSuccess(res, result, 'DR test executed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get DR metrics
 */
export const getDRMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const { metricType, days } = req.query;
    const metrics = await DRAutomationService.getDRMetrics(
      tenantId,
      metricType as string | undefined,
      days ? parseInt(days as string) : 30
    );
    sendSuccess(res, metrics);
  } catch (error) {
    next(error);
  }
};

/**
 * Get DR dashboard
 */
export const getDRDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const dashboard = await DRAutomationService.getDRDashboard(tenantId);
    sendSuccess(res, dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * Check RTO/RPO violations
 */
export const checkRTORPO = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tenantId = req.tenantId;
    const violations = await DRAutomationService.checkRTORPOViolations(tenantId);
    sendSuccess(res, violations);
  } catch (error) {
    next(error);
  }
};
