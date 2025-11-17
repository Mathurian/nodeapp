import { PrismaClient, Prisma } from '@prisma/client';
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
        totalRequests: number;
        averageResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        responseTimeDistribution: (Prisma.PickEnumerable<Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
            _count: {
                id: number;
            };
            _avg: {
                responseTime: number;
            };
        })[];
        slowEndpoints: (Prisma.PickEnumerable<Prisma.PerformanceLogGroupByOutputType, "endpoint"[]> & {
            _count: {
                id: number;
            };
            _avg: {
                responseTime: number;
            };
        })[];
        errorStats: (Prisma.PickEnumerable<Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
            _count: {
                id: number;
            };
        })[];
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
            connectionCount: number | bigint;
        };
        disk: {
            available: boolean;
            path?: string;
            error?: string;
        };
    }>;
    getPerformanceLogs(query: PerformanceLogsQuery): Promise<{
        logs: {
            id: string;
            createdAt: Date;
            eventId: string | null;
            categoryId: string | null;
            contestId: string | null;
            userId: string | null;
            method: string;
            userAgent: string | null;
            ipAddress: string | null;
            endpoint: string;
            responseTime: number;
            statusCode: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    clearPerformanceLogs(olderThan?: string): Promise<{
        message: string;
        count: number;
    }>;
    getHealthCheck(): Promise<HealthCheckResult>;
}
export {};
//# sourceMappingURL=PerformanceService.d.ts.map