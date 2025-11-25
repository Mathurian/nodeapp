/**
 * Search Repository
 * Handles database operations for advanced search functionality
 */

import { injectable } from 'tsyringe';
import { PrismaClient, SavedSearch, SearchHistory, SearchAnalytic, Prisma } from '@prisma/client';
import prisma from '../config/database';

export interface CreateSavedSearchDTO {
  userId: string;
  tenantId: string;
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  entityTypes?: string[];
  isPublic?: boolean;
}

export interface CreateSearchHistoryDTO {
  userId: string;
  tenantId: string;
  query: string;
  filters?: Record<string, unknown>;
  entityTypes?: string[];
  resultCount?: number;
}

export interface SearchOptions {
  tenantId: string;
  query?: string;
  entityTypes?: string[];
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  rank?: number;
}

// Types for raw SQL query results
interface RawUserSearchResult {
  id: string;
  name: string;
  email: string;
  role: string;
  rank: string | number;
}

interface RawEventSearchResult {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  rank: string | number;
}

interface RawContestSearchResult {
  id: string;
  name: string;
  description: string | null;
  event_name: string | null;
  rank: string | number;
}

interface RawCategorySearchResult {
  id: string;
  name: string;
  description: string | null;
  contest_name: string | null;
  rank: string | number;
}

interface RawContestantSearchResult {
  id: string;
  name: string;
  email: string | null;
  contestantNumber: number | null;
  rank: string | number;
}

interface RawJudgeSearchResult {
  id: string;
  name: string;
  email: string | null;
  isHeadJudge: boolean;
  rank: string | number;
}

@injectable()
export class SearchRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  // ==================== Saved Searches ====================

  /**
   * Create saved search
   */
  async createSavedSearch(data: CreateSavedSearchDTO): Promise<SavedSearch> {
    return this.prismaClient.savedSearch.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        name: data.name,
        query: data.query,
        filters: data.filters ? JSON.stringify(data.filters) : null,
        entityTypes: data.entityTypes?.join(','),
        isPublic: data.isPublic ?? false,
      },
    });
  }

  /**
   * Get saved searches for user
   */
  async getSavedSearches(userId: string, tenantId: string, includePublic = false): Promise<SavedSearch[]> {
    const where: Prisma.SavedSearchWhereInput = includePublic
      ? {
          tenantId,
          OR: [{ userId }, { isPublic: true }],
        }
      : { userId, tenantId };

    return this.prismaClient.savedSearch.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(id: string, userId: string, tenantId: string): Promise<SavedSearch> {
    // Verify it belongs to user and tenant
    const search = await this.prismaClient.savedSearch.findFirst({
      where: { id, userId, tenantId },
    });
    if (!search) throw new Error('Saved search not found');

    return this.prismaClient.savedSearch.delete({
      where: { id },
    });
  }

  // ==================== Search History ====================

  /**
   * Create search history entry
   */
  async createSearchHistory(data: CreateSearchHistoryDTO): Promise<SearchHistory> {
    return this.prismaClient.searchHistory.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        query: data.query,
        filters: data.filters ? JSON.stringify(data.filters) : null,
        entityTypes: data.entityTypes?.join(','),
        resultCount: data.resultCount ?? 0,
      },
    });
  }

  /**
   * Get search history for user
   */
  async getSearchHistory(userId: string, tenantId: string, limit = 10): Promise<SearchHistory[]> {
    return this.prismaClient.searchHistory.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Clear search history for user
   */
  async clearSearchHistory(userId: string, tenantId: string): Promise<number> {
    const result = await this.prismaClient.searchHistory.deleteMany({
      where: { userId, tenantId },
    });
    return result.count;
  }

  // ==================== Search Analytics ====================

  /**
   * Track search analytics
   */
  async trackSearch(query: string, resultCount: number, responseTime: number): Promise<void> {
    const existing = await this.prismaClient.searchAnalytic.findFirst({
      where: { query },
    });

    if (existing) {
      const newSearchCount = existing.searchCount + 1;
      const newAvgResponseTime = Math.round(
        (existing.avgResponseTime * existing.searchCount + responseTime) / newSearchCount
      );

      await this.prismaClient.searchAnalytic.update({
        where: { id: existing.id },
        data: {
          resultCount,
          avgResponseTime: newAvgResponseTime,
          searchCount: newSearchCount,
          lastSearched: new Date(),
        },
      });
    } else {
      await this.prismaClient.searchAnalytic.create({
        data: {
          query,
          resultCount,
          avgResponseTime: responseTime,
          searchCount: 1,
          lastSearched: new Date(),
        },
      });
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 10): Promise<SearchAnalytic[]> {
    return this.prismaClient.searchAnalytic.findMany({
      orderBy: { searchCount: 'desc' },
      take: limit,
    });
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(prefix: string, limit = 5): Promise<string[]> {
    const analytics = await this.prismaClient.searchAnalytic.findMany({
      where: {
        query: {
          startsWith: prefix,
        },
      },
      orderBy: { searchCount: 'desc' },
      take: limit,
    });

    return analytics.map((a) => a.query);
  }

  // ==================== Full-Text Search ====================

  /**
   * Search users
   */
  async searchUsers(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const users = await this.prismaClient.$queryRaw<RawUserSearchResult[]>`
      SELECT
        id,
        name,
        email,
        role,
        ts_rank(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM users
      WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, ''))
            @@ plainto_tsquery('english', ${query})
        AND "tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return users.map((user) => ({
      id: user.id,
      type: 'user',
      title: user.name,
      description: user.email,
      metadata: { role: user.role },
      rank: typeof user.rank === 'string' ? parseFloat(user.rank) : Number(user.rank),
    }));
  }

  /**
   * Search events
   */
  async searchEvents(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const events = await this.prismaClient.$queryRaw<RawEventSearchResult[]>`
      SELECT
        id,
        name,
        description,
        "startDate",
        "endDate",
        ts_rank(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM events
      WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
            @@ plainto_tsquery('english', ${query})
        AND archived = false
        AND "tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return events.map((event) => ({
      id: event.id,
      type: 'event',
      title: event.name,
      description: event.description ?? undefined,
      metadata: {
        startDate: event.startDate,
        endDate: event.endDate,
      },
      rank: typeof event.rank === 'string' ? parseFloat(event.rank) : Number(event.rank),
    }));
  }

  /**
   * Search contests
   */
  async searchContests(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const contests = await this.prismaClient.$queryRaw<RawContestSearchResult[]>`
      SELECT
        c.id,
        c.name,
        c.description,
        e.name as event_name,
        ts_rank(to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM contests c
      LEFT JOIN events e ON c."eventId" = e.id
      WHERE to_tsvector('english', COALESCE(c.name, '') || ' ' || COALESCE(c.description, ''))
            @@ plainto_tsquery('english', ${query})
        AND c.archived = false
        AND c."tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return contests.map((contest) => ({
      id: contest.id,
      type: 'contest',
      title: contest.name,
      description: contest.description ?? undefined,
      metadata: { eventName: contest.event_name ?? undefined },
      rank: typeof contest.rank === 'string' ? parseFloat(contest.rank) : Number(contest.rank),
    }));
  }

  /**
   * Search categories
   */
  async searchCategories(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const categories = await this.prismaClient.$queryRaw<RawCategorySearchResult[]>`
      SELECT
        cat.id,
        cat.name,
        cat.description,
        c.name as contest_name,
        ts_rank(to_tsvector('english', COALESCE(cat.name, '') || ' ' || COALESCE(cat.description, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM categories cat
      LEFT JOIN contests c ON cat."contestId" = c.id
      WHERE to_tsvector('english', COALESCE(cat.name, '') || ' ' || COALESCE(cat.description, ''))
            @@ plainto_tsquery('english', ${query})
        AND cat."tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return categories.map((category) => ({
      id: category.id,
      type: 'category',
      title: category.name,
      description: category.description ?? undefined,
      metadata: { contestName: category.contest_name ?? undefined },
      rank: typeof category.rank === 'string' ? parseFloat(category.rank) : Number(category.rank),
    }));
  }

  /**
   * Search contestants
   */
  async searchContestants(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const contestants = await this.prismaClient.$queryRaw<RawContestantSearchResult[]>`
      SELECT
        id,
        name,
        email,
        "contestantNumber",
        ts_rank(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM contestants
      WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, ''))
            @@ plainto_tsquery('english', ${query})
        AND "tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return contestants.map((contestant) => ({
      id: contestant.id,
      type: 'contestant',
      title: contestant.name,
      description: contestant.email ?? undefined,
      metadata: { contestantNumber: contestant.contestantNumber ?? undefined },
      rank: typeof contestant.rank === 'string' ? parseFloat(contestant.rank) : Number(contestant.rank),
    }));
  }

  /**
   * Search judges
   */
  async searchJudges(options: SearchOptions): Promise<SearchResult[]> {
    const { query, tenantId, limit = 20, offset = 0 } = options;

    const judges = await this.prismaClient.$queryRaw<RawJudgeSearchResult[]>`
      SELECT
        id,
        name,
        email,
        "isHeadJudge",
        ts_rank(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, '')),
                plainto_tsquery('english', ${query})) AS rank
      FROM judges
      WHERE to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(email, ''))
            @@ plainto_tsquery('english', ${query})
        AND "tenantId" = ${tenantId}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return judges.map((judge) => ({
      id: judge.id,
      type: 'judge',
      title: judge.name,
      description: judge.email ?? undefined,
      metadata: { isHeadJudge: judge.isHeadJudge },
      rank: typeof judge.rank === 'string' ? parseFloat(judge.rank) : Number(judge.rank),
    }));
  }

  /**
   * Multi-entity search
   */
  async searchAll(options: SearchOptions): Promise<SearchResult[]> {
    const { entityTypes } = options;

    const results: SearchResult[] = [];

    // If no entity types specified, search all
    const typesToSearch = entityTypes && entityTypes.length > 0
      ? entityTypes
      : ['users', 'events', 'contests', 'categories', 'contestants', 'judges'];

    // Execute searches in parallel
    const promises: Promise<SearchResult[]>[] = [];

    if (typesToSearch.includes('users')) promises.push(this.searchUsers(options));
    if (typesToSearch.includes('events')) promises.push(this.searchEvents(options));
    if (typesToSearch.includes('contests')) promises.push(this.searchContests(options));
    if (typesToSearch.includes('categories')) promises.push(this.searchCategories(options));
    if (typesToSearch.includes('contestants')) promises.push(this.searchContestants(options));
    if (typesToSearch.includes('judges')) promises.push(this.searchJudges(options));

    const resultArrays = await Promise.all(promises);

    // Combine and sort by rank
    resultArrays.forEach((arr) => results.push(...arr));
    results.sort((a, b) => (b.rank || 0) - (a.rank || 0));

    // Apply limit
    return results.slice(0, options.limit || 20);
  }
}
