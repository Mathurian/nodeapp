"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreEvent = exports.archiveEvent = exports.deleteArchivedItem = exports.restoreItem = exports.archiveItem = exports.getArchivedEvents = exports.getActiveEvents = exports.getAllArchives = exports.ArchiveController = void 0;
const tsyringe_1 = require("tsyringe");
const ArchiveService_1 = require("../services/ArchiveService");
const logger_1 = require("../utils/logger");
class ArchiveController {
    archiveService;
    constructor() {
        this.archiveService = tsyringe_1.container.resolve(ArchiveService_1.ArchiveService);
    }
    getAllArchives = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const archives = await this.archiveService.getAllArchives();
            res.json(archives);
        }
        catch (error) {
            log.error('Get archives error:', error);
            return next(error);
        }
    };
    getActiveEvents = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const events = await this.archiveService.getActiveEvents();
            res.json(events);
        }
        catch (error) {
            log.error('Get active events error:', error);
            return next(error);
        }
    };
    getArchivedEvents = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const events = await this.archiveService.getArchivedEvents();
            res.json(events);
        }
        catch (error) {
            log.error('Get archived events error:', error);
            return next(error);
        }
    };
    archiveItem = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            if (!id) {
                res.status(400).json({ error: 'Item ID required' });
                return;
            }
            const archive = await this.archiveService.archiveItem(id, reason, userId);
            res.json(archive);
        }
        catch (error) {
            log.error('Archive item error:', error);
            return next(error);
        }
    };
    restoreItem = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Item ID required' });
                return;
            }
            const result = await this.archiveService.restoreItem(id);
            res.json(result);
        }
        catch (error) {
            log.error('Restore item error:', error);
            return next(error);
        }
    };
    deleteArchivedItem = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Item ID required' });
                return;
            }
            const result = await this.archiveService.deleteArchivedItem(id);
            res.json(result);
        }
        catch (error) {
            log.error('Delete archived item error:', error);
            return next(error);
        }
    };
    archiveEvent = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const { eventId } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            if (!eventId || !userId) {
                res.status(400).json({ error: 'Event ID and user required' });
                return;
            }
            const archive = await this.archiveService.archiveEvent(eventId, userId, reason);
            res.json(archive);
        }
        catch (error) {
            log.error('Archive event error:', error);
            return next(error);
        }
    };
    restoreEvent = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'archive');
        try {
            const { eventId } = req.params;
            if (!eventId) {
                res.status(400).json({ error: 'Event ID required' });
                return;
            }
            const result = await this.archiveService.restoreEvent(eventId);
            res.json(result);
        }
        catch (error) {
            log.error('Restore event error:', error);
            return next(error);
        }
    };
}
exports.ArchiveController = ArchiveController;
const controller = new ArchiveController();
exports.getAllArchives = controller.getAllArchives;
exports.getActiveEvents = controller.getActiveEvents;
exports.getArchivedEvents = controller.getArchivedEvents;
exports.archiveItem = controller.archiveItem;
exports.restoreItem = controller.restoreItem;
exports.deleteArchivedItem = controller.deleteArchivedItem;
exports.archiveEvent = controller.archiveEvent;
exports.restoreEvent = controller.restoreEvent;
//# sourceMappingURL=archiveController.js.map