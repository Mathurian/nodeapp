import { Request, Response } from 'express';
import BackupMonitoringService from '../services/BackupMonitoringService';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const backupMonitoringService = BackupMonitoringService.getInstance();

export class BackupAdminController {
  /**
   * GET /api/admin/backups
   * List backup history
   */
  async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const {
        limit = 50,
        offset = 0,
        type,
        status,
        startDate,
        endDate,
      } = req.query;

      const options: any = {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      if (type) options.type = type as string;
      if (status) options.status = status as string;
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const result = await backupMonitoringService.getBackupHistory(options);

      // Convert BigInt to string for JSON serialization
      const backups = result.backups.map((backup: any) => ({
        ...backup,
        size: backup.size ? backup.size.toString() : null,
      }));

      res.json({
        success: true,
        data: {
          backups,
          total: result.total,
          limit: options.limit,
          offset: options.offset,
        },
      });
    } catch (error) {
      console.error('Failed to list backups:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backup history',
      });
    }
  }

  /**
   * GET /api/admin/backups/stats
   * Get backup statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const stats = await backupMonitoringService.getBackupStats(days);

      // Convert BigInt to string
      const statsResponse = {
        ...stats,
        totalSize: stats.totalSize.toString(),
        totalSizeGB: (Number(stats.totalSize) / (1024 * 1024 * 1024)).toFixed(2),
      };

      res.json({
        success: true,
        data: statsResponse,
      });
    } catch (error) {
      console.error('Failed to get backup stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backup statistics',
      });
    }
  }

  /**
   * GET /api/admin/backups/latest
   * Get latest backup info
   */
  async getLatest(req: Request, res: Response): Promise<void> {
    try {
      const type = req.query.type as string | undefined;
      const latest = await backupMonitoringService.getLatestBackup(type);

      if (!latest) {
        res.json({
          success: true,
          data: null,
          message: 'No backups found',
        });
        return;
      }

      // Convert BigInt to string
      const latestResponse = {
        ...latest,
        size: latest.size ? latest.size.toString() : null,
        sizeGB: latest.size ? (Number(latest.size) / (1024 * 1024 * 1024)).toFixed(2) : null,
      };

      res.json({
        success: true,
        data: latestResponse,
      });
    } catch (error) {
      console.error('Failed to get latest backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve latest backup',
      });
    }
  }

  /**
   * GET /api/admin/backups/health
   * Get backup health status
   */
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const health = await backupMonitoringService.checkBackupHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error('Failed to check backup health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check backup health',
      });
    }
  }

  /**
   * POST /api/admin/backups/verify
   * Trigger backup verification
   */
  async verifyBackups(_req: Request, res: Response): Promise<void> {
    try {
      const scriptPath = '/var/www/event-manager/scripts/backup-verify.sh';

      // Check if script exists
      try {
        await fs.access(scriptPath, fs.constants.X_OK);
      } catch {
        res.status(500).json({
          success: false,
          error: 'Backup verification script not found or not executable',
        });
        return;
      }

      // Execute verification script in background
      exec(scriptPath, (error, _stdout, _stderr) => {
        if (error) {
          console.error('Backup verification failed:', error);
        } else {
          console.log('Backup verification completed:', _stdout);
        }
      });

      res.json({
        success: true,
        message: 'Backup verification started',
      });
    } catch (error) {
      console.error('Failed to trigger backup verification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger backup verification',
      });
    }
  }

  /**
   * POST /api/admin/backups/full
   * Trigger manual full backup
   */
  async triggerFullBackup(_req: Request, res: Response): Promise<void> {
    try {
      const scriptPath = '/var/www/event-manager/scripts/backup-full.sh';

      // Check if script exists
      try {
        await fs.access(scriptPath, fs.constants.X_OK);
      } catch {
        res.status(500).json({
          success: false,
          error: 'Backup script not found or not executable',
        });
        return;
      }

      // Execute backup script in background
      exec(scriptPath, (error, _stdout, _stderr) => {
        if (error) {
          console.error('Full backup failed:', error);
        } else {
          console.log('Full backup completed:', _stdout);
        }
      });

      res.json({
        success: true,
        message: 'Full backup started',
      });
    } catch (error) {
      console.error('Failed to trigger full backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger full backup',
      });
    }
  }

  /**
   * GET /api/admin/backups/trend
   * Get backup size trend
   */
  async getSizeTrend(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const trend = await backupMonitoringService.getBackupSizeTrend(days);

      res.json({
        success: true,
        data: trend,
      });
    } catch (error) {
      console.error('Failed to get backup trend:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve backup trend',
      });
    }
  }

  /**
   * GET /api/admin/backups/files
   * List backup files on disk
   */
  async listBackupFiles(_req: Request, res: Response): Promise<void> {
    try {
      const backupDir = '/var/backups/event-manager/full';

      try {
        const files = await fs.readdir(backupDir);
        const backupFiles = files.filter(
          (f) => f.endsWith('.tar.gz') || f.endsWith('.tar.zst')
        );

        const fileDetails = await Promise.all(
          backupFiles.map(async (file) => {
            const filePath = path.join(backupDir, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              size: stats.size,
              sizeGB: (stats.size / (1024 * 1024 * 1024)).toFixed(2),
              created: stats.birthtime,
              modified: stats.mtime,
            };
          })
        );

        // Sort by modified date, newest first
        fileDetails.sort((a, b) => b.modified.getTime() - a.modified.getTime());

        res.json({
          success: true,
          data: {
            directory: backupDir,
            files: fileDetails,
            count: fileDetails.length,
          },
        });
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          res.json({
            success: true,
            data: {
              directory: backupDir,
              files: [],
              count: 0,
              message: 'Backup directory does not exist yet',
            },
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Failed to list backup files:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list backup files',
      });
    }
  }

  /**
   * POST /api/admin/backups/log
   * Log a backup (called by backup scripts)
   */
  async logBackup(req: Request, res: Response): Promise<void> {
    try {
      const {
        type,
        status,
        startedAt,
        completedAt,
        duration,
        size,
        location,
        errorMessage,
        metadata,
      } = req.body;

      // Validate required fields
      if (!type || !status || !startedAt || !location) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: type, status, startedAt, location',
        });
        return;
      }

      const backupLog = await backupMonitoringService.logBackup({
        type,
        status,
        startedAt: new Date(startedAt),
        completedAt: completedAt ? new Date(completedAt) : undefined,
        duration,
        size,
        location,
        errorMessage,
        metadata,
      });

      res.json({
        success: true,
        data: {
          ...backupLog,
          size: backupLog.size ? backupLog.size.toString() : null,
        },
      });
    } catch (error) {
      console.error('Failed to log backup:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log backup',
      });
    }
  }

  /**
   * POST /api/admin/backups/alert
   * Receive alert from backup scripts
   */
  async receiveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { level, subject, message } = req.body;

      console.log(`[BACKUP ALERT - ${level}] ${subject}: ${message}`);

      // Could integrate with notification system here
      // For now, just log it

      res.json({
        success: true,
        message: 'Alert received',
      });
    } catch (error) {
      console.error('Failed to process alert:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process alert',
      });
    }
  }

  /**
   * DELETE /api/admin/backups/logs/cleanup
   * Cleanup old backup logs
   */
  async cleanupLogs(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 90;
      const count = await backupMonitoringService.cleanupOldLogs(days);

      res.json({
        success: true,
        message: `Cleaned up ${count} old backup logs`,
        data: { count, retentionDays: days },
      });
    } catch (error) {
      console.error('Failed to cleanup logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup logs',
      });
    }
  }
}

export default new BackupAdminController();
