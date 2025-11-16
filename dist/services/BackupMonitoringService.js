"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const events_1 = require("events");
const prisma = new client_1.PrismaClient();
class BackupMonitoringService extends events_1.EventEmitter {
    static instance;
    constructor() {
        super();
    }
    static getInstance() {
        if (!BackupMonitoringService.instance) {
            BackupMonitoringService.instance = new BackupMonitoringService();
        }
        return BackupMonitoringService.instance;
    }
    async logBackup(data, tenantId = 'default_tenant') {
        try {
            const backupLog = await prisma.backupLog.create({
                data: {
                    tenantId,
                    type: data.type,
                    status: data.status,
                    startedAt: data.startedAt,
                    completedAt: data.completedAt,
                    duration: data.duration,
                    size: data.size ? BigInt(data.size) : null,
                    location: data.location,
                    errorMessage: data.errorMessage,
                    metadata: data.metadata || {},
                },
            });
            this.emit('backup:logged', backupLog);
            if (data.status === 'failed') {
                this.emit('backup:failed', backupLog);
                await this.handleBackupFailure(backupLog);
            }
            else if (data.status === 'success') {
                this.emit('backup:success', backupLog);
            }
            return backupLog;
        }
        catch (error) {
            console.error('Failed to log backup:', error);
            throw error;
        }
    }
    async updateBackupLog(id, data) {
        try {
            const updateData = {};
            if (data.status)
                updateData.status = data.status;
            if (data.completedAt)
                updateData.completedAt = data.completedAt;
            if (data.duration)
                updateData.duration = data.duration;
            if (data.size !== undefined)
                updateData.size = BigInt(data.size);
            if (data.errorMessage)
                updateData.errorMessage = data.errorMessage;
            if (data.metadata)
                updateData.metadata = data.metadata;
            const backupLog = await prisma.backupLog.update({
                where: { id },
                data: updateData,
            });
            this.emit('backup:updated', backupLog);
            return backupLog;
        }
        catch (error) {
            console.error('Failed to update backup log:', error);
            throw error;
        }
    }
    async getBackupHistory(options = {}) {
        const { limit = 50, offset = 0, type, status, startDate, endDate } = options;
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (startDate || endDate) {
            where.startedAt = {};
            if (startDate)
                where.startedAt.gte = startDate;
            if (endDate)
                where.startedAt.lte = endDate;
        }
        const [backups, total] = await Promise.all([
            prisma.backupLog.findMany({
                where,
                orderBy: { startedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.backupLog.count({ where }),
        ]);
        return { backups, total };
    }
    async getLatestBackup(type) {
        const where = type ? { type } : {};
        return prisma.backupLog.findFirst({
            where,
            orderBy: { startedAt: 'desc' },
        });
    }
    async getBackupStats(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const backups = await prisma.backupLog.findMany({
            where: {
                startedAt: {
                    gte: startDate,
                },
            },
        });
        const totalBackups = backups.length;
        const successfulBackups = backups.filter((b) => b.status === 'success').length;
        const failedBackups = backups.filter((b) => b.status === 'failed').length;
        const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 0;
        const lastBackup = await this.getLatestBackup();
        const totalSize = backups
            .filter((b) => b.size !== null)
            .reduce((sum, b) => sum + BigInt(b.size || 0), BigInt(0));
        const completedBackups = backups.filter((b) => b.duration !== null);
        const averageDuration = completedBackups.length > 0
            ? completedBackups.reduce((sum, b) => sum + (b.duration || 0), 0) / completedBackups.length
            : 0;
        const issues = [];
        let backupHealth = 'healthy';
        if (lastBackup) {
            const ageHours = (Date.now() - lastBackup.startedAt.getTime()) / (1000 * 60 * 60);
            if (ageHours > 25) {
                issues.push(`Last backup is ${ageHours.toFixed(1)} hours old (expected: < 25 hours)`);
                backupHealth = 'critical';
            }
        }
        else {
            issues.push('No backups found');
            backupHealth = 'critical';
        }
        if (successRate < 90) {
            issues.push(`Low success rate: ${successRate.toFixed(1)}% (expected: > 90%)`);
            backupHealth = backupHealth === 'critical' ? 'critical' : 'warning';
        }
        const recentBackups = backups.slice(0, 5);
        const recentFailures = recentBackups.filter((b) => b.status === 'failed').length;
        if (recentFailures >= 2) {
            issues.push(`${recentFailures} failures in last 5 backups`);
            backupHealth = 'critical';
        }
        return {
            totalBackups,
            successfulBackups,
            failedBackups,
            successRate,
            lastBackupTime: lastBackup?.startedAt,
            lastBackupStatus: lastBackup?.status,
            totalSize,
            averageDuration,
            backupHealth,
            issues,
        };
    }
    async checkBackupHealth() {
        const lastBackup = await this.getLatestBackup();
        const issues = [];
        let isHealthy = true;
        let lastBackupInfo;
        if (lastBackup) {
            const ageMs = Date.now() - lastBackup.startedAt.getTime();
            const ageHours = ageMs / (1000 * 60 * 60);
            lastBackupInfo = {
                type: lastBackup.type,
                status: lastBackup.status,
                timestamp: lastBackup.startedAt,
                ageHours,
            };
            if (ageHours > 25) {
                issues.push(`Last backup is ${ageHours.toFixed(1)} hours old`);
                isHealthy = false;
            }
            if (lastBackup.status === 'failed') {
                issues.push('Last backup failed');
                isHealthy = false;
            }
        }
        else {
            issues.push('No backups found');
            isHealthy = false;
        }
        const recentBackups = await prisma.backupLog.findMany({
            where: {
                startedAt: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });
        const recentFailures = recentBackups.filter((b) => b.status === 'failed').length;
        if (recentFailures > 2) {
            issues.push(`${recentFailures} failures in last 10 backups`);
            isHealthy = false;
        }
        return {
            isHealthy,
            issues,
            lastBackup: lastBackupInfo,
            recentFailures,
        };
    }
    async handleBackupFailure(backupLog) {
        try {
            console.error('Backup failed:', {
                type: backupLog.type,
                error: backupLog.errorMessage,
                timestamp: backupLog.startedAt,
            });
            const recentFailures = await prisma.backupLog.count({
                where: {
                    status: 'failed',
                    startedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            });
            if (recentFailures >= 3) {
                console.error('CRITICAL: Multiple backup failures detected');
                this.emit('backup:critical', { failures: recentFailures });
            }
        }
        catch (error) {
            console.error('Failed to handle backup failure:', error);
        }
    }
    async cleanupOldLogs(retentionDays = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await prisma.backupLog.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate,
                },
            },
        });
        return result.count;
    }
    async getBackupSizeTrend(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const backups = await prisma.backupLog.findMany({
            where: {
                startedAt: {
                    gte: startDate,
                },
                status: 'success',
                size: {
                    not: null,
                },
            },
            orderBy: { startedAt: 'asc' },
            select: {
                startedAt: true,
                size: true,
            },
        });
        return backups.map((b) => ({
            date: b.startedAt.toISOString().split('T')[0],
            size: Number(b.size) / (1024 * 1024 * 1024),
        }));
    }
    async detectSizeAnomalies() {
        const recentBackups = await prisma.backupLog.findMany({
            where: {
                type: 'full',
                status: 'success',
                size: { not: null },
            },
            orderBy: { startedAt: 'desc' },
            take: 10,
        });
        if (recentBackups.length < 5) {
            return { hasAnomaly: false };
        }
        const latest = recentBackups[0];
        const previous = recentBackups.slice(1);
        const averageSize = previous.reduce((sum, b) => sum + Number(b.size), 0) / previous.length;
        const currentSize = Number(latest.size);
        const deviation = ((currentSize - averageSize) / averageSize) * 100;
        const hasAnomaly = Math.abs(deviation) > 100;
        return {
            hasAnomaly,
            details: {
                currentSize,
                averageSize,
                deviation,
            },
        };
    }
}
exports.default = BackupMonitoringService;
//# sourceMappingURL=BackupMonitoringService.js.map