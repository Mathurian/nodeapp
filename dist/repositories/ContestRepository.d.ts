import { Contest, PrismaClient } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
export type ContestWithRelations = any;
export declare class ContestRepository extends BaseRepository<Contest> {
    constructor(prisma: PrismaClient);
    protected getModelName(): string;
    findByEventId(eventId: string, includeArchivedEvents?: boolean): Promise<Contest[]>;
    findByEventIdWithArchived(eventId: string, includeArchivedContests?: boolean): Promise<Contest[]>;
    findActiveByEventId(eventId: string): Promise<Contest[]>;
    findArchivedContests(): Promise<Contest[]>;
    findContestWithDetails(contestId: string): Promise<ContestWithRelations | null>;
    findContestWithScores(contestId: string): Promise<any>;
    searchContests(query: string): Promise<Contest[]>;
    archiveContest(contestId: string): Promise<Contest>;
    unarchiveContest(contestId: string): Promise<Contest>;
    getContestStats(contestId: string): Promise<{
        totalCategories: number;
        totalContestants: number;
        totalJudges: number;
        totalScores: number;
    }>;
    getNextContestantNumber(contestId: string): Promise<number>;
    incrementContestantNumber(contestId: string): Promise<Contest>;
}
//# sourceMappingURL=ContestRepository.d.ts.map