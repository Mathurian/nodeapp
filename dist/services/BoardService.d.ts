import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class BoardService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        contests: number;
        categories: number;
        certified: number;
        pending: number;
    }>;
    getCertifications(): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        tenantId: string;
        updatedAt: Date;
        description: string | null;
        contestId: string;
        scoreCap: number | null;
        timeLimit: number | null;
        contestantMin: number | null;
        contestantMax: number | null;
        totalsCertified: boolean;
    }[]>;
    approveCertification(categoryId: string): Promise<{
        message: string;
        category: {
            contest: {
                event: {
                    name: string;
                    id: string;
                    createdAt: Date;
                    tenantId: string;
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
                createdAt: Date;
                tenantId: string;
                updatedAt: Date;
                description: string | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
                eventId: string;
                nextContestantNumber: number | null;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
    }>;
    rejectCertification(categoryId: string, reason?: string): Promise<{
        message: string;
        category: {
            contest: {
                event: {
                    name: string;
                    id: string;
                    createdAt: Date;
                    tenantId: string;
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
                createdAt: Date;
                tenantId: string;
                updatedAt: Date;
                description: string | null;
                contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
                contestantViewRestricted: boolean;
                contestantViewReleaseDate: Date | null;
                isLocked: boolean;
                lockedAt: Date | null;
                lockVerifiedBy: string | null;
                archived: boolean;
                eventId: string;
                nextContestantNumber: number | null;
            };
        } & {
            name: string;
            id: string;
            createdAt: Date;
            tenantId: string;
            updatedAt: Date;
            description: string | null;
            contestId: string;
            scoreCap: number | null;
            timeLimit: number | null;
            contestantMin: number | null;
            contestantMax: number | null;
            totalsCertified: boolean;
        };
    }>;
    getCertificationStatus(): Promise<{
        total: number;
        pending: number;
        certified: number;
        approved: number;
    }>;
    getEmceeScripts(): Promise<{
        id: string;
        categoryId: string | null;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        contestId: string | null;
        title: string;
        filePath: string | null;
        order: number | null;
        content: string;
    }[]>;
    createEmceeScript(data: {
        title: string;
        content: string;
        type?: string;
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        order?: number;
        notes?: string;
        userId: string;
    }): Promise<{
        id: string;
        categoryId: string | null;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        contestId: string | null;
        title: string;
        filePath: string | null;
        order: number | null;
        content: string;
    }>;
    updateEmceeScript(scriptId: string, data: {
        title?: string;
        content?: string;
        type?: string;
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        order?: number;
        notes?: string;
        isActive?: boolean;
    }): Promise<{
        id: string;
        categoryId: string | null;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        contestId: string | null;
        title: string;
        filePath: string | null;
        order: number | null;
        content: string;
    }>;
    deleteEmceeScript(scriptId: string): Promise<{
        message: string;
    }>;
    getScoreRemovalRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: {
            id: string;
            contestantId: string;
            categoryId: string;
            reason: string;
            status: import(".prisma/client").$Enums.RequestStatus;
            judgeId: string;
            requestedAt: Date;
            reviewedAt: Date | null;
            reviewedById: string | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    approveScoreRemoval(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        contestantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        judgeId: string;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    rejectScoreRemoval(requestId: string, userId: string, reason?: string): Promise<{
        id: string;
        contestantId: string;
        categoryId: string;
        reason: string;
        status: import(".prisma/client").$Enums.RequestStatus;
        judgeId: string;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
}
//# sourceMappingURL=BoardService.d.ts.map