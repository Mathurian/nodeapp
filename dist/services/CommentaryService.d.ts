import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
interface CreateCommentDto {
    scoreId: string;
    criterionId: string;
    contestantId: string;
    judgeId: string;
    comment: string;
    isPrivate?: boolean;
}
interface UpdateCommentDto {
    comment?: string;
    isPrivate?: boolean;
}
export declare class CommentaryService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateCommentDto): Promise<{
        judge: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        criterionId: string;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    }>;
    getCommentsForScore(scoreId: string, userRole: string): Promise<({
        judge: never;
        criterion: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        criterionId: string;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    })[]>;
    getCommentsByContestant(contestantId: string, userRole: string): Promise<({
        judge: never;
        criterion: never;
        score: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        criterionId: string;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    })[]>;
    update(id: string, data: UpdateCommentDto, userId: string, userRole: string): Promise<{
        judge: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        criterionId: string;
        comment: string;
        scoreId: string;
        isPrivate: boolean;
    }>;
    delete(id: string, userId: string, userRole: string): Promise<void>;
}
export {};
//# sourceMappingURL=CommentaryService.d.ts.map