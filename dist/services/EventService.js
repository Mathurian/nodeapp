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
exports.EventService = void 0;
const tsyringe_1 = require("tsyringe");
const BaseService_1 = require("./BaseService");
const EventRepository_1 = require("../repositories/EventRepository");
const CacheService_1 = require("./CacheService");
const RestrictionService_1 = require("./RestrictionService");
let EventService = class EventService extends BaseService_1.BaseService {
    eventRepo;
    cacheService;
    restrictionService;
    constructor(eventRepo, cacheService, restrictionService) {
        super();
        this.eventRepo = eventRepo;
        this.cacheService = cacheService;
        this.restrictionService = restrictionService;
    }
    getCacheKey(id) {
        return `event:${id}`;
    }
    getListCacheKey(filters) {
        return `events:list:${JSON.stringify(filters || {})}`;
    }
    async invalidateEventCache(id) {
        if (id) {
            await this.cacheService.del(this.getCacheKey(id));
        }
        await this.cacheService.invalidatePattern('events:list:*');
        await this.cacheService.invalidatePattern('events:stats:*');
    }
    async createEvent(data) {
        try {
            this.validateRequired(data, ['name', 'startDate', 'endDate']);
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            if (isNaN(startDate.getTime())) {
                throw new BaseService_1.ValidationError('Invalid start date format');
            }
            if (isNaN(endDate.getTime())) {
                throw new BaseService_1.ValidationError('Invalid end date format');
            }
            if (endDate < startDate) {
                throw new BaseService_1.ValidationError('End date must be after start date');
            }
            const event = await this.eventRepo.create({
                ...data,
                startDate,
                endDate,
            });
            await this.invalidateEventCache();
            this.logInfo('Event created', { eventId: event.id });
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'createEvent', data });
        }
    }
    async getEventById(id) {
        try {
            const cacheKey = this.getCacheKey(id);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                this.logInfo('Event cache hit', { eventId: id });
                return cached;
            }
            const event = await this.eventRepo.findById(id);
            if (!event) {
                throw new BaseService_1.NotFoundError('Event', id);
            }
            await this.cacheService.set(cacheKey, event, 3600);
            this.logInfo('Event cache miss', { eventId: id });
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getEventById', id });
        }
    }
    async getEventWithDetails(id) {
        try {
            const cacheKey = `event:details:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const event = await this.eventRepo.findEventWithDetails(id);
            if (!event) {
                throw new BaseService_1.NotFoundError('Event', id);
            }
            await this.cacheService.set(cacheKey, event, 1800);
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getEventWithDetails', id });
        }
    }
    async getAllEvents(filters) {
        try {
            const cacheKey = this.getListCacheKey(filters);
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            let events;
            if (filters?.archived !== undefined) {
                events = filters.archived
                    ? await this.eventRepo.findArchivedEvents()
                    : await this.eventRepo.findActiveEvents();
            }
            else if (filters?.search) {
                events = await this.eventRepo.searchEvents(filters.search);
            }
            else {
                events = await this.eventRepo.findAll();
            }
            await this.cacheService.set(cacheKey, events, 300);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getAllEvents', filters });
        }
    }
    async getUpcomingEvents() {
        try {
            const cacheKey = 'events:upcoming';
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.findUpcomingEvents();
            await this.cacheService.set(cacheKey, events, 300);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getUpcomingEvents' });
        }
    }
    async getOngoingEvents() {
        try {
            const cacheKey = 'events:ongoing';
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.findOngoingEvents();
            await this.cacheService.set(cacheKey, events, 120);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getOngoingEvents' });
        }
    }
    async getPastEvents() {
        try {
            const cacheKey = 'events:past';
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.findPastEvents();
            await this.cacheService.set(cacheKey, events, 3600);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getPastEvents' });
        }
    }
    async updateEvent(id, data) {
        try {
            const isLocked = await this.restrictionService.isLocked(id);
            if (isLocked) {
                throw this.forbiddenError('Event is locked and cannot be edited. Please unlock it first.');
            }
            await this.getEventById(id);
            if (data.startDate || data.endDate) {
                const startDate = data.startDate ? new Date(data.startDate) : undefined;
                const endDate = data.endDate ? new Date(data.endDate) : undefined;
                if (startDate && isNaN(startDate.getTime())) {
                    throw new BaseService_1.ValidationError('Invalid start date format');
                }
                if (endDate && isNaN(endDate.getTime())) {
                    throw new BaseService_1.ValidationError('Invalid end date format');
                }
                if (startDate && endDate && endDate < startDate) {
                    throw new BaseService_1.ValidationError('End date must be after start date');
                }
            }
            const event = await this.eventRepo.update(id, data);
            await this.invalidateEventCache(id);
            this.logInfo('Event updated', { eventId: id });
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'updateEvent', id, data });
        }
    }
    async archiveEvent(id) {
        try {
            const event = await this.eventRepo.archiveEvent(id);
            await this.invalidateEventCache(id);
            this.logInfo('Event archived', { eventId: id });
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'archiveEvent', id });
        }
    }
    async unarchiveEvent(id) {
        try {
            const event = await this.eventRepo.unarchiveEvent(id);
            await this.invalidateEventCache(id);
            this.logInfo('Event unarchived', { eventId: id });
            return event;
        }
        catch (error) {
            return this.handleError(error, { operation: 'unarchiveEvent', id });
        }
    }
    async deleteEvent(id) {
        try {
            const isLocked = await this.restrictionService.isLocked(id);
            if (isLocked) {
                throw this.forbiddenError('Event is locked and cannot be deleted. Please unlock it first.');
            }
            await this.getEventById(id);
            await this.eventRepo.delete(id);
            await this.invalidateEventCache(id);
            this.logInfo('Event deleted', { eventId: id });
        }
        catch (error) {
            return this.handleError(error, { operation: 'deleteEvent', id });
        }
    }
    async getEventStats(id) {
        try {
            const cacheKey = `events:stats:${id}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const stats = await this.eventRepo.getEventStats(id);
            await this.cacheService.set(cacheKey, stats, 300);
            return stats;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getEventStats', id });
        }
    }
    async searchEvents(query) {
        try {
            const cacheKey = `events:search:${query}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.searchEvents(query);
            await this.cacheService.set(cacheKey, events, 300);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'searchEvents', query });
        }
    }
    async getEventsByDateRange(startDate, endDate) {
        try {
            const cacheKey = `events:range:${startDate.toISOString()}:${endDate.toISOString()}`;
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.findEventsByDateRange(startDate, endDate);
            await this.cacheService.set(cacheKey, events, 600);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getEventsByDateRange', startDate, endDate });
        }
    }
    async getEventsRequiringAttention() {
        try {
            const cacheKey = 'events:attention';
            const cached = await this.cacheService.get(cacheKey);
            if (cached) {
                return cached;
            }
            const events = await this.eventRepo.getEventsRequiringAttention();
            await this.cacheService.set(cacheKey, events, 3600);
            return events;
        }
        catch (error) {
            return this.handleError(error, { operation: 'getEventsRequiringAttention' });
        }
    }
};
exports.EventService = EventService;
exports.EventService = EventService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('EventRepository')),
    __param(1, (0, tsyringe_1.inject)('CacheService')),
    __param(2, (0, tsyringe_1.inject)(RestrictionService_1.RestrictionService)),
    __metadata("design:paramtypes", [EventRepository_1.EventRepository,
        CacheService_1.CacheService,
        RestrictionService_1.RestrictionService])
], EventService);
//# sourceMappingURL=EventService.js.map