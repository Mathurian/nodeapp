"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEvents = exports.getEventStats = exports.unarchiveEvent = exports.archiveEvent = exports.deleteEvent = exports.updateEvent = exports.createEvent = exports.getPastEvents = exports.getOngoingEvents = exports.getUpcomingEvents = exports.getEventWithDetails = exports.getEventById = exports.getAllEvents = exports.EventsController = void 0;
const responseHelpers_1 = require("../utils/responseHelpers");
const tsyringe_1 = require("tsyringe");
const EventService_1 = require("../services/EventService");
const successResponse = (res, data, message, status = 200) => {
    return res.status(status).json({
        success: true,
        message,
        data,
    });
};
class EventsController {
    eventService;
    constructor() {
        this.eventService = tsyringe_1.container.resolve(EventService_1.EventService);
    }
    getAllEvents = async (req, res, next) => {
        try {
            const { archived, search } = req.query;
            const filters = {};
            if (archived !== undefined) {
                filters.archived = archived === 'true';
            }
            if (search && typeof search === 'string') {
                filters.search = search;
            }
            const events = await this.eventService.getAllEvents(filters);
            const now = new Date();
            const eventsWithStatus = events.map(event => {
                let status = 'DRAFT';
                if (event.archived) {
                    status = 'ARCHIVED';
                }
                else if (new Date(event.startDate) <= now && new Date(event.endDate) >= now) {
                    status = 'ACTIVE';
                }
                else if (new Date(event.endDate) < now) {
                    status = 'COMPLETED';
                }
                return {
                    ...event,
                    status,
                };
            });
            (0, responseHelpers_1.sendSuccess)(res, eventsWithStatus);
        }
        catch (error) {
            return next(error);
        }
    };
    getEventById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const event = await this.eventService.getEventById(id);
            return (0, responseHelpers_1.sendSuccess)(res, event);
        }
        catch (error) {
            return next(error);
        }
    };
    getEventWithDetails = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const event = await this.eventService.getEventWithDetails(id);
            return (0, responseHelpers_1.sendSuccess)(res, event);
        }
        catch (error) {
            return next(error);
        }
    };
    getUpcomingEvents = async (_req, res, next) => {
        try {
            const events = await this.eventService.getUpcomingEvents();
            return (0, responseHelpers_1.sendSuccess)(res, events);
        }
        catch (error) {
            return next(error);
        }
    };
    getOngoingEvents = async (_req, res, next) => {
        try {
            const events = await this.eventService.getOngoingEvents();
            return (0, responseHelpers_1.sendSuccess)(res, events);
        }
        catch (error) {
            return next(error);
        }
    };
    getPastEvents = async (_req, res, next) => {
        try {
            const events = await this.eventService.getPastEvents();
            return (0, responseHelpers_1.sendSuccess)(res, events);
        }
        catch (error) {
            return next(error);
        }
    };
    createEvent = async (req, res, next) => {
        try {
            const event = await this.eventService.createEvent(req.body);
            successResponse(res, event, 'Event created successfully', 201);
        }
        catch (error) {
            return next(error);
        }
    };
    updateEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const event = await this.eventService.updateEvent(id, req.body);
            return (0, responseHelpers_1.sendSuccess)(res, event, 'Event updated successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    deleteEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            await this.eventService.deleteEvent(id);
            return (0, responseHelpers_1.sendSuccess)(res, null, 'Event deleted successfully', 204);
        }
        catch (error) {
            return next(error);
        }
    };
    archiveEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const event = await this.eventService.archiveEvent(id);
            return (0, responseHelpers_1.sendSuccess)(res, event, 'Event archived successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    unarchiveEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const event = await this.eventService.unarchiveEvent(id);
            return (0, responseHelpers_1.sendSuccess)(res, event, 'Event unarchived successfully');
        }
        catch (error) {
            return next(error);
        }
    };
    getEventStats = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendSuccess)(res, null, 'Event ID is required', 400);
            }
            const stats = await this.eventService.getEventStats(id);
            return (0, responseHelpers_1.sendSuccess)(res, stats);
        }
        catch (error) {
            return next(error);
        }
    };
    searchEvents = async (req, res, next) => {
        try {
            const { q } = req.query;
            if (!q || typeof q !== 'string') {
                return (0, responseHelpers_1.sendSuccess)(res, []);
            }
            const events = await this.eventService.searchEvents(q);
            return (0, responseHelpers_1.sendSuccess)(res, events);
        }
        catch (error) {
            return next(error);
        }
    };
}
exports.EventsController = EventsController;
const controller = new EventsController();
exports.getAllEvents = controller.getAllEvents;
exports.getEventById = controller.getEventById;
exports.getEventWithDetails = controller.getEventWithDetails;
exports.getUpcomingEvents = controller.getUpcomingEvents;
exports.getOngoingEvents = controller.getOngoingEvents;
exports.getPastEvents = controller.getPastEvents;
exports.createEvent = controller.createEvent;
exports.updateEvent = controller.updateEvent;
exports.deleteEvent = controller.deleteEvent;
exports.archiveEvent = controller.archiveEvent;
exports.unarchiveEvent = controller.unarchiveEvent;
exports.getEventStats = controller.getEventStats;
exports.searchEvents = controller.searchEvents;
exports.default = controller;
//# sourceMappingURL=eventsController.js.map