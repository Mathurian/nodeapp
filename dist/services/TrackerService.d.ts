import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class TrackerService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getScoringProgressByContest(contestId: string): Promise<{
        contestId: string;
        contestName: string;
        eventName: string;
        categories: {
            categoryId: string;
            categoryName: string;
            totalContestants: number;
            totalJudges: number;
            totalScores: number;
            expectedScores: number;
            completionPercentage: number;
            judges: {
                judgeId: string;
                judgeName: string;
                completed: number;
                total: number;
                completionPercentage: number;
            }[];
        }[];
        overallCompletion: number;
    }>;
    getScoringProgressByCategory(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        contestName: string;
        eventName: string;
        totalContestants: number;
        totalJudges: number;
        totalScores: number;
        expectedScores: number;
        completionPercentage: number;
    }>;
}
//# sourceMappingURL=TrackerService.d.ts.map