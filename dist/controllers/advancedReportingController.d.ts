import { Request, Response, NextFunction } from 'express';
export declare class AdvancedReportingController {
    private advancedReportingService;
    private prisma;
    constructor();
    generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        scores: any;
        total: any;
    }>, Record<string, any>>>;
    generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        event: any;
        contests: any;
        categories: any;
        totalScores: any;
    }>, Record<string, any>>>;
    generateEventReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateJudgePerformanceReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateSystemAnalyticsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateContestResultsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    scores: any;
    total: any;
}>, Record<string, any>>>;
export declare const generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    event: any;
    contests: any;
    categories: any;
    totalScores: any;
}>, Record<string, any>>>;
export declare const generateEventReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateJudgePerformanceReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateSystemAnalyticsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateContestResultsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=advancedReportingController.d.ts.map