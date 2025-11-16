"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchContests = exports.getContestStats = exports.getArchivedContests = exports.reactivateContest = exports.archiveContest = exports.deleteContest = exports.updateContest = exports.createContest = exports.getContestsByEvent = exports.getContestById = exports.ContestsController = void 0;
const container_1 = require("../config/container");
const ContestService_1 = require("../services/ContestService");
const responseHelpers_1 = require("../utils/responseHelpers");
class ContestsController {
    contestService;
    constructor() {
        this.contestService = container_1.container.resolve(ContestService_1.ContestService);
    }
    getContestById = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const contest = await this.contestService.getContestWithDetails(id);
            return (0, responseHelpers_1.sendSuccess)(res, contest, 'Contest retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getContestsByEvent = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            const { includeArchived } = req.query;
            if (!eventId) {
                return (0, responseHelpers_1.sendError)(res, 'Event ID is required', 400);
            }
            const contests = await this.contestService.getContestsByEventId(eventId, includeArchived === 'true', true);
            return (0, responseHelpers_1.sendSuccess)(res, contests, 'Contests retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createContest = async (req, res, next) => {
        try {
            const { eventId } = req.params;
            if (!eventId) {
                return (0, responseHelpers_1.sendError)(res, 'Event ID is required', 400);
            }
            const { name, description, contestantNumberingMode } = req.body;
            const contest = await this.contestService.createContest({
                eventId,
                name,
                description,
                contestantNumberingMode,
            });
            return (0, responseHelpers_1.sendCreated)(res, contest, 'Contest created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateContest = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const { name, description, contestantNumberingMode } = req.body;
            const contest = await this.contestService.updateContest(id, {
                name,
                description,
                contestantNumberingMode,
            });
            return (0, responseHelpers_1.sendSuccess)(res, contest, 'Contest updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deleteContest = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            await this.contestService.deleteContest(id);
            return (0, responseHelpers_1.sendNoContent)(res);
        }
        catch (error) {
            next(error);
        }
    };
    archiveContest = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const contest = await this.contestService.archiveContest(id);
            return (0, responseHelpers_1.sendSuccess)(res, contest, 'Contest archived successfully');
        }
        catch (error) {
            next(error);
        }
    };
    reactivateContest = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const contest = await this.contestService.unarchiveContest(id);
            return (0, responseHelpers_1.sendSuccess)(res, contest, 'Contest reactivated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getArchivedContests = async (req, res, next) => {
        try {
            const { eventId } = req.query;
            const contests = eventId
                ? await this.contestService.getContestsByEventId(eventId, true, true)
                : [];
            return (0, responseHelpers_1.sendSuccess)(res, contests, 'Archived contests retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getContestStats = async (req, res, next) => {
        try {
            const { id } = req.params;
            if (!id) {
                return (0, responseHelpers_1.sendError)(res, 'Contest ID is required', 400);
            }
            const stats = await this.contestService.getContestStats(id);
            return (0, responseHelpers_1.sendSuccess)(res, stats, 'Contest statistics retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    searchContests = async (req, res, next) => {
        try {
            const { query } = req.query;
            if (!query || typeof query !== 'string') {
                return (0, responseHelpers_1.sendError)(res, 'Search query is required', 400);
            }
            const contests = await this.contestService.searchContests(query);
            return (0, responseHelpers_1.sendSuccess)(res, contests, 'Search results retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ContestsController = ContestsController;
const controller = new ContestsController();
exports.getContestById = controller.getContestById;
exports.getContestsByEvent = controller.getContestsByEvent;
exports.createContest = controller.createContest;
exports.updateContest = controller.updateContest;
exports.deleteContest = controller.deleteContest;
exports.archiveContest = controller.archiveContest;
exports.reactivateContest = controller.reactivateContest;
exports.getArchivedContests = controller.getArchivedContests;
exports.getContestStats = controller.getContestStats;
exports.searchContests = controller.searchContests;
//# sourceMappingURL=contestsController.js.map