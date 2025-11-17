"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledBackupService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class ScheduledBackupService {
    prisma;
    jobs;
    isRunning;
    constructor(prismaClient) {
        this.prisma = prismaClient;
        this.jobs = new Map();
        this.isRunning = false;
    }
    async start() {
        if (this.isRunning) {
            console.log('Scheduled backup service is already running');
            return;
        }
        this.isRunning = true;
        console.log('Starting scheduled backup service...');
        await this.loadBackupSettings();
    }
    async stop() {
        if (!this.isRunning) {
            console.log('Scheduled backup service is not running');
            return;
        }
        this.jobs.forEach((job, key) => {
            job.stop();
            console.log(`Stopped backup job: ${key}`);
        });
        this.jobs.clear();
        this.isRunning = false;
        console.log('Scheduled backup service stopped');
    }
    async loadBackupSettings() {
        try {
            if (process.env.NODE_ENV === 'test') {
                return;
            }
            const settings = await this.prisma.backupSetting.findMany();
            for (const setting of settings) {
                if (setting.enabled) {
                    await this.scheduleBackup(setting);
                }
            }
        }
        catch (error) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Error loading backup settings:', error);
            }
        }
    }
    async scheduleBackup(setting) {
        const jobKey = `${setting.backupType}_${setting.frequency}`;
        if (this.jobs.has(jobKey)) {
            this.jobs.get(jobKey).stop();
        }
        let cronExpression;
        switch (setting.frequency) {
            case 'MINUTES':
                cronExpression = `*/${setting.frequencyValue || 60} * * * *`;
                break;
            case 'HOURS':
                cronExpression = `0 */${setting.frequencyValue || 1} * * *`;
                break;
            case 'DAILY':
                cronExpression = `0 ${setting.frequencyValue || 2} * * *`;
                break;
            case 'WEEKLY':
                cronExpression = `0 ${setting.frequencyValue || 2} * * 0`;
                break;
            case 'MONTHLY':
                cronExpression = `0 ${setting.frequencyValue || 2} 1 * *`;
                break;
            default:
                console.warn(`Unknown backup frequency: ${setting.frequency}`);
                return;
        }
        const job = node_cron_1.default.schedule(cronExpression, async () => {
            console.log(`Running scheduled ${setting.backupType} backup...`);
            await this.runScheduledBackup(setting);
        });
        this.jobs.set(jobKey, job);
        console.log(`Scheduled ${setting.backupType} backup: ${cronExpression}`);
    }
    async runScheduledBackup(setting) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `scheduled-backup-${setting.backupType.toLowerCase()}-${timestamp}.sql`;
            const filepath = path_1.default.join('backups', filename);
            if (!fs_1.default.existsSync('backups')) {
                fs_1.default.mkdirSync('backups', { recursive: true });
            }
            const backupLog = await this.prisma.backupLog.create({
                data: {
                    tenantId: 'default_tenant',
                    type: setting.backupType,
                    location: filepath,
                    size: 0,
                    status: 'running',
                    startedAt: new Date(),
                    errorMessage: null
                }
            });
            const dbUrl = new URL(process.env.DATABASE_URL || '');
            const host = dbUrl.hostname;
            const port = dbUrl.port || '5432';
            const database = dbUrl.pathname.slice(1).split('?')[0];
            const username = dbUrl.username;
            const password = dbUrl.password || '';
            let command;
            switch (setting.backupType) {
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
                    await this.prisma.backupLog.update({
                        where: { id: backupLog.id },
                        data: {
                            status: 'failed',
                            errorMessage: 'Invalid backup type',
                            completedAt: new Date(),
                            duration: 0
                        }
                    });
                    return;
            }
            (0, child_process_1.exec)(command, async (error, stdout, stderr) => {
                if (error) {
                    console.error('Scheduled backup error:', error);
                    await this.prisma.backupLog.update({
                        where: { id: backupLog.id },
                        data: {
                            status: 'failed',
                            errorMessage: error.message,
                            completedAt: new Date(),
                            duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000)
                        }
                    });
                    return;
                }
                const stats = fs_1.default.statSync(filepath);
                await this.prisma.backupLog.update({
                    where: { id: backupLog.id },
                    data: {
                        status: 'success',
                        size: stats.size,
                        errorMessage: null,
                        completedAt: new Date(),
                        duration: Math.floor((Date.now() - backupLog.startedAt.getTime()) / 1000)
                    }
                });
                console.log(`Scheduled ${setting.backupType} backup completed: ${filename}`);
                await this.cleanupOldBackups(setting);
            });
        }
        catch (error) {
            console.error('Error running scheduled backup:', error);
        }
    }
    async cleanupOldBackups(setting) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - setting.retentionDays);
            const oldBackups = await this.prisma.backupLog.findMany({
                where: {
                    type: setting.backupType,
                    createdAt: {
                        lt: cutoffDate
                    },
                    status: 'success'
                }
            });
            for (const backup of oldBackups) {
                if (fs_1.default.existsSync(backup.location)) {
                    fs_1.default.unlinkSync(backup.location);
                }
                await this.prisma.backupLog.delete({
                    where: { id: backup.id }
                });
                console.log(`Cleaned up old backup: ${backup.location}`);
            }
        }
        catch (error) {
            console.error('Error cleaning up old backups:', error);
        }
    }
    async updateBackupSchedule(setting) {
        const jobKey = `${setting.backupType}_${setting.frequency}`;
        if (this.jobs.has(jobKey)) {
            this.jobs.get(jobKey).stop();
            this.jobs.delete(jobKey);
        }
        if (setting.enabled) {
            await this.scheduleBackup(setting);
        }
    }
    async reloadSettings() {
        this.jobs.forEach((job) => {
            job.stop();
        });
        this.jobs.clear();
        await this.loadBackupSettings();
    }
    async runManualBackup(settingId) {
        try {
            const setting = await this.prisma.backupSetting.findUnique({
                where: { id: settingId }
            });
            if (!setting) {
                throw new Error('Backup setting not found');
            }
            await this.runScheduledBackup(setting);
            return { success: true, message: 'Manual backup completed' };
        }
        catch (error) {
            console.error('Error running manual backup:', error);
            const errorObj = error;
            return { success: false, error: errorObj.message || 'Unknown error' };
        }
    }
    getActiveSchedules() {
        const schedules = [];
        this.jobs.forEach((job, key) => {
            const [backupType, frequency] = key.split('_');
            schedules.push({ backupType, frequency, isActive: true });
        });
        return schedules;
    }
}
exports.ScheduledBackupService = ScheduledBackupService;
exports.default = ScheduledBackupService;
//# sourceMappingURL=scheduledBackupService.js.map