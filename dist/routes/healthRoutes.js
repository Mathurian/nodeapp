"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const cache_1 = require("../utils/cache");
const router = express_1.default.Router();
router.get('/health', async (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'event-manager'
    });
});
router.get('/health/detailed', async (_req, res) => {
    const startTime = Date.now();
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'event-manager',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        checks: {}
    };
    try {
        const dbStart = Date.now();
        await prisma_1.default.$queryRaw `SELECT 1 as health_check`;
        const dbDuration = Date.now() - dbStart;
        health.checks.database = {
            status: 'healthy',
            responseTime: dbDuration,
            message: 'Database connection successful'
        };
    }
    catch (error) {
        const errorObj = error;
        health.status = 'unhealthy';
        health.checks.database = {
            status: 'unhealthy',
            error: errorObj.message,
            message: 'Database connection failed'
        };
    }
    try {
        const cacheStart = Date.now();
        const testKey = '__health_check__';
        const testValue = 'test';
        cache_1.cache.set(testKey, testValue, 1);
        const retrieved = cache_1.cache.get(testKey);
        cache_1.cache.delete(testKey);
        const cacheDuration = Date.now() - cacheStart;
        const cacheWorking = retrieved === testValue;
        health.checks.cache = {
            status: cacheWorking ? 'healthy' : 'degraded',
            responseTime: cacheDuration,
            size: cache_1.cache.getStats().size,
            message: cacheWorking ? 'Cache working correctly' : 'Cache test failed'
        };
        if (!cacheWorking) {
            health.status = 'degraded';
        }
    }
    catch (error) {
        const errorObj = error;
        health.status = 'degraded';
        health.checks.cache = {
            status: 'unhealthy',
            error: errorObj.message,
            message: 'Cache check failed'
        };
    }
    const memory = process.memoryUsage();
    const memoryUsageMB = {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024)
    };
    const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    health.checks.memory = {
        status: heapUsagePercent > 90 ? 'critical' : heapUsagePercent > 75 ? 'warning' : 'healthy',
        usageMB: memoryUsageMB,
        heapUsagePercent: Math.round(heapUsagePercent * 100) / 100,
        message: `Memory usage at ${Math.round(heapUsagePercent)}%`
    };
    if (heapUsagePercent > 90) {
        health.status = 'critical';
    }
    else if (heapUsagePercent > 75 && health.status === 'healthy') {
        health.status = 'warning';
    }
    health.responseTime = Date.now() - startTime;
    const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 :
            health.status === 'warning' ? 200 :
                503;
    res.status(statusCode).json(health);
});
router.get('/health/live', (_req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});
router.get('/health/ready', async (_req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1 as ready_check`;
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
            message: 'Application is ready to accept traffic'
        });
    }
    catch (error) {
        const errorObj = error;
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            message: 'Application is not ready to accept traffic',
            error: errorObj.message || 'Unknown error'
        });
        return;
    }
});
exports.default = router;
module.exports = router;
//# sourceMappingURL=healthRoutes.js.map