import { Request, Response, NextFunction } from 'express';
export declare class TrackerController {
    private trackerService;
    private prisma;
    constructor();
    getScoringProgressByContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
    }>, Record<string, any>>>;
    getScoringProgressByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: string;
        categoryName: string;
        contestName: string;
        eventName: string;
        totalContestants: number;
        totalJudges: number;
        totalScores: number;
        expectedScores: number;
        completionPercentage: number;
    }>, Record<string, any>>>;
    getJudgeScoringProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getPendingCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getScoringProgressByContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
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
}>, Record<string, any>>>;
export declare const getScoringProgressByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    categoryName: string;
    contestName: string;
    eventName: string;
    totalContestants: number;
    totalJudges: number;
    totalScores: number;
    expectedScores: number;
    completionPercentage: number;
}>, Record<string, any>>>;
export declare const getJudgeScoringProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getPendingCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=trackerController.d.ts.map