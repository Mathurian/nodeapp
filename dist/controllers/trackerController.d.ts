import { Request, Response, NextFunction } from 'express';
export declare class TrackerController {
    private trackerService;
    private prisma;
    constructor();
    getScoringProgressByContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        contestId: any;
        contestName: any;
        eventName: any;
        categories: any[];
        overallCompletion: number;
    }>, Record<string, any>>>;
    getScoringProgressByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: any;
        categoryName: any;
        contestName: any;
        eventName: any;
        totalContestants: any;
        totalJudges: any;
        totalScores: any;
        expectedScores: number;
        completionPercentage: number;
    }>, Record<string, any>>>;
    getJudgeScoringProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getPendingCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getScoringProgressByContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    contestId: any;
    contestName: any;
    eventName: any;
    categories: any[];
    overallCompletion: number;
}>, Record<string, any>>>;
export declare const getScoringProgressByCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: any;
    categoryName: any;
    contestName: any;
    eventName: any;
    totalContestants: any;
    totalJudges: any;
    totalScores: any;
    expectedScores: number;
    completionPercentage: number;
}>, Record<string, any>>>;
export declare const getJudgeScoringProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getPendingCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=trackerController.d.ts.map