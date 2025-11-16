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
exports.ContestService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const ContestRepository_1 = require("../repositories/ContestRepository");
const cacheService_1 = require("./cacheService");
const RestrictionService_1 = require("./RestrictionService");
let ContestService = class ContestService extends BaseService_1.BaseService {
    contestRepo;
    cacheService;
    restrictionService;
    constructor(contestRepo, cacheService, restrictionService) {
        super();
        this.contestRepo = contestRepo;
        this.cacheService = cacheService;
        this.restrictionService = restrictionService;
    }
    getCacheKey(id) {
        return `contest:${id}`;
    }
    async invalidateContestCache(id, eventId) {
        if (id) {
            await this.cacheService.del(this.getCacheKey(id));
            await this.cacheService.del(`contest:details:${id}`);
        }
        if (eventId) {
            await this.cacheService.del(`contests:event:${eventId}`);
        }
        await this.cacheService.invalidatePattern('contests:*');
    }
    async createContest(data) {
        try {
            this.validateRequired(data, ['eventId', 'name']);
            const contest = await this.contestRepo.create(data);
            await this.invalidateContestCache(undefined, data.eventId);
            this.logInfo('Contest created', { contestId: contest.id, eventId: data.eventId });
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'createContest', data });
        }
    }
    async getContestById(id) {
        try {
            const cacheKey = this.getCacheKey(id);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const contest = await this.contestRepo.findById(id);
            if (!contest) {
                throw new BaseService_1.NotFoundError('Contest', id);
            }
            await this.cacheService.set(cacheKey, contest, 1800);
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getContestById', id });
        }
    }
    async getContestWithDetails(id) {
        try {
            const cacheKey = `contest:details:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const contest = await this.contestRepo.findContestWithDetails(id);
            if (!contest) {
                throw new BaseService_1.NotFoundError('Contest', id);
            }
            await this.cacheService.set(cacheKey, contest, 900);
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getContestWithDetails', id });
        }
    }
    async getContestsByEventId(eventId, includeArchived = false, forEventView = false) {
        try {
            const cacheKey = `contests:event:${eventId}:${includeArchived}:${forEventView}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            let contests;
            if (forEventView) {
                contests = await this.contestRepo.findByEventIdWithArchived(eventId, includeArchived);
            }
            else {
                contests = includeArchived
                    ? await this.contestRepo.findByEventId(eventId, false)
                    : await this.contestRepo.findActiveByEventId(eventId);
            }
            await this.cacheService.set(cacheKey, contests, 600);
            return contests;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getContestsByEventId', eventId });
        }
    }
    async updateContest(id, data) {
        try {
            const isLocked = await this.restrictionService.isLocked(undefined, id);
            if (isLocked) {
                throw this.forbiddenError('Contest is locked and cannot be edited. Please unlock it first.');
            }
            const existing = await this.getContestById(id);
            const contest = await this.contestRepo.update(id, data);
            await this.invalidateContestCache(id, existing.eventId);
            this.logInfo('Contest updated', { contestId: id });
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'updateContest', id, data });
        }
    }
    async archiveContest(id) {
        try {
            const existing = await this.getContestById(id);
            const contest = await this.contestRepo.archiveContest(id);
            await this.invalidateContestCache(id, existing.eventId);
            this.logInfo('Contest archived', { contestId: id });
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'archiveContest', id });
        }
    }
    async unarchiveContest(id) {
        try {
            const existing = await this.getContestById(id);
            const contest = await this.contestRepo.unarchiveContest(id);
            await this.invalidateContestCache(id, existing.eventId);
            this.logInfo('Contest unarchived', { contestId: id });
            return contest;
        }
        catch (error) {
            return this.handleError(error, { operation: 'unarchiveContest', id });
        }
    }
    async deleteContest(id) {
        try {
            const isLocked = await this.restrictionService.isLocked(undefined, id);
            if (isLocked) {
                throw this.forbiddenError('Contest is locked and cannot be deleted. Please unlock it first.');
            }
            const existing = await this.getContestById(id);
            await this.contestRepo.delete(id);
            await this.invalidateContestCache(id, existing.eventId);
            this.logInfo('Contest deleted', { contestId: id });
        }
        catch (error) {
            return this.handleError(error, { operation: 'deleteContest', id });
        }
    }
    async getContestStats(id) {
        try {
            const cacheKey = `contest:stats:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const stats = await this.contestRepo.getContestStats(id);
            await this.cacheService.set(cacheKey, stats, 300);
            return stats;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getContestStats', id });
        }
    }
    async searchContests(query) {
        try {
            const cacheKey = `contests:search:${query}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const contests = await this.contestRepo.searchContests(query);
            await this.cacheService.set(cacheKey, contests, 300);
            return contests;
        }
        catch (error) {
            return this.handleError(error, { operation: 'searchContests', query });
        }
    }
    async getNextContestantNumber(contestId) {
        try {
            return await this.contestRepo.getNextContestantNumber(contestId);
        }
        catch (error) {
            return this.handleError(error, { operation: 'getNextContestantNumber', contestId });
        }
    }
    async assignContestantNumber(contestId) {
        try {
            const contest = await this.getContestById(contestId);
            if (contest.contestantNumberingMode !== 'AUTO_INDEXED') {
                throw new BaseService_1.ValidationError('Contest is not in AUTO_INDEXED numbering mode');
            }
            const currentNumber = await this.contestRepo.getNextContestantNumber(contestId);
            await this.contestRepo.incrementContestantNumber(contestId);
            await this.invalidateContestCache(contestId, contest.eventId);
            return currentNumber;
        }
        catch (error) {
            return this.handleError(error, { operation: 'assignContestantNumber', contestId });
        }
    }
};
exports.ContestService = ContestService;
exports.ContestService = ContestService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('ContestRepository')),
    __param(1, (0, tsyringe_1.inject)('CacheService')),
    __param(2, (0, tsyringe_1.inject)(RestrictionService_1.RestrictionService)),
    __metadata("design:paramtypes", [ContestRepository_1.ContestRepository,
        cacheService_1.CacheService,
        RestrictionService_1.RestrictionService])
], ContestService);
//# sourceMappingURL=ContestService.js.map