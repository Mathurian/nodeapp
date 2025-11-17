import { Request, Response, NextFunction } from 'express';
export declare class AdvancedReportingController {
    private advancedReportingService;
    private prisma;
    constructor();
    generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        scores: ({
            category: {
                contest: {
                    name: string;
                };
                name: string;
            };
            contestant: {
                name: string;
            };
            judge: {
                name: string;
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
        total: number;
    }>, Record<string, any>>>;
    generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        event: string;
        contests: number;
        categories: number;
        totalScores: number;
    }>, Record<string, any>>>;
    generateEventReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateJudgePerformanceReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateSystemAnalyticsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    generateContestResultsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    scores: ({
        category: {
            contest: {
                name: string;
            };
            name: string;
        };
        contestant: {
            name: string;
        };
        judge: {
            name: string;
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
    total: number;
}>, Record<string, any>>>;
export declare const generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    event: string;
    contests: number;
    categories: number;
    totalScores: number;
}>, Record<string, any>>>;
export declare const generateEventReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateJudgePerformanceReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateSystemAnalyticsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const generateContestResultsReport: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=advancedReportingController.d.ts.map