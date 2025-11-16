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
            contest: {
                event: {
                    name: string;
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    startDate: Date;
                    endDate: Date;
                    location: string | null;
                    maxContestants: number | null;
                    contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                    contestantViewRestricted: boolean;
                    contestantViewReleaseDate: Date | null;
                    isLocked: boolean;
                    lockedAt: Date | null;
                    lockVerifiedBy: string | null;
                    archived: boolean;
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
            };
            scores: ({
                contestant: {
                    name: string;
                    id: string;
                    email: string | null;
                    gender: string | null;
                    pronouns: string | null;
                    bio: string | null;
                    imagePath: string | null;
                    contestantNumber: number | null;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                };
                judge: {
                    name: string;
                    id: string;
                    email: string | null;
                    gender: string | null;
                    pronouns: string | null;
                    bio: string | null;
                    imagePath: string | null;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    isHeadJudge: boolean;
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
            id: string;
            name: string;
            eventName: string;
        };
        contestants: unknown[];
        totalScores: number;
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
    getContestScoreReview(contestId: string): Promise<{
        contest: {
            id: string;
            name: string;
            event: {
                name: string;
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                startDate: Date;
                endDate: Date;
                location: string | null;
                maxContestants: number | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
            };
        };
        summary: {
            totalCategories: number;
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
        event: any;
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
                id: string;
                contestantNumber: number;
                user: {
                    name: string;
                    id: string;
                    email: string;
                };
            };
            judge: {
                id: string;
                name: string;
                user: {
                    name: string;
                    id: string;
                    email: string;
                };
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