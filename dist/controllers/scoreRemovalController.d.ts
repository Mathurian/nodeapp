import { Request, Response, NextFunction } from 'express';
export declare class ScoreRemovalController {
    private scoreRemovalService;
    constructor();
    createScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    }>, Record<string, any>>>;
    getScoreRemovalRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<({
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    })[]>, Record<string, any>>>;
    getScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        category: never;
        judge: never;
        requestedByUser: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    }>, Record<string, any>>>;
    signScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        request: {
            category: never;
            judge: never;
        } & {
            status: import(".prisma/client").$Enums.RequestStatus;
            id: string;
            judgeId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            reason: string;
            requestedBy: string;
            requestedAt: Date;
            tallySignature: string | null;
            tallySignedAt: Date | null;
            tallySignedBy: string | null;
            auditorSignature: string | null;
            auditorSignedAt: Date | null;
            auditorSignedBy: string | null;
            boardSignature: string | null;
            boardSignedAt: Date | null;
            boardSignedBy: string | null;
        };
        allSigned: boolean;
    }>, Record<string, any>>>;
    executeScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
        deletedCount: number;
    }>, Record<string, any>>>;
}
export declare const createScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    category: never;
    judge: never;
} & {
    status: import(".prisma/client").$Enums.RequestStatus;
    id: string;
    judgeId: string;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    reason: string;
    requestedBy: string;
    requestedAt: Date;
    tallySignature: string | null;
    tallySignedAt: Date | null;
    tallySignedBy: string | null;
    auditorSignature: string | null;
    auditorSignedAt: Date | null;
    auditorSignedBy: string | null;
    boardSignature: string | null;
    boardSignedAt: Date | null;
    boardSignedBy: string | null;
}>, Record<string, any>>>;
export declare const getScoreRemovalRequests: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<({
    category: never;
    judge: never;
    requestedByUser: never;
} & {
    status: import(".prisma/client").$Enums.RequestStatus;
    id: string;
    judgeId: string;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    reason: string;
    requestedBy: string;
    requestedAt: Date;
    tallySignature: string | null;
    tallySignedAt: Date | null;
    tallySignedBy: string | null;
    auditorSignature: string | null;
    auditorSignedAt: Date | null;
    auditorSignedBy: string | null;
    boardSignature: string | null;
    boardSignedAt: Date | null;
    boardSignedBy: string | null;
})[]>, Record<string, any>>>;
export declare const getScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    category: never;
    judge: never;
    requestedByUser: never;
} & {
    status: import(".prisma/client").$Enums.RequestStatus;
    id: string;
    judgeId: string;
    createdAt: Date;
    updatedAt: Date;
    categoryId: string;
    reason: string;
    requestedBy: string;
    requestedAt: Date;
    tallySignature: string | null;
    tallySignedAt: Date | null;
    tallySignedBy: string | null;
    auditorSignature: string | null;
    auditorSignedAt: Date | null;
    auditorSignedBy: string | null;
    boardSignature: string | null;
    boardSignedAt: Date | null;
    boardSignedBy: string | null;
}>, Record<string, any>>>;
export declare const signScoreRemovalRequest: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    request: {
        category: never;
        judge: never;
    } & {
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        createdAt: Date;
        updatedAt: Date;
        categoryId: string;
        reason: string;
        requestedBy: string;
        requestedAt: Date;
        tallySignature: string | null;
        tallySignedAt: Date | null;
        tallySignedBy: string | null;
        auditorSignature: string | null;
        auditorSignedAt: Date | null;
        auditorSignedBy: string | null;
        boardSignature: string | null;
        boardSignedAt: Date | null;
        boardSignedBy: string | null;
    };
    allSigned: boolean;
}>, Record<string, any>>>;
export declare const executeScoreRemoval: (req: Request, res: Response, next: NextFunction) => Promise<Response<import("../types/api/responses.types").SuccessResponse<{
    deletedCount: number;
}>, Record<string, any>>>;
//# sourceMappingURL=scoreRemovalController.d.ts.map