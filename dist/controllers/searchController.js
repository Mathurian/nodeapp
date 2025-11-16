"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSearchHistory = exports.getSearchHistory = exports.executeSavedSearch = exports.deleteSavedSearch = exports.getSavedSearches = exports.saveSearch = exports.getTrendingSearches = exports.getPopularSearches = exports.getSuggestions = exports.searchByType = exports.search = exports.SearchController = void 0;
const container_1 = require("../config/container");
const SearchService_1 = require("../services/SearchService");
const responseHelpers_1 = require("../utils/responseHelpers");
class SearchController {
    searchService;
    constructor() {
        this.searchService = container_1.container.resolve(SearchService_1.SearchService);
    }
    search = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { query, entityTypes, filters, limit = 20, offset = 0, facets, } = req.query;
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Query parameter is required' });
            }
            const options = {
                query,
                entityTypes: entityTypes ? entityTypes.split(',') : undefined,
                filters: filters ? JSON.parse(filters) : undefined,
                limit: parseInt(limit),
                offset: parseInt(offset),
                facets: facets ? JSON.parse(facets) : undefined,
            };
            const results = await this.searchService.search(userId, options);
            return (0, responseHelpers_1.sendSuccess)(res, results);
        }
        catch (error) {
            next(error);
        }
    };
    searchByType = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { type } = req.params;
            const { query, filters, limit = 20, offset = 0 } = req.query;
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Query parameter is required' });
            }
            const options = {
                query,
                filters: filters ? JSON.parse(filters) : undefined,
                limit: parseInt(limit),
                offset: parseInt(offset),
            };
            const results = await this.searchService.searchByType(userId, type, options);
            return (0, responseHelpers_1.sendSuccess)(res, results);
        }
        catch (error) {
            next(error);
        }
    };
    getSuggestions = async (req, res, next) => {
        try {
            const { query, limit = 5 } = req.query;
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ error: 'Query parameter is required' });
            }
            const suggestions = await this.searchService.getSearchSuggestions(query, parseInt(limit));
            return (0, responseHelpers_1.sendSuccess)(res, suggestions);
        }
        catch (error) {
            next(error);
        }
    };
    getPopularSearches = async (req, res, next) => {
        try {
            const { limit = 10 } = req.query;
            const searches = await this.searchService.getPopularSearches(parseInt(limit));
            return (0, responseHelpers_1.sendSuccess)(res, searches);
        }
        catch (error) {
            next(error);
        }
    };
    getTrendingSearches = async (req, res, next) => {
        try {
            const { limit = 5 } = req.query;
            const searches = await this.searchService.getTrendingSearches(parseInt(limit));
            return (0, responseHelpers_1.sendSuccess)(res, searches);
        }
        catch (error) {
            next(error);
        }
    };
    saveSearch = async (req, res, next) => {
        try {
            const userId = req.user.id;
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
            return (0, responseHelpers_1.sendSuccess)(res, savedSearch, 'Search saved successfully', 201);
        }
        catch (error) {
            next(error);
        }
    };
    getSavedSearches = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { includePublic = 'false' } = req.query;
            const searches = await this.searchService.getSavedSearches(userId, includePublic === 'true');
            const parsed = searches.map((search) => ({
                ...search,
                filters: search.filters ? JSON.parse(search.filters) : null,
                entityTypes: search.entityTypes ? search.entityTypes.split(',') : [],
            }));
            return (0, responseHelpers_1.sendSuccess)(res, parsed);
        }
        catch (error) {
            next(error);
        }
    };
    deleteSavedSearch = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            await this.searchService.deleteSavedSearch(id, userId);
            return res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    };
    executeSavedSearch = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const results = await this.searchService.executeSavedSearch(userId, id);
            return (0, responseHelpers_1.sendSuccess)(res, results);
        }
        catch (error) {
            next(error);
        }
    };
    getSearchHistory = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const { limit = 10 } = req.query;
            const history = await this.searchService.getSearchHistory(userId, parseInt(limit));
            const parsed = history.map((item) => ({
                ...item,
                filters: item.filters ? JSON.parse(item.filters) : null,
                entityTypes: item.entityTypes ? item.entityTypes.split(',') : [],
            }));
            return (0, responseHelpers_1.sendSuccess)(res, parsed);
        }
        catch (error) {
            next(error);
        }
    };
    clearSearchHistory = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const count = await this.searchService.clearSearchHistory(userId);
            return (0, responseHelpers_1.sendSuccess)(res, { count }, 'Search history cleared successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SearchController = SearchController;
const controller = new SearchController();
exports.search = controller.search;
exports.searchByType = controller.searchByType;
exports.getSuggestions = controller.getSuggestions;
exports.getPopularSearches = controller.getPopularSearches;
exports.getTrendingSearches = controller.getTrendingSearches;
exports.saveSearch = controller.saveSearch;
exports.getSavedSearches = controller.getSavedSearches;
exports.deleteSavedSearch = controller.deleteSavedSearch;
exports.executeSavedSearch = controller.executeSavedSearch;
exports.getSearchHistory = controller.getSearchHistory;
exports.clearSearchHistory = controller.clearSearchHistory;
//# sourceMappingURL=searchController.js.map