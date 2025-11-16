import { Request, Response, NextFunction } from 'express';
export declare class CategoryCertificationController {
    private categoryCertificationService;
    private prisma;
    constructor();
    getCategoryCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: string;
        judgeProgress: {
            contestantsCertified: number;
            totalContestants: number;
            isCategoryCertified: boolean;
        };
        tallyMasterProgress: {
            isCategoryCertified: boolean;
        };
        auditorProgress: {
            isCategoryCertified: boolean;
        };
        boardProgress: {
            isCategoryCertified: boolean;
        };
    }>, Record<string, any>>>;
    certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
        userId: string;
        signatureName: string | null;
    }>, Record<string, any>>>;
    certifyContestant: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyJudgeScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getCategoryCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    judgeProgress: {
        contestantsCertified: number;
        totalContestants: number;
        isCategoryCertified: boolean;
    };
    tallyMasterProgress: {
        isCategoryCertified: boolean;
    };
    auditorProgress: {
        isCategoryCertified: boolean;
    };
    boardProgress: {
        isCategoryCertified: boolean;
    };
}>, Record<string, any>>>;
export declare const certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: string;
    categoryId: string;
    certifiedAt: Date;
    comments: string | null;
    userId: string;
    signatureName: string | null;
}>, Record<string, any>>>;
export declare const certifyContestant: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyJudgeScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=categoryCertificationController.d.ts.map