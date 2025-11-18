import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AuditorService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalCategories: any;
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
        certification: any;
    }>;
    rejectAudit(categoryId: string, userId: string, reason: string): Promise<{
        message: string;
        activityLog: any;
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
    }): Promise<any>;
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
            total: any;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=AuditorService.d.ts.map