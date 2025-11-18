import { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    private adminService;
    private prisma;
    constructor();
    getDashboard: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    getSystemHealth: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        database: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>, Record<string, any>>>;
    clearCache: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
    }>, Record<string, any>>>;
    getDatabaseTables: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        name: string;
        rowCount: number;
        size: string;
    }[]>, Record<string, any>>>;
    getTableStructure: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    getTableData: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    executeDatabaseQuery: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        rows: Record<string, any>[];
        columns: string[];
        rowCount: number;
    }>, Record<string, any>>>;
    getStats: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    getLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    getActiveUsers: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        name: string;
        email: string;
        lastLoginAt: Date;
    }[]>, Record<string, any>>>;
    getUsers: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        users: {
            id: string;
            role: import(".prisma/client").$Enums.UserRole;
            name: string;
            createdAt: Date;
            email: string;
            isActive: boolean;
            lastLoginAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getEvents: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        events: {
            id: string;
            name: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            archived: boolean;
            location: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getContests: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        contests: {
            id: string;
            tenantId: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            isLocked: boolean;
            lockedAt: Date | null;
            description: string | null;
            archived: boolean;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            contestantViewReleaseDate: Date | null;
            lockVerifiedBy: string | null;
            eventId: string;
            nextContestantNumber: number | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getCategories: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        categories: {
            id: string;
            tenantId: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            contestId: string;
            description: string | null;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getScores: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        scores: {
            id: string;
            categoryId: string;
            certifiedAt: Date | null;
            tenantId: string;
            createdAt: Date;
            contestantId: string;
            judgeId: string;
            criterionId: string | null;
            score: number | null;
            updatedAt: Date;
            allowCommentEdit: boolean;
            certifiedBy: string | null;
            comment: string | null;
            isCertified: boolean;
            isLocked: boolean;
            lockedAt: Date | null;
            lockedBy: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getActivityLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    getAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    exportAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
    testConnection: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        database: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>, Record<string, any>>>;
    forceLogoutAllUsers: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
        usersAffected: number;
    }>, Record<string, any>>>;
    forceLogoutUser: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
        userId: string;
    }>, Record<string, any>>>;
    getContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        scores: {
            id: string;
            categoryId: string;
            certifiedAt: Date | null;
            tenantId: string;
            createdAt: Date;
            contestantId: string;
            judgeId: string;
            criterionId: string | null;
            score: number | null;
            updatedAt: Date;
            allowCommentEdit: boolean;
            certifiedBy: string | null;
            comment: string | null;
            isCertified: boolean;
            isLocked: boolean;
            lockedAt: Date | null;
            lockedBy: string | null;
        }[];
        stats: {
            totalScores: number;
            certifiedScores: number;
            averageScore: number;
            highestScore: number;
            lowestScore: number;
        };
    }>, Record<string, any>>>;
}
export declare const getDashboard: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const getSystemHealth: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    database: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
}>, Record<string, any>>>;
export declare const clearCache: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
}>, Record<string, any>>>;
export declare const getDatabaseTables: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    name: string;
    rowCount: number;
    size: string;
}[]>, Record<string, any>>>;
export declare const getTableStructure: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const getTableData: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const executeDatabaseQuery: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    rows: Record<string, any>[];
    columns: string[];
    rowCount: number;
}>, Record<string, any>>>;
export declare const getStats: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const getLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const getActiveUsers: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: import(".prisma/client").$Enums.UserRole;
    name: string;
    email: string;
    lastLoginAt: Date;
}[]>, Record<string, any>>>;
export declare const getUsers: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    users: {
        id: string;
        role: import(".prisma/client").$Enums.UserRole;
        name: string;
        createdAt: Date;
        email: string;
        isActive: boolean;
        lastLoginAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getEvents: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    events: {
        id: string;
        name: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        archived: boolean;
        location: string;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getContests: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    contests: {
        id: string;
        tenantId: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        description: string | null;
        archived: boolean;
        contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
        contestantViewRestricted: boolean;
        contestantViewReleaseDate: Date | null;
        lockVerifiedBy: string | null;
        eventId: string;
        nextContestantNumber: number | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getCategories: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categories: {
        id: string;
        tenantId: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        contestId: string;
        description: string | null;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getScores: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    scores: {
        id: string;
        categoryId: string;
        certifiedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string | null;
        score: number | null;
        updatedAt: Date;
        allowCommentEdit: boolean;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getActivityLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const getAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const exportAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const testConnection: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    database: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
}>, Record<string, any>>>;
export declare const forceLogoutAllUsers: (_req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
    usersAffected: number;
}>, Record<string, any>>>;
export declare const forceLogoutUser: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
    userId: string;
}>, Record<string, any>>>;
export declare const getContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    scores: {
        id: string;
        categoryId: string;
        certifiedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string | null;
        score: number | null;
        updatedAt: Date;
        allowCommentEdit: boolean;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    }[];
    stats: {
        totalScores: number;
        certifiedScores: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
    };
}>, Record<string, any>>>;
//# sourceMappingURL=adminController.d.ts.map