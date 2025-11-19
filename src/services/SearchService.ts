/**
 * Search Service
 * Handles advanced search functionality with full-text search
 */

import { injectable, inject } from 'tsyringe';
import {
  SearchRepository,
  SearchOptions,
  SearchResult,
  CreateSavedSearchDTO,
  CreateSearchHistoryDTO,
} from '../repositories/SearchRepository';
import { SavedSearch, SearchHistory, SearchAnalytic } from '@prisma/client';

export interface FacetedSearchOptions {
  tenantId: string;
  query?: string;
  filters?: Record<string, any>;
  entityTypes?: string[];
  limit?: number;
  offset?: number;
  facets?: {
    types?: boolean;
    dates?: boolean;
    roles?: boolean;
    status?: boolean;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  facets?: {
    types?: Array<{ type: string; count: number }>;
    dates?: Array<{ date: string; count: number }>;
    roles?: Array<{ role: string; count: number }>;
    status?: Array<{ status: string; count: number }>;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  query: string;
}

@injectable()
export class SearchService {
  constructor(
    @inject('SearchRepository')
    private searchRepository: SearchRepository
  ) {}

  /**
   * Perform advanced search across all entities
   */
  async search(userId: string, options: FacetedSearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();

    // Perform the search
    const results = await this.searchRepository.searchAll(options);

    // Track search analytics
    const responseTime = Date.now() - startTime;
    await this.searchRepository.trackSearch(options.query, results.length, responseTime);

    // Record search history
    await this.searchRepository.createSearchHistory({
      userId,
      tenantId: options.tenantId,
      query: options.query,
      filters: options.filters,
      entityTypes: options.entityTypes,
      resultCount: results.length,
    });

    // Calculate facets if requested
    const facets = options.facets ? this.calculateFacets(results, options.facets) : undefined;

    const page = Math.floor((options.offset || 0) / (options.limit || 20)) + 1;

    return {
      results,
      facets,
      totalCount: results.length,
      page,
      pageSize: options.limit || 20,
      query: options.query,
    };
  }

  /**
   * Search specific entity type
   */
  async searchByType(userId: string, entityType: string, options: SearchOptions): Promise<SearchResult[]> {
    const startTime = Date.now();

    let results: SearchResult[] = [];

    switch (entityType) {
      case 'users':
        results = await this.searchRepository.searchUsers(options);
        break;
      case 'events':
        results = await this.searchRepository.searchEvents(options);
        break;
      case 'contests':
        results = await this.searchRepository.searchContests(options);
        break;
      case 'categories':
        results = await this.searchRepository.searchCategories(options);
        break;
      case 'contestants':
        results = await this.searchRepository.searchContestants(options);
        break;
      case 'judges':
        results = await this.searchRepository.searchJudges(options);
        break;
      default:
        throw new Error(`Invalid entity type: ${entityType}`);
    }

    const responseTime = Date.now() - startTime;
    await this.searchRepository.trackSearch(options.query, results.length, responseTime);

    await this.searchRepository.createSearchHistory({
      userId,
      tenantId: options.tenantId,
      query: options.query,
      filters: options.filters,
      entityTypes: [entityType],
      resultCount: results.length,
    });

    return results;
  }

  /**
   * Calculate facets from search results
   */
  private calculateFacets(results: SearchResult[], facetOptions: any): any {
    const facets: any = {};

    if (facetOptions.types) {
      facets.types = this.calculateTypeFacets(results);
    }

    if (facetOptions.dates) {
      facets.dates = this.calculateDateFacets(results);
    }

    if (facetOptions.roles) {
      facets.roles = this.calculateRoleFacets(results);
    }

    if (facetOptions.status) {
      facets.status = this.calculateStatusFacets(results);
    }

    return facets;
  }

  /**
   * Calculate type facets
   */
  private calculateTypeFacets(results: SearchResult[]): Array<{ type: string; count: number }> {
    const typeCounts = new Map<string, number>();

    results.forEach((result) => {
      const count = typeCounts.get(result.type) || 0;
      typeCounts.set(result.type, count + 1);
    });

    return Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate date facets
   */
  private calculateDateFacets(results: SearchResult[]): Array<{ date: string; count: number }> {
    const dateCounts = new Map<string, number>();

    results.forEach((result) => {
      if (result.metadata?.['startDate']) {
        const date = new Date(result.metadata['startDate']).toISOString().split('T')[0];
        const count = dateCounts.get(date) || 0;
        dateCounts.set(date, count + 1);
      }
    });

    return Array.from(dateCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate role facets
   */
  private calculateRoleFacets(results: SearchResult[]): Array<{ role: string; count: number }> {
    const roleCounts = new Map<string, number>();

    results.forEach((result) => {
      if (result.metadata?.['role']) {
        const role = result.metadata['role'];
        const count = roleCounts.get(role) || 0;
        roleCounts.set(role, count + 1);
      }
    });

    return Array.from(roleCounts.entries())
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate status facets
   */
  private calculateStatusFacets(results: SearchResult[]): Array<{ status: string; count: number }> {
    const statusCounts = new Map<string, number>();

    results.forEach((result) => {
      if (result.metadata?.['status']) {
        const status = result.metadata['status'];
        const count = statusCounts.get(status) || 0;
        statusCounts.set(status, count + 1);
      }
    });

    return Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ==================== Saved Searches ====================

  /**
   * Save search for user
   */
  async saveSearch(data: CreateSavedSearchDTO): Promise<SavedSearch> {
    return this.searchRepository.createSavedSearch(data);
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(userId: string, tenantId: string, includePublic = false): Promise<SavedSearch[]> {
    return this.searchRepository.getSavedSearches(userId, tenantId, includePublic);
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(id: string, userId: string, tenantId: string): Promise<SavedSearch> {
    return this.searchRepository.deleteSavedSearch(id, userId, tenantId);
  }

  /**
   * Execute saved search
   */
  async executeSavedSearch(userId: string, tenantId: string, savedSearchId: string): Promise<SearchResponse> {
    const savedSearch = await this.searchRepository.getSavedSearches(userId, tenantId);
    const search = savedSearch.find((s) => s.id === savedSearchId);

    if (!search) {
      throw new Error('Saved search not found');
    }

    const options: FacetedSearchOptions = {
      tenantId,
      query: search.query,
      filters: search.filters ? JSON.parse(search.filters) : undefined,
      entityTypes: search.entityTypes ? search.entityTypes.split(',') : undefined,
    };

    return this.search(userId, options);
  }

  // ==================== Search History ====================

  /**
   * Get search history for user
   */
  async getSearchHistory(userId: string, tenantId: string, limit = 10): Promise<SearchHistory[]> {
    return this.searchRepository.getSearchHistory(userId, tenantId, limit);
  }

  /**
   * Clear search history
   */
  async clearSearchHistory(userId: string, tenantId: string): Promise<number> {
    return this.searchRepository.clearSearchHistory(userId, tenantId);
  }

  // ==================== Search Suggestions ====================

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(prefix: string, limit = 5): Promise<string[]> {
    if (prefix.length < 2) return [];
    return this.searchRepository.getSearchSuggestions(prefix, limit);
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 10): Promise<SearchAnalytic[]> {
    return this.searchRepository.getPopularSearches(limit);
  }

  /**
   * Get trending searches (recent popular searches)
   */
  async getTrendingSearches(limit = 5): Promise<SearchAnalytic[]> {
    const popular = await this.searchRepository.getPopularSearches(limit * 2);

    // Filter to recent searches (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return popular
      .filter((s) => new Date(s.lastSearched) >= sevenDaysAgo)
      .slice(0, limit);
  }
}
