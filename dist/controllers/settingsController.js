"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContestantVisibilitySettings = exports.getContestantVisibilitySettings = exports.getDatabaseConnectionInfo = exports.uploadThemeFavicon = exports.uploadThemeLogo = exports.updateThemeSettings = exports.getThemeSettings = exports.updateJWTConfig = exports.getJWTConfig = exports.updatePasswordPolicy = exports.getPasswordPolicy = exports.updateEmailSettings = exports.getEmailSettings = exports.updateBackupSettings = exports.getBackupSettings = exports.updateSecuritySettings = exports.getSecuritySettings = exports.updateLoggingLevel = exports.getLoggingLevels = exports.testSettings = exports.updateSettings = exports.getPublicSettings = exports.getAppName = exports.getSettings = exports.getAllSettings = exports.SettingsController = void 0;
const container_1 = require("../config/container");
const SettingsService_1 = require("../services/SettingsService");
const responseHelpers_1 = require("../utils/responseHelpers");
class SettingsController {
    settingsService;
    constructor() {
        this.settingsService = container_1.container.resolve(SettingsService_1.SettingsService);
    }
    getAllSettings = async (req, res, next) => {
        try {
            const settings = await this.settingsService.getAllSettings();
            res.json(settings);
        }
        catch (error) {
            next(error);
        }
    };
    getSettings = async (req, res, next) => {
        try {
            const settings = await this.settingsService.getAllSettings();
            res.json(settings);
        }
        catch (error) {
            next(error);
        }
    };
    getAppName = async (req, res, next) => {
        try {
            const appNameSettings = await this.settingsService.getAppName();
            res.json({ data: appNameSettings });
        }
        catch (error) {
            res.json({ data: { appName: 'Event Manager', appSubtitle: '' } });
        }
    };
    getPublicSettings = async (req, res, next) => {
        try {
            const publicSettings = await this.settingsService.getPublicSettings();
            res.json(publicSettings);
        }
        catch (error) {
            next(error);
        }
    };
    updateSettings = async (req, res, next) => {
        try {
            const settings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateSettings(settings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    testSettings = async (req, res, next) => {
        try {
            const { type } = req.params;
            const { testEmail } = req.body;
            if (type === 'email') {
                const success = await this.settingsService.testEmailSettings(testEmail);
                (0, responseHelpers_1.successResponse)(res, { success }, 'Email test successful');
            }
            else {
                res.status(400).json({ error: 'Invalid test type' });
            }
        }
        catch (error) {
            next(error);
        }
    };
    getLoggingLevels = async (req, res, next) => {
        try {
            const loggingLevels = await this.settingsService.getLoggingLevels();
            res.json(loggingLevels);
        }
        catch (error) {
            next(error);
        }
    };
    updateLoggingLevel = async (req, res, next) => {
        try {
            const { level } = req.body;
            const userId = req.user?.id || '';
            const setting = await this.settingsService.updateLoggingLevel(level, userId);
            (0, responseHelpers_1.successResponse)(res, setting, 'Logging level updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getSecuritySettings = async (req, res, next) => {
        try {
            const securitySettings = await this.settingsService.getSecuritySettings();
            res.json(securitySettings);
        }
        catch (error) {
            next(error);
        }
    };
    updateSecuritySettings = async (req, res, next) => {
        try {
            const securitySettings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateSecuritySettings(securitySettings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Security settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getBackupSettings = async (req, res, next) => {
        try {
            const backupSettings = await this.settingsService.getBackupSettings();
            res.json(backupSettings);
        }
        catch (error) {
            next(error);
        }
    };
    updateBackupSettings = async (req, res, next) => {
        try {
            const backupSettings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateBackupSettings(backupSettings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Backup settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getEmailSettings = async (req, res, next) => {
        try {
            const emailSettings = await this.settingsService.getEmailSettings();
            res.json(emailSettings);
        }
        catch (error) {
            next(error);
        }
    };
    updateEmailSettings = async (req, res, next) => {
        try {
            const emailSettings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateEmailSettings(emailSettings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Email settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getPasswordPolicy = async (req, res, next) => {
        try {
            const passwordPolicy = await this.settingsService.getPasswordPolicy();
            res.json(passwordPolicy);
        }
        catch (error) {
            next(error);
        }
    };
    updatePasswordPolicy = async (req, res, next) => {
        try {
            const passwordPolicy = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updatePasswordPolicy(passwordPolicy, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Password policy updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getJWTConfig = async (req, res, next) => {
        try {
            const jwtConfig = await this.settingsService.getJWTConfig();
            res.json(jwtConfig);
        }
        catch (error) {
            next(error);
        }
    };
    updateJWTConfig = async (req, res, next) => {
        try {
            const jwtConfig = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateJWTConfig(jwtConfig, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'JWT configuration updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getThemeSettings = async (req, res, next) => {
        try {
            const themeSettings = await this.settingsService.getThemeSettings();
            res.json(themeSettings);
        }
        catch (error) {
            next(error);
        }
    };
    updateThemeSettings = async (req, res, next) => {
        try {
            const themeSettings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateThemeSettings(themeSettings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Theme settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    uploadThemeLogo = async (req, res, next) => {
        try {
            const file = req.file;
            const userId = req.user?.id || '';
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            const logoPath = `/uploads/${file.filename}`;
            await this.settingsService.updateSetting('theme_logoPath', logoPath, userId);
            (0, responseHelpers_1.successResponse)(res, { logoPath }, 'Logo uploaded successfully');
        }
        catch (error) {
            next(error);
        }
    };
    uploadThemeFavicon = async (req, res, next) => {
        try {
            const file = req.file;
            const userId = req.user?.id || '';
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            const faviconPath = `/uploads/${file.filename}`;
            await this.settingsService.updateSetting('theme_faviconPath', faviconPath, userId);
            (0, responseHelpers_1.successResponse)(res, { faviconPath }, 'Favicon uploaded successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getDatabaseConnectionInfo = async (req, res, next) => {
        try {
            const info = await this.settingsService.getDatabaseConnectionInfo();
            res.json(info);
        }
        catch (error) {
            next(error);
        }
    };
    getContestantVisibilitySettings = async (req, res, next) => {
        try {
            const visibilitySettings = await this.settingsService.getContestantVisibilitySettings();
            const transformed = {
                canViewWinners: visibilitySettings['contestant_visibility_canViewWinners'] === 'true' ||
                    visibilitySettings['canViewWinners'] === 'true',
                canViewOverallResults: visibilitySettings['contestant_visibility_canViewOverallResults'] === 'true' ||
                    visibilitySettings['canViewOverallResults'] === 'true'
            };
            (0, responseHelpers_1.successResponse)(res, transformed, 'Contestant visibility settings retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateContestantVisibilitySettings = async (req, res, next) => {
        try {
            const visibilitySettings = req.body;
            const userId = req.user?.id || '';
            const updatedCount = await this.settingsService.updateContestantVisibilitySettings(visibilitySettings, userId);
            (0, responseHelpers_1.successResponse)(res, { updatedCount }, 'Contestant visibility settings updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SettingsController = SettingsController;
const controller = new SettingsController();
exports.getAllSettings = controller.getAllSettings;
exports.getSettings = controller.getSettings;
exports.getAppName = controller.getAppName;
exports.getPublicSettings = controller.getPublicSettings;
exports.updateSettings = controller.updateSettings;
exports.testSettings = controller.testSettings;
exports.getLoggingLevels = controller.getLoggingLevels;
exports.updateLoggingLevel = controller.updateLoggingLevel;
exports.getSecuritySettings = controller.getSecuritySettings;
exports.updateSecuritySettings = controller.updateSecuritySettings;
exports.getBackupSettings = controller.getBackupSettings;
exports.updateBackupSettings = controller.updateBackupSettings;
exports.getEmailSettings = controller.getEmailSettings;
exports.updateEmailSettings = controller.updateEmailSettings;
exports.getPasswordPolicy = controller.getPasswordPolicy;
exports.updatePasswordPolicy = controller.updatePasswordPolicy;
exports.getJWTConfig = controller.getJWTConfig;
exports.updateJWTConfig = controller.updateJWTConfig;
exports.getThemeSettings = controller.getThemeSettings;
exports.updateThemeSettings = controller.updateThemeSettings;
exports.uploadThemeLogo = controller.uploadThemeLogo;
exports.uploadThemeFavicon = controller.uploadThemeFavicon;
exports.getDatabaseConnectionInfo = controller.getDatabaseConnectionInfo;
exports.getContestantVisibilitySettings = controller.getContestantVisibilitySettings;
exports.updateContestantVisibilitySettings = controller.updateContestantVisibilitySettings;
//# sourceMappingURL=settingsController.js.map