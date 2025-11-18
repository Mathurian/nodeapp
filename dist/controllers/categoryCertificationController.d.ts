import { Request, Response, NextFunction } from 'express';
export declare class CategoryCertificationController {
    private categoryCertificationService;
    private prisma;
    constructor();
    getCategoryCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        categoryId: string;
        judgeProgress: {
            contestantsCertified: number;
            totalContestants: any;
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
    certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        categoryId: string;
        role: string;
        userId: string;
        signatureName: string | null;
        certifiedAt: Date;
        comments: string | null;
        tenantId: string;
    }>, Record<string, any>>>;
    certifyContestant: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyJudgeScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getCategoryCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    categoryId: string;
    judgeProgress: {
        contestantsCertified: number;
        totalContestants: any;
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
export declare const certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    categoryId: string;
    role: string;
    userId: string;
    signatureName: string | null;
    certifiedAt: Date;
    comments: string | null;
    tenantId: string;
}>, Record<string, any>>>;
export declare const certifyContestant: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyJudgeScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=categoryCertificationController.d.ts.map