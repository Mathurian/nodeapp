"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestEvent = exports.TestEventSetupController = void 0;
const tsyringe_1 = require("tsyringe");
const TestEventSetupService_1 = require("../services/TestEventSetupService");
const responseHelpers_1 = require("../utils/responseHelpers");
const logger_1 = require("../utils/logger");
class TestEventSetupController {
    testEventSetupService;
    constructor() {
        this.testEventSetupService = tsyringe_1.container.resolve(TestEventSetupService_1.TestEventSetupService);
    }
    createTestEvent = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'testEventSetup');
        try {
            const config = req.body;
            if (!req.user) {
                throw new Error('User not authenticated');
            }
            const result = await this.testEventSetupService.createTestEvent(config, req.user.id, req.user.role);
            log.info('Test event created', { eventId: result.eventId, userId: req.user.id });
            (0, responseHelpers_1.sendCreated)(res, result, result.message);
        }
        catch (error) {
            log.error('Create test event error', { error: error.message });
            return next(error);
        }
    };
}
exports.TestEventSetupController = TestEventSetupController;
const controller = new TestEventSetupController();
exports.createTestEvent = controller.createTestEvent;
//# sourceMappingURL=testEventSetupController.js.map