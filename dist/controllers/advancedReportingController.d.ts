import { Request, Response, NextFunction } from 'express';
export declare class AdvancedReportingController {
    private advancedReportingService;
    private prisma;
    constructor();
    generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        scores: ({
            category: never;
            contestant: never;
            judge: never;
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            allowCommentEdit: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            comment: string | null;
            isCertified: boolean;
            lockedBy: string | null;
        })[];
        total: number;
    }>, Record<string, any>>>;
    generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        event: string;
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
    scores: ({
        category: never;
        contestant: never;
        judge: never;
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[];
    total: number;
}>, Record<string, any>>>;
export declare const generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    event: string;
    contests: any;
    categories: any;
    totalScores: any;
}>, Record<string, any>>>;
export declare const generateEventReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateJudgePerformanceReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateSystemAnalyticsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateContestResultsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=advancedReportingController.d.ts.map