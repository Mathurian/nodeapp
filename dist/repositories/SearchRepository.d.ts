import { PrismaClient, SavedSearch, SearchHistory, SearchAnalytic } from '@prisma/client';
export interface CreateSavedSearchDTO {
    userId: string;
    tenantId: string;
    name: string;
    query: string;
    filters?: Record<string, any>;
    entityTypes?: string[];
    isPublic?: boolean;
}
export interface CreateSearchHistoryDTO {
    userId: string;
    tenantId: string;
    query: string;
    filters?: Record<string, any>;
    entityTypes?: string[];
    resultCount?: number;
}
export interface SearchOptions {
    tenantId: string;
    query?: string;
    entityTypes?: string[];
    filters?: Record<string, any>;
    limit?: number;
    offset?: number;
}
export interface SearchResult {
    id: string;
    type: string;
    title: string;
    description?: string;
    metadata?: Record<string, any>;
    rank?: number;
}
export declare class SearchRepository {
    private prismaClient;
    constructor(prismaClient?: PrismaClient);
    createSavedSearch(data: CreateSavedSearchDTO): Promise<SavedSearch>;
    getSavedSearches(userId: string, tenantId: string, includePublic?: boolean): Promise<SavedSearch[]>;
    deleteSavedSearch(id: string, userId: string, tenantId: string): Promise<SavedSearch>;
    createSearchHistory(data: CreateSearchHistoryDTO): Promise<SearchHistory>;
    getSearchHistory(userId: string, tenantId: string, limit?: number): Promise<SearchHistory[]>;
    clearSearchHistory(userId: string, tenantId: string): Promise<number>;
    trackSearch(query: string, resultCount: number, responseTime: number): Promise<void>;
    getPopularSearches(limit?: number): Promise<SearchAnalytic[]>;
    getSearchSuggestions(prefix: string, limit?: number): Promise<string[]>;
    searchUsers(options: SearchOptions): Promise<SearchResult[]>;
    searchEvents(options: SearchOptions): Promise<SearchResult[]>;
    searchContests(options: SearchOptions): Promise<SearchResult[]>;
    searchCategories(options: SearchOptions): Promise<SearchResult[]>;
    searchContestants(options: SearchOptions): Promise<SearchResult[]>;
    searchJudges(options: SearchOptions): Promise<SearchResult[]>;
    searchAll(options: SearchOptions): Promise<SearchResult[]>;
}
//# sourceMappingURL=SearchRepository.d.ts.map