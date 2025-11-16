"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestQueryMonitoring = exports.ConnectionPoolMonitor = exports.QueryMetrics = exports.createMonitoredPrismaClient = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const queryLogger = new logger_1.Logger('QueryMonitoring');
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10);
const createMonitoredPrismaClient = () => {
    const prisma = new client_1.PrismaClient({
        log: [
            {
                emit: 'event',
                level: 'query',
            },
            {
                emit: 'event',
                level: 'error',
            },
            {
                emit: 'event',
                level: 'warn',
            },
        ],
    });
    prisma.$on('query', async (e) => {
        const duration = parseFloat(e.duration);
        if (duration > SLOW_QUERY_THRESHOLD) {
            queryLogger.warn('Slow Query Detected', {
                query: e.query,
                params: e.params,
                duration: `${duration}ms`,
                target: e.target,
                timestamp: new Date().toISOString(),
            });
            try {
                await prisma.performanceLog.create({
                    data: {
                        endpoint: 'database-query',
                        method: e.target || 'UNKNOWN',
                        responseTime: Math.round(duration),
                        statusCode: 200,
                        createdAt: new Date(),
                    },
                });
            }
            catch (error) {
            }
        }
    });
    prisma.$on('error', (e) => {
        queryLogger.error('Prisma Error', {
            message: e.message,
            target: e.target,
            timestamp: new Date().toISOString(),
        });
    });
    prisma.$on('warn', (e) => {
        queryLogger.warn('Prisma Warning', {
            message: e.message,
            target: e.target,
            timestamp: new Date().toISOString(),
        });
    });
    return prisma;
};
exports.createMonitoredPrismaClient = createMonitoredPrismaClient;
class QueryMetrics {
    static metrics = new Map();
    static recordQuery(operation, duration) {
        const existing = this.metrics.get(operation);
        if (existing) {
            existing.count++;
            existing.totalDuration += duration;
            existing.minDuration = Math.min(existing.minDuration, duration);
            existing.maxDuration = Math.max(existing.maxDuration, duration);
            existing.avgDuration = existing.totalDuration / existing.count;
        }
        else {
            this.metrics.set(operation, {
                count: 1,
                totalDuration: duration,
                minDuration: duration,
                maxDuration: duration,
                avgDuration: duration,
            });
        }
    }
    static getMetrics() {
        const metrics = [];
        this.metrics.forEach((value, key) => {
            metrics.push({
                operation: key,
                ...value,
            });
        });
        return metrics.sort((a, b) => b.avgDuration - a.avgDuration);
    }
    static reset() {
        this.metrics.clear();
    }
    static getSlowQueries(threshold = SLOW_QUERY_THRESHOLD) {
        return this.getMetrics().filter(m => m.avgDuration > threshold);
    }
}
exports.QueryMetrics = QueryMetrics;
class ConnectionPoolMonitor {
    static prisma;
    static initialize(prisma) {
        this.prisma = prisma;
    }
    static async getPoolStats() {
        try {
            const result = await this.prisma.$queryRaw `
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database();
      `;
            return {
                total: parseInt(result[0]?.total_connections || '0', 10),
                active: parseInt(result[0]?.active_connections || '0', 10),
                idle: parseInt(result[0]?.idle_connections || '0', 10),
                idleInTransaction: parseInt(result[0]?.idle_in_transaction || '0', 10),
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            queryLogger.error('Failed to get connection pool stats', { error });
            return null;
        }
    }
    static async getLongRunningQueries(thresholdSeconds = 10) {
        try {
            const result = await this.prisma.$queryRaw `
        SELECT
          pid,
          now() - query_start as duration,
          state,
          query
        FROM pg_stat_activity
        WHERE (now() - query_start) > interval '${thresholdSeconds} seconds'
          AND state != 'idle'
          AND datname = current_database()
        ORDER BY duration DESC;
      `;
            return result;
        }
        catch (error) {
            queryLogger.error('Failed to get long running queries', { error });
            return [];
        }
    }
}
exports.ConnectionPoolMonitor = ConnectionPoolMonitor;
const requestQueryMonitoring = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const operation = `${req.method} ${req.path}`;
        QueryMetrics.recordQuery(operation, duration);
        if (duration > SLOW_QUERY_THRESHOLD) {
            queryLogger.warn('Slow Request Detected', {
                method: req.method,
                path: req.path,
                duration: `${duration}ms`,
                statusCode: res.statusCode,
            });
        }
    });
    next();
};
exports.requestQueryMonitoring = requestQueryMonitoring;
exports.default = {
    createMonitoredPrismaClient: exports.createMonitoredPrismaClient,
    QueryMetrics,
    ConnectionPoolMonitor,
    requestQueryMonitoring: exports.requestQueryMonitoring,
};
//# sourceMappingURL=queryMonitoring.js.map