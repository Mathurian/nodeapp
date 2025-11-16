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
exports.BulkEventController = void 0;
const tsyringe_1 = require("tsyringe");
const BulkOperationService_1 = require("../services/BulkOperationService");
const EventService_1 = require("../services/EventService");
const logger_1 = require("../utils/logger");
const Logger = (0, logger_1.createLogger)('BulkEventController');
let BulkEventController = class BulkEventController {
    bulkOperationService;
    eventService;
    constructor(bulkOperationService, eventService) {
        this.bulkOperationService = bulkOperationService;
        this.eventService = eventService;
    }
    async changeEventStatus(req, res) {
        try {
            const { eventIds, status } = req.body;
            if (!Array.isArray(eventIds) || eventIds.length === 0) {
                res.status(400).json({ error: 'eventIds array is required' });
                return;
            }
            const validStatuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
                });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (eventId) => {
                const event = await this.eventService.getEventById(eventId);
                await this.eventService.updateEvent(eventId, { ...event, status });
            }, eventIds);
            Logger.info('Bulk change event status completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk status change completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk change event status failed', { error });
            res.status(500).json({
                error: 'Failed to change event status',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async deleteEvents(req, res) {
        try {
            const { eventIds } = req.body;
            if (!Array.isArray(eventIds) || eventIds.length === 0) {
                res.status(400).json({ error: 'eventIds array is required' });
                return;
            }
            const result = await this.bulkOperationService.executeBulkOperation(async (eventId) => {
                await this.eventService.deleteEvent(eventId);
            }, eventIds);
            Logger.info('Bulk delete events completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk delete completed',
                result
            });
        }
        catch (error) {
            Logger.error('Bulk delete events failed', { error });
            res.status(500).json({
                error: 'Failed to delete events',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async cloneEvents(req, res) {
        try {
            const { eventIds } = req.body;
            if (!Array.isArray(eventIds) || eventIds.length === 0) {
                res.status(400).json({ error: 'eventIds array is required' });
                return;
            }
            const clonedEvents = [];
            const result = await this.bulkOperationService.executeBulkOperation(async (eventId) => {
                const event = await this.eventService.getEventById(eventId);
                const cloned = await this.eventService.createEvent({
                    ...event,
                    name: event.name + ' (Copy)',
                    status: 'DRAFT'
                });
                clonedEvents.push(cloned);
            }, eventIds);
            Logger.info('Bulk clone events completed', { result, userId: req.user?.id });
            res.json({
                message: 'Bulk clone completed',
                result,
                clonedEvents
            });
        }
        catch (error) {
            Logger.error('Bulk clone events failed', { error });
            res.status(500).json({
                error: 'Failed to clone events',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
exports.BulkEventController = BulkEventController;
exports.BulkEventController = BulkEventController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(BulkOperationService_1.BulkOperationService)),
    __param(1, (0, tsyringe_1.inject)(EventService_1.EventService)),
    __metadata("design:paramtypes", [BulkOperationService_1.BulkOperationService,
        EventService_1.EventService])
], BulkEventController);
//# sourceMappingURL=BulkEventController.js.map