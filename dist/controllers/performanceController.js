"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthCheck = exports.clearPerformanceLogs = exports.getPerformanceLogs = exports.getSystemMetrics = exports.getPerformanceStats = exports.logPerformance = exports.PerformanceController = void 0;
const container_1 = require("../config/container");
const PerformanceService_1 = require("../services/PerformanceService");
const responseHelpers_1 = require("../utils/responseHelpers");
class PerformanceController {
    performanceService;
    constructor() {
        this.performanceService = container_1.container.resolve(PerformanceService_1.PerformanceService);
    }
    logPerformance = (req, res, next) => {
        const startTime = Date.now();
        res.on('finish', async () => {
            const responseTime = Date.now() - startTime;
            const user = req.user;
            await this.performanceService.logPerformance({
                endpoint: req.route?.path || req.path.split('?')[0],
                method: req.method,
                responseTime,
                statusCode: res.statusCode,
                userId: user?.id || null,
                eventId: req.query?.eventId || null,
            });
        });
        next();
    };
    getPerformanceStats = async (req, res, next) => {
        try {
            const { timeRange, endpoint, method } = req.query;
            const stats = await this.performanceService.getPerformanceStats({
                timeRange: timeRange,
                endpoint: endpoint,
                method: method,
            });
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    getSystemMetrics = async (_req, res, next) => {
        try {
            const metrics = await this.performanceService.getSystemMetrics();
            return (0, responseHelpers_1.sendSuccess)(res, metrics);
        }
        catch (error) {
            return next(error);
        }
    };
    getPerformanceLogs = async (req, res, next) => {
        try {
            const { page, limit, endpoint, method, statusCode, userId, minResponseTime, maxResponseTime, startDate, endDate, } = req.query;
            const result = await this.performanceService.getPerformanceLogs({
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                endpoint: endpoint,
                method: method,
                statusCode: statusCode ? Number(statusCode) : undefined,
                userId: userId,
                minResponseTime: minResponseTime ? Number(minResponseTime) : undefined,
                maxResponseTime: maxResponseTime ? Number(maxResponseTime) : undefined,
                startDate: startDate,
                endDate: endDate,
            });
            return (0, responseHelpers_1.sendSuccess)(res, result);
        }
        catch (error) {
            return next(error);
        }
    };
    clearPerformanceLogs = async (req, res, next) => {
        try {
            const { olderThan } = req.body;
            const result = await this.performanceService.clearPerformanceLogs(olderThan);
            return (0, responseHelpers_1.sendSuccess)(res, result, result.message);
        }
        catch (error) {
            return next(error);
        }
    };
    getHealthCheck = async (_req, res, _next) => {
        try {
            const health = await this.performanceService.getHealthCheck();
            const statusCode = health.status === 'healthy' ? 200 : 503;
            return res.status(statusCode).json(health);
        }
        catch (error) {
            return res.status(503).json({
                status: 'unhealthy',
                error: 'Health check failed',
                timestamp: new Date().toISOString(),
            });
        }
    };
}
exports.PerformanceController = PerformanceController;
const controller = new PerformanceController();
exports.logPerformance = controller.logPerformance;
exports.getPerformanceStats = controller.getPerformanceStats;
exports.getSystemMetrics = controller.getSystemMetrics;
exports.getPerformanceLogs = controller.getPerformanceLogs;
exports.clearPerformanceLogs = controller.clearPerformanceLogs;
exports.getHealthCheck = controller.getHealthCheck;
//# sourceMappingURL=performanceController.js.map