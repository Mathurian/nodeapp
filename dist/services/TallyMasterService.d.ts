import { BaseService } from './BaseService';
import { PrismaClient, UserRole } from '@prisma/client';
export declare class TallyMasterService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalCategories: number;
        pendingTotals: number;
        certifiedTotals: number;
    }>;
    getCertifications(page?: number, limit?: number): Promise<{
        categories: ({
            contest: never;
            scores: never;
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
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
            pages: number;
        };
    }>;
    getCertificationQueue(page?: number, limit?: number): Promise<{
        categories: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getPendingCertifications(page?: number, limit?: number): Promise<{
        categories: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    certifyTotals(categoryId: string, userId: string, userRole: UserRole): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        contestId: string;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    }>;
    getScoreReview(categoryId: string): Promise<{
        category: {
            id: string;
            name: string;
            description: string;
            scoreCap: number;
            maxScore: number;
        };
        contest: {
            id: any;
            name: any;
            eventName: any;
        };
        contestants: unknown[];
        totalScores: any;
        uniqueContestants: number;
    }>;
    getBiasCheckingTools(categoryId: string): Promise<{
        category: {
            id: string;
            name: string;
            description: string;
            maxScore: any;
        };
        overallAverage: number;
        totalScores: any;
        uniqueJudges: number;
        biasAnalysis: {
            judge: any;
            averageScore: number;
            scoreCount: any;
            deviation: number;
            deviationPercentage: number;
            potentialBias: boolean;
        }[];
        recommendations: string[];
    }>;
    getTallyMasterHistory(page?: number, limit?: number): Promise<{
        categories: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
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
    getContestScoreReview(contestId: string): Promise<{
        contest: {
            id: string;
            name: string;
            event: never;
        };
        summary: {
            totalCategories: any;
            uniqueJudges: number;
            uniqueContestants: number;
            totalScores: any;
        };
        judgeBreakdown: unknown[];
        contestantBreakdown: unknown[];
    }>;
    getCategoryJudges(categoryId: string): Promise<any[]>;
    getContestCertifications(contestId: string): Promise<{
        contestId: string;
        contestName: string;
        event: never;
        categories: any;
        totalCategories: any;
        averageScoringCompletion: number;
        averageCertificationCompletion: number;
    }>;
    getScoreRemovalRequests(page?: number, limit?: number, status?: string, categoryId?: string, contestId?: string): Promise<{
        requests: {
            id: any;
            categoryId: any;
            contestantId: any;
            judgeId: any;
            reason: any;
            status: any;
            requestedAt: any;
            reviewedAt: any;
            reviewedById: any;
            category: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                description: string | null;
                contestId: string;
                scoreCap: number | null;
                timeLimit: number | null;
                contestantMin: number | null;
                contestantMax: number | null;
                totalsCertified: boolean;
            };
            contestant: {
                id: string;
                contestantNumber: number;
                user: any;
            };
            judge: {
                id: string;
                name: string;
                user: any;
            };
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=TallyMasterService.d.ts.map