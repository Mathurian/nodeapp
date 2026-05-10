/**
 * Contest Service
 * Business logic layer for Contest entity with caching support
 */

import { CommentaryMode, CommentaryScope, Contest, Prisma } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService, ValidationError } from './BaseService';
import { ContestRepository } from '../repositories/ContestRepository';
import { CategoryRepository } from '../repositories/CategoryRepository';
import { CacheService } from './CacheService';
import { RestrictionService } from './RestrictionService';
import { MetricsService } from './MetricsService';

// Proper type definitions for contest responses
type ContestWithDetails = Prisma.ContestGetPayload<{
  include: {
    event: true;
    categories: {
      include: {
        criteria: true;
        contestants: true;
      };
    };
  };
}>;

interface ContestStats {
  totalCategories: number;
  totalContestants: number;
  totalScores: number;
  averageScoresPerCategory: number;
  completionPercentage: number;
}

interface CreateContestDto {
  tenantId?: string;
  eventId: string;
  name: string;
  description?: string;
  commentaryMode?: CommentaryMode;
  commentaryScope?: CommentaryScope;
  contestantNumberingMode?: 'MANUAL' | 'AUTO_INDEXED' | 'OPTIONAL';
}

interface UpdateContestDto extends Partial<CreateContestDto> {}

interface ContestFilters {
  eventId?: string;
  archived?: boolean;
  search?: string;
  tenantId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

@injectable()
export class ContestService extends BaseService {
  private compareContests(left: Contest, right: Contest): number {
    const byName = String(left.name || '').localeCompare(String(right.name || ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
    if (byName !== 0) return byName;

    return String(left.id || '').localeCompare(String(right.id || ''), undefined, {
      sensitivity: 'base',
      numeric: true,
    });
  }

  private sortContests(contests: Contest[], filters?: ContestFilters): Contest[] {
    if (filters?.sortBy) {
      const sortField = filters.sortBy as keyof Contest;
      const sortDir = filters.sortDirection || 'desc';
      return [...contests].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (aVal === null || aVal === undefined) return sortDir === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDir === 'asc' ? -1 : 1;

        let primary = 0;

        if (aVal instanceof Date && bVal instanceof Date) {
          primary = sortDir === 'asc' ? aVal.getTime() - bVal.getTime() : bVal.getTime() - aVal.getTime();
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          primary = sortDir === 'asc'
            ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base', numeric: true })
            : bVal.localeCompare(aVal, undefined, { sensitivity: 'base', numeric: true });
        } else {
          primary = sortDir === 'asc' ? (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) : (bVal < aVal ? -1 : bVal > aVal ? 1 : 0);
        }

        if (primary !== 0) return primary;
        return this.compareContests(a, b);
      });
    }

    return [...contests].sort((a, b) => this.compareContests(a, b));
  }

  constructor(
    @inject('ContestRepository') private contestRepo: ContestRepository,
    @inject('CategoryRepository') private categoryRepo: CategoryRepository,
    @inject('CacheService') private cacheService: CacheService,
    @inject(RestrictionService) private restrictionService: RestrictionService,
    @inject(MetricsService) private metricsService: MetricsService
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

  private async invalidateCategoryCaches(contestId?: string): Promise<void> {
    if (contestId) {
      await this.cacheService.del(`categories:contest:${contestId}`);
    }
    await this.cacheService.invalidatePattern('categories:*');
  }

  /**
   * Create a new contest
   */
  async createContest(data: CreateContestDto): Promise<Contest> {
    try {
      // Validate required fields
      this.validateRequired(data as unknown as Record<string, unknown>, ['eventId', 'name']);
      if (!data.tenantId) {
        throw new ValidationError('Tenant context is required to create a contest');
      }

      // Create contest
      const contest = await this.contestRepo.create({
        ...data,
        tenantId: data.tenantId
      } as any);

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
        throw this.notFoundError('Contest', id);
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
  async getContestWithDetails(id: string): Promise<ContestWithDetails> {
    try {
      const cacheKey = `contest:details:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as ContestWithDetails;
      }

      const contest = await this.contestRepo.findContestWithDetails(id);

      if (!contest) {
        throw this.notFoundError('Contest', id);
      }

      // Cache for 15 minutes
      await this.cacheService.set(cacheKey, contest, 900);

      return contest as ContestWithDetails;
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
   * Get all contests with optional filters
   */
  async getAllContests(filters?: ContestFilters): Promise<Contest[]> {
    try {
      const cacheKey = `contests:all:${JSON.stringify(filters)}`;
      const cached = await this.cacheService.get<Contest[]>(cacheKey);

      if (cached) {
        return cached;
      }

      let contests: Contest[];

      if (filters?.archived !== undefined) {
        contests = filters.archived
          ? await this.contestRepo.findArchivedContests()
          : await this.contestRepo.findAllActive();
      } else {
        contests = await this.contestRepo.findAllActive();
      }

      contests = contests.filter((contest) => !contest.deletedAt);

      // Filter by event ID
      if (filters?.eventId) {
        contests = contests.filter(contest => contest.eventId === filters.eventId);
      }

      // Filter by tenant ID
      if (filters?.tenantId) {
        contests = contests.filter(contest => contest.tenantId === filters.tenantId);
      }

      // Search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        contests = contests.filter(contest =>
          contest.name?.toLowerCase().includes(searchLower) ||
          contest.description?.toLowerCase().includes(searchLower)
        );
      }

      // Filter by created date range
      if (filters?.createdAfter) {
        contests = contests.filter(contest => new Date(contest.createdAt) >= filters.createdAfter!);
      }

      if (filters?.createdBefore) {
        contests = contests.filter(contest => new Date(contest.createdAt) <= filters.createdBefore!);
      }

      contests = this.sortContests(contests, filters);

      // Cache for 10 minutes
      await this.cacheService.set(cacheKey, contests, 600);

      return contests;
    } catch (error) {
      return this.handleError(error, { operation: 'getAllContests', filters });
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
   * Delete contest (soft delete)
   * S4-3: Soft delete pattern - mark as deleted instead of removing
   */
  async deleteContest(id: string, deletedBy?: string): Promise<void> {
    try {
      // Check if contest is locked
      const isLocked = await this.restrictionService.isLocked(undefined, id);
      if (isLocked) {
        throw this.forbiddenError('Contest is locked and cannot be deleted. Please unlock it first.');
      }

      const contest = await this.getContestById(id);
      const cascadeDeletedAt = new Date();

      // S4-3: Soft delete - update deletedAt and deletedBy fields
      await this.contestRepo.update(id, {
        deletedAt: cascadeDeletedAt,
        deletedBy: deletedBy || null,
      });
      await this.categoryRepo.softDeleteByContestId(id, cascadeDeletedAt, deletedBy || null);

      // S4-4: Record soft delete metrics
      this.metricsService.recordSoftDelete('Contest', contest.tenantId);

      // Invalidate caches
      await this.invalidateContestCache(id, contest.eventId);
      await this.invalidateCategoryCaches(id);

      this.logInfo('Contest soft deleted', { contestId: id, deletedBy });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteContest', id });
    }
  }

  /**
   * Restore a soft-deleted contest
   * S4-3: Allow undeleting contests
   */
  async restoreContest(id: string): Promise<Contest> {
    try {
      const contest = await this.contestRepo.findById(id);
      if (!contest) {
        throw this.notFoundError('Contest', id);
      }
      const cascadeDeletedAt = contest.deletedAt || null;

      // S4-3: Restore by clearing deletedAt and deletedBy
      const restoredContest = await this.contestRepo.update(id, {
        deletedAt: null,
        deletedBy: null,
      });

      if (cascadeDeletedAt) {
        await this.categoryRepo.restoreByContestIdAndDeletedAt(id, cascadeDeletedAt);
      }

      // S4-4: Record soft delete restore metrics
      this.metricsService.recordSoftDeleteRestore('Contest', restoredContest.tenantId);

      // Invalidate caches
      await this.invalidateContestCache(id, restoredContest.eventId);
      await this.invalidateCategoryCaches(id);

      this.logInfo('Contest restored', { contestId: id });
      return restoredContest;
    } catch (error) {
      return this.handleError(error, { operation: 'restoreContest', id });
    }
  }

  /**
   * Get contest statistics
   */
  async getContestStats(id: string): Promise<ContestStats> {
    try {
      const cacheKey = `contest:stats:${id}`;
      const cached = await this.cacheService.get(cacheKey);

      if (cached) {
        return cached as ContestStats;
      }

      const stats = await this.contestRepo.getContestStats(id);

      // Cache for 5 minutes
      await this.cacheService.set(cacheKey, stats, 300);

      return stats as unknown as ContestStats;
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
