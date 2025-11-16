import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class EmceeService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalScripts: number;
        totalEvents: number;
        totalContests: number;
        totalCategories: number;
    }>;
    getScripts(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
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
    }[]>;
    getScript(scriptId: string): Promise<{
        event: never;
        contest: never;
        category: never;
        author: never;
    } & {
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
    getContestantBios(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
    }): Promise<any[]>;
    getJudgeBios(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
    }): Promise<{
        name: string;
        id: string;
        preferredName: string | null;
        email: string;
        password: string;
        role: import(".prisma/client").$Enums.UserRole;
        gender: string | null;
        pronouns: string | null;
        judgeId: string | null;
        contestantId: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        state: string | null;
        country: string | null;
        timezone: string | null;
        language: string | null;
        bio: string | null;
        imagePath: string | null;
        judgeBio: string | null;
        judgeSpecialties: string | null;
        judgeCertifications: string | null;
        contestantBio: string | null;
        contestantNumber: string | null;
        contestantAge: number | null;
        contestantSchool: string | null;
        notificationSettings: string | null;
        navigationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        smsPhone: string | null;
        smsEnabled: boolean;
        privacy: string | null;
        mfaEnabled: boolean;
        mfaSecret: string | null;
        mfaMethod: string | null;
        mfaEnrolledAt: Date | null;
        mfaBackupCodes: string | null;
        tenantId: string;
        isSuperAdmin: boolean;
        sessionVersion: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getEvents(): Promise<({
        contests: ({
            categories: {
                name: string;
                id: string;
                description: string;
                scoreCap: number;
            }[];
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
        })[];
    } & {
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
    })[]>;
    getEvent(eventId: string): Promise<{
        contests: ({
            categories: {
                name: string;
                id: string;
                description: string;
                scoreCap: number;
            }[];
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
        })[];
    } & {
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
    }>;
    getContests(eventId?: string): Promise<({
        event: {
            name: string;
            id: string;
            description: string;
            startDate: Date;
            endDate: Date;
        };
        categories: {
            name: string;
            id: string;
            description: string;
            scoreCap: number;
        }[];
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
    })[]>;
    getContest(contestId: string): Promise<{
        event: {
            name: string;
            id: string;
            description: string;
            startDate: Date;
            endDate: Date;
        };
        categories: {
            name: string;
            id: string;
            description: string;
            scoreCap: number;
        }[];
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
    }>;
    getEmceeHistory(page?: number, limit?: number): Promise<{
        scripts: {
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
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    uploadScript(data: {
        title: string;
        content?: string;
        filePath?: string | null;
        eventId?: string | null;
        contestId?: string | null;
        categoryId?: string | null;
        order?: number;
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
    updateScript(id: string, data: {
        title?: string;
        content?: string;
        eventId?: string | null;
        contestId?: string | null;
        categoryId?: string | null;
        order?: number;
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
    deleteScript(id: string): Promise<void>;
    getScriptFileInfo(scriptId: string): Promise<{
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
}
//# sourceMappingURL=EmceeService.d.ts.map