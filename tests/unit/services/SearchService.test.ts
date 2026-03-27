/**
 * SearchService Unit Tests
 * Aligned with tenant-aware search options and repository contracts.
 */

import 'reflect-metadata';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { SearchService, type FacetedSearchOptions } from '../../../src/services/SearchService';
import {
  SearchRepository,
  type CreateSavedSearchDTO,
  type SearchOptions,
  type SearchResult,
} from '../../../src/repositories/SearchRepository';

describe('SearchService', () => {
  let service: SearchService;
  let mockRepository: DeepMockProxy<SearchRepository>;

  const testTenantId = 'tenant-1';
  const now = new Date('2026-02-25T12:00:00.000Z');

  const buildSearchResult = (
    overrides: Partial<SearchResult> = {}
  ): SearchResult => ({
    id: '1',
    type: 'user',
    title: 'John Doe',
    description: 'Test user',
    metadata: { role: 'ADMIN', status: 'active' },
    rank: 1,
    ...overrides,
  });

  const buildSearchOptions = (
    overrides: Partial<SearchOptions> = {}
  ): SearchOptions => ({
    tenantId: testTenantId,
    query: 'test',
    limit: 20,
    offset: 0,
    ...overrides,
  });

  const buildFacetedSearchOptions = (
    overrides: Partial<FacetedSearchOptions> = {}
  ): FacetedSearchOptions => ({
    tenantId: testTenantId,
    query: 'test',
    limit: 20,
    offset: 0,
    ...overrides,
  });

  const buildSavedSearch = (
    overrides: Partial<{
      id: string;
      userId: string;
      tenantId: string;
      name: string;
      query: string;
      filters: string | null;
      entityTypes: string | null;
      isPublic: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ) => ({
    id: 'search-1',
    userId: 'user-1',
    tenantId: testTenantId,
    name: 'My Search',
    query: 'test query',
    filters: JSON.stringify({ status: 'active' }),
    entityTypes: 'users,events',
    isPublic: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const buildSearchHistory = (
    overrides: Partial<{
      id: string;
      userId: string;
      tenantId: string;
      query: string;
      filters: string | null;
      entityTypes: string | null;
      resultCount: number;
      createdAt: Date;
    }> = {}
  ) => ({
    id: 'history-1',
    userId: 'user-1',
    tenantId: testTenantId,
    query: 'test',
    filters: null,
    entityTypes: null,
    resultCount: 3,
    createdAt: now,
    ...overrides,
  });

  const buildSearchAnalytic = (
    overrides: Partial<{
      id: string;
      query: string;
      resultCount: number;
      avgResponseTime: number;
      searchCount: number;
      lastSearched: Date;
      createdAt: Date;
      updatedAt: Date;
    }> = {}
  ) => ({
    id: 'analytic-1',
    query: 'popular query',
    resultCount: 10,
    avgResponseTime: 100,
    searchCount: 50,
    lastSearched: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const mockSearchResults: SearchResult[] = [
    buildSearchResult({
      id: '1',
      type: 'user',
      title: 'John Doe',
      description: 'Test user',
      metadata: { role: 'ADMIN', status: 'active' },
      rank: 1,
    }),
    buildSearchResult({
      id: '2',
      type: 'event',
      title: 'Annual Conference',
      description: 'Event description',
      metadata: { startDate: '2024-01-15', status: 'active' },
      rank: 0.95,
    }),
    buildSearchResult({
      id: '3',
      type: 'contest',
      title: 'Coding Challenge',
      description: 'Contest description',
      metadata: { status: 'upcoming' },
      rank: 0.9,
    }),
  ];

  beforeEach(() => {
    mockRepository = mockDeep<SearchRepository>();
    service = new SearchService(mockRepository);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockRepository);
  });

  describe('search', () => {
    it('should perform search and return faceted results', async () => {
      const options = buildFacetedSearchOptions({
        facets: {
          types: true,
          dates: true,
          roles: true,
          status: true,
        },
      });

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory());

      const result = await service.search('user-1', options);

      expect(mockRepository.searchAll).toHaveBeenCalledWith(options);
      expect(mockRepository.trackSearch).toHaveBeenCalledWith('test', 3, expect.any(Number));
      expect(mockRepository.createSearchHistory).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: testTenantId,
        query: 'test',
        filters: undefined,
        entityTypes: undefined,
        resultCount: 3,
      });
      expect(result.totalCount).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.query).toBe('test');
      expect(result.facets?.types).toContainEqual({ type: 'user', count: 1 });
      expect(result.facets?.types).toContainEqual({ type: 'event', count: 1 });
      expect(result.facets?.types).toContainEqual({ type: 'contest', count: 1 });
    });

    it('should calculate correct page numbers with offset', async () => {
      const options = buildFacetedSearchOptions({
        limit: 10,
        offset: 20,
      });

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory());

      const result = await service.search('user-1', options);

      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(10);
    });

    it('should return results without facets when facets are not requested', async () => {
      const options = buildFacetedSearchOptions();

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory());

      const result = await service.search('user-1', options);

      expect(result.facets).toBeUndefined();
    });

    it('should handle empty search results', async () => {
      const options = buildFacetedSearchOptions({ query: 'nonexistent' });

      mockRepository.searchAll.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(
        buildSearchHistory({ query: 'nonexistent', resultCount: 0 })
      );

      const result = await service.search('user-1', options);

      expect(result.results).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('searchByType', () => {
    it('should search users by type', async () => {
      const options = buildSearchOptions({ query: 'john', limit: 10 });
      const userResults = [mockSearchResults[0]];

      mockRepository.searchUsers.mockResolvedValue(userResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'john', resultCount: 1 }));

      const result = await service.searchByType('user-1', 'users', options);

      expect(mockRepository.searchUsers).toHaveBeenCalledWith(options);
      expect(mockRepository.createSearchHistory).toHaveBeenCalledWith({
        userId: 'user-1',
        tenantId: testTenantId,
        query: 'john',
        filters: undefined,
        entityTypes: ['users'],
        resultCount: 1,
      });
      expect(result).toEqual(userResults);
    });

    it('should search events by type', async () => {
      const options = buildSearchOptions({ query: 'conference', limit: 10 });
      const eventResults = [mockSearchResults[1]];

      mockRepository.searchEvents.mockResolvedValue(eventResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'conference', resultCount: 1 }));

      const result = await service.searchByType('user-1', 'events', options);

      expect(mockRepository.searchEvents).toHaveBeenCalledWith(options);
      expect(result).toEqual(eventResults);
    });

    it('should search contests by type', async () => {
      const options = buildSearchOptions({ query: 'coding', limit: 10 });
      const contestResults = [mockSearchResults[2]];

      mockRepository.searchContests.mockResolvedValue(contestResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'coding', resultCount: 1 }));

      const result = await service.searchByType('user-1', 'contests', options);

      expect(mockRepository.searchContests).toHaveBeenCalledWith(options);
      expect(result).toEqual(contestResults);
    });

    it('should search categories by type', async () => {
      const options = buildSearchOptions({ query: 'category', limit: 10 });

      mockRepository.searchCategories.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'category', resultCount: 0 }));

      await service.searchByType('user-1', 'categories', options);

      expect(mockRepository.searchCategories).toHaveBeenCalledWith(options);
    });

    it('should search contestants by type', async () => {
      const options = buildSearchOptions({ query: 'contestant', limit: 10 });

      mockRepository.searchContestants.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'contestant', resultCount: 0 }));

      await service.searchByType('user-1', 'contestants', options);

      expect(mockRepository.searchContestants).toHaveBeenCalledWith(options);
    });

    it('should search judges by type', async () => {
      const options = buildSearchOptions({ query: 'judge', limit: 10 });

      mockRepository.searchJudges.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'judge', resultCount: 0 }));

      await service.searchByType('user-1', 'judges', options);

      expect(mockRepository.searchJudges).toHaveBeenCalledWith(options);
    });

    it('should throw an error for invalid entity type', async () => {
      const options = buildSearchOptions({ query: 'test', limit: 10 });

      await expect(service.searchByType('user-1', 'invalid', options)).rejects.toThrow(
        'Invalid entity type: invalid'
      );
    });
  });

  describe('saveSearch', () => {
    it('should save a search successfully', async () => {
      const searchData: CreateSavedSearchDTO = {
        userId: 'user-1',
        tenantId: testTenantId,
        name: 'My Search',
        query: 'test query',
        filters: { status: 'active' },
        entityTypes: ['users', 'events'],
        isPublic: false,
      };
      const savedSearch = buildSavedSearch();

      mockRepository.createSavedSearch.mockResolvedValue(savedSearch);

      const result = await service.saveSearch(searchData);

      expect(mockRepository.createSavedSearch).toHaveBeenCalledWith(searchData);
      expect(result).toEqual(savedSearch);
    });
  });

  describe('getSavedSearches', () => {
    it('should get saved searches for a user', async () => {
      const savedSearches = [buildSavedSearch({ query: 'test', entityTypes: 'users' })];

      mockRepository.getSavedSearches.mockResolvedValue(savedSearches);

      const result = await service.getSavedSearches('user-1', testTenantId);

      expect(mockRepository.getSavedSearches).toHaveBeenCalledWith('user-1', testTenantId, false);
      expect(result).toEqual(savedSearches);
    });

    it('should include public searches when requested', async () => {
      mockRepository.getSavedSearches.mockResolvedValue([]);

      await service.getSavedSearches('user-1', testTenantId, true);

      expect(mockRepository.getSavedSearches).toHaveBeenCalledWith('user-1', testTenantId, true);
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete a saved search', async () => {
      const deletedSearch = buildSavedSearch({ query: 'test', entityTypes: null });

      mockRepository.deleteSavedSearch.mockResolvedValue(deletedSearch);

      const result = await service.deleteSavedSearch('search-1', 'user-1', testTenantId);

      expect(mockRepository.deleteSavedSearch).toHaveBeenCalledWith(
        'search-1',
        'user-1',
        testTenantId
      );
      expect(result).toEqual(deletedSearch);
    });
  });

  describe('executeSavedSearch', () => {
    it('should execute a saved search', async () => {
      const savedSearch = buildSavedSearch();

      mockRepository.getSavedSearches.mockResolvedValue([savedSearch]);
      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue();
      mockRepository.createSearchHistory.mockResolvedValue(buildSearchHistory({ query: 'test query' }));

      const result = await service.executeSavedSearch('user-1', testTenantId, 'search-1');

      expect(mockRepository.getSavedSearches).toHaveBeenCalledWith('user-1', testTenantId, false);
      expect(result.query).toBe('test query');
      expect(result.results).toEqual(mockSearchResults);
    });

    it('should throw an error if the saved search is not found', async () => {
      mockRepository.getSavedSearches.mockResolvedValue([]);

      await expect(service.executeSavedSearch('user-1', testTenantId, 'invalid')).rejects.toThrow(
        'Saved search not found'
      );
    });
  });

  describe('getSearchHistory', () => {
    it('should get search history for a user', async () => {
      const history = [buildSearchHistory({ resultCount: 5 })];

      mockRepository.getSearchHistory.mockResolvedValue(history);

      const result = await service.getSearchHistory('user-1', testTenantId);

      expect(mockRepository.getSearchHistory).toHaveBeenCalledWith('user-1', testTenantId, 10);
      expect(result).toEqual(history);
    });

    it('should respect a custom limit', async () => {
      mockRepository.getSearchHistory.mockResolvedValue([]);

      await service.getSearchHistory('user-1', testTenantId, 5);

      expect(mockRepository.getSearchHistory).toHaveBeenCalledWith('user-1', testTenantId, 5);
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear search history', async () => {
      mockRepository.clearSearchHistory.mockResolvedValue(10);

      const result = await service.clearSearchHistory('user-1', testTenantId);

      expect(mockRepository.clearSearchHistory).toHaveBeenCalledWith('user-1', testTenantId);
      expect(result).toBe(10);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return suggestions for a valid prefix', async () => {
      const suggestions = ['test', 'testing', 'tester'];
      mockRepository.getSearchSuggestions.mockResolvedValue(suggestions);

      const result = await service.getSearchSuggestions('tes');

      expect(mockRepository.getSearchSuggestions).toHaveBeenCalledWith('tes', 5);
      expect(result).toEqual(suggestions);
    });

    it('should return an empty array for a short prefix', async () => {
      const result = await service.getSearchSuggestions('t');

      expect(result).toEqual([]);
      expect(mockRepository.getSearchSuggestions).not.toHaveBeenCalled();
    });

    it('should respect a custom limit', async () => {
      mockRepository.getSearchSuggestions.mockResolvedValue([]);

      await service.getSearchSuggestions('test', 10);

      expect(mockRepository.getSearchSuggestions).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('getPopularSearches', () => {
    it('should get popular searches', async () => {
      const popular = [buildSearchAnalytic()];

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getPopularSearches();

      expect(mockRepository.getPopularSearches).toHaveBeenCalledWith(10);
      expect(result).toEqual(popular);
    });

    it('should respect a custom limit', async () => {
      mockRepository.getPopularSearches.mockResolvedValue([]);

      await service.getPopularSearches(20);

      expect(mockRepository.getPopularSearches).toHaveBeenCalledWith(20);
    });
  });

  describe('getTrendingSearches', () => {
    it('should get trending searches from the last 7 days', async () => {
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const popular = [
        buildSearchAnalytic({ id: 'analytics-1', query: 'recent query', lastSearched: recentDate }),
        buildSearchAnalytic({ id: 'analytics-2', query: 'old query', lastSearched: oldDate }),
      ];

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getTrendingSearches();

      expect(result).toHaveLength(1);
      expect(result[0]?.query).toBe('recent query');
    });

    it('should limit results to the requested count', async () => {
      const popular = Array.from({ length: 10 }, (_, i) =>
        buildSearchAnalytic({
          id: `analytics-${i}`,
          query: `query ${i}`,
          lastSearched: new Date(),
        })
      );

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getTrendingSearches(3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });
});
