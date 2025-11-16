import { Request, Response, NextFunction } from 'express';
export declare class JudgeContestantCertificationController {
    private judgeContestantCertificationService;
    private prisma;
    constructor();
    getCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        judgeId: string;
        contestantId: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
    }[]>, Record<string, any>>>;
    certify: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        judgeId: string;
        contestantId: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
    }>, Record<string, any>>>;
    uncertify: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
    certifyContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getCategoryCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getCertifications: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    judgeId: string;
    contestantId: string;
    categoryId: string;
    certifiedAt: Date;
    comments: string | null;
}[]>, Record<string, any>>>;
export declare const certify: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    judgeId: string;
    contestantId: string;
    categoryId: string;
    certifiedAt: Date;
    comments: string | null;
}>, Record<string, any>>>;
export declare const uncertify: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const certifyContestantScores: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getCategoryCertificationStatus: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const certifyCategory: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=judgeContestantCertificationController.d.ts.map