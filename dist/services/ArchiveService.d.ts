import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class ArchiveService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getAllArchives(): Promise<{
        name: string;
        id: string;
        description: string | null;
        startDate: Date | null;
        endDate: Date | null;
        eventId: string;
        archivedAt: Date;
        archivedById: string;
    }[]>;
    getActiveEvents(): Promise<{
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
    }[]>;
    getArchivedEvents(): Promise<{
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
    }[]>;
    archiveItem(id: string, reason?: string, userId?: string): Promise<{
        name: string;
        id: string;
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