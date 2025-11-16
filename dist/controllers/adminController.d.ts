import { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    private adminService;
    private prisma;
    constructor();
    getDashboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
    getSystemHealth: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        database: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>, Record<string, any>>>;
    clearCache: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
    }>, Record<string, any>>>;
    getDatabaseTables: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        name: string;
        rowCount: number;
        size: string;
    }[]>, Record<string, any>>>;
    getTableStructure: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
    getTableData: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
    executeDatabaseQuery: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        rows: Record<string, any>[];
        columns: string[];
        rowCount: number;
    }>, Record<string, any>>>;
    getStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
    getLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }[]>, Record<string, any>>>;
    getActiveUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        name: string;
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        lastLoginAt: Date;
    }[]>, Record<string, any>>>;
    getUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        users: {
            name: string;
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            lastLoginAt: Date;
            createdAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getEvents: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        events: {
            name: string;
            id: string;
            createdAt: Date;
            startDate: Date;
            endDate: Date;
            location: string;
            archived: boolean;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getContests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        contests: ({
            event: {
                name: string;
                id: string;
            };
        } & {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            description: string | null;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            contestantViewReleaseDate: Date | null;
            isLocked: boolean;
            lockedAt: Date | null;
            lockVerifiedBy: string | null;
            archived: boolean;
            nextContestantNumber: number | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getCategories: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        categories: ({
            contest: {
                event: {
                    name: string;
                    id: string;
                };
                name: string;
                id: string;
            };
        } & {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getScores: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        scores: ({
            category: {
                name: string;
                id: string;
            };
            contestant: {
                name: string;
                id: string;
            };
            judge: {
                name: string;
                id: string;
            };
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            comment: string | null;
            allowCommentEdit: boolean;
            isCertified: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            lockedBy: string | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    }>, Record<string, any>>>;
    getActivityLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }[]>, Record<string, any>>>;
    getAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }[]>, Record<string, any>>>;
    exportAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
    testConnection: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        database: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
    }>, Record<string, any>>>;
    forceLogoutAllUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
        usersAffected: number;
    }>, Record<string, any>>>;
    forceLogoutUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        success: boolean;
        message: string;
    }>, Record<string, any>>>;
    getContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        scores: ({
            category: {
                contest: {
                    event: {
                        name: string;
                        id: string;
                    };
                    name: string;
                    id: string;
                };
                name: string;
                id: string;
            };
            contestant: {
                name: string;
                id: string;
                contestantNumber: number;
            };
            judge: {
                name: string;
                id: string;
            };
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            comment: string | null;
            allowCommentEdit: boolean;
            isCertified: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            lockedBy: string | null;
        })[];
        stats: {
            totalScores: number;
            certifiedScores: number;
            averageScore: number;
            highestScore: number;
            lowestScore: number;
        };
    }>, Record<string, any>>>;
}
export declare const getDashboard: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
export declare const getSystemHealth: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    database: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
}>, Record<string, any>>>;
export declare const clearCache: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
}>, Record<string, any>>>;
export declare const getDatabaseTables: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    name: string;
    rowCount: number;
    size: string;
}[]>, Record<string, any>>>;
export declare const getTableStructure: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
export declare const getTableData: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
export declare const executeDatabaseQuery: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    rows: Record<string, any>[];
    columns: string[];
    rowCount: number;
}>, Record<string, any>>>;
export declare const getStats: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
export declare const getLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}[]>, Record<string, any>>>;
export declare const getActiveUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    name: string;
    id: string;
    email: string;
    role: import(".prisma/client").$Enums.UserRole;
    lastLoginAt: Date;
}[]>, Record<string, any>>>;
export declare const getUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    users: {
        name: string;
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getEvents: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    events: {
        name: string;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        location: string;
        archived: boolean;
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getContests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    contests: ({
        event: {
            name: string;
            id: string;
        };
    } & {
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        description: string | null;
        contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
        contestantViewRestricted: boolean;
        contestantViewReleaseDate: Date | null;
        isLocked: boolean;
        lockedAt: Date | null;
        lockVerifiedBy: string | null;
        archived: boolean;
        nextContestantNumber: number | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getCategories: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    categories: ({
        contest: {
            event: {
                name: string;
                id: string;
            };
            name: string;
            id: string;
        };
    } & {
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        contestId: string;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getScores: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    scores: ({
        category: {
            name: string;
            id: string;
        };
        contestant: {
            name: string;
            id: string;
        };
        judge: {
            name: string;
            id: string;
        };
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        comment: string | null;
        allowCommentEdit: boolean;
        isCertified: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        lockedBy: string | null;
    })[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}>, Record<string, any>>>;
export declare const getActivityLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}[]>, Record<string, any>>>;
export declare const getAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}[]>, Record<string, any>>>;
export declare const exportAuditLogs: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const testConnection: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    database: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
}>, Record<string, any>>>;
export declare const forceLogoutAllUsers: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
    usersAffected: number;
}>, Record<string, any>>>;
export declare const forceLogoutUser: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    success: boolean;
    message: string;
}>, Record<string, any>>>;
export declare const getContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    scores: ({
        category: {
            contest: {
                event: {
                    name: string;
                    id: string;
                };
                name: string;
                id: string;
            };
            name: string;
            id: string;
        };
        contestant: {
            name: string;
            id: string;
            contestantNumber: number;
        };
        judge: {
            name: string;
            id: string;
        };
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        comment: string | null;
        allowCommentEdit: boolean;
        isCertified: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        lockedBy: string | null;
    })[];
    stats: {
        totalScores: number;
        certifiedScores: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
    };
}>, Record<string, any>>>;
//# sourceMappingURL=adminController.d.ts.map