import { Request, Response, NextFunction } from 'express';
export declare class CommentaryController {
    private commentaryService;
    constructor();
    createComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string;
        updatedAt: Date;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    }>, Record<string, any>>>;
    getCommentsForScore: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string;
        updatedAt: Date;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    })[]>, Record<string, any>>>;
    getCommentsByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
        score: never;
        judge: never;
        criterion: never;
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string;
        updatedAt: Date;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    })[]>, Record<string, any>>>;
    updateComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string;
        updatedAt: Date;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    }>, Record<string, any>>>;
    deleteComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const createComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
}>, Record<string, any>>>;
export declare const getCommentsForScore: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
})[]>, Record<string, any>>>;
export declare const getCommentsByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    score: never;
    judge: never;
    criterion: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
})[]>, Record<string, any>>>;
export declare const updateComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
}>, Record<string, any>>>;
export declare const deleteComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const createScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
}>, Record<string, any>>>;
export declare const getScoreComments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
})[]>, Record<string, any>>>;
export declare const updateScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    tenantId: string;
    createdAt: Date;
    contestantId: string;
    judgeId: string;
    criterionId: string;
    updatedAt: Date;
    comment: string;
    scoreId: string;
    isPrivate: boolean;
}>, Record<string, any>>>;
export declare const deleteScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=commentaryController.d.ts.map