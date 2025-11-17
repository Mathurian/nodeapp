"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugBackupSettings = exports.getActiveSchedules = exports.runScheduledBackup = exports.deleteBackupSetting = exports.updateBackupSetting = exports.createBackupSetting = exports.getBackupSettings = exports.deleteBackup = exports.restoreBackup = exports.downloadBackup = exports.listBackups = exports.createBackup = void 0;
const container_1 = require("../config/container");
const scheduledBackupService_1 = __importDefault(require("../services/scheduledBackupService"));
const SettingsService_1 = require("../services/SettingsService");
const prisma_1 = require("../utils/prisma");
const responseHelpers_1 = require("../utils/responseHelpers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const getScheduledBackupService = () => {
    return new scheduledBackupService_1.default(prisma_1.prisma);
};
const getSettingsService = () => {
    return container_1.container.resolve(SettingsService_1.SettingsService);
};
const createBackup = async (req, res, next) => {
    try {
        const { type = 'FULL' } = req.body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backup-${type.toLowerCase()}-${timestamp}.sql`;
        const filepath = path_1.default.join('backups', filename);
        if (!fs_1.default.existsSync('backups')) {
            fs_1.default.mkdirSync('backups', { recursive: true });
        }
        const backupLog = await prisma_1.prisma.backupLog.create({
            data: {
                tenantId: req.tenantId,
                type: type,
                location: filepath,
                size: BigInt(0),
                status: 'IN_PROGRESS',
                startedAt: new Date(),
                errorMessage: null,
                metadata: {}
            }
        });
        const dbUrl = new URL(process.env.DATABASE_URL || '');
        const host = dbUrl.hostname;
        const port = dbUrl.port || '5432';
        const database = dbUrl.pathname.slice(1).split('?')[0];
        const username = dbUrl.username;
        const password = dbUrl.password || '';
        let command;
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
                await prisma_1.prisma.backupLog.update({
                    where: { id: backupLog.id },
                    data: { status: 'FAILED', errorMessage: 'Invalid backup type' }
                });
                res.status(400).json({ error: 'Invalid backup type' });
                return;
        }
        (0, child_process_1.exec)(command, async (error, _stdout, _stderr) => {
            if (error) {
                await prisma_1.prisma.backupLog.update({
                    where: { id: backupLog.id },
                    data: { status: 'FAILED', errorMessage: error.message }
                });
                res.status(500).json({ error: `Backup failed: ${error.message}` });
                return;
            }
            const stats = fs_1.default.statSync(filepath);
            const completedAt = new Date();
            const duration = Math.floor((completedAt.getTime() - backupLog.startedAt.getTime()) / 1000);
            await prisma_1.prisma.backupLog.update({
                where: { id: backupLog.id },
                data: {
                    status: 'COMPLETED',
                    size: BigInt(stats.size),
                    completedAt,
                    duration,
                    errorMessage: null
                }
            });
            (0, responseHelpers_1.sendSuccess)(res, {
                id: backupLog.id,
                filename,
                filepath,
                fileSize: stats.size,
                type,
                createdAt: backupLog.createdAt
            }, 'Backup created successfully');
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.createBackup = createBackup;
const listBackups = async (_req, res, next) => {
    try {
        const backups = await prisma_1.prisma.backupLog.findMany({
            orderBy: { createdAt: 'desc' }
        });
        const transformedBackups = backups.map(backup => ({
            ...backup,
            filename: path_1.default.basename(backup.location),
            size: backup.size ? Number(backup.size) : null
        }));
        (0, responseHelpers_1.sendSuccess)(res, transformedBackups);
    }
    catch (error) {
        return next(error);
    }
};
exports.listBackups = listBackups;
const downloadBackup = async (req, res, next) => {
    try {
        const { backupId } = req.params;
        const backup = await prisma_1.prisma.backupLog.findUnique({
            where: { id: backupId }
        });
        if (!backup) {
            res.status(404).json({ error: 'Backup not found' });
            return;
        }
        if (!fs_1.default.existsSync(backup.location)) {
            res.status(404).json({ error: 'Backup file not found' });
            return;
        }
        res.download(backup.location, path_1.default.basename(backup.location));
    }
    catch (error) {
        return next(error);
    }
};
exports.downloadBackup = downloadBackup;
const restoreBackup = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: 'No backup file provided' });
            return;
        }
        const dbUrl = new URL(process.env.DATABASE_URL || '');
        const host = dbUrl.hostname;
        const port = dbUrl.port || '5432';
        const database = dbUrl.pathname.slice(1).split('?')[0];
        const username = dbUrl.username;
        const password = dbUrl.password || '';
        const command = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${database} -f ${file.path}`;
        (0, child_process_1.exec)(command, async (error, _stdout, _stderr) => {
            if (error) {
                res.status(500).json({ error: `Restore failed: ${error.message}` });
                return;
            }
            fs_1.default.unlinkSync(file.path);
            (0, responseHelpers_1.sendSuccess)(res, null, 'Backup restored successfully');
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.restoreBackup = restoreBackup;
const deleteBackup = async (req, res, next) => {
    try {
        const { filename } = req.params;
        const filepath = path_1.default.join('backups', filename);
        if (!fs_1.default.existsSync(filepath)) {
            res.status(404).json({ error: 'Backup file not found' });
            return;
        }
        fs_1.default.unlinkSync(filepath);
        await prisma_1.prisma.backupLog.updateMany({
            where: { location: filepath },
            data: { status: 'DELETED' }
        });
        (0, responseHelpers_1.sendSuccess)(res, null, 'Backup deleted successfully');
    }
    catch (error) {
        return next(error);
    }
};
exports.deleteBackup = deleteBackup;
const getBackupSettings = async (_req, res, next) => {
    try {
        const backupSettings = await prisma_1.prisma.backupSetting.findMany({
            orderBy: { createdAt: 'desc' }
        });
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
        (0, responseHelpers_1.sendSuccess)(res, {
            success: true,
            settings: schedules
        });
    }
    catch (error) {
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            (0, responseHelpers_1.sendSuccess)(res, {
                success: true,
                settings: []
            });
            return;
        }
        return next(error);
    }
};
exports.getBackupSettings = getBackupSettings;
const createBackupSetting = async (_req, res, next) => {
    try {
        (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup setting created');
    }
    catch (error) {
        return next(error);
    }
};
exports.createBackupSetting = createBackupSetting;
const updateBackupSetting = async (req, res, next) => {
    try {
        const settings = req.body;
        const userId = req.user?.id;
        const settingsService = getSettingsService();
        await settingsService.updateBackupSettings(settings, userId);
        (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup settings updated');
    }
    catch (error) {
        return next(error);
    }
};
exports.updateBackupSetting = updateBackupSetting;
const deleteBackupSetting = async (_req, res, next) => {
    try {
        (0, responseHelpers_1.sendSuccess)(res, {}, 'Backup setting deleted');
    }
    catch (error) {
        return next(error);
    }
};
exports.deleteBackupSetting = deleteBackupSetting;
const runScheduledBackup = async (req, res, next) => {
    try {
        const { settingId } = req.body;
        const backupService = getScheduledBackupService();
        const result = await backupService.runManualBackup(settingId);
        if (result.success) {
            (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        else {
            res.status(500).json({ error: result.error || 'Backup failed' });
        }
    }
    catch (error) {
        return next(error);
    }
};
exports.runScheduledBackup = runScheduledBackup;
const getActiveSchedules = async (_req, res, next) => {
    try {
        const backupService = getScheduledBackupService();
        const schedules = backupService.getActiveSchedules();
        (0, responseHelpers_1.sendSuccess)(res, schedules);
    }
    catch (error) {
        return next(error);
    }
};
exports.getActiveSchedules = getActiveSchedules;
const debugBackupSettings = async (_req, res, next) => {
    try {
        const settingsService = getSettingsService();
        const settings = await settingsService.getBackupSettings();
        const backupService = getScheduledBackupService();
        const schedules = backupService.getActiveSchedules();
        (0, responseHelpers_1.sendSuccess)(res, {
            settings,
            schedules,
            databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured'
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.debugBackupSettings = debugBackupSettings;
//# sourceMappingURL=backupController.js.map