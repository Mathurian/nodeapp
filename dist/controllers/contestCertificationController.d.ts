import { Request, Response, NextFunction } from 'express';
export declare class ContestCertificationController {
    private contestCertificationService;
    constructor();
    getContestCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        contestId: string;
        tallyMaster: boolean;
        auditor: boolean;
        board: boolean;
        organizer: boolean;
        certifications: {
            id: string;
            userId: string;
            contestId: string;
            role: string;
            certifiedAt: Date;
            comments: string | null;
        }[];
    }>, Record<string, any>>>;
    certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        id: string;
        userId: string;
        contestId: string;
        role: string;
        certifiedAt: Date;
        comments: string | null;
    }>, Record<string, any>>>;
}
export declare const getContestCertificationProgress: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    contestId: string;
    tallyMaster: boolean;
    auditor: boolean;
    board: boolean;
    organizer: boolean;
    certifications: {
        id: string;
        userId: string;
        contestId: string;
        role: string;
        certifiedAt: Date;
        comments: string | null;
    }[];
}>, Record<string, any>>>;
export declare const certifyContest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    id: string;
    userId: string;
    contestId: string;
    role: string;
    certifiedAt: Date;
    comments: string | null;
}>, Record<string, any>>>;
//# sourceMappingURL=contestCertificationController.d.ts.map