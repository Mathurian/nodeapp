import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AdminService extends BaseService {
    private prisma;
    private startTime;
    constructor(prisma: PrismaClient);
    getDashboardStats(): Promise<{
        totalUsers: number;
        totalEvents: number;
        totalContests: number;
        totalCategories: number;
        totalScores: number;
        activeUsers: number;
        pendingCertifications: number;
        certificationBreakdown: {
            judge: number;
            tallyMaster: number;
            auditor: number;
            board: number;
        };
        systemHealth: "HEALTHY" | "CRITICAL";
        lastBackup: string;
        databaseSize: string;
        uptime: string;
        uptimeSeconds: number;
    }>;
    getSystemHealth(): Promise<{
        database: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>;
    clearCache(): Promise<{
        success: boolean;
        message: string;
    }>;
    getActivityLogs(limit?: number): Promise<any>;
    getAuditLogs(limit?: number): Promise<any>;
    getDatabaseTables(): Promise<any[]>;
    getTableStructure(tableName: string): Promise<{
        tableName: string;
        columns: any;
        primaryKeys: any;
        foreignKeys: any;
        columnCount: any;
    }>;
    getTableData(tableName: string, page?: number, limit?: number, orderBy?: string, orderDirection?: string): Promise<{
        tableName: string;
        rows: any;
        columns: string[];
        pagination: {
            page: number;
            limit: number;
            totalRows: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
        rowCount: number;
    }>;
    executeDatabaseQuery(query: string, limit?: number): Promise<{
        rows: any;
        columns: string[];
        rowCount: any;
    }>;
}
//# sourceMappingURL=AdminService.d.ts.map