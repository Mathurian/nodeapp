"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DRAutomationService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const EventBusService_1 = __importStar(require("./EventBusService"));
const BackupTransferService_1 = __importDefault(require("./BackupTransferService"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const logger = (0, logger_1.createLogger)('DRAutomationService');
class DRAutomationService {
    static async getDRConfig(tenantId) {
        try {
            let config = await database_1.default.drConfig.findFirst({
                where: tenantId ? { tenantId } : {},
                orderBy: { createdAt: 'desc' }
            });
            if (!config) {
                config = await database_1.default.drConfig.create({
                    data: {
                        tenantId,
                        backupFrequency: 'daily',
                        backupRetentionDays: 30,
                        enableAutoBackup: true,
                        enablePITR: false,
                        enableDRTesting: true,
                        drTestFrequency: 'weekly',
                        rtoMinutes: 240,
                        rpoMinutes: 60,
                    }
                });
                logger.info(`Created default DR config for tenant ${tenantId || 'global'}`);
            }
            return config;
        }
        catch (error) {
            logger.error('Error getting DR config:', error);
            throw error;
        }
    }
    static async updateDRConfig(id, input) {
        try {
            const config = await database_1.default.drConfig.update({
                where: { id },
                data: input
            });
            logger.info(`Updated DR config ${id}`);
            await EventBusService_1.default.publish(EventBusService_1.AppEventType.BACKUP_COMPLETED, { configId: id, changes: input }, { source: 'DRAutomationService' });
            return config;
        }
        catch (error) {
            logger.error('Error updating DR config:', error);
            throw error;
        }
    }
    static async createBackupSchedule(input) {
        try {
            const nextRunAt = this.calculateNextRun(input.frequency);
            const schedule = await database_1.default.backupSchedule.create({
                data: {
                    tenantId: input.tenantId,
                    name: input.name,
                    backupType: input.backupType || 'full',
                    frequency: input.frequency,
                    enabled: input.enabled !== false,
                    retentionDays: input.retentionDays || 30,
                    targets: input.targets || [],
                    compression: input.compression !== false,
                    encryption: input.encryption || false,
                    nextRunAt
                }
            });
            logger.info(`Created backup schedule: ${schedule.name} (${schedule.id})`);
            return schedule;
        }
        catch (error) {
            logger.error('Error creating backup schedule:', error);
            throw error;
        }
    }
    static async updateBackupSchedule(id, input) {
        try {
            const updateData = { ...input };
            if (input.frequency) {
                updateData.nextRunAt = this.calculateNextRun(input.frequency);
            }
            const schedule = await database_1.default.backupSchedule.update({
                where: { id },
                data: updateData
            });
            logger.info(`Updated backup schedule ${id}`);
            return schedule;
        }
        catch (error) {
            logger.error('Error updating backup schedule:', error);
            throw error;
        }
    }
    static async deleteBackupSchedule(id) {
        try {
            await database_1.default.backupSchedule.delete({ where: { id } });
            logger.info(`Deleted backup schedule ${id}`);
        }
        catch (error) {
            logger.error('Error deleting backup schedule:', error);
            throw error;
        }
    }
    static async listBackupSchedules(tenantId) {
        try {
            return await database_1.default.backupSchedule.findMany({
                where: tenantId ? { tenantId } : {},
                orderBy: { createdAt: 'desc' }
            });
        }
        catch (error) {
            logger.error('Error listing backup schedules:', error);
            throw error;
        }
    }
    static async createBackupTarget(input) {
        try {
            const target = await database_1.default.backupTarget.create({
                data: {
                    tenantId: input.tenantId,
                    name: input.name,
                    type: input.type,
                    config: input.config,
                    enabled: input.enabled !== false,
                    priority: input.priority || 0
                }
            });
            logger.info(`Created backup target: ${target.name} (${target.type})`);
            return target;
        }
        catch (error) {
            logger.error('Error creating backup target:', error);
            throw error;
        }
    }
    static async updateBackupTarget(id, input) {
        try {
            const target = await database_1.default.backupTarget.update({
                where: { id },
                data: input
            });
            logger.info(`Updated backup target ${id}`);
            return target;
        }
        catch (error) {
            logger.error('Error updating backup target:', error);
            throw error;
        }
    }
    static async deleteBackupTarget(id) {
        try {
            await database_1.default.backupTarget.delete({ where: { id } });
            logger.info(`Deleted backup target ${id}`);
        }
        catch (error) {
            logger.error('Error deleting backup target:', error);
            throw error;
        }
    }
    static async listBackupTargets(tenantId) {
        try {
            return await database_1.default.backupTarget.findMany({
                where: tenantId ? { tenantId } : {},
                orderBy: { priority: 'desc' }
            });
        }
        catch (error) {
            logger.error('Error listing backup targets:', error);
            throw error;
        }
    }
    static async verifyBackupTarget(id) {
        try {
            const target = await database_1.default.backupTarget.findUnique({ where: { id } });
            if (!target) {
                throw new Error(`Backup target ${id} not found`);
            }
            const verified = await BackupTransferService_1.default.testConnection(target);
            await database_1.default.backupTarget.update({
                where: { id },
                data: {
                    verified,
                    lastVerified: new Date()
                }
            });
            logger.info(`Verified backup target ${id}: ${verified}`);
            return verified;
        }
        catch (error) {
            logger.error('Error verifying backup target:', error);
            await database_1.default.backupTarget.update({
                where: { id },
                data: {
                    verified: false,
                    lastVerified: new Date()
                }
            }).catch(() => { });
            throw error;
        }
    }
    static async executeBackup(scheduleId) {
        const startTime = Date.now();
        try {
            const schedule = await database_1.default.backupSchedule.findUnique({
                where: { id: scheduleId }
            });
            if (!schedule) {
                throw new Error(`Backup schedule ${scheduleId} not found`);
            }
            logger.info(`Starting backup for schedule: ${schedule.name}`);
            await database_1.default.backupSchedule.update({
                where: { id: scheduleId },
                data: { lastRunAt: new Date() }
            });
            const dbUrl = new URL(process.env.DATABASE_URL || '');
            const host = dbUrl.hostname;
            const port = dbUrl.port || '5432';
            const database = dbUrl.pathname.slice(1).split('?')[0];
            const username = dbUrl.username;
            const password = dbUrl.password || '';
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `backup-${schedule.backupType}-${timestamp}.sql${schedule.compression ? '.gz' : ''}`;
            const backupsDir = path.join(process.cwd(), 'backups');
            await fs.mkdir(backupsDir, { recursive: true });
            const filepath = path.join(backupsDir, filename);
            let command;
            const pgDumpBase = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database}`;
            switch (schedule.backupType) {
                case 'full':
                    command = `${pgDumpBase} -f ${filepath}`;
                    break;
                case 'schema':
                    command = `${pgDumpBase} --schema-only -f ${filepath}`;
                    break;
                case 'data':
                    command = `${pgDumpBase} --data-only -f ${filepath}`;
                    break;
                default:
                    command = `${pgDumpBase} -f ${filepath}`;
            }
            if (schedule.compression) {
                command += ` && gzip ${filepath}`;
            }
            await execAsync(command);
            const stats = await fs.stat(filepath + (schedule.compression ? '.gz' : ''));
            const size = stats.size;
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const backupLog = await database_1.default.backupLog.create({
                data: {
                    tenantId: schedule.tenantId,
                    type: schedule.backupType,
                    status: 'success',
                    startedAt: new Date(startTime),
                    completedAt: new Date(),
                    duration,
                    size: BigInt(size),
                    location: filepath,
                    metadata: {
                        scheduleId: schedule.id,
                        scheduleName: schedule.name,
                        compression: schedule.compression,
                        encryption: schedule.encryption
                    }
                }
            });
            await database_1.default.backupSchedule.update({
                where: { id: scheduleId },
                data: {
                    lastStatus: 'success',
                    nextRunAt: this.calculateNextRun(schedule.frequency)
                }
            });
            if (schedule.targets && Array.isArray(schedule.targets) && schedule.targets.length > 0) {
                await this.replicateToTargets(backupLog.id, filepath, schedule.targets);
            }
            await this.recordMetric(schedule.tenantId, 'backup_duration', duration, 'seconds', {
                scheduleId: schedule.id,
                backupType: schedule.backupType
            });
            await this.recordMetric(schedule.tenantId, 'backup_size', size, 'bytes', {
                scheduleId: schedule.id,
                backupType: schedule.backupType
            });
            await EventBusService_1.default.publish(EventBusService_1.AppEventType.BACKUP_COMPLETED, { backupId: backupLog.id, scheduleId: schedule.id, size, duration }, { source: 'DRAutomationService' });
            logger.info(`Backup completed successfully: ${filename} (${size} bytes, ${duration}s)`);
            return {
                success: true,
                backupId: backupLog.id,
                location: filepath,
                size,
                duration
            };
        }
        catch (error) {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            logger.error('Backup failed:', error);
            await database_1.default.backupSchedule.update({
                where: { id: scheduleId },
                data: {
                    lastStatus: 'failed',
                    nextRunAt: this.calculateNextRun('1 hour')
                }
            }).catch(() => { });
            return {
                success: false,
                error: error.message,
                duration
            };
        }
    }
    static async executeDRTest(backupId, testType = 'restore') {
        const startTime = Date.now();
        try {
            const backup = await database_1.default.backupLog.findUnique({ where: { id: backupId } });
            if (!backup) {
                throw new Error(`Backup ${backupId} not found`);
            }
            logger.info(`Starting DR test (${testType}) for backup ${backupId}`);
            const testLog = await database_1.default.drTestLog.create({
                data: {
                    tenantId: backup.tenantId,
                    testType,
                    backupId,
                    status: 'running',
                    startedAt: new Date(),
                    automatedTest: true
                }
            });
            let testResults = {
                testType,
                backupId,
                backupLocation: backup.location,
                backupSize: backup.size
            };
            let success = false;
            switch (testType) {
                case 'restore':
                    testResults.note = 'Restore test simulated (would restore to test DB in production)';
                    success = true;
                    break;
                case 'integrity':
                    try {
                        await fs.access(backup.location);
                        const stats = await fs.stat(backup.location);
                        testResults.fileExists = true;
                        testResults.fileSize = stats.size;
                        success = true;
                    }
                    catch {
                        testResults.fileExists = false;
                        success = false;
                    }
                    break;
                case 'failover':
                    testResults.note = 'Failover test simulated (would test actual failover in production)';
                    success = true;
                    break;
                default:
                    throw new Error(`Unknown test type: ${testType}`);
            }
            const duration = Math.floor((Date.now() - startTime) / 1000);
            await database_1.default.drTestLog.update({
                where: { id: testLog.id },
                data: {
                    status: success ? 'success' : 'failed',
                    completedAt: new Date(),
                    duration,
                    testResults
                }
            });
            logger.info(`DR test completed: ${testType} - ${success ? 'success' : 'failed'}`);
            return {
                success,
                duration,
                results: testResults
            };
        }
        catch (error) {
            logger.error('DR test failed:', error);
            throw error;
        }
    }
    static async getDRMetrics(tenantId, metricType, days = 30) {
        try {
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            return await database_1.default.drMetric.findMany({
                where: {
                    ...(tenantId && { tenantId }),
                    ...(metricType && { metricType }),
                    timestamp: { gte: since }
                },
                orderBy: { timestamp: 'desc' }
            });
        }
        catch (error) {
            logger.error('Error getting DR metrics:', error);
            throw error;
        }
    }
    static async getDRDashboard(tenantId) {
        try {
            const [config, schedules, targets, recentBackups, recentTests, metrics] = await Promise.all([
                this.getDRConfig(tenantId),
                this.listBackupSchedules(tenantId),
                this.listBackupTargets(tenantId),
                database_1.default.backupLog.findMany({
                    where: tenantId ? { tenantId } : {},
                    orderBy: { startedAt: 'desc' },
                    take: 10
                }),
                database_1.default.drTestLog.findMany({
                    where: tenantId ? { tenantId } : {},
                    orderBy: { startedAt: 'desc' },
                    take: 10
                }),
                this.getDRMetrics(tenantId, undefined, 7)
            ]);
            const totalBackups = recentBackups.length;
            const successfulBackups = recentBackups.filter(b => b.status === 'success').length;
            const failedBackups = totalBackups - successfulBackups;
            const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;
            const totalTests = recentTests.length;
            const passedTests = recentTests.filter(t => t.status === 'success').length;
            const testPassRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
            const avgBackupDuration = recentBackups
                .filter(b => b.duration)
                .reduce((sum, b) => sum + (b.duration || 0), 0) / Math.max(successfulBackups, 1);
            const totalBackupSize = recentBackups
                .filter(b => b.size)
                .reduce((sum, b) => sum + Number(b.size || 0), 0);
            return {
                config,
                schedules: {
                    total: schedules.length,
                    enabled: schedules.filter(s => s.enabled).length,
                    disabled: schedules.filter(s => !s.enabled).length,
                    list: schedules
                },
                targets: {
                    total: targets.length,
                    enabled: targets.filter(t => t.enabled).length,
                    verified: targets.filter(t => t.verified).length,
                    list: targets
                },
                backups: {
                    total: totalBackups,
                    successful: successfulBackups,
                    failed: failedBackups,
                    successRate,
                    avgDuration: Math.round(avgBackupDuration),
                    totalSize: totalBackupSize,
                    recent: recentBackups
                },
                tests: {
                    total: totalTests,
                    passed: passedTests,
                    passRate: testPassRate,
                    recent: recentTests
                },
                metrics: {
                    recent: metrics,
                    rto: config.rtoMinutes,
                    rpo: config.rpoMinutes
                }
            };
        }
        catch (error) {
            logger.error('Error getting DR dashboard:', error);
            throw error;
        }
    }
    static async checkRTORPOViolations(tenantId) {
        try {
            const config = await this.getDRConfig(tenantId);
            const lastBackup = await database_1.default.backupLog.findFirst({
                where: {
                    ...(tenantId && { tenantId }),
                    status: 'success'
                },
                orderBy: { completedAt: 'desc' }
            });
            const rpoViolation = lastBackup
                ? (Date.now() - lastBackup.completedAt.getTime()) / (60 * 1000) > config.rpoMinutes
                : true;
            if (rpoViolation) {
                await this.recordMetric(tenantId, 'rpo_violation', 1, 'count', {
                    lastBackup: lastBackup?.completedAt,
                    rpoMinutes: config.rpoMinutes
                });
            }
            return {
                rpoViolation,
                rtoMinutes: config.rtoMinutes,
                rpoMinutes: config.rpoMinutes,
                lastBackup: lastBackup?.completedAt,
                minutesSinceLastBackup: lastBackup
                    ? Math.floor((Date.now() - lastBackup.completedAt.getTime()) / (60 * 1000))
                    : null
            };
        }
        catch (error) {
            logger.error('Error checking RTO/RPO violations:', error);
            throw error;
        }
    }
    static calculateNextRun(frequency) {
        const now = new Date();
        const lowerFreq = frequency.toLowerCase();
        if (lowerFreq === 'hourly' || lowerFreq === '1 hour') {
            return new Date(now.getTime() + 60 * 60 * 1000);
        }
        else if (lowerFreq === 'daily' || lowerFreq === '1 day') {
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        else if (lowerFreq === 'weekly' || lowerFreq === '1 week') {
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        else if (lowerFreq === 'monthly' || lowerFreq === '1 month') {
            return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    static async replicateToTargets(backupId, filepath, targetIds) {
        try {
            const targets = await database_1.default.backupTarget.findMany({
                where: {
                    id: { in: targetIds },
                    enabled: true
                }
            });
            logger.info(`Replicating backup to ${targets.length} targets`);
            for (const target of targets) {
                try {
                    await this.replicateToTarget(filepath, target);
                    logger.info(`Replicated to target: ${target.name} (${target.type})`);
                }
                catch (error) {
                    logger.error(`Failed to replicate to target ${target.name}:`, error);
                }
            }
        }
        catch (error) {
            logger.error('Error replicating to targets:', error);
        }
    }
    static async replicateToTarget(filepath, target) {
        const result = await BackupTransferService_1.default.uploadToTarget(filepath, target);
        if (!result.success) {
            throw new Error(result.error || 'Upload failed');
        }
        logger.info(`Successfully uploaded to ${target.name}: ${result.remotePath}`);
    }
    static async recordMetric(tenantId, metricType, value, unit, metadata) {
        try {
            await database_1.default.drMetric.create({
                data: {
                    tenantId: tenantId || null,
                    metricType,
                    value,
                    unit,
                    metadata
                }
            });
        }
        catch (error) {
            logger.error('Error recording metric:', error);
        }
    }
}
exports.DRAutomationService = DRAutomationService;
exports.default = DRAutomationService;
//# sourceMappingURL=DRAutomationService.js.map