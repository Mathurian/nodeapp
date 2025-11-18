import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AuditorService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalCategories: number;
        pendingAudits: any;
        completedAudits: any;
    }>;
    getPendingAudits(page?: number, limit?: number): Promise<{
        categories: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>;
    getCompletedAudits(page?: number, limit?: number): Promise<{
        categories: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>;
    finalCertification(categoryId: string, userId: string): Promise<{
        message: string;
        certification: {
            id: string;
            role: string;
            tenantId: string;
            categoryId: string;
            certifiedAt: Date;
            userId: string;
            comments: string | null;
            signatureName: string | null;
        };
    }>;
    rejectAudit(categoryId: string, userId: string, reason: string): Promise<{
        message: string;
        activityLog: {
            id: string;
            createdAt: Date;
            action: string;
            userId: string | null;
            userName: string | null;
            userRole: string | null;
            resourceType: string | null;
            resourceId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            logLevel: import(".prisma/client").$Enums.LogLevel;
            details: import("@prisma/client/runtime/library").JsonValue | null;
        };
    }>;
    getScoreVerification(categoryId: string, contestantId?: string): Promise<{
        categoryId: string;
        scores: unknown[];
        totalScores: any;
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
        tenantId: string;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    }>;
    getTallyMasterStatus(categoryId: string): Promise<{
        categoryId: any;
        categoryName: any;
        totalScores: any;
        verifiedScores: any;
        pendingVerification: number;
        verificationProgress: string | number;
        tallyMasterCertified: any;
        auditorCertified: any;
        finalCertified: any;
    }>;
    getCertificationWorkflow(categoryId: string): Promise<{
        categoryId: any;
        categoryName: any;
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
            id: any;
            name: any;
            description: any;
            scoreCap: any;
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
        auditLogs: any;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=AuditorService.d.ts.map