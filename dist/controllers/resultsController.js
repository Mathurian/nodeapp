"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventResults = exports.getContestResults = exports.getCategoryResults = exports.getContestantResults = exports.getCategories = exports.getAllResults = exports.ResultsController = void 0;
const tsyringe_1 = require("tsyringe");
const ResultsService_1 = require("../services/ResultsService");
const logger_1 = require("../utils/logger");
class ResultsController {
    resultsService;
    constructor() {
        this.resultsService = tsyringe_1.container.resolve(ResultsService_1.ResultsService);
    }
    getAllResults = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const userRole = req.user?.role;
            const userId = req.user?.id;
            if (!userRole || !userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const offset = parseInt(req.query.offset) || 0;
            const limit = parseInt(req.query.limit) || 50;
            const page = parseInt(req.query.page) || 1;
            const { results, total } = await this.resultsService.getAllResults({
                userRole,
                userId,
                offset,
                limit,
            });
            res.json({
                results,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            log.error('Get results error:', error);
            return next(error);
        }
    };
    getCategories = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const categories = await this.resultsService.getCategories();
            res.json(categories);
        }
        catch (error) {
            log.error('Get categories error:', error);
            return next(error);
        }
    };
    getContestantResults = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const { contestantId } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            if (!userRole || !userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const results = await this.resultsService.getContestantResults({
                contestantId,
                userRole,
                userId,
            });
            res.json(results);
        }
        catch (error) {
            log.error('Get contestant results error:', error);
            if (error instanceof Error && error.message === 'Access denied. You can only view your own results.') {
                res.status(403).json({ error: error.message });
                return;
            }
            return next(error);
        }
    };
    getCategoryResults = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const { categoryId } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            if (!userRole || !userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const results = await this.resultsService.getCategoryResults({
                categoryId,
                userRole,
                userId,
            });
            res.json(results);
        }
        catch (error) {
            log.error('Get category results error:', error);
            if (error instanceof Error) {
                if (error.message === 'Category not found') {
                    res.status(404).json({ error: error.message });
                    return;
                }
                if (error.message === 'Not assigned to this category') {
                    res.status(403).json({ error: error.message });
                    return;
                }
            }
            return next(error);
        }
    };
    getContestResults = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const { contestId } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            if (!userRole || !userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const results = await this.resultsService.getContestResults({
                contestId,
                userRole,
                userId,
            });
            res.json(results);
        }
        catch (error) {
            log.error('Get contest results error:', error);
            if (error instanceof Error) {
                if (error.message === 'Contest not found') {
                    res.status(404).json({ error: error.message });
                    return;
                }
                if (error.message === 'Not assigned to this contest') {
                    res.status(403).json({ error: error.message });
                    return;
                }
            }
            return next(error);
        }
    };
    getEventResults = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'results');
        try {
            const { eventId } = req.params;
            const userRole = req.user?.role;
            const userId = req.user?.id;
            if (!userRole || !userId) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            const results = await this.resultsService.getEventResults({
                eventId,
                userRole,
                userId,
            });
            res.json(results);
        }
        catch (error) {
            log.error('Get event results error:', error);
            if (error instanceof Error) {
                if (error.message === 'Event not found') {
                    res.status(404).json({ error: error.message });
                    return;
                }
                if (error.message === 'Not assigned to this event') {
                    res.status(403).json({ error: error.message });
                    return;
                }
            }
            return next(error);
        }
    };
}
exports.ResultsController = ResultsController;
const controller = new ResultsController();
exports.getAllResults = controller.getAllResults;
exports.getCategories = controller.getCategories;
exports.getContestantResults = controller.getContestantResults;
exports.getCategoryResults = controller.getCategoryResults;
exports.getContestResults = controller.getContestResults;
exports.getEventResults = controller.getEventResults;
//# sourceMappingURL=resultsController.js.map