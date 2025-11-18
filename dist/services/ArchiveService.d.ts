import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class ArchiveService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllArchives(): Promise<any>;
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
        isLocked: boolean;
        lockedAt: Date | null;
        contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
        archived: boolean;
        contestantViewRestricted: boolean;
        contestantViewReleaseDate: Date | null;
        lockVerifiedBy: string | null;
        startDate: Date;
        endDate: Date;
        location: string | null;
        maxContestants: number | null;
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
        isLocked: boolean;
        lockedAt: Date | null;
        contestantNumberingMode: import(".prisma/client").$Enums.ContestantNumberingMode;
        archived: boolean;
        contestantViewRestricted: boolean;
        contestantViewReleaseDate: Date | null;
        lockVerifiedBy: string | null;
        startDate: Date;
        endDate: Date;
        location: string | null;
        maxContestants: number | null;
    })[]>;
    archiveItem(id: string, reason?: string, userId?: string): Promise<any>;
    restoreItem(id: string): Promise<{
        message: string;
    }>;
    deleteArchivedItem(id: string): Promise<{
        message: string;
    }>;
    archiveEvent(eventId: string, userId: string, reason?: string): Promise<any>;
    restoreEvent(eventId: string): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=ArchiveService.d.ts.map