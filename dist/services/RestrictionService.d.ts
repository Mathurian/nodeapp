import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export interface SetContestantViewRestrictionDTO {
    eventId?: string;
    contestId?: string;
    restricted: boolean;
    releaseDate?: Date;
}
export interface LockEventContestDTO {
    eventId?: string;
    contestId?: string;
    locked: boolean;
    verifiedBy?: string;
}
export declare class RestrictionService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    setContestantViewRestriction(dto: SetContestantViewRestrictionDTO, userId: string, userRole: string): Promise<void>;
    canContestantView(eventId?: string, contestId?: string): Promise<boolean>;
    lockEventContest(dto: LockEventContestDTO, userId: string, userRole: string): Promise<void>;
    isLocked(eventId?: string, contestId?: string): Promise<boolean>;
}
//# sourceMappingURL=RestrictionService.d.ts.map