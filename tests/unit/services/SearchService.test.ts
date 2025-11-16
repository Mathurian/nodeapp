/**
 * SearchService Unit Tests
 * Comprehensive tests for search functionality
 */

import 'reflect-metadata';
import { SearchService } from '../../../src/services/SearchService';
import { SearchRepository, SearchOptions, SearchResult } from '../../../src/repositories/SearchRepository';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('SearchService', () => {
  let service: SearchService;
  let mockRepository: DeepMockProxy<SearchRepository>;

  const mockSearchResults: SearchResult[] = [
    {
      id: '1',
      type: 'users',
      title: 'John Doe',
      description: 'Test user',
      metadata: { role: 'ADMIN', status: 'active' },
      score: 1.0
    },
    {
      id: '2',
      type: 'events',
      title: 'Annual Conference',
      description: 'Event description',
      metadata: { startDate: '2024-01-15', status: 'active' },
      score: 0.95
    },
    {
      id: '3',
      type: 'contests',
      title: 'Coding Challenge',
      description: 'Contest description',
      metadata: { status: 'upcoming' },
      score: 0.9
    }
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
      const options = {
        query: 'test',
        limit: 20,
        offset: 0,
        facets: {
          types: true,
          dates: true,
          roles: true,
          status: true
        }
      };

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue({
        id: 'track-1',
        query: 'test',
        resultCount: 3,
        averageResponseTime: 100,
        totalSearches: 1,
        lastSearched: new Date(),
        createdAt: new Date()
      });
      mockRepository.createSearchHistory.mockResolvedValue({
        id: 'history-1',
        userId: 'user-1',
        query: 'test',
        filters: null,
        entityTypes: null,
        resultCount: 3,
        createdAt: new Date()
      });

      const result = await service.search('user-1', options);

      expect(mockRepository.searchAll).toHaveBeenCalledWith(options);
      expect(mockRepository.trackSearch).toHaveBeenCalledWith('test', 3, expect.any(Number));
      expect(mockRepository.createSearchHistory).toHaveBeenCalledWith({
        userId: 'user-1',
        query: 'test',
        filters: undefined,
        entityTypes: undefined,
        resultCount: 3
      });

      expect(result).toEqual({
        results: mockSearchResults,
        facets: {
          types: expect.any(Array),
          dates: expect.any(Array),
          roles: expect.any(Array),
          status: expect.any(Array)
        },
        totalCount: 3,
        page: 1,
        pageSize: 20,
        query: 'test'
      });

      expect(result.facets?.types).toContainEqual({ type: 'users', count: 1 });
      expect(result.facets?.types).toContainEqual({ type: 'events', count: 1 });
      expect(result.facets?.types).toContainEqual({ type: 'contests', count: 1 });
    });

    it('should calculate correct page numbers with offset', async () => {
      const options = {
        query: 'test',
        limit: 10,
        offset: 20
      };

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.search('user-1', options);

      expect(result.page).toBe(3); // offset 20 / limit 10 + 1 = page 3
      expect(result.pageSize).toBe(10);
    });

    it('should return results without facets when facets not requested', async () => {
      const options = {
        query: 'test',
        limit: 20,
        offset: 0
      };

      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.search('user-1', options);

      expect(result.facets).toBeUndefined();
    });

    it('should handle empty search results', async () => {
      const options = {
        query: 'nonexistent',
        limit: 20,
        offset: 0
      };

      mockRepository.searchAll.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.search('user-1', options);

      expect(result.results).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('searchByType', () => {
    it('should search users by type', async () => {
      const options: SearchOptions = { query: 'john', limit: 10 };
      const userResults = [mockSearchResults[0]];

      mockRepository.searchUsers.mockResolvedValue(userResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'users', options);

      expect(mockRepository.searchUsers).toHaveBeenCalledWith(options);
      expect(result).toEqual(userResults);
    });

    it('should search events by type', async () => {
      const options: SearchOptions = { query: 'conference', limit: 10 };
      const eventResults = [mockSearchResults[1]];

      mockRepository.searchEvents.mockResolvedValue(eventResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'events', options);

      expect(mockRepository.searchEvents).toHaveBeenCalledWith(options);
      expect(result).toEqual(eventResults);
    });

    it('should search contests by type', async () => {
      const options: SearchOptions = { query: 'coding', limit: 10 };
      const contestResults = [mockSearchResults[2]];

      mockRepository.searchContests.mockResolvedValue(contestResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'contests', options);

      expect(mockRepository.searchContests).toHaveBeenCalledWith(options);
      expect(result).toEqual(contestResults);
    });

    it('should search categories by type', async () => {
      const options: SearchOptions = { query: 'category', limit: 10 };

      mockRepository.searchCategories.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'categories', options);

      expect(mockRepository.searchCategories).toHaveBeenCalledWith(options);
    });

    it('should search contestants by type', async () => {
      const options: SearchOptions = { query: 'contestant', limit: 10 };

      mockRepository.searchContestants.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'contestants', options);

      expect(mockRepository.searchContestants).toHaveBeenCalledWith(options);
    });

    it('should search judges by type', async () => {
      const options: SearchOptions = { query: 'judge', limit: 10 };

      mockRepository.searchJudges.mockResolvedValue([]);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.searchByType('user-1', 'judges', options);

      expect(mockRepository.searchJudges).toHaveBeenCalledWith(options);
    });

    it('should throw error for invalid entity type', async () => {
      const options: SearchOptions = { query: 'test', limit: 10 };

      await expect(service.searchByType('user-1', 'invalid', options))
        .rejects.toThrow('Invalid entity type: invalid');
    });
  });

  describe('saveSearch', () => {
    it('should save search successfully', async () => {
      const searchData = {
        userId: 'user-1',
        name: 'My Search',
        query: 'test query',
        filters: JSON.stringify({ status: 'active' }),
        entityTypes: 'users,events',
        isPublic: false
      };

      const savedSearch = {
        id: 'search-1',
        ...searchData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.createSavedSearch.mockResolvedValue(savedSearch);

      const result = await service.saveSearch(searchData);

      expect(mockRepository.createSavedSearch).toHaveBeenCalledWith(searchData);
      expect(result).toEqual(savedSearch);
    });
  });

  describe('getSavedSearches', () => {
    it('should get saved searches for user', async () => {
      const savedSearches = [
        {
          id: 'search-1',
          userId: 'user-1',
          name: 'My Search',
          query: 'test',
          filters: null,
          entityTypes: 'users',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.getSavedSearches.mockResolvedValue(savedSearches);

      const result = await service.getSavedSearches('user-1');

      expect(mockRepository.getSavedSearches).toHaveBeenCalledWith('user-1', false);
      expect(result).toEqual(savedSearches);
    });

    it('should include public searches when requested', async () => {
      mockRepository.getSavedSearches.mockResolvedValue([]);

      await service.getSavedSearches('user-1', true);

      expect(mockRepository.getSavedSearches).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('deleteSavedSearch', () => {
    it('should delete saved search', async () => {
      const deletedSearch = {
        id: 'search-1',
        userId: 'user-1',
        name: 'My Search',
        query: 'test',
        filters: null,
        entityTypes: null,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.deleteSavedSearch.mockResolvedValue(deletedSearch);

      const result = await service.deleteSavedSearch('search-1', 'user-1');

      expect(mockRepository.deleteSavedSearch).toHaveBeenCalledWith('search-1', 'user-1');
      expect(result).toEqual(deletedSearch);
    });
  });

  describe('executeSavedSearch', () => {
    it('should execute saved search', async () => {
      const savedSearch = {
        id: 'search-1',
        userId: 'user-1',
        name: 'My Search',
        query: 'test query',
        filters: JSON.stringify({ status: 'active' }),
        entityTypes: 'users,events',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.getSavedSearches.mockResolvedValue([savedSearch]);
      mockRepository.searchAll.mockResolvedValue(mockSearchResults);
      mockRepository.trackSearch.mockResolvedValue({} as any);
      mockRepository.createSearchHistory.mockResolvedValue({} as any);

      const result = await service.executeSavedSearch('user-1', 'search-1');

      expect(result.query).toBe('test query');
      expect(result.results).toEqual(mockSearchResults);
    });

    it('should throw error if saved search not found', async () => {
      mockRepository.getSavedSearches.mockResolvedValue([]);

      await expect(service.executeSavedSearch('user-1', 'invalid'))
        .rejects.toThrow('Saved search not found');
    });
  });

  describe('getSearchHistory', () => {
    it('should get search history for user', async () => {
      const history = [
        {
          id: 'history-1',
          userId: 'user-1',
          query: 'test',
          filters: null,
          entityTypes: null,
          resultCount: 5,
          createdAt: new Date()
        }
      ];

      mockRepository.getSearchHistory.mockResolvedValue(history);

      const result = await service.getSearchHistory('user-1');

      expect(mockRepository.getSearchHistory).toHaveBeenCalledWith('user-1', 10);
      expect(result).toEqual(history);
    });

    it('should respect custom limit', async () => {
      mockRepository.getSearchHistory.mockResolvedValue([]);

      await service.getSearchHistory('user-1', 5);

      expect(mockRepository.getSearchHistory).toHaveBeenCalledWith('user-1', 5);
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear search history', async () => {
      mockRepository.clearSearchHistory.mockResolvedValue(10);

      const result = await service.clearSearchHistory('user-1');

      expect(mockRepository.clearSearchHistory).toHaveBeenCalledWith('user-1');
      expect(result).toBe(10);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return suggestions for valid prefix', async () => {
      const suggestions = ['test', 'testing', 'tester'];
      mockRepository.getSearchSuggestions.mockResolvedValue(suggestions);

      const result = await service.getSearchSuggestions('tes');

      expect(mockRepository.getSearchSuggestions).toHaveBeenCalledWith('tes', 5);
      expect(result).toEqual(suggestions);
    });

    it('should return empty array for short prefix', async () => {
      const result = await service.getSearchSuggestions('t');

      expect(result).toEqual([]);
      expect(mockRepository.getSearchSuggestions).not.toHaveBeenCalled();
    });

    it('should respect custom limit', async () => {
      mockRepository.getSearchSuggestions.mockResolvedValue([]);

      await service.getSearchSuggestions('test', 10);

      expect(mockRepository.getSearchSuggestions).toHaveBeenCalledWith('test', 10);
    });
  });

  describe('getPopularSearches', () => {
    it('should get popular searches', async () => {
      const popular = [
        {
          id: 'analytics-1',
          query: 'popular query',
          resultCount: 10,
          averageResponseTime: 100,
          totalSearches: 50,
          lastSearched: new Date(),
          createdAt: new Date()
        }
      ];

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getPopularSearches();

      expect(mockRepository.getPopularSearches).toHaveBeenCalledWith(10);
      expect(result).toEqual(popular);
    });

    it('should respect custom limit', async () => {
      mockRepository.getPopularSearches.mockResolvedValue([]);

      await service.getPopularSearches(20);

      expect(mockRepository.getPopularSearches).toHaveBeenCalledWith(20);
    });
  });

  describe('getTrendingSearches', () => {
    it('should get trending searches from last 7 days', async () => {
      const recentDate = new Date();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const popular = [
        {
          id: 'analytics-1',
          query: 'recent query',
          resultCount: 10,
          averageResponseTime: 100,
          totalSearches: 50,
          lastSearched: recentDate,
          createdAt: new Date()
        },
        {
          id: 'analytics-2',
          query: 'old query',
          resultCount: 10,
          averageResponseTime: 100,
          totalSearches: 100,
          lastSearched: oldDate,
          createdAt: new Date()
        }
      ];

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getTrendingSearches();

      expect(result).toHaveLength(1);
      expect(result[0].query).toBe('recent query');
    });

    it('should limit results to requested count', async () => {
      const popular = Array.from({ length: 10 }, (_, i) => ({
        id: `analytics-${i}`,
        query: `query ${i}`,
        resultCount: 10,
        averageResponseTime: 100,
        totalSearches: 50,
        lastSearched: new Date(),
        createdAt: new Date()
      }));

      mockRepository.getPopularSearches.mockResolvedValue(popular);

      const result = await service.getTrendingSearches(3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });
});
