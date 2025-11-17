"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileViewUrl = exports.serveScriptFile = exports.toggleScript = exports.deleteScript = exports.updateScript = exports.uploadScript = exports.getEmceeHistory = exports.getContest = exports.getContests = exports.getEvent = exports.getEvents = exports.getJudgeBios = exports.getContestantBios = exports.getScript = exports.getScripts = exports.getStats = exports.EmceeController = void 0;
const tsyringe_1 = require("tsyringe");
const EmceeService_1 = require("../services/EmceeService");
const logger_1 = require("../utils/logger");
const responseHelpers_1 = require("../utils/responseHelpers");
class EmceeController {
    emceeService;
    constructor() {
        this.emceeService = tsyringe_1.container.resolve(EmceeService_1.EmceeService);
    }
    getStats = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const stats = await this.emceeService.getStats();
            res.json(stats);
        }
        catch (error) {
            log.error('Get emcee stats error:', error);
            return next(error);
        }
    };
    getScripts = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { eventId, contestId, categoryId } = req.query;
            const scripts = await this.emceeService.getScripts({
                eventId: eventId,
                contestId: contestId,
                categoryId: categoryId,
            });
            res.json(scripts);
        }
        catch (error) {
            log.error('Get scripts error:', error);
            return next(error);
        }
    };
    getScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { scriptId } = req.params;
            if (!scriptId) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const script = await this.emceeService.getScript(scriptId);
            res.json(script);
        }
        catch (error) {
            log.error('Get script error:', error);
            return next(error);
        }
    };
    getContestantBios = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { eventId, contestId, categoryId } = req.query;
            const contestants = await this.emceeService.getContestantBios({
                eventId: eventId,
                contestId: contestId,
                categoryId: categoryId,
            });
            (0, responseHelpers_1.sendSuccess)(res, contestants, 'Contestant bios retrieved successfully');
        }
        catch (error) {
            log.error('Get contestant bios error:', error);
            return next(error);
        }
    };
    getJudgeBios = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { eventId, contestId, categoryId } = req.query;
            const judges = await this.emceeService.getJudgeBios({
                eventId: eventId,
                contestId: contestId,
                categoryId: categoryId,
            });
            (0, responseHelpers_1.sendSuccess)(res, judges, 'Judge bios retrieved successfully');
        }
        catch (error) {
            log.error('Get judge bios error:', error);
            return next(error);
        }
    };
    getEvents = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const events = await this.emceeService.getEvents();
            res.json(events);
        }
        catch (error) {
            log.error('Get events error:', error);
            return next(error);
        }
    };
    getEvent = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { eventId } = req.params;
            if (!eventId) {
                res.status(400).json({ error: 'Event ID required' });
                return;
            }
            const event = await this.emceeService.getEvent(eventId);
            res.json(event);
        }
        catch (error) {
            log.error('Get event error:', error);
            return next(error);
        }
    };
    getContests = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { eventId } = req.query;
            const contests = await this.emceeService.getContests(eventId);
            res.json(contests);
        }
        catch (error) {
            log.error('Get contests error:', error);
            return next(error);
        }
    };
    getContest = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { contestId } = req.params;
            if (!contestId) {
                res.status(400).json({ error: 'Contest ID required' });
                return;
            }
            const contest = await this.emceeService.getContest(contestId);
            res.json(contest);
        }
        catch (error) {
            log.error('Get contest error:', error);
            return next(error);
        }
    };
    getEmceeHistory = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const history = await this.emceeService.getEmceeHistory(page, limit);
            res.json(history);
        }
        catch (error) {
            log.error('Get emcee history error:', error);
            return next(error);
        }
    };
    uploadScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { title, content, eventId, contestId, categoryId, order } = req.body;
            let filePath = null;
            if (req.file) {
                filePath = `/uploads/emcee/${req.file.filename}`;
            }
            const script = await this.emceeService.uploadScript({
                title,
                content,
                filePath,
                eventId,
                contestId,
                categoryId,
                order: order ? parseInt(order) : 0,
            });
            res.status(201).json(script);
        }
        catch (error) {
            log.error('Upload script error:', error);
            return next(error);
        }
    };
    updateScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const { title, content, eventId, contestId, categoryId, order } = req.body;
            const script = await this.emceeService.updateScript(id, {
                title,
                content,
                eventId,
                contestId,
                categoryId,
                order: order ? parseInt(order) : 0,
            });
            res.json(script);
        }
        catch (error) {
            log.error('Update script error:', error);
            return next(error);
        }
    };
    deleteScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            await this.emceeService.deleteScript(id);
            res.status(204).send();
        }
        catch (error) {
            log.error('Delete script error:', error);
            return next(error);
        }
    };
    toggleScript = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const script = await this.emceeService.getScript(id);
            res.json(script);
        }
        catch (error) {
            log.error('Toggle script error:', error);
            return next(error);
        }
    };
    serveScriptFile = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { scriptId } = req.params;
            if (!scriptId) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            const script = await this.emceeService.getScriptFileInfo(scriptId);
            if (!script.filePath) {
                res.status(404).json({ error: 'Script file not found' });
                return;
            }
            const path = require('path');
            const fs = require('fs');
            const filePath = path.join(__dirname, '../../', script.filePath);
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        }
        catch (error) {
            log.error('Serve script file error:', error);
            return next(error);
        }
    };
    getFileViewUrl = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'emcee');
        try {
            const { scriptId } = req.params;
            if (!scriptId) {
                res.status(400).json({ error: 'Script ID required' });
                return;
            }
            await this.emceeService.getScriptFileInfo(scriptId);
            const viewUrl = `/api/emcee/scripts/${scriptId}/view`;
            res.json({ viewUrl, expiresIn: 300 });
        }
        catch (error) {
            log.error('Get file view URL error:', error);
            return next(error);
        }
    };
}
exports.EmceeController = EmceeController;
const controller = new EmceeController();
exports.getStats = controller.getStats;
exports.getScripts = controller.getScripts;
exports.getScript = controller.getScript;
exports.getContestantBios = controller.getContestantBios;
exports.getJudgeBios = controller.getJudgeBios;
exports.getEvents = controller.getEvents;
exports.getEvent = controller.getEvent;
exports.getContests = controller.getContests;
exports.getContest = controller.getContest;
exports.getEmceeHistory = controller.getEmceeHistory;
exports.uploadScript = controller.uploadScript;
exports.updateScript = controller.updateScript;
exports.deleteScript = controller.deleteScript;
exports.toggleScript = controller.toggleScript;
exports.serveScriptFile = controller.serveScriptFile;
exports.getFileViewUrl = controller.getFileViewUrl;
//# sourceMappingURL=emceeController.js.map