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
        certifications: any;
    }>, Record<string, any>>>;
    certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        tenantId: string;
        certifiedAt: Date;
        contestId: string;
        role: string;
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
    certifications: any;
}>, Record<string, any>>>;
export declare const certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    tenantId: string;
    certifiedAt: Date;
    contestId: string;
    role: string;
    userId: string;
    comments: string | null;
}>, Record<string, any>>>;
//# sourceMappingURL=contestCertificationController.d.ts.map