import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class TrackerService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getScoringProgressByContest(contestId: string): Promise<{
        contestId: any;
        contestName: any;
        eventName: any;
        categories: any[];
        overallCompletion: number;
    }>;
    getScoringProgressByCategory(categoryId: string): Promise<{
        categoryId: any;
        categoryName: any;
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