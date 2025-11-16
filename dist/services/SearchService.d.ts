import { SearchRepository, SearchOptions, SearchResult, CreateSavedSearchDTO } from '../repositories/SearchRepository';
import { SavedSearch, SearchHistory, SearchAnalytic } from '@prisma/client';
export interface FacetedSearchOptions {
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
        types?: Array<{
            type: string;
            count: number;
        }>;
        dates?: Array<{
            date: string;
            count: number;
        }>;
        roles?: Array<{
            role: string;
            count: number;
        }>;
        status?: Array<{
            status: string;
            count: number;
        }>;
    };
    totalCount: number;
    page: number;
    pageSize: number;
    query: string;
}
export declare class SearchService {
    private searchRepository;
    constructor(searchRepository: SearchRepository);
    search(userId: string, options: FacetedSearchOptions): Promise<SearchResponse>;
    searchByType(userId: string, entityType: string, options: SearchOptions): Promise<SearchResult[]>;
    private calculateFacets;
    private calculateTypeFacets;
    private calculateDateFacets;
    private calculateRoleFacets;
    private calculateStatusFacets;
    saveSearch(data: CreateSavedSearchDTO): Promise<SavedSearch>;
    getSavedSearches(userId: string, includePublic?: boolean): Promise<SavedSearch[]>;
    deleteSavedSearch(id: string, userId: string): Promise<SavedSearch>;
    executeSavedSearch(userId: string, savedSearchId: string): Promise<SearchResponse>;
    getSearchHistory(userId: string, limit?: number): Promise<SearchHistory[]>;
    clearSearchHistory(userId: string): Promise<number>;
    getSearchSuggestions(prefix: string, limit?: number): Promise<string[]>;
    getPopularSearches(limit?: number): Promise<SearchAnalytic[]>;
    getTrendingSearches(limit?: number): Promise<SearchAnalytic[]>;
}
//# sourceMappingURL=SearchService.d.ts.map