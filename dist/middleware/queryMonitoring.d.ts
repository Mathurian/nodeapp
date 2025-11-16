import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
export declare const createMonitoredPrismaClient: () => PrismaClient<{
    log: ({
        emit: "event";
        level: "query";
    } | {
        emit: "event";
        level: "error";
    } | {
        emit: "event";
        level: "warn";
    })[];
}, "query" | "warn" | "error", import("@prisma/client/runtime/library").DefaultArgs>;
export declare class QueryMetrics {
    private static metrics;
    static recordQuery(operation: string, duration: number): void;
    static getMetrics(): any[];
    static reset(): void;
    static getSlowQueries(threshold?: number): any[];
}
export declare class ConnectionPoolMonitor {
    private static prisma;
    static initialize(prisma: PrismaClient): void;
    static getPoolStats(): Promise<{
        total: number;
        active: number;
        idle: number;
        idleInTransaction: number;
        timestamp: string;
    }>;
    static getLongRunningQueries(thresholdSeconds?: number): Promise<any>;
}
export declare const requestQueryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    createMonitoredPrismaClient: () => PrismaClient<{
        log: ({
            emit: "event";
            level: "query";
        } | {
            emit: "event";
            level: "error";
        } | {
            emit: "event";
            level: "warn";
        })[];
    }, "query" | "warn" | "error", import("@prisma/client/runtime/library").DefaultArgs>;
    QueryMetrics: typeof QueryMetrics;
    ConnectionPoolMonitor: typeof ConnectionPoolMonitor;
    requestQueryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=queryMonitoring.d.ts.map