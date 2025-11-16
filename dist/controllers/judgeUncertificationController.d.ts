import { Request, Response, NextFunction } from 'express';
export declare class JudgeUncertificationController {
    private judgeUncertificationService;
    private prisma;
    constructor();
    getUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<({
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    })[]>, Record<string, any>>>;
    createUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    }>, Record<string, any>>>;
    signUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        request: {
            category: never;
            judge: never;
        } & {
            status: import(".prisma/client").$Enums.RequestStatus;
            id: string;
            judgeId: string;
            tenantId: string | null;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            reason: string;
            approvedAt: Date | null;
            rejectionReason: string | null;
            requestedBy: string;
            requestedAt: Date;
            approvedBy: string | null;
            rejectedBy: string | null;
            rejectedAt: Date | null;
        };
        allSigned: boolean;
    }>, Record<string, any>>>;
    executeUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        message: string;
    }>, Record<string, any>>>;
    requestUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    approveUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    rejectUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getJudgeUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<({
    category: never;
    judge: never;
    requestedByUser: never;
} & {
    status: import(".prisma/client").$Enums.RequestStatus;
    id: string;
    judgeId: string;
    tenantId: string | null;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    reason: string;
    approvedAt: Date | null;
    rejectionReason: string | null;
    requestedBy: string;
    requestedAt: Date;
    approvedBy: string | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
})[]>, Record<string, any>>>;
export declare const createUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    category: never;
    judge: never;
} & {
    status: import(".prisma/client").$Enums.RequestStatus;
    id: string;
    judgeId: string;
    tenantId: string | null;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    reason: string;
    approvedAt: Date | null;
    rejectionReason: string | null;
    requestedBy: string;
    requestedAt: Date;
    approvedBy: string | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
}>, Record<string, any>>>;
export declare const signUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    request: {
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        tenantId: string | null;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        approvedAt: Date | null;
        rejectionReason: string | null;
        requestedBy: string;
        requestedAt: Date;
        approvedBy: string | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    };
    allSigned: boolean;
}>, Record<string, any>>>;
export declare const executeUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    message: string;
}>, Record<string, any>>>;
export declare const requestUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const approveUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const rejectUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getJudgeUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=judgeUncertificationController.d.ts.map