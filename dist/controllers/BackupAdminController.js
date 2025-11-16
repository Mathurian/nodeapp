"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupAdminController = void 0;
const BackupMonitoringService_1 = __importDefault(require("../services/BackupMonitoringService"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const backupMonitoringService = BackupMonitoringService_1.default.getInstance();
class BackupAdminController {
    async listBackups(req, res) {
        try {
            const { limit = 50, offset = 0, type, status, startDate, endDate, } = req.query;
            const options = {
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
            };
            if (type)
                options.type = type;
            if (status)
                options.status = status;
            if (startDate)
                options.startDate = new Date(startDate);
            if (endDate)
                options.endDate = new Date(endDate);
            const result = await backupMonitoringService.getBackupHistory(options);
            const backups = result.backups.map((backup) => ({
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
        }
        catch (error) {
            console.error('Failed to list backups:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve backup history',
            });
        }
    }
    async getStats(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const stats = await backupMonitoringService.getBackupStats(days);
            const statsResponse = {
                ...stats,
                totalSize: stats.totalSize.toString(),
                totalSizeGB: (Number(stats.totalSize) / (1024 * 1024 * 1024)).toFixed(2),
            };
            res.json({
                success: true,
                data: statsResponse,
            });
        }
        catch (error) {
            console.error('Failed to get backup stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve backup statistics',
            });
        }
    }
    async getLatest(req, res) {
        try {
            const type = req.query.type;
            const latest = await backupMonitoringService.getLatestBackup(type);
            if (!latest) {
                res.json({
                    success: true,
                    data: null,
                    message: 'No backups found',
                });
                return;
            }
            const latestResponse = {
                ...latest,
                size: latest.size ? latest.size.toString() : null,
                sizeGB: latest.size ? (Number(latest.size) / (1024 * 1024 * 1024)).toFixed(2) : null,
            };
            res.json({
                success: true,
                data: latestResponse,
            });
        }
        catch (error) {
            console.error('Failed to get latest backup:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve latest backup',
            });
        }
    }
    async getHealth(req, res) {
        try {
            const health = await backupMonitoringService.checkBackupHealth();
            res.json({
                success: true,
                data: health,
            });
        }
        catch (error) {
            console.error('Failed to check backup health:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check backup health',
            });
        }
    }
    async verifyBackups(req, res) {
        try {
            const scriptPath = '/var/www/event-manager/scripts/backup-verify.sh';
            try {
                await promises_1.default.access(scriptPath, promises_1.default.constants.X_OK);
            }
            catch {
                res.status(500).json({
                    success: false,
                    error: 'Backup verification script not found or not executable',
                });
                return;
            }
            (0, child_process_1.exec)(scriptPath, (error, stdout, stderr) => {
                if (error) {
                    console.error('Backup verification failed:', error);
                }
                else {
                    console.log('Backup verification completed:', stdout);
                }
            });
            res.json({
                success: true,
                message: 'Backup verification started',
            });
        }
        catch (error) {
            console.error('Failed to trigger backup verification:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to trigger backup verification',
            });
        }
    }
    async triggerFullBackup(req, res) {
        try {
            const scriptPath = '/var/www/event-manager/scripts/backup-full.sh';
            try {
                await promises_1.default.access(scriptPath, promises_1.default.constants.X_OK);
            }
            catch {
                res.status(500).json({
                    success: false,
                    error: 'Backup script not found or not executable',
                });
                return;
            }
            (0, child_process_1.exec)(scriptPath, (error, stdout, stderr) => {
                if (error) {
                    console.error('Full backup failed:', error);
                }
                else {
                    console.log('Full backup completed:', stdout);
                }
            });
            res.json({
                success: true,
                message: 'Full backup started',
            });
        }
        catch (error) {
            console.error('Failed to trigger full backup:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to trigger full backup',
            });
        }
    }
    async getSizeTrend(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 30;
            const trend = await backupMonitoringService.getBackupSizeTrend(days);
            res.json({
                success: true,
                data: trend,
            });
        }
        catch (error) {
            console.error('Failed to get backup trend:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve backup trend',
            });
        }
    }
    async listBackupFiles(req, res) {
        try {
            const backupDir = '/var/backups/event-manager/full';
            try {
                const files = await promises_1.default.readdir(backupDir);
                const backupFiles = files.filter((f) => f.endsWith('.tar.gz') || f.endsWith('.tar.zst'));
                const fileDetails = await Promise.all(backupFiles.map(async (file) => {
                    const filePath = path_1.default.join(backupDir, file);
                    const stats = await promises_1.default.stat(filePath);
                    return {
                        name: file,
                        size: stats.size,
                        sizeGB: (stats.size / (1024 * 1024 * 1024)).toFixed(2),
                        created: stats.birthtime,
                        modified: stats.mtime,
                    };
                }));
                fileDetails.sort((a, b) => b.modified.getTime() - a.modified.getTime());
                res.json({
                    success: true,
                    data: {
                        directory: backupDir,
                        files: fileDetails,
                        count: fileDetails.length,
                    },
                });
            }
            catch (error) {
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
                }
                else {
                    throw error;
                }
            }
        }
        catch (error) {
            console.error('Failed to list backup files:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list backup files',
            });
        }
    }
    async logBackup(req, res) {
        try {
            const { type, status, startedAt, completedAt, duration, size, location, errorMessage, metadata, } = req.body;
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
        }
        catch (error) {
            console.error('Failed to log backup:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to log backup',
            });
        }
    }
    async receiveAlert(req, res) {
        try {
            const { level, subject, message } = req.body;
            console.log(`[BACKUP ALERT - ${level}] ${subject}: ${message}`);
            res.json({
                success: true,
                message: 'Alert received',
            });
        }
        catch (error) {
            console.error('Failed to process alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process alert',
            });
        }
    }
    async cleanupLogs(req, res) {
        try {
            const days = parseInt(req.query.days, 10) || 90;
            const count = await backupMonitoringService.cleanupOldLogs(days);
            res.json({
                success: true,
                message: `Cleaned up ${count} old backup logs`,
                data: { count, retentionDays: days },
            });
        }
        catch (error) {
            console.error('Failed to cleanup logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to cleanup logs',
            });
        }
    }
}
exports.BackupAdminController = BackupAdminController;
exports.default = new BackupAdminController();
//# sourceMappingURL=BackupAdminController.js.map