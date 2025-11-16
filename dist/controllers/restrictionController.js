"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLocked = exports.lockEventContest = exports.canContestantView = exports.setContestantViewRestriction = exports.RestrictionController = void 0;
const tsyringe_1 = require("tsyringe");
const RestrictionService_1 = require("../services/RestrictionService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class RestrictionController {
    restrictionService;
    constructor() {
        this.restrictionService = tsyringe_1.container.resolve(RestrictionService_1.RestrictionService);
    }
    setContestantViewRestriction = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'restriction');
        try {
            const { eventId, contestId, restricted, releaseDate } = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            await this.restrictionService.setContestantViewRestriction({ eventId, contestId, restricted, releaseDate: releaseDate ? new Date(releaseDate) : undefined }, req.user.id, req.user.role);
            log.info('Contestant view restriction set', { eventId, contestId, restricted });
            (0, responseHelpers_1.sendSuccess)(res, null, 'Contestant view restriction updated successfully');
        }
        catch (error) {
            log.error('Set contestant view restriction error', { error: error.message });
            next(error);
        }
    };
    canContestantView = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'restriction');
        try {
            const { eventId, contestId } = req.query;
            const canView = await this.restrictionService.canContestantView(eventId, contestId);
            (0, responseHelpers_1.sendSuccess)(res, { canView });
        }
        catch (error) {
            log.error('Check contestant view error', { error: error.message });
            next(error);
        }
    };
    lockEventContest = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'restriction');
        try {
            const { eventId, contestId, locked, verifiedBy } = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            await this.restrictionService.lockEventContest({ eventId, contestId, locked, verifiedBy }, req.user.id, req.user.role);
            log.info('Event/contest lock updated', { eventId, contestId, locked });
            (0, responseHelpers_1.sendSuccess)(res, null, locked ? 'Event/contest locked successfully' : 'Event/contest unlocked successfully');
        }
        catch (error) {
            log.error('Lock event/contest error', { error: error.message });
            next(error);
        }
    };
    isLocked = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'restriction');
        try {
            const { eventId, contestId } = req.query;
            const locked = await this.restrictionService.isLocked(eventId, contestId);
            (0, responseHelpers_1.sendSuccess)(res, { locked });
        }
        catch (error) {
            log.error('Check lock status error', { error: error.message });
            next(error);
        }
    };
}
exports.RestrictionController = RestrictionController;
const controller = new RestrictionController();
exports.setContestantViewRestriction = controller.setContestantViewRestriction;
exports.canContestantView = controller.canContestantView;
exports.lockEventContest = controller.lockEventContest;
exports.isLocked = controller.isLocked;
//# sourceMappingURL=restrictionController.js.map