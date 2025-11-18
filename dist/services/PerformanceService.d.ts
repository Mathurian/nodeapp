import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
interface PerformanceLogData {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userId?: string | null;
    eventId?: string | null;
}
interface PerformanceStatsQuery {
    timeRange?: '1h' | '24h' | '7d' | '30d';
    endpoint?: string;
    method?: string;
}
interface PerformanceLogsQuery {
    page?: number;
    limit?: number;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    userId?: string;
    minResponseTime?: number;
    maxResponseTime?: number;
    startDate?: string;
    endDate?: string;
}
interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    checks: {
        database: boolean;
        memory: boolean;
        disk: boolean;
        uptime: boolean;
    };
    uptime: number;
    memory: {
        used: number;
        total: number;
        percent: string;
    };
}
export declare class PerformanceService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    logPerformance(data: PerformanceLogData): Promise<void>;
    getPerformanceStats(query: PerformanceStatsQuery): Promise<{
        timeRange: "1h" | "24h" | "7d" | "30d";
        totalRequests: any;
        averageResponseTime: number;
        minResponseTime: any;
        maxResponseTime: any;
        responseTimeDistribution: any;
        slowEndpoints: any;
        errorStats: any;
        errorRate: string;
    }>;
    getSystemMetrics(): Promise<{
        timestamp: string;
        process: {
            pid: number;
            uptime: number;
            cpuUsage: {
                user: number;
                system: number;
            };
            memoryUsage: {
                rss: number;
                heapTotal: number;
                heapUsed: number;
                external: number;
            };
        };
        system: {
            platform: NodeJS.Platform;
            arch: NodeJS.Architecture;
            hostname: string;
            uptime: number;
            loadAverage: number[];
            totalMemory: number;
            freeMemory: number;
            cpuCount: number;
        };
        database: {
            status: string;
            connectionCount: any;
        };
        disk: {
            available: boolean;
            path?: string;
            error?: string;
        };
    }>;
    getPerformanceLogs(query: PerformanceLogsQuery): Promise<{
        logs: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>;
    clearPerformanceLogs(olderThan?: string): Promise<{
        message: string;
        count: any;
    }>;
    getHealthCheck(): Promise<HealthCheckResult>;
}
export {};
//# sourceMappingURL=PerformanceService.d.ts.map