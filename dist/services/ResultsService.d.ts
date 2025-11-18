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
            certifiedBy: never;
            certifiedAt: never;
            totalEarned: any;
            totalPossible: any;
        }[];
        total: number;
    }>;
    getCategories(): Promise<any>;
    getContestantResults(filter: ContestantResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        categoryId: string;
        certifiedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string | null;
        score: number | null;
        updatedAt: Date;
        allowCommentEdit: boolean;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    })[]>;
    getCategoryResults(filter: CategoryResultsFilter): Promise<any[]>;
    getContestResults(filter: ContestResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        categoryId: string;
        certifiedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string | null;
        score: number | null;
        updatedAt: Date;
        allowCommentEdit: boolean;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    })[]>;
    getEventResults(filter: EventResultsFilter): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        id: string;
        categoryId: string;
        certifiedAt: Date | null;
        tenantId: string;
        createdAt: Date;
        contestantId: string;
        judgeId: string;
        criterionId: string | null;
        score: number | null;
        updatedAt: Date;
        allowCommentEdit: boolean;
        certifiedBy: string | null;
        comment: string | null;
        isCertified: boolean;
        isLocked: boolean;
        lockedAt: Date | null;
        lockedBy: string | null;
    })[]>;
}
export {};
//# sourceMappingURL=ResultsService.d.ts.map