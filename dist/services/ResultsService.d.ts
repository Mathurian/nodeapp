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
        [x: string]: {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        }[] | ({
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
        } | {
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
        })[] | ({
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        })[] | {
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
        }[];
        [x: number]: never;
        [x: symbol]: never;
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
    })[]>;
    getCategoryResults(filter: CategoryResultsFilter): Promise<any[]>;
    getContestResults(filter: ContestResultsFilter): Promise<({
        [x: string]: {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        }[] | ({
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
        } | {
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
        })[] | ({
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        })[] | {
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
        }[];
        [x: number]: never;
        [x: symbol]: never;
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
    })[]>;
    getEventResults(filter: EventResultsFilter): Promise<({
        [x: string]: {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        }[] | ({
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
        } | {
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
        })[] | ({
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        } | {
            id: string;
            contestantId: string;
            tenantId: string;
            scoreId: string | null;
            judgeId: string;
            categoryId: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            reason: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        })[] | {
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
        }[];
        [x: number]: never;
        [x: symbol]: never;
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
    })[]>;
}
export {};
//# sourceMappingURL=ResultsService.d.ts.map