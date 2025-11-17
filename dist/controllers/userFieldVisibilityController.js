"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetFieldVisibility = exports.updateFieldVisibility = exports.getFieldVisibilitySettings = exports.UserFieldVisibilityController = void 0;
const tsyringe_1 = require("tsyringe");
const UserFieldVisibilityService_1 = require("../services/UserFieldVisibilityService");
const logger_1 = require("../utils/logger");
class UserFieldVisibilityController {
    userFieldVisibilityService;
    constructor() {
        this.userFieldVisibilityService = tsyringe_1.container.resolve(UserFieldVisibilityService_1.UserFieldVisibilityService);
    }
    getFieldVisibilitySettings = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'userfieldvisibility');
        try {
            const settings = await this.userFieldVisibilityService.getFieldVisibilitySettings();
            res.json(settings);
        }
        catch (error) {
            log.error('Get field visibility settings error:', error);
            return next(error);
        }
    };
    updateFieldVisibility = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'userfieldvisibility');
        try {
            const { field } = req.params;
            const { visible, required } = req.body;
            const userId = req.user?.id;
            if (!field || typeof visible !== 'boolean') {
                res.status(400).json({ error: 'Field name and visible status are required' });
                return;
            }
            const result = await this.userFieldVisibilityService.updateFieldVisibility(field, visible, required, userId);
            res.json(result);
        }
        catch (error) {
            log.error('Update field visibility error:', error);
            return next(error);
        }
    };
    resetFieldVisibility = async (req, res, next) => {
        const log = (0, logger_1.createRequestLogger)(req, 'userfieldvisibility');
        try {
            const result = await this.userFieldVisibilityService.resetFieldVisibility();
            res.json(result);
        }
        catch (error) {
            log.error('Reset field visibility error:', error);
            return next(error);
        }
    };
}
exports.UserFieldVisibilityController = UserFieldVisibilityController;
const controller = new UserFieldVisibilityController();
exports.getFieldVisibilitySettings = controller.getFieldVisibilitySettings;
exports.updateFieldVisibility = controller.updateFieldVisibility;
exports.resetFieldVisibility = controller.resetFieldVisibility;
//# sourceMappingURL=userFieldVisibilityController.js.map