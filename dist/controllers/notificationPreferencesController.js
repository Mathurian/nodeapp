"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPreferences = exports.updatePreferences = exports.getPreferences = exports.NotificationPreferencesController = void 0;
const container_1 = require("../config/container");
const NotificationPreferenceRepository_1 = require("../repositories/NotificationPreferenceRepository");
const responseHelpers_1 = require("../utils/responseHelpers");
class NotificationPreferencesController {
    preferenceRepository;
    constructor() {
        this.preferenceRepository = container_1.container.resolve(NotificationPreferenceRepository_1.NotificationPreferenceRepository);
    }
    getPreferences = async (req, res, next) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const preferences = await this.preferenceRepository.getOrCreate(tenantId, userId);
            const parsed = {
                ...preferences,
                emailTypes: preferences.emailTypes || [],
                pushTypes: preferences.pushTypes || [],
                inAppTypes: preferences.inAppTypes || [],
            };
            return (0, responseHelpers_1.sendSuccess)(res, parsed);
        }
        catch (error) {
            next(error);
        }
    };
    updatePreferences = async (req, res, next) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            const { emailEnabled, pushEnabled, inAppEnabled, emailDigestFrequency, emailTypes, pushTypes, inAppTypes, quietHoursStart, quietHoursEnd, } = req.body;
            const preferences = await this.preferenceRepository.update(tenantId, userId, {
                emailEnabled,
                pushEnabled,
                inAppEnabled,
                emailDigestFrequency,
                emailTypes,
                pushTypes,
                inAppTypes,
                quietHoursStart,
                quietHoursEnd,
            });
            const parsed = {
                ...preferences,
                emailTypes: preferences.emailTypes || [],
                pushTypes: preferences.pushTypes || [],
                inAppTypes: preferences.inAppTypes || [],
            };
            return (0, responseHelpers_1.sendSuccess)(res, parsed, 'Notification preferences updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    resetPreferences = async (req, res, next) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.id;
            await this.preferenceRepository.delete(tenantId, userId).catch(() => { });
            const preferences = await this.preferenceRepository.create({ tenantId, userId });
            const parsed = {
                ...preferences,
                emailTypes: [],
                pushTypes: [],
                inAppTypes: [],
            };
            return (0, responseHelpers_1.sendSuccess)(res, parsed, 'Notification preferences reset to defaults');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.NotificationPreferencesController = NotificationPreferencesController;
const controller = new NotificationPreferencesController();
exports.getPreferences = controller.getPreferences;
exports.updatePreferences = controller.updatePreferences;
exports.resetPreferences = controller.resetPreferences;
//# sourceMappingURL=notificationPreferencesController.js.map