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
        results: any[];
        total: any;
    }>;
    getCategories(): Promise<any>;
    getContestantResults(filter: ContestantResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        score: number | null;
        categoryId: string;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        isLocked: boolean;
        lockedAt: Date | null;
        criterionId: string | null;
        allowCommentEdit: boolean;
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
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        score: number | null;
        categoryId: string;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        isLocked: boolean;
        lockedAt: Date | null;
        criterionId: string | null;
        allowCommentEdit: boolean;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[]>;
    getEventResults(filter: EventResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        score: number | null;
        categoryId: string;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        isLocked: boolean;
        lockedAt: Date | null;
        criterionId: string | null;
        allowCommentEdit: boolean;
        comment: string | null;
        isCertified: boolean;
        lockedBy: string | null;
    })[]>;
}
export {};
//# sourceMappingURL=ResultsService.d.ts.map