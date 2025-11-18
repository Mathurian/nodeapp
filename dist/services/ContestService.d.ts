import { Contest } from '@prisma/client';
import { BaseService } from './BaseService';
import { ContestRepository } from '../repositories/ContestRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';
interface CreateContestDto {
    eventId: string;
    name: string;
    description?: string;
    contestantNumberingMode?: 'MANUAL' | 'AUTO';
}
interface UpdateContestDto extends Partial<CreateContestDto> {
}
export declare class ContestService extends BaseService {
    private contestRepo;
    private cacheService;
    private restrictionService;
    constructor(contestRepo: ContestRepository, cacheService: CacheService, restrictionService: RestrictionService);
    private getCacheKey;
    private invalidateContestCache;
    createContest(data: CreateContestDto): Promise<Contest>;
    getContestById(id: string): Promise<Contest>;
    getContestWithDetails(id: string): Promise<any>;
    getContestsByEventId(eventId: string, includeArchived?: boolean, forEventView?: boolean): Promise<Contest[]>;
    updateContest(id: string, data: UpdateContestDto): Promise<Contest>;
    archiveContest(id: string): Promise<Contest>;
    unarchiveContest(id: string): Promise<Contest>;
    deleteContest(id: string): Promise<void>;
    getContestStats(id: string): Promise<any>;
    searchContests(query: string): Promise<Contest[]>;
    getNextContestantNumber(contestId: string): Promise<number>;
    assignContestantNumber(contestId: string): Promise<number>;
}
export {};
//# sourceMappingURL=ContestService.d.ts.map