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
        contestantId: string;
        comment: string;
        isPrivate: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        scoreId: string;
        criterionId: string;
        judgeId: string;
    }>, Record<string, any>>>;
    getCommentsForScore: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        contestantId: string;
        comment: string;
        isPrivate: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        scoreId: string;
        criterionId: string;
        judgeId: string;
    })[]>, Record<string, any>>>;
    getCommentsByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
        score: {
            category: {
                contest: {
                    [x: string]: ({
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        name: string;
                        contestId: string;
                        description: string | null;
                        scoreCap: number | null;
                        timeLimit: number | null;
                        contestantMin: number | null;
                        contestantMax: number | null;
                        totalsCertified: boolean;
                    } | {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        name: string;
                        contestId: string;
                        description: string | null;
                        scoreCap: number | null;
                        timeLimit: number | null;
                        contestantMin: number | null;
                        contestantMax: number | null;
                        totalsCertified: boolean;
                    })[] | ({
                        id: string;
                        tenantId: string;
                        judgeId: string;
                        categoryId: string | null;
                        contestId: string;
                        eventId: string;
                        status: import(".prisma/client").$Enums.AssignmentStatus;
                        assignedAt: Date;
                        assignedBy: string;
                        notes: string | null;
                        priority: number;
                    } | {
                        id: string;
                        tenantId: string;
                        judgeId: string;
                        categoryId: string | null;
                        contestId: string;
                        eventId: string;
                        status: import(".prisma/client").$Enums.AssignmentStatus;
                        assignedAt: Date;
                        assignedBy: string;
                        notes: string | null;
                        priority: number;
                    })[] | ({
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        categoryId: string | null;
                        contestId: string | null;
                        eventId: string | null;
                        title: string;
                        content: string;
                        order: number | null;
                        file_path: string | null;
                    } | {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        categoryId: string | null;
                        contestId: string | null;
                        eventId: string | null;
                        title: string;
                        content: string;
                        order: number | null;
                        file_path: string | null;
                    })[] | ({
                        contestantId: string;
                        tenantId: string;
                        contestId: string;
                    } | {
                        contestantId: string;
                        tenantId: string;
                        contestId: string;
                    })[] | ({
                        tenantId: string;
                        judgeId: string;
                        contestId: string;
                    } | {
                        tenantId: string;
                        judgeId: string;
                        contestId: string;
                    })[] | {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        name: string;
                        contestId: string;
                        description: string | null;
                        scoreCap: number | null;
                        timeLimit: number | null;
                        contestantMin: number | null;
                        contestantMax: number | null;
                        totalsCertified: boolean;
                    }[] | {
                        id: string;
                        tenantId: string;
                        judgeId: string;
                        categoryId: string | null;
                        contestId: string;
                        eventId: string;
                        status: import(".prisma/client").$Enums.AssignmentStatus;
                        assignedAt: Date;
                        assignedBy: string;
                        notes: string | null;
                        priority: number;
                    }[] | {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        tenantId: string;
                        categoryId: string | null;
                        contestId: string | null;
                        eventId: string | null;
                        title: string;
                        content: string;
                        order: number | null;
                        file_path: string | null;
                    }[] | {
                        contestantId: string;
                        tenantId: string;
                        contestId: string;
                    }[] | {
                        tenantId: string;
                        judgeId: string;
                        contestId: string;
                    }[];
                    [x: number]: never;
                    [x: symbol]: never;
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    name: string;
                    isLocked: boolean;
                    lockedAt: Date | null;
                    description: string | null;
                    eventId: string;
                    contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                    nextContestantNumber: number | null;
                    archived: boolean;
                    contestantViewRestricted: boolean;
                    contestantViewReleaseDate: Date | null;
                    lockVerifiedBy: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                contestId: string;
                description: string | null;
                scoreCap: number | null;
                timeLimit: number | null;
                contestantMin: number | null;
                contestantMax: number | null;
                totalsCertified: boolean;
            };
        } & {
            id: string;
            contestantId: string;
            comment: string | null;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            score: number | null;
            criterionId: string | null;
            judgeId: string;
            categoryId: string;
            allowCommentEdit: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            isCertified: boolean;
            isLocked: boolean;
            lockedAt: Date | null;
            lockedBy: string | null;
        };
        criterion: {
            name: string;
            maxScore: number;
        };
        judge: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        contestantId: string;
        comment: string;
        isPrivate: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        scoreId: string;
        criterionId: string;
        judgeId: string;
    })[]>, Record<string, any>>>;
    updateComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        contestantId: string;
        comment: string;
        isPrivate: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        scoreId: string;
        criterionId: string;
        judgeId: string;
    }>, Record<string, any>>>;
    deleteComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
}
export declare const createComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
}>, Record<string, any>>>;
export declare const getCommentsForScore: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
})[]>, Record<string, any>>>;
export declare const getCommentsByContestant: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    score: {
        category: {
            contest: {
                [x: string]: ({
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    name: string;
                    contestId: string;
                    description: string | null;
                    scoreCap: number | null;
                    timeLimit: number | null;
                    contestantMin: number | null;
                    contestantMax: number | null;
                    totalsCertified: boolean;
                } | {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    name: string;
                    contestId: string;
                    description: string | null;
                    scoreCap: number | null;
                    timeLimit: number | null;
                    contestantMin: number | null;
                    contestantMax: number | null;
                    totalsCertified: boolean;
                })[] | ({
                    id: string;
                    tenantId: string;
                    judgeId: string;
                    categoryId: string | null;
                    contestId: string;
                    eventId: string;
                    status: import(".prisma/client").$Enums.AssignmentStatus;
                    assignedAt: Date;
                    assignedBy: string;
                    notes: string | null;
                    priority: number;
                } | {
                    id: string;
                    tenantId: string;
                    judgeId: string;
                    categoryId: string | null;
                    contestId: string;
                    eventId: string;
                    status: import(".prisma/client").$Enums.AssignmentStatus;
                    assignedAt: Date;
                    assignedBy: string;
                    notes: string | null;
                    priority: number;
                })[] | ({
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    categoryId: string | null;
                    contestId: string | null;
                    eventId: string | null;
                    title: string;
                    content: string;
                    order: number | null;
                    file_path: string | null;
                } | {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    categoryId: string | null;
                    contestId: string | null;
                    eventId: string | null;
                    title: string;
                    content: string;
                    order: number | null;
                    file_path: string | null;
                })[] | ({
                    contestantId: string;
                    tenantId: string;
                    contestId: string;
                } | {
                    contestantId: string;
                    tenantId: string;
                    contestId: string;
                })[] | ({
                    tenantId: string;
                    judgeId: string;
                    contestId: string;
                } | {
                    tenantId: string;
                    judgeId: string;
                    contestId: string;
                })[] | {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    name: string;
                    contestId: string;
                    description: string | null;
                    scoreCap: number | null;
                    timeLimit: number | null;
                    contestantMin: number | null;
                    contestantMax: number | null;
                    totalsCertified: boolean;
                }[] | {
                    id: string;
                    tenantId: string;
                    judgeId: string;
                    categoryId: string | null;
                    contestId: string;
                    eventId: string;
                    status: import(".prisma/client").$Enums.AssignmentStatus;
                    assignedAt: Date;
                    assignedBy: string;
                    notes: string | null;
                    priority: number;
                }[] | {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    tenantId: string;
                    categoryId: string | null;
                    contestId: string | null;
                    eventId: string | null;
                    title: string;
                    content: string;
                    order: number | null;
                    file_path: string | null;
                }[] | {
                    contestantId: string;
                    tenantId: string;
                    contestId: string;
                }[] | {
                    tenantId: string;
                    judgeId: string;
                    contestId: string;
                }[];
                [x: number]: never;
                [x: symbol]: never;
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                tenantId: string;
                name: string;
                isLocked: boolean;
                lockedAt: Date | null;
                description: string | null;
                eventId: string;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                nextContestantNumber: number | null;
                archived: boolean;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                lockVerifiedBy: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            name: string;
            contestId: string;
            description: string | null;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
    } & {
        id: string;
        contestantId: string;
        comment: string | null;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        score: number | null;
        criterionId: string | null;
        judgeId: string;
        categoryId: string;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    };
    criterion: {
        name: string;
        maxScore: number;
    };
    judge: {
        name: string;
        email: string;
    };
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
})[]>, Record<string, any>>>;
export declare const updateComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
}>, Record<string, any>>>;
export declare const deleteComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
export declare const createScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
}>, Record<string, any>>>;
export declare const getScoreComments: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<({
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
})[]>, Record<string, any>>>;
export declare const updateScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<{
    [x: string]: never;
    [x: number]: never;
    [x: symbol]: never;
} & {
    id: string;
    contestantId: string;
    comment: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    scoreId: string;
    criterionId: string;
    judgeId: string;
}>, Record<string, any>>>;
export declare const deleteScoreComment: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<import("../types/api/responses.types").SuccessResponse<any>, Record<string, any>>>;
//# sourceMappingURL=commentaryController.d.ts.map