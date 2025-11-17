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
        tenantId: string;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
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
        tenantId: string;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
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
        sessionVersion: number;
        isActive: boolean;
        lastLoginAt: Date | null;
        judgeBio: string | null;
        judgeSpecialties: string | null;
        judgeCertifications: string | null;
        contestantBio: string | null;
        contestantNumber: string | null;
        contestantAge: number | null;
        contestantSchool: string | null;
        bio: string | null;
        imagePath: string | null;
        phone: string | null;
        address: string | null;
        timezone: string | null;
        language: string | null;
        notificationSettings: string | null;
        smsPhone: string | null;
        smsEnabled: boolean;
        privacy: string | null;
        createdAt: Date;
        updatedAt: Date;
        navigationPreferences: import("@prisma/client/runtime/library").JsonValue | null;
        city: string | null;
        state: string | null;
        country: string | null;
        tenantId: string;
        isSuperAdmin: boolean;
        mfaBackupCodes: string | null;
        mfaEnabled: boolean;
        mfaEnrolledAt: Date | null;
        mfaMethod: string | null;
        mfaSecret: string | null;
    }[]>;
    getEvents(): Promise<({
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
    })[]>;
    getEvent(eventId: string): Promise<{
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
    }>;
    getContests(eventId?: string): Promise<({
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
    })[]>;
    getContest(contestId: string): Promise<{
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
    }>;
    getEmceeHistory(page?: number, limit?: number): Promise<{
        scripts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            eventId: string | null;
            categoryId: string | null;
            contestId: string | null;
            title: string;
            content: string;
            order: number | null;
            file_path: string | null;
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
        tenantId: string;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
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
        tenantId: string;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
    }>;
    deleteScript(id: string): Promise<void>;
    getScriptFileInfo(scriptId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        eventId: string | null;
        categoryId: string | null;
        contestId: string | null;
        title: string;
        content: string;
        order: number | null;
        file_path: string | null;
    }>;
}
//# sourceMappingURL=EmceeService.d.ts.map