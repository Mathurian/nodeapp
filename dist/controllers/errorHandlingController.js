"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportErrorLogs = exports.cleanupErrorLogs = exports.getErrorTrends = exports.markErrorResolved = exports.getErrorDetails = exports.getErrorStatistics = exports.getErrorStats = exports.logError = exports.ErrorHandlingController = void 0;
const container_1 = require("../config/container");
const ErrorHandlingService_1 = require("../services/ErrorHandlingService");
const responseHelpers_1 = require("../utils/responseHelpers");
class ErrorHandlingController {
    errorHandlingService;
    prisma;
    constructor() {
        this.errorHandlingService = container_1.container.resolve(ErrorHandlingService_1.ErrorHandlingService);
        this.prisma = container_1.container.resolve('PrismaClient');
    }
    logError = async (req, res, next) => {
        try {
            const { error, context } = req.body;
            const result = this.errorHandlingService.logError(error, context);
            return (0, responseHelpers_1.sendSuccess)(res, result, 'Error logged');
        }
        catch (error) {
            return next(error);
        }
    };
    getErrorStats = async (_req, res, next) => {
        try {
            const stats = this.errorHandlingService.getErrorStats();
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getErrorStatistics = async (req, res, next) => {
        try {
            const days = parseInt(req.query.days) || 7;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const errorLogs = await this.prisma.activityLog.findMany({
                where: {
                    action: 'ERROR',
                    createdAt: { gte: since }
                },
                select: {
                    action: true,
                    resourceType: true,
                    createdAt: true,
                    details: true
                }
            });
            const stats = {
                total: errorLogs.length,
                byType: errorLogs.reduce((acc, log) => {
                    const type = log.resourceType || 'UNKNOWN';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                }, {}),
                byDay: errorLogs.reduce((acc, log) => {
                    const day = log.createdAt.toISOString().split('T')[0];
                    acc[day] = (acc[day] || 0) + 1;
                    return acc;
                }, {}),
                timeRange: { days, since }
            };
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getErrorDetails = async (req, res, next) => {
        try {
            const { id } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;
            if (id) {
                const errorLog = await this.prisma.activityLog.findUnique({
                    where: { id },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });
                if (!errorLog) {
                    return (0, responseHelpers_1.sendSuccess)(res, {}, 'Error log not found', 404);
                }
                return (0, responseHelpers_1.sendSuccess)(res, errorLog);
            }
            const [errorLogs, total] = await Promise.all([
                this.prisma.activityLog.findMany({
                    where: { action: 'ERROR' },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }
                }),
                this.prisma.activityLog.count({ where: { action: 'ERROR' } })
            ]);
            return (0, responseHelpers_1.sendSuccess)(res, {
                errors: errorLogs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: skip + limit < total
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    markErrorResolved = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { resolution } = req.body;
            const existing = await this.prisma.activityLog.findUnique({
                where: { id }
            });
            if (!existing) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'Error log not found', 404);
            }
            const errorLog = await this.prisma.activityLog.update({
                where: { id },
                data: {
                    details: {
                        ...(typeof existing.details === 'object' && existing.details !== null ? existing.details : {}),
                        resolved: true,
                        resolvedAt: new Date().toISOString(),
                        resolution: resolution || 'Resolved'
                    }
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, errorLog, 'Error marked as resolved');
        }
        catch (error) {
            return next(error);
        }
    };
    getErrorTrends = async (req, res, next) => {
        try {
            const days = parseInt(req.query.days) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const errorLogs = await this.prisma.activityLog.findMany({
                where: {
                    action: 'ERROR',
                    createdAt: { gte: since }
                },
                select: {
                    createdAt: true,
                    resourceType: true
                },
                orderBy: { createdAt: 'asc' }
            });
            const trendsByDay = errorLogs.reduce((acc, log) => {
                const day = log.createdAt.toISOString().split('T')[0];
                if (!acc[day]) {
                    acc[day] = { total: 0, byType: {} };
                }
                acc[day].total++;
                const type = log.resourceType || 'UNKNOWN';
                acc[day].byType[type] = (acc[day].byType[type] || 0) + 1;
                return acc;
            }, {});
            const dailyTotals = Object.values(trendsByDay).map((d) => d.total);
            const movingAverage = dailyTotals.length > 0
                ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
                : 0;
            return (0, responseHelpers_1.sendSuccess)(res, {
                trends: trendsByDay,
                summary: {
                    totalErrors: errorLogs.length,
                    daysAnalyzed: days,
                    movingAverage: parseFloat(movingAverage.toFixed(2)),
                    peakDay: Object.entries(trendsByDay).reduce((max, [day, data]) => {
                        return data.total > (max?.total || 0) ? { day, ...data } : max;
                    }, null)
                }
            });
        }
        catch (error) {
            return next(error);
        }
    };
    cleanupErrorLogs = async (req, res, next) => {
        try {
            const { olderThanDays } = req.body;
            if (!olderThanDays) {
                return (0, responseHelpers_1.sendSuccess)(res, {}, 'olderThanDays parameter is required', 400);
            }
            const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
            const result = await this.prisma.activityLog.deleteMany({
                where: {
                    action: 'ERROR',
                    createdAt: { lt: cutoffDate }
                }
            });
            return (0, responseHelpers_1.sendSuccess)(res, {
                deleted: result.count,
                cutoffDate
            }, `Deleted ${result.count} error logs older than ${olderThanDays} days`);
        }
        catch (error) {
            return next(error);
        }
    };
    exportErrorLogs = async (req, res, next) => {
        try {
            const format = req.query.format || 'json';
            const limit = parseInt(req.query.limit) || 1000;
            const days = parseInt(req.query.days) || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            const errorLogs = await this.prisma.activityLog.findMany({
                where: {
                    action: 'ERROR',
                    createdAt: { gte: since }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                take: limit,
                orderBy: { createdAt: 'desc' }
            });
            if (format === 'csv') {
                const headers = ['ID', 'User', 'Type', 'Details', 'IP Address', 'Date'];
                const rows = errorLogs.map(log => [
                    log.id,
                    log.user?.name || 'System',
                    log.resourceType || 'UNKNOWN',
                    JSON.stringify(log.details),
                    log.ipAddress || 'N/A',
                    log.createdAt
                ]);
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
                ].join('\n');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="error-logs-${Date.now()}.csv"`);
                return res.send(csvContent);
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="error-logs-${Date.now()}.json"`);
            return res.send(JSON.stringify(errorLogs, null, 2));
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.ErrorHandlingController = ErrorHandlingController;
const controller = new ErrorHandlingController();
exports.logError = controller.logError;
exports.getErrorStats = controller.getErrorStats;
exports.getErrorStatistics = controller.getErrorStatistics;
exports.getErrorDetails = controller.getErrorDetails;
exports.markErrorResolved = controller.markErrorResolved;
exports.getErrorTrends = controller.getErrorTrends;
exports.cleanupErrorLogs = controller.cleanupErrorLogs;
exports.exportErrorLogs = controller.exportErrorLogs;
//# sourceMappingURL=errorHandlingController.js.map