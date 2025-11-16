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
    }[]>;
    approveCertification(categoryId: string): Promise<{
        message: string;
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
    }>;
    rejectCertification(categoryId: string, reason?: string): Promise<{
        message: string;
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
    }>;
    getCertificationStatus(): Promise<{
        total: number;
        pending: number;
        certified: number;
        approved: number;
    }>;
    getEmceeScripts(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        filePath: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        filePath: string | null;
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
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        filePath: string | null;
    }>;
    deleteEmceeScript(scriptId: string): Promise<{
        message: string;
    }>;
    getScoreRemovalRequests(status?: string, page?: number, limit?: number): Promise<{
        requests: {
            status: import(".prisma/client").$Enums.RequestStatus;
            id: string;
            judgeId: string;
            contestantId: string;
            categoryId: string;
            reason: string;
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
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        contestantId: string;
        categoryId: string;
        reason: string;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
    rejectScoreRemoval(requestId: string, userId: string, reason?: string): Promise<{
        status: import(".prisma/client").$Enums.RequestStatus;
        id: string;
        judgeId: string;
        contestantId: string;
        categoryId: string;
        reason: string;
        requestedAt: Date;
        reviewedAt: Date | null;
        reviewedById: string | null;
    }>;
}
//# sourceMappingURL=BoardService.d.ts.map