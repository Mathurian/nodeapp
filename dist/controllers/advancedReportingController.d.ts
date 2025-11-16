import { Request, Response, NextFunction } from 'express';
export declare class AdvancedReportingController {
    private advancedReportingService;
    private prisma;
    constructor();
    generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        scores: ({
            category: {
                name: string;
                contest: {
                    name: string;
                };
            };
            contestant: {
                name: string;
            };
            judge: {
                name: string;
            };
        } & {
            id: string;
            categoryId: string;
            createdAt: Date;
            score: number | null;
            judgeId: string;
            contestantId: string;
            updatedAt: Date;
            isLocked: boolean;
            lockedAt: Date | null;
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
    generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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
export declare const generateScoreReport: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    scores: ({
        category: {
            name: string;
            contest: {
                name: string;
            };
        };
        contestant: {
            name: string;
        };
        judge: {
            name: string;
        };
    } & {
        id: string;
        categoryId: string;
        createdAt: Date;
        score: number | null;
        judgeId: string;
        contestantId: string;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
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
export declare const generateSummaryReport: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
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