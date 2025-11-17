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
    getActivityLogs(limit?: number): Promise<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resource: string;
        resourceId: string;
        details: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string;
        userAgent: string;
        createdAt: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }[]>;
    getAuditLogs(limit?: number): Promise<{
        id: string;
        userId: string;
        action: string;
        resourceType: string;
        resource: string;
        resourceId: string;
        details: import("@prisma/client/runtime/library").JsonValue;
        ipAddress: string;
        userAgent: string;
        createdAt: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }[]>;
    getDatabaseTables(): Promise<{
        name: string;
        rowCount: number;
        size: string;
    }[]>;
    getTableStructure(tableName: string): Promise<{
        tableName: string;
        columns: {
            column_name: string;
            data_type: string;
            character_maximum_length: number;
            numeric_precision: number;
            numeric_scale: number;
            is_nullable: string;
            column_default: string;
        }[];
        primaryKeys: string[];
        foreignKeys: {
            column_name: string;
            foreign_table_name: string;
            foreign_column_name: string;
        }[];
        columnCount: number;
    }>;
    getTableData(tableName: string, page?: number, limit?: number, orderBy?: string, orderDirection?: string): Promise<{
        tableName: string;
        rows: Record<string, any>[];
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
        rows: Record<string, any>[];
        columns: string[];
        rowCount: number;
    }>;
}
//# sourceMappingURL=AdminService.d.ts.map