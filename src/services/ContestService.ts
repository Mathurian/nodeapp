/**
 * Contest Service
 * Business logic layer for Contest entity with caching support
 */

import { Contest } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError, NotFoundError } from './BaseService';
import { ContestRepository } from '../repositories/ContestRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';

interface CreateContestDto {
  eventId: string;
  name: string;
  description?: string;
  contestantNumberingMode?: 'MANUAL' | 'AUTO';
}

interface UpdateContestDto extends Partial<CreateContestDto> {}

@injectable()
export class ContestService extends BaseService {
  constructor(
    @inject('ContestRepository') private contestRepo: ContestRepository,
    @inject('CacheService') private cacheService: CacheService,
    @inject(RestrictionService) private restrictionService: RestrictionService
  ) {
    super();
  }

  /**
   * Get cache key for contest
   */
  private getCacheKey(id: string): string {
    return `contest:${id}`;
  }

  /**
   * Invalidate contest cache
   */
  private async invalidateContestCache(id?: string, eventId?: string): Promise<void> {
    if (id) {
      await this.cacheService.del(this.getCacheKey(id));
      await this.cacheService.del(`contest:details:${id}`);
    }
    if (eventId) {
      await this.cacheService.del(`contests:event:${eventId}`);
    }
    await this.cacheService.invalidatePattern('contests:*');
  }

  /**
   * Create a new contest
   */
  async createContest(data: CreateContestDto): Promise<Contest> {
    try {
      // Validate required fields
      this.validateRequired(data, ['eventId', 'name']);

      // Create contest
      const contest = await this.contestRepo.create(data);

      // Invalidate caches
      await this.invalidateContestCache(undefined, data.eventId);

      this.logInfo('Contest created', { contestId: contest.id, eventId: data.eventId });
      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'createContest', data });
    }
  }

  /**
   * Get contest by ID with caching
   */
  async getContestById(id: string): Promise<Contest> {
    try {
      const cacheKey = this.getCacheKey(id);
      const cached = await this.cacheService.get<Contest>(cacheKey);

      if (cached) {
        return cached;
      }

      const contest = await this.contestRepo.findById(id);

      if (!contest) {
        throw new NotFoundError('Contest', id);
      }

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, contest, 1800);

      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'getContestById', id });
    }
  }

  /**
   * Get contest with full details
   */
  async getContestWithDetails(id: string): Promise<any> {
    try {
      const cacheKey = `contest:details:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached;
      }

      const contest = await this.contestRepo.findContestWithDetails(id);

      if (!contest) {
        throw new NotFoundError('Contest', id);
      }

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, contest, 900);

      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'getContestWithDetails', id });
    }
  }

  /**
   * Get contests by event ID
   */
  async getContestsByEventId(eventId: string, includeArchived: boolean = false, forEventView: boolean = false): Promise<Contest[]> {
    try {
      const cacheKey = `contests:event:${eventId}:${includeArchived}:${forEventView}`;
      const cached = await this.cacheService.get<Contest[]>(cacheKey);

      if (cached) {
        return cached;
      }

      let contests: Contest[];
      
      if (forEventView) {
        // When viewing contests for a specific event, show archived contests if requested
        // This allows viewing archived contests even if the event itself is archived
        contests = await this.contestRepo.findByEventIdWithArchived(eventId, includeArchived);
      } else {
        // For dropdowns and general listing, always exclude contests from archived events
        contests = includeArchived
          ? await this.contestRepo.findByEventId(eventId, false) // Still exclude archived events
          : await this.contestRepo.findActiveByEventId(eventId);
      }

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, contests, 600);

      return contests;
    } catch (error) {
      return this.handleError(error, { operation: 'getContestsByEventId', eventId });
    }
  }

  /**
   * Update contest
   */
  async updateContest(id: string, data: UpdateContestDto): Promise<Contest> {
    try {
      // Check if contest is locked
      const isLocked = await this.restrictionService.isLocked(undefined, id);
      if (isLocked) {
        throw this.forbiddenError('Contest is locked and cannot be edited. Please unlock it first.');
      }

      // Verify contest exists
      const existing = await this.getContestById(id);

      // Update contest
      const contest = await this.contestRepo.update(id, data);

      // Invalidate caches
      await this.invalidateContestCache(id, existing.eventId);

      this.logInfo('Contest updated', { contestId: id });
      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'updateContest', id, data });
    }
  }

  /**
   * Archive contest
   */
  async archiveContest(id: string): Promise<Contest> {
    try {
      const existing = await this.getContestById(id);
      const contest = await this.contestRepo.archiveContest(id);

      // Invalidate caches
      await this.invalidateContestCache(id, existing.eventId);

      this.logInfo('Contest archived', { contestId: id });
      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'archiveContest', id });
    }
  }

  /**
   * Unarchive contest
   */
  async unarchiveContest(id: string): Promise<Contest> {
    try {
      const existing = await this.getContestById(id);
      const contest = await this.contestRepo.unarchiveContest(id);

      // Invalidate caches
      await this.invalidateContestCache(id, existing.eventId);

      this.logInfo('Contest unarchived', { contestId: id });
      return contest;
    } catch (error) {
      return this.handleError(error, { operation: 'unarchiveContest', id });
    }
  }

  /**
   * Delete contest
   */
  async deleteContest(id: string): Promise<void> {
    try {
      // Check if contest is locked
      const isLocked = await this.restrictionService.isLocked(undefined, id);
      if (isLocked) {
        throw this.forbiddenError('Contest is locked and cannot be deleted. Please unlock it first.');
      }

      const existing = await this.getContestById(id);
      await this.contestRepo.delete(id);

      // Invalidate caches
      await this.invalidateContestCache(id, existing.eventId);

      this.logInfo('Contest deleted', { contestId: id });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteContest', id });
    }
  }

  /**
   * Get contest statistics
   */
  async getContestStats(id: string): Promise<any> {
    try {
      const cacheKey = `contest:stats:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached;
      }

      const stats = await this.contestRepo.getContestStats(id);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, 300);

      return stats;
    } catch (error) {
      return this.handleError(error, { operation: 'getContestStats', id });
    }
  }

  /**
   * Search contests
   */
  async searchContests(query: string): Promise<Contest[]> {
    try {
      const cacheKey = `contests:search:${query}`;
      const cached = await this.cacheService.get<Contest[]>(cacheKey);

      if (cached) {
        return cached;
      }

      const contests = await this.contestRepo.searchContests(query);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, contests, 300);

      return contests;
    } catch (error) {
      return this.handleError(error, { operation: 'searchContests', query });
    }
  }

  /**
   * Get next contestant number for contest
   */
  async getNextContestantNumber(contestId: string): Promise<number> {
    try {
      return await this.contestRepo.getNextContestantNumber(contestId);
    } catch (error) {
      return this.handleError(error, { operation: 'getNextContestantNumber', contestId });
    }
  }

  /**
   * Assign contestant number (for AUTO mode)
   */
  async assignContestantNumber(contestId: string): Promise<number> {
    try {
      const contest = await this.getContestById(contestId);

      if (contest.contestantNumberingMode !== 'AUTO_INDEXED') {
        throw new ValidationError('Contest is not in AUTO_INDEXED numbering mode');
      }

      const currentNumber = await this.contestRepo.getNextContestantNumber(contestId);
      await this.contestRepo.incrementContestantNumber(contestId);

      // Invalidate cache
      await this.invalidateContestCache(contestId, contest.eventId);

      return currentNumber;
    } catch (error) {
      return this.handleError(error, { operation: 'assignContestantNumber', contestId });
    }
  }
}
