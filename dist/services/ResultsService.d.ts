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
            totalPossible: number;
            category: {
                contest: {
                    event: {
                        name: string;
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        startDate: Date;
                        endDate: Date;
                    };
                    name: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    eventId: string;
                    description: string;
                };
                name: string;
                id: string;
                description: string;
                contestId: string;
                scoreCap: number;
                totalsCertified: boolean;
            };
            contestant: {
                name: string;
                id: string;
                email: string;
                contestantNumber: number;
            };
            judge: {
                name: string;
                id: string;
                email: string;
            };
            criterion: {
                name: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                categoryId: string;
                maxScore: number;
            };
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
    getCategories(): Promise<({
        contest: {
            event: {
                name: string;
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                startDate: Date;
                endDate: Date;
                location: string | null;
                maxContestants: number | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
            };
        } & {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            description: string | null;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            contestantViewReleaseDate: Date | null;
            isLocked: boolean;
            lockedAt: Date | null;
            lockVerifiedBy: string | null;
            archived: boolean;
            nextContestantNumber: number | null;
        };
    } & {
        name: string;
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        contestId: string;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    })[]>;
    getContestantResults(filter: ContestantResultsFilter): Promise<({
        category: {
            contest: {
                event: {
                    name: string;
                    id: string;
                    tenantId: string;
                    createdAt: Date;
                    updatedAt: Date;
                    description: string | null;
                    startDate: Date;
                    endDate: Date;
                    location: string | null;
                    maxContestants: number | null;
                    contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                    contestantViewRestricted: boolean;
                    contestantViewReleaseDate: Date | null;
                    isLocked: boolean;
                    lockedAt: Date | null;
                    lockVerifiedBy: string | null;
                    archived: boolean;
                };
            } & {
                name: string;
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                eventId: string;
                description: string | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
                nextContestantNumber: number | null;
            };
        } & {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
        judge: {
            name: string;
            id: string;
            email: string | null;
            gender: string | null;
            pronouns: string | null;
            bio: string | null;
            imagePath: string | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            isHeadJudge: boolean;
        };
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        comment: string | null;
        allowCommentEdit: boolean;
        isCertified: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        lockedBy: string | null;
    })[]>;
    getCategoryResults(filter: CategoryResultsFilter): Promise<any[]>;
    getContestResults(filter: ContestResultsFilter): Promise<({
        category: {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
        contestant: {
            name: string;
            id: string;
            email: string | null;
            gender: string | null;
            pronouns: string | null;
            bio: string | null;
            imagePath: string | null;
            contestantNumber: number | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
        };
        judge: {
            name: string;
            id: string;
            email: string | null;
            gender: string | null;
            pronouns: string | null;
            bio: string | null;
            imagePath: string | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            isHeadJudge: boolean;
        };
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        comment: string | null;
        allowCommentEdit: boolean;
        isCertified: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        lockedBy: string | null;
    })[]>;
    getEventResults(filter: EventResultsFilter): Promise<({
        category: {
            contest: {
                name: string;
                id: string;
                tenantId: string;
                createdAt: Date;
                updatedAt: Date;
                eventId: string;
                description: string | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
                nextContestantNumber: number | null;
            };
        } & {
            name: string;
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
        contestant: {
            name: string;
            id: string;
            email: string | null;
            gender: string | null;
            pronouns: string | null;
            bio: string | null;
            imagePath: string | null;
            contestantNumber: number | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
        };
        judge: {
            name: string;
            id: string;
            email: string | null;
            gender: string | null;
            pronouns: string | null;
            bio: string | null;
            imagePath: string | null;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            isHeadJudge: boolean;
        };
    } & {
        score: number | null;
        id: string;
        judgeId: string;
        contestantId: string;
        createdAt: Date;
        updatedAt: Date;
        isLocked: boolean;
        lockedAt: Date | null;
        categoryId: string;
        criterionId: string | null;
        comment: string | null;
        allowCommentEdit: boolean;
        isCertified: boolean;
        certifiedAt: Date | null;
        certifiedBy: string | null;
        lockedBy: string | null;
    })[]>;
}
export {};
//# sourceMappingURL=ResultsService.d.ts.map