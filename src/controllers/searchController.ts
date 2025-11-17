/**
 * Search Controller
 * Handles HTTP requests for advanced search functionality
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { SearchService } from '../services/SearchService';
import { sendSuccess } from '../utils/responseHelpers';

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
      const userId = req.user!.id;
      const {
        query,
        entityTypes,
        filters,
        limit = 20,
        offset = 0,
        facets,
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const options = {
        query,
        entityTypes: entityTypes ? (entityTypes as string).split(',') : undefined,
        filters: filters ? JSON.parse(filters as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        facets: facets ? JSON.parse(facets as string) : undefined,
      };

      const results = await this.searchService.search(userId, options);

      return sendSuccess(res, results);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search specific entity type
   */
  searchByType = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { type } = req.params;
      const { query, filters, limit = 20, offset = 0 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const options = {
        query,
        filters: filters ? JSON.parse(filters as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const results = await this.searchService.searchByType(userId, type, options);

      return sendSuccess(res, results);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get search suggestions
   */
  getSuggestions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { query, limit = 5 } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      const suggestions = await this.searchService.getSearchSuggestions(query, parseInt(limit as string));

      return sendSuccess(res, suggestions);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get popular searches
   */
  getPopularSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { limit = 10 } = req.query;
      const searches = await this.searchService.getPopularSearches(parseInt(limit as string));

      return sendSuccess(res, searches);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get trending searches
   */
  getTrendingSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { limit = 5 } = req.query;
      const searches = await this.searchService.getTrendingSearches(parseInt(limit as string));

      return sendSuccess(res, searches);
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
      const userId = req.user!.id;
      const { name, query, filters, entityTypes, isPublic } = req.body;

      if (!name || !query) {
        return res.status(400).json({ error: 'Name and query are required' });
      }

      const savedSearch = await this.searchService.saveSearch({
        userId,
        name,
        query,
        filters,
        entityTypes,
        isPublic,
      });

      return sendSuccess(res, savedSearch, 'Search saved successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get saved searches
   */
  getSavedSearches = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { includePublic = 'false' } = req.query;

      const searches = await this.searchService.getSavedSearches(
        userId,
        includePublic === 'true'
      );

      // Parse JSON fields
      const parsed = searches.map((search) => ({
        ...search,
        filters: search.filters ? JSON.parse(search.filters) : null,
        entityTypes: search.entityTypes ? search.entityTypes.split(',') : [],
      }));

      return sendSuccess(res, parsed);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete saved search
   */
  deleteSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await this.searchService.deleteSavedSearch(id, userId);

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Execute saved search
   */
  executeSavedSearch = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const results = await this.searchService.executeSavedSearch(userId, id);

      return sendSuccess(res, results);
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
      const userId = req.user!.id;
      const { limit = 10 } = req.query;

      const history = await this.searchService.getSearchHistory(userId, parseInt(limit as string));

      // Parse JSON fields
      const parsed = history.map((item) => ({
        ...item,
        filters: item.filters ? JSON.parse(item.filters) : null,
        entityTypes: item.entityTypes ? item.entityTypes.split(',') : [],
      }));

      return sendSuccess(res, parsed);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Clear search history
   */
  clearSearchHistory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const count = await this.searchService.clearSearchHistory(userId);

      return sendSuccess(res, { count }, 'Search history cleared successfully');
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
