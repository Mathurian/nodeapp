import { Request, Response, NextFunction } from 'express';
export declare class PerformanceController {
    private performanceService;
    constructor();
    logPerformance: (req: Request, res: Response, next: NextFunction) => void;
    getPerformanceStats: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        timeRange: "1h" | "24h" | "7d" | "30d";
        totalRequests: number;
        averageResponseTime: number;
        minResponseTime: number;
        maxResponseTime: number;
        responseTimeDistribution: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
            _count: {
                id: number;
            };
            _avg: {
                responseTime: number;
            };
        })[];
        slowEndpoints: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "endpoint"[]> & {
            _count: {
                id: number;
            };
            _avg: {
                responseTime: number;
            };
        })[];
        errorStats: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
            _count: {
                id: number;
            };
        })[];
        errorRate: string;
    }>, Record<string, any>>>;
    getSystemMetrics: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    getPerformanceLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        logs: {
            id: string;
            tenantId: string | null;
            createdAt: Date;
            categoryId: string | null;
            eventId: string | null;
            contestId: string | null;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            endpoint: string;
            method: string;
            responseTime: number;
            statusCode: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>, Record<string, any>>>;
    clearPerformanceLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        message: string;
        count: number;
    }>, Record<string, any>>>;
    getHealthCheck: (_req: Request, res: Response, _next: NextFunction) => Promise<Response<any, Record<string, any>>>;
}
export declare const logPerformance: (req: Request, res: Response, next: NextFunction) => void;
export declare const getPerformanceStats: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    timeRange: "1h" | "24h" | "7d" | "30d";
    totalRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    responseTimeDistribution: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
        _count: {
            id: number;
        };
        _avg: {
            responseTime: number;
        };
    })[];
    slowEndpoints: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "endpoint"[]> & {
        _count: {
            id: number;
        };
        _avg: {
            responseTime: number;
        };
    })[];
    errorStats: (import(".prisma/client").Prisma.PickEnumerable<import(".prisma/client").Prisma.PerformanceLogGroupByOutputType, "statusCode"[]> & {
        _count: {
            id: number;
        };
    })[];
    errorRate: string;
}>, Record<string, any>>>;
export declare const getSystemMetrics: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const getPerformanceLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    logs: {
        id: string;
        tenantId: string | null;
        createdAt: Date;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        userId: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        endpoint: string;
        method: string;
        responseTime: number;
        statusCode: number;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}>, Record<string, any>>>;
export declare const clearPerformanceLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    message: string;
    count: number;
}>, Record<string, any>>>;
export declare const getHealthCheck: (_req: Request, res: Response, _next: NextFunction) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=performanceController.d.ts.map