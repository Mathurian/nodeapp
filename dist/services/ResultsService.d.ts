import { PrismaClient, UserRole } from '@prisma/client';
import { BaseService } from './BaseService';
interface ResultsFilter {
    userRole: UserRole;
    userId: string;
    offset?: number;
    limit?: number;
}
interface ContestantResultsFilter {
    contestantId: string;
    userRole: UserRole;
    userId: string;
}
interface CategoryResultsFilter {
    categoryId: string;
    userRole: UserRole;
    userId: string;
}
interface ContestResultsFilter {
    contestId: string;
    userRole: UserRole;
    userId: string;
}
interface EventResultsFilter {
    eventId: string;
    userRole: UserRole;
    userId: string;
}
export declare class ResultsService extends BaseService {
    protected prisma: PrismaClient;
    constructor(prisma: PrismaClient);
    getAllResults(filter: ResultsFilter): Promise<{
        results: {
            certificationStatus: string;
            certifiedBy: string;
            certifiedAt: Date;
            totalEarned: number;
            totalPossible: any;
            category: never;
            contestant: never;
            judge: never;
            criterion: never;
            score: number;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            criterionId: string;
            comment: string;
            isCertified: boolean;
        }[];
        total: number;
    }>;
    getCategories(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        contestId: string;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    }[]>;
    getContestantResults(filter: ContestantResultsFilter): Promise<({
        category: never;
        judge: never;
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[]>;
    getCategoryResults(filter: CategoryResultsFilter): Promise<any[]>;
    getContestResults(filter: ContestResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[]>;
    getEventResults(filter: EventResultsFilter): Promise<({
        category: never;
        contestant: never;
        judge: never;
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        allowCommentEdit: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[]>;
}
export {};
//# sourceMappingURL=ResultsService.d.ts.map