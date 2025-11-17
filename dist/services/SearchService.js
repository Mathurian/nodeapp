"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const tsyringe_1 = require("tsyringe");
const SearchRepository_1 = require("../repositories/SearchRepository");
let SearchService = class SearchService {
    searchRepository;
    constructor(searchRepository) {
        this.searchRepository = searchRepository;
    }
    async search(userId, options) {
        const startTime = Date.now();
        const results = await this.searchRepository.searchAll(options);
        const responseTime = Date.now() - startTime;
        await this.searchRepository.trackSearch(options.query, results.length, responseTime);
        await this.searchRepository.createSearchHistory({
            userId,
            tenantId: options.tenantId,
            query: options.query,
            filters: options.filters,
            entityTypes: options.entityTypes,
            resultCount: results.length,
        });
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
    async searchByType(userId, entityType, options) {
        const startTime = Date.now();
        let results = [];
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
    calculateFacets(results, facetOptions) {
        const facets = {};
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
    calculateTypeFacets(results) {
        const typeCounts = new Map();
        results.forEach((result) => {
            const count = typeCounts.get(result.type) || 0;
            typeCounts.set(result.type, count + 1);
        });
        return Array.from(typeCounts.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count);
    }
    calculateDateFacets(results) {
        const dateCounts = new Map();
        results.forEach((result) => {
            if (result.metadata?.startDate) {
                const date = new Date(result.metadata.startDate).toISOString().split('T')[0];
                const count = dateCounts.get(date) || 0;
                dateCounts.set(date, count + 1);
            }
        });
        return Array.from(dateCounts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => b.count - a.count);
    }
    calculateRoleFacets(results) {
        const roleCounts = new Map();
        results.forEach((result) => {
            if (result.metadata?.role) {
                const role = result.metadata.role;
                const count = roleCounts.get(role) || 0;
                roleCounts.set(role, count + 1);
            }
        });
        return Array.from(roleCounts.entries())
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count);
    }
    calculateStatusFacets(results) {
        const statusCounts = new Map();
        results.forEach((result) => {
            if (result.metadata?.status) {
                const status = result.metadata.status;
                const count = statusCounts.get(status) || 0;
                statusCounts.set(status, count + 1);
            }
        });
        return Array.from(statusCounts.entries())
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count);
    }
    async saveSearch(data) {
        return this.searchRepository.createSavedSearch(data);
    }
    async getSavedSearches(userId, tenantId, includePublic = false) {
        return this.searchRepository.getSavedSearches(userId, tenantId, includePublic);
    }
    async deleteSavedSearch(id, userId, tenantId) {
        return this.searchRepository.deleteSavedSearch(id, userId, tenantId);
    }
    async executeSavedSearch(userId, tenantId, savedSearchId) {
        const savedSearch = await this.searchRepository.getSavedSearches(userId, tenantId);
        const search = savedSearch.find((s) => s.id === savedSearchId);
        if (!search) {
            throw new Error('Saved search not found');
        }
        const options = {
            tenantId,
            query: search.query,
            filters: search.filters ? JSON.parse(search.filters) : undefined,
            entityTypes: search.entityTypes ? search.entityTypes.split(',') : undefined,
        };
        return this.search(userId, options);
    }
    async getSearchHistory(userId, tenantId, limit = 10) {
        return this.searchRepository.getSearchHistory(userId, tenantId, limit);
    }
    async clearSearchHistory(userId, tenantId) {
        return this.searchRepository.clearSearchHistory(userId, tenantId);
    }
    async getSearchSuggestions(prefix, limit = 5) {
        if (prefix.length < 2)
            return [];
        return this.searchRepository.getSearchSuggestions(prefix, limit);
    }
    async getPopularSearches(limit = 10) {
        return this.searchRepository.getPopularSearches(limit);
    }
    async getTrendingSearches(limit = 5) {
        const popular = await this.searchRepository.getPopularSearches(limit * 2);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return popular
            .filter((s) => new Date(s.lastSearched) >= sevenDaysAgo)
            .slice(0, limit);
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('SearchRepository')),
    __metadata("design:paramtypes", [SearchRepository_1.SearchRepository])
], SearchService);
//# sourceMappingURL=SearchService.js.map