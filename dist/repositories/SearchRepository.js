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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchRepository = void 0;
const tsyringe_1 = require("tsyringe");
const client_1 = require("@prisma/client");
const database_1 = __importDefault(require("../config/database"));
let SearchRepository = class SearchRepository {
    prismaClient;
    constructor(prismaClient = database_1.default) {
        this.prismaClient = prismaClient;
    }
    async createSavedSearch(data) {
        return this.prismaClient.savedSearch.create({
            data: {
                userId: data.userId,
                name: data.name,
                query: data.query,
                filters: data.filters ? JSON.stringify(data.filters) : null,
                entityTypes: data.entityTypes?.join(','),
                isPublic: data.isPublic ?? false,
            },
        });
    }
    async getSavedSearches(userId, includePublic = false) {
        const where = includePublic
            ? {
                OR: [{ userId }, { isPublic: true }],
            }
            : { userId };
        return this.prismaClient.savedSearch.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
        });
    }
    async deleteSavedSearch(id, userId) {
        return this.prismaClient.savedSearch.delete({
            where: { id, userId },
        });
    }
    async createSearchHistory(data) {
        return this.prismaClient.searchHistory.create({
            data: {
                userId: data.userId,
                query: data.query,
                filters: data.filters ? JSON.stringify(data.filters) : null,
                entityTypes: data.entityTypes?.join(','),
                resultCount: data.resultCount ?? 0,
            },
        });
    }
    async getSearchHistory(userId, limit = 10) {
        return this.prismaClient.searchHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    async clearSearchHistory(userId) {
        const result = await this.prismaClient.searchHistory.deleteMany({
            where: { userId },
        });
        return result.count;
    }
    async trackSearch(query, resultCount, responseTime) {
        const existing = await this.prismaClient.searchAnalytic.findFirst({
            where: { query },
        });
        if (existing) {
            const newSearchCount = existing.searchCount + 1;
            const newAvgResponseTime = Math.round((existing.avgResponseTime * existing.searchCount + responseTime) / newSearchCount);
            await this.prismaClient.searchAnalytic.update({
                where: { id: existing.id },
                data: {
                    resultCount,
                    avgResponseTime: newAvgResponseTime,
                    searchCount: newSearchCount,
                    lastSearched: new Date(),
                },
            });
        }
        else {
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
    async getPopularSearches(limit = 10) {
        return this.prismaClient.searchAnalytic.findMany({
            orderBy: { searchCount: 'desc' },
            take: limit,
        });
    }
    async getSearchSuggestions(prefix, limit = 5) {
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
    async searchUsers(options) {
        const { query, limit = 20, offset = 0 } = options;
        const users = await this.prismaClient.$queryRaw `
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
            rank: parseFloat(user.rank),
        }));
    }
    async searchEvents(options) {
        const { query, limit = 20, offset = 0 } = options;
        const events = await this.prismaClient.$queryRaw `
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
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return events.map((event) => ({
            id: event.id,
            type: 'event',
            title: event.name,
            description: event.description,
            metadata: {
                startDate: event.startDate,
                endDate: event.endDate,
            },
            rank: parseFloat(event.rank),
        }));
    }
    async searchContests(options) {
        const { query, limit = 20, offset = 0 } = options;
        const contests = await this.prismaClient.$queryRaw `
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
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return contests.map((contest) => ({
            id: contest.id,
            type: 'contest',
            title: contest.name,
            description: contest.description,
            metadata: { eventName: contest.event_name },
            rank: parseFloat(contest.rank),
        }));
    }
    async searchCategories(options) {
        const { query, limit = 20, offset = 0 } = options;
        const categories = await this.prismaClient.$queryRaw `
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
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return categories.map((category) => ({
            id: category.id,
            type: 'category',
            title: category.name,
            description: category.description,
            metadata: { contestName: category.contest_name },
            rank: parseFloat(category.rank),
        }));
    }
    async searchContestants(options) {
        const { query, limit = 20, offset = 0 } = options;
        const contestants = await this.prismaClient.$queryRaw `
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
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return contestants.map((contestant) => ({
            id: contestant.id,
            type: 'contestant',
            title: contestant.name,
            description: contestant.email,
            metadata: { contestantNumber: contestant.contestantNumber },
            rank: parseFloat(contestant.rank),
        }));
    }
    async searchJudges(options) {
        const { query, limit = 20, offset = 0 } = options;
        const judges = await this.prismaClient.$queryRaw `
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
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
        return judges.map((judge) => ({
            id: judge.id,
            type: 'judge',
            title: judge.name,
            description: judge.email,
            metadata: { isHeadJudge: judge.isHeadJudge },
            rank: parseFloat(judge.rank),
        }));
    }
    async searchAll(options) {
        const { entityTypes } = options;
        const results = [];
        const typesToSearch = entityTypes && entityTypes.length > 0
            ? entityTypes
            : ['users', 'events', 'contests', 'categories', 'contestants', 'judges'];
        const promises = [];
        if (typesToSearch.includes('users'))
            promises.push(this.searchUsers(options));
        if (typesToSearch.includes('events'))
            promises.push(this.searchEvents(options));
        if (typesToSearch.includes('contests'))
            promises.push(this.searchContests(options));
        if (typesToSearch.includes('categories'))
            promises.push(this.searchCategories(options));
        if (typesToSearch.includes('contestants'))
            promises.push(this.searchContestants(options));
        if (typesToSearch.includes('judges'))
            promises.push(this.searchJudges(options));
        const resultArrays = await Promise.all(promises);
        resultArrays.forEach((arr) => results.push(...arr));
        results.sort((a, b) => (b.rank || 0) - (a.rank || 0));
        return results.slice(0, options.limit || 20);
    }
};
exports.SearchRepository = SearchRepository;
exports.SearchRepository = SearchRepository = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [client_1.PrismaClient])
], SearchRepository);
//# sourceMappingURL=SearchRepository.js.map