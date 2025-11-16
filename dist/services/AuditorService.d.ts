import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AuditorService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalCategories: number;
        pendingAudits: number;
        completedAudits: number;
    }>;
    getPendingAudits(page?: number, limit?: number): Promise<{
        categories: {
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
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getCompletedAudits(page?: number, limit?: number): Promise<{
        categories: {
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
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    finalCertification(categoryId: string, userId: string): Promise<{
        message: string;
        certification: {
            id: string;
            role: string;
            categoryId: string;
            certifiedAt: Date;
            comments: string | null;
            userId: string;
            signatureName: string | null;
        };
    }>;
    rejectAudit(categoryId: string, userId: string, reason: string): Promise<{
        message: string;
        activityLog: {
            id: string;
            createdAt: Date;
            userId: string | null;
            userAgent: string | null;
            userName: string | null;
            userRole: string | null;
            action: string;
            resourceType: string | null;
            resourceId: string | null;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            logLevel: import(".prisma/client").$Enums.LogLevel;
        };
    }>;
    getScoreVerification(categoryId: string, contestantId?: string): Promise<{
        categoryId: string;
        scores: unknown[];
        totalScores: number;
        uniqueContestants: number;
    }>;
    verifyScore(scoreId: string, userId: string, data: {
        verified: boolean;
        comments?: string;
        issues?: string;
    }): Promise<{
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
    }>;
    getTallyMasterStatus(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        totalScores: any;
        verifiedScores: any;
        pendingVerification: number;
        verificationProgress: string | number;
        tallyMasterCertified: any;
        auditorCertified: any;
        finalCertified: any;
    }>;
    getCertificationWorkflow(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        contestName: any;
        eventName: any;
        steps: {
            name: string;
            status: string;
            completedAt: any;
            details: string;
        }[];
        currentStep: number;
        overallStatus: string;
    }>;
    generateSummaryReport(categoryId: string, userId: string, includeDetails?: boolean): Promise<{
        category: {
            id: string;
            name: string;
            description: string;
            scoreCap: number;
        };
        contest: {
            id: any;
            name: any;
            eventName: any;
        };
        statistics: {
            totalScores: any;
            uniqueContestants: number;
            uniqueJudges: number;
            averageScore: number;
            maxScore: number;
            minScore: number;
            scoreRange: number;
        };
        rankings: any[];
        certification: {
            tallyMasterCertified: any;
            auditorCertified: any;
            finalCertified: any;
            certifications: any;
        };
        generatedAt: string;
        generatedBy: string;
    }>;
    getAuditHistory(categoryId?: string, page?: number, limit?: number): Promise<{
        auditLogs: ({
            user: {
                name: string;
                id: string;
                preferredName: string;
                email: string;
                role: import(".prisma/client").$Enums.UserRole;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            userAgent: string | null;
            userName: string | null;
            userRole: string | null;
            action: string;
            resourceType: string | null;
            resourceId: string | null;
            details: import("@prisma/client/runtime/library").JsonValue | null;
            ipAddress: string | null;
            logLevel: import(".prisma/client").$Enums.LogLevel;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=AuditorService.d.ts.map