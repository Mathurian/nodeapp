import { Request, Response, NextFunction } from 'express';
export declare class ContestCertificationController {
    private contestCertificationService;
    constructor();
    getContestCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        contestId: string;
        tallyMaster: boolean;
        auditor: boolean;
        board: boolean;
        organizer: boolean;
        certifications: {
            id: string;
            role: string;
            tenantId: string;
            certifiedAt: Date;
            contestId: string;
            userId: string;
            comments: string | null;
        }[];
    }>, Record<string, any>>>;
    certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        role: string;
        tenantId: string;
        certifiedAt: Date;
        contestId: string;
        userId: string;
        comments: string | null;
    }>, Record<string, any>>>;
}
export declare const getContestCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    contestId: string;
    tallyMaster: boolean;
    auditor: boolean;
    board: boolean;
    organizer: boolean;
    certifications: {
        id: string;
        role: string;
        tenantId: string;
        certifiedAt: Date;
        contestId: string;
        userId: string;
        comments: string | null;
    }[];
}>, Record<string, any>>>;
export declare const certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    role: string;
    tenantId: string;
    certifiedAt: Date;
    contestId: string;
    userId: string;
    comments: string | null;
}>, Record<string, any>>>;
//# sourceMappingURL=contestCertificationController.d.ts.map