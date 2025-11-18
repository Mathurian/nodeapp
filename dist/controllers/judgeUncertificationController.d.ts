import { Request, Response, NextFunction } from 'express';
export declare class JudgeUncertificationController {
    private judgeUncertificationService;
    private prisma;
    constructor();
    getUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        id: string;
        categoryId: string;
        tenantId: string;
        createdAt: Date;
        reason: string;
        judgeId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        rejectionReason: string | null;
        requestedBy: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    })[]>, Record<string, any>>>;
    createUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        categoryId: string;
        tenantId: string;
        createdAt: Date;
        reason: string;
        judgeId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        rejectionReason: string | null;
        requestedBy: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    }>, Record<string, any>>>;
    signUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        request: {
            category: never;
            judge: never;
        } & {
            id: string;
            categoryId: string;
            tenantId: string;
            createdAt: Date;
            reason: string;
            judgeId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.RequestStatus;
            requestedAt: Date;
            rejectionReason: string | null;
            requestedBy: string;
            approvedBy: string | null;
            approvedAt: Date | null;
            rejectedBy: string | null;
            rejectedAt: Date | null;
        };
        allSigned: boolean;
    }>, Record<string, any>>>;
    executeUncertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        message: string;
    }>, Record<string, any>>>;
    requestUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    approveUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    rejectUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
    getJudgeUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
}
export declare const getUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    category: never;
    judge: never;
    requestedByUser: never;
} & {
    id: string;
    categoryId: string;
    tenantId: string;
    createdAt: Date;
    reason: string;
    judgeId: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.RequestStatus;
    requestedAt: Date;
    rejectionReason: string | null;
    requestedBy: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
})[]>, Record<string, any>>>;
export declare const createUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    categoryId: string;
    tenantId: string;
    createdAt: Date;
    reason: string;
    judgeId: string;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.RequestStatus;
    requestedAt: Date;
    rejectionReason: string | null;
    requestedBy: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    rejectedBy: string | null;
    rejectedAt: Date | null;
}>, Record<string, any>>>;
export declare const signUncertificationRequest: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    request: {
        category: never;
        judge: never;
    } & {
        id: string;
        categoryId: string;
        tenantId: string;
        createdAt: Date;
        reason: string;
        judgeId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.RequestStatus;
        requestedAt: Date;
        rejectionReason: string | null;
        requestedBy: string;
        approvedBy: string | null;
        approvedAt: Date | null;
        rejectedBy: string | null;
        rejectedAt: Date | null;
    };
    allSigned: boolean;
}>, Record<string, any>>>;
export declare const executeUncertification: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    message: string;
}>, Record<string, any>>>;
export declare const requestUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const approveUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const rejectUncertification: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const getJudgeUncertificationRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
//# sourceMappingURL=judgeUncertificationController.d.ts.map