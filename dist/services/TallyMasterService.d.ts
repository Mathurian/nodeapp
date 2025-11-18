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
        categories: any;
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
            id: any;
            name: any;
            description: any;
            scoreCap: any;
            maxScore: any;
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
            id: any;
            name: any;
            description: any;
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
        categories: any;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getContestScoreReview(contestId: string): Promise<{
        contest: {
            id: any;
            name: any;
            event: any;
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
        contestId: any;
        contestName: any;
        event: any;
        categories: any[];
        totalCategories: number;
        averageScoringCompletion: number;
        averageCertificationCompletion: number;
    }>;
    getScoreRemovalRequests(page?: number, limit?: number, status?: string, categoryId?: string, contestId?: string): Promise<{
        requests: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
}
//# sourceMappingURL=TallyMasterService.d.ts.map