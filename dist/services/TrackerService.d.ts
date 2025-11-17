import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class TrackerService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getScoringProgressByContest(contestId: string): Promise<{
        contestId: string;
        contestName: string;
        eventName: any;
        categories: any;
        overallCompletion: number;
    }>;
    getScoringProgressByCategory(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        contestName: any;
        eventName: any;
        totalContestants: any;
        totalJudges: any;
        totalScores: any;
        expectedScores: number;
        completionPercentage: number;
    }>;
}
//# sourceMappingURL=TrackerService.d.ts.map