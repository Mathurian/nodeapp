import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class WinnerService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    generateSignature(userId: string, categoryId: string, userRole: string, ipAddress?: string, userAgent?: string): string;
    getWinnersByCategory(categoryId: string, _userRole: string): Promise<{
        category: any;
        contestants: {
            contestant: any;
            totalScore: number;
            totalPossibleScore: any;
            scores: any[];
            judgesScored: string[];
        }[];
        totalPossibleScore: any;
        allSigned: boolean;
        boardSigned: boolean;
        canShowWinners: boolean;
        signatures: {
            userId: string;
            role: string;
            certifiedAt: Date;
        }[];
        message: string;
    }>;
    getWinnersByContest(contestId: string, _userRole: string, includeCategoryBreakdown?: boolean): Promise<{
        contest: {
            event: never;
            categories: never;
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            eventId: string;
            description: string | null;
            archived: boolean;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            isLocked: boolean;
            contestantViewReleaseDate: Date | null;
            lockedAt: Date | null;
            lockVerifiedBy: string | null;
            nextContestantNumber: number | null;
        };
        categories: any[];
        contestants: {
            contestant: any;
            totalScore: number;
            totalPossibleScore: number;
            categoriesParticipated: number;
        }[];
        message: string;
    }>;
    signWinners(categoryId: string, userId: string, userRole: string, ipAddress?: string, userAgent?: string): Promise<{
        message: string;
        signature: string;
        categoryId: string;
    }>;
    getSignatureStatus(categoryId: string, userId: string): Promise<{
        categoryId: string;
        userId: string;
        signed: boolean;
        signature: any;
    }>;
    getCertificationProgress(categoryId: string): Promise<{
        categoryId: string;
        totalsCertified: boolean;
        certificationProgress: number;
        rolesCertified: string[];
        rolesRemaining: string[];
    }>;
    getRoleCertificationStatus(categoryId: string, role: string): Promise<{
        categoryId: string;
        role: string;
        certified: boolean;
        certifiedBy: any;
        certifiedAt: any;
    }>;
    certifyScores(categoryId: string, userId: string, userRole: string): Promise<{
        message: string;
        categoryId: string;
        certifiedBy: string;
        role: string;
    }>;
    getWinners(eventId?: string, contestId?: string): Promise<{
        contest: {
            event: never;
            categories: never;
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            eventId: string;
            description: string | null;
            archived: boolean;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            isLocked: boolean;
            contestantViewReleaseDate: Date | null;
            lockedAt: Date | null;
            lockVerifiedBy: string | null;
            nextContestantNumber: number | null;
        };
        categories: any[];
        contestants: {
            contestant: any;
            totalScore: number;
            totalPossibleScore: number;
            categoriesParticipated: number;
        }[];
        message: string;
    } | {
        event: {
            contests: never;
        } & {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            description: string | null;
            startDate: Date;
            endDate: Date;
            archived: boolean;
            location: string | null;
            maxContestants: number | null;
            contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
            contestantViewRestricted: boolean;
            isLocked: boolean;
            contestantViewReleaseDate: Date | null;
            lockedAt: Date | null;
            lockVerifiedBy: string | null;
        };
        contests: any[];
        message: string;
        winners?: undefined;
    } | {
        winners: any[];
        message: string;
        event?: undefined;
        contests?: undefined;
    }>;
}
//# sourceMappingURL=WinnerService.d.ts.map