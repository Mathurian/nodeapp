import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class ArchiveService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllArchives(): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
    } & {
        name: string;
        id: string;
        tenantId: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        eventId: string;
        archivedAt: Date;
        archivedById: string;
    })[]>;
    getActiveEvents(): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
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
    getArchivedEvents(): Promise<({
        [x: string]: never;
        [x: number]: never;
        [x: symbol]: never;
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
    archiveItem(id: string, reason?: string, userId?: string): Promise<{
        name: string;
        id: string;
        tenantId: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        eventId: string;
        archivedAt: Date;
        archivedById: string;
    }>;
    restoreItem(id: string): Promise<{
        message: string;
    }>;
    deleteArchivedItem(id: string): Promise<{
        message: string;
    }>;
    archiveEvent(eventId: string, userId: string, reason?: string): Promise<{
        name: string;
        id: string;
        tenantId: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        eventId: string;
        archivedAt: Date;
        archivedById: string;
    }>;
    restoreEvent(eventId: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=ArchiveService.d.ts.map