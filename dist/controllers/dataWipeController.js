"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wipeEventData = exports.wipeAllData = exports.DataWipeController = void 0;
const tsyringe_1 = require("tsyringe");
const DataWipeService_1 = require("../services/DataWipeService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class DataWipeController {
    dataWipeService;
    constructor() {
        this.dataWipeService = tsyringe_1.container.resolve(DataWipeService_1.DataWipeService);
    }
    wipeAllData = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'dataWipe');
        try {
            const { confirmation } = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            await this.dataWipeService.wipeAllData(req.user.id, req.user.role, confirmation);
            log.warn('All data wiped', { userId: req.user.id });
            (0, responseHelpers_1.sendSuccess)(res, null, 'All data wiped successfully');
        }
        catch (error) {
            log.error('Wipe all data error', { error: error.message });
            return next(error);
        }
    };
    wipeEventData = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'dataWipe');
        try {
            const { eventId } = req.params;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            await this.dataWipeService.wipeEventData(eventId, req.user.id, req.user.role);
            log.warn('Event data wiped', { eventId, userId: req.user.id });
            (0, responseHelpers_1.sendSuccess)(res, null, 'Event data wiped successfully');
        }
        catch (error) {
            log.error('Wipe event data error', { error: error.message });
            return next(error);
        }
    };
}
exports.DataWipeController = DataWipeController;
const controller = new DataWipeController();
exports.wipeAllData = controller.wipeAllData;
exports.wipeEventData = controller.wipeEventData;
//# sourceMappingURL=dataWipeController.js.map