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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const os = __importStar(require("os"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const BaseService_1 = require("./BaseService");
let PerformanceService = class PerformanceService extends BaseService_1.BaseService {
    prisma;
    constructor(prisma) {
        super();
        this.prisma = prisma;
    }
    async logPerformance(data) {
        try {
            const sampleRate = parseFloat(process.env.PERF_SAMPLE_RATE || '0.2');
            if (Math.random() > sampleRate) {
                return;
            }
            await this.prisma.performanceLog.create({
                data: {
                    endpoint: data.endpoint,
                    method: data.method,
                    responseTime: data.responseTime,
                    statusCode: data.statusCode,
                    userId: data.userId || null,
                    ipAddress: null,
                    userAgent: null,
                    eventId: data.eventId || null,
                },
            });
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Performance logging error:', error);
            }
        }
    }
    async getPerformanceStats(query) {
        const { timeRange = '24h', endpoint, method } = query;
        const now = new Date();
        let startTime;
        switch (timeRange) {
            case '1h':
                startTime = new Date(now.getTime() - 60 * 60 * 1000);
                break;
            case '24h':
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        const whereClause = {
            createdAt: {
                gte: startTime,
            },
            ...(endpoint && { endpoint }),
            ...(method && { method }),
        };
        const stats = await this.prisma.performanceLog.aggregate({
            where: whereClause,
            _avg: {
                responseTime: true,
            },
            _min: {
                responseTime: true,
            },
            _max: {
                responseTime: true,
            },
            _count: {
                id: true,
            },
        });
        const responseTimeDistribution = await this.prisma.performanceLog.groupBy({
            by: ['statusCode'],
            where: whereClause,
            _count: {
                id: true,
            },
            _avg: {
                responseTime: true,
            },
        });
        const slowEndpoints = await this.prisma.performanceLog.groupBy({
            by: ['endpoint'],
            where: whereClause,
            _avg: {
                responseTime: true,
            },
            _count: {
                id: true,
            },
            orderBy: {
                _avg: {
                    responseTime: 'desc',
                },
            },
            take: 10,
        });
        const errorStats = await this.prisma.performanceLog.groupBy({
            by: ['statusCode'],
            where: {
                ...whereClause,
                statusCode: {
                    gte: 400,
                },
            },
            _count: {
                id: true,
            },
        });
        const totalRequests = stats._count.id;
        const errorCount = errorStats.reduce((sum, stat) => sum + stat._count.id, 0);
        return {
            timeRange,
            totalRequests,
            averageResponseTime: Math.round(stats._avg.responseTime || 0),
            minResponseTime: stats._min.responseTime || 0,
            maxResponseTime: stats._max.responseTime || 0,
            responseTimeDistribution,
            slowEndpoints,
            errorStats,
            errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : '0',
        };
    }
    async getSystemMetrics() {
        const cpuUsage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        const systemInfo = {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            uptime: os.uptime(),
            loadAverage: os.loadavg(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpuCount: os.cpus().length,
        };
        const dbStatus = await this.prisma.$queryRaw `SELECT 1 as status`;
        const connectionCount = await this.prisma.$queryRaw `
      SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
    `;
        let diskUsage = {
            available: false,
        };
        try {
            const projectRoot = path.join(__dirname, '../../');
            await fs_1.promises.stat(projectRoot);
            diskUsage = {
                available: true,
                path: projectRoot,
            };
        }
        catch (error) {
            diskUsage = {
                available: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
        return {
            timestamp: new Date().toISOString(),
            process: {
                pid: process.pid,
                uptime: process.uptime(),
                cpuUsage: {
                    user: cpuUsage.user,
                    system: cpuUsage.system,
                },
                memoryUsage: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                },
            },
            system: systemInfo,
            database: {
                status: dbStatus ? 'connected' : 'disconnected',
                connectionCount: connectionCount[0]?.count || 0,
            },
            disk: diskUsage,
        };
    }
    async getPerformanceLogs(query) {
        const { page = 1, limit = 50, endpoint, method, statusCode, userId, minResponseTime, maxResponseTime, startDate, endDate, } = query;
        const whereClause = {
            ...(endpoint && { endpoint: { contains: endpoint } }),
            ...(method && { method }),
            ...(statusCode && { statusCode: Number(statusCode) }),
            ...(userId && { userId }),
            ...(minResponseTime && { responseTime: { gte: Number(minResponseTime) } }),
            ...(maxResponseTime && { responseTime: { lte: Number(maxResponseTime) } }),
            ...(startDate &&
                endDate && {
                createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            }),
        };
        const logs = await this.prisma.performanceLog.findMany({
            where: whereClause,
            orderBy: {
                createdAt: 'desc',
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        const total = await this.prisma.performanceLog.count({
            where: whereClause,
        });
        return {
            logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }
    async clearPerformanceLogs(olderThan) {
        const whereClause = olderThan
            ? {
                createdAt: {
                    lt: new Date(olderThan),
                },
            }
            : {};
        const result = await this.prisma.performanceLog.deleteMany({
            where: whereClause,
        });
        return {
            message: `Cleared ${result.count} performance log entries`,
            count: result.count,
        };
    }
    async getHealthCheck() {
        const checks = {
            database: false,
            memory: false,
            disk: false,
            uptime: false,
        };
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            checks.database = true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
        }
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        checks.memory = memoryUsagePercent < 90;
        try {
            await fs_1.promises.access(path.join(__dirname, '../../'));
            checks.disk = true;
        }
        catch (error) {
            console.error('Disk health check failed:', error);
        }
        checks.uptime = process.uptime() > 0;
        const allHealthy = Object.values(checks).every((check) => check === true);
        return {
            status: allHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            checks,
            uptime: process.uptime(),
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                percent: memoryUsagePercent.toFixed(2),
            },
        };
    }
};
exports.PerformanceService = PerformanceService;
exports.PerformanceService = PerformanceService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('PrismaClient')),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], PerformanceService);
//# sourceMappingURL=PerformanceService.js.map