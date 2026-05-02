/**
 * Search Controller
 * Handles HTTP requests for advanced search functionality
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SearchService } from '../services/SearchService';
import { sendUnauthorized} from '../utils/responseHelpers';

const parseParam = <T>(value: unknown): T | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }
  return value as T;
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
};

const pluralizeSearchType = (type: unknown): unknown => {
  if (type === 'event') return 'events';
  if (type === 'contest') return 'contests';
  if (type === 'user') return 'users';
  if (type === 'category') return 'categories';
  if (type === 'contestant') return 'contestants';
  if (type === 'judge') return 'judges';
  return type;
};

const normalizeSearchResult = <T extends { type?: unknown }>(result: T): T => ({
  ...result,
  type: pluralizeSearchType(result.type),
});

const normalizeSearchResponse = (response: any): any => ({
  ...response,
  results: Array.isArray(response.results)
    ? response.results.map(normalizeSearchResult)
    : response.results,
});

const normalizeAnalytic = (analytic: any): any => ({
  ...analytic,
  totalSearches: analytic.searchCount,
});

export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = container.resolve(SearchService);
  }

  /**
   * Perform global search
   */
  search = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const source = { ...req.query, ...req.body };
      const {
        entityTypes,
        type,
        filters,
        limit = 20,
        offset = 0,
        facets,
      } = source;

      const resolvedQuery = firstString(source.query, source.q);

      if (!resolvedQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      // Accept legacy/simple "type" filter used by frontend and map to entityTypes.
      const resolvedEntityTypes =
        Array.isArray(entityTypes)
          ? entityTypes
          : typeof entityTypes === 'string' && entityTypes.trim().length > 0
          ? entityTypes.split(',')
          : typeof type === 'string' && type !== 'ALL'
            ? [type]
            : undefined;

      const options = {
        query: resolvedQuery,
        entityTypes: resolvedEntityTypes,
        filters: parseParam<Record<string, unknown>>(filters),
        limit: Number.parseInt(String(limit), 10),
        offset: Number.parseInt(String(offset), 10),
        facets: parseParam<any>(facets),
        tenantId: req.user.tenantId
      };

      const results = await this.searchService.search(userId, options);

      return res.json(normalizeSearchResponse(results));
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search specific entity type
   */
  searchByType = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { type } = req.params;
      const source = { ...req.query, ...req.body };
      const { filters, limit = 20, offset = 0 } = source;

      const resolvedQuery = firstString(source.query, source.q);

      if (!resolvedQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const allowedTypes = ['users', 'events', 'contests', 'categories', 'contestants', 'judges'];
      if (!type || !allowedTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid entity type: ${type}` });
      }

      const options = {
        query: resolvedQuery,
        filters: parseParam<Record<string, unknown>>(filters),
        limit: Number.parseInt(String(limit), 10),
        offset: Number.parseInt(String(offset), 10),
        tenantId: req.user.tenantId
      };

      const results = await this.searchService.searchByType(userId, type, options);

      return res.json({ results: results.map(normalizeSearchResult) });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get search suggestions
   */
  getSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { query, q, limit = 5 } = req.query;

      const resolvedQuery = (typeof query === 'string' ? query : undefined)
        || (typeof q === 'string' ? q : undefined);

      if (!resolvedQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const suggestions = await this.searchService.getSearchSuggestions(resolvedQuery, parseInt(limit as string));

      return res.json(suggestions);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get popular searches
   */
  getPopularSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { limit = 10 } = req.query;
      const searches = await this.searchService.getPopularSearches(parseInt(limit as string));

      return res.json(searches.map(normalizeAnalytic));
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get trending searches
   */
  getTrendingSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { limit = 5 } = req.query;
      const searches = await this.searchService.getTrendingSearches(parseInt(limit as string));

      return res.json(searches.map(normalizeAnalytic));
    } catch (error) {
      return next(error);
    }
  };

  // ==================== Saved Searches ====================

  /**
   * Save search
   */
  saveSearch = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { name, query, filters, entityTypes, isPublic } = req.body;

      if (!name || !query) {
        return res.status(400).json({ error: 'Name and query are required' });
      }

      const savedSearch = await this.searchService.saveSearch({
        userId,
        name,
        query,
        filters: parseParam(filters),
        entityTypes: Array.isArray(entityTypes)
          ? entityTypes
          : typeof entityTypes === 'string' && entityTypes.trim().length > 0
            ? entityTypes.split(',')
            : undefined,
        isPublic,
        tenantId: req.user.tenantId
      });

      return res.status(201).json(savedSearch);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get saved searches
   */
  getSavedSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { includePublic = 'false' } = req.query;

      const searches = await this.searchService.getSavedSearches(
        userId,
        req.user.tenantId,
        includePublic === 'true'
      );

      // Parse JSON fields
      const parsed = searches.map((search) => ({
        ...search,
        filters: search.filters ? JSON.parse(search.filters) : null,
        entityTypes: search.entityTypes ? search.entityTypes.split(',') : [],
      }));

      return res.json(parsed);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete saved search
   */
  deleteSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { id } = req.params;

      try {
        await this.searchService.deleteSavedSearch(id!, userId, req.user.tenantId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Saved search not found')) {
          return res.status(404).json({ error: 'Saved search not found' });
        }
        throw error;
      }

      return res.json({ message: 'Saved search deleted successfully' });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Execute saved search
   */
  executeSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { id } = req.params;

      let results;
      try {
        results = await this.searchService.executeSavedSearch(userId, req.user.tenantId, id!);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Saved search not found')) {
          return res.status(404).json({ error: 'Saved search not found' });
        }
        throw error;
      }

      return res.json(normalizeSearchResponse(results));
    } catch (error) {
      return next(error);
    }
  };

  // ==================== Search History ====================

  /**
   * Get search history
   */
  getSearchHistory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const history = await this.searchService.getSearchHistory(userId, req.user.tenantId, parseInt(limit as string));

      // Parse JSON fields
      const parsed = history.map((item) => ({
        ...item,
        filters: item.filters ? JSON.parse(item.filters) : null,
        entityTypes: item.entityTypes ? item.entityTypes.split(',') : [],
      }));

      return res.json(parsed);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Clear search history
   */
  clearSearchHistory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const userId = req.user.id;
      const count = await this.searchService.clearSearchHistory(userId, req.user.tenantId);

      return res.json({ deletedCount: count });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new SearchController();
export const search = controller.search;
export const searchByType = controller.searchByType;
export const getSuggestions = controller.getSuggestions;
export const getPopularSearches = controller.getPopularSearches;
export const getTrendingSearches = controller.getTrendingSearches;
export const saveSearch = controller.saveSearch;
export const getSavedSearches = controller.getSavedSearches;
export const deleteSavedSearch = controller.deleteSavedSearch;
export const executeSavedSearch = controller.executeSavedSearch;
export const getSearchHistory = controller.getSearchHistory;
export const clearSearchHistory = controller.clearSearchHistory;
