"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../utils/config");
const router = express_1.default.Router();
const themeStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'uploads/theme/');
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fieldname = file.fieldname === 'logo' ? 'logo' : 'favicon';
        cb(null, fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const themeUpload = (0, multer_1.default)({
    storage: themeStorage,
    limits: { fileSize: config_1.maxFileSize },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only image files are allowed for logo and favicon.'), false);
        }
    }
});
router.get('/password-policy', settingsController_1.getPasswordPolicy);
router.get('/app-name', settingsController_1.getAppName);
router.get('/public', settingsController_1.getPublicSettings);
router.get('/theme', settingsController_1.getThemeSettings);
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getAllSettings);
router.get('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getSettings);
router.put('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_SETTINGS', 'SETTINGS'), settingsController_1.updateSettings);
router.put('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_SETTINGS', 'SETTINGS'), settingsController_1.updateSettings);
router.post('/test/:type', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.testSettings);
router.get('/logging-levels', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getLoggingLevels);
router.put('/logging-levels', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_LOGGING_LEVEL', 'SETTINGS'), settingsController_1.updateLoggingLevel);
router.get('/security', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getSecuritySettings);
router.put('/security', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_SECURITY_SETTINGS', 'SETTINGS'), settingsController_1.updateSecuritySettings);
router.get('/backup', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getBackupSettings);
router.put('/backup', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_BACKUP_SETTINGS', 'SETTINGS'), settingsController_1.updateBackupSettings);
router.get('/email', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getEmailSettings);
router.put('/email', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_EMAIL_SETTINGS', 'SETTINGS'), settingsController_1.updateEmailSettings);
router.put('/password-policy', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_PASSWORD_POLICY', 'SETTINGS'), settingsController_1.updatePasswordPolicy);
router.get('/jwt-config', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), settingsController_1.getJWTConfig);
router.put('/jwt-config', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('UPDATE_JWT_CONFIG', 'SETTINGS'), settingsController_1.updateJWTConfig);
router.put('/theme', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('UPDATE_THEME_SETTINGS', 'SETTINGS'), settingsController_1.updateThemeSettings);
router.post('/theme/logo', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), themeUpload.single('logo'), (0, errorHandler_1.logActivity)('UPLOAD_THEME_LOGO', 'SETTINGS'), settingsController_1.uploadThemeLogo);
router.post('/theme/favicon', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), themeUpload.single('favicon'), (0, errorHandler_1.logActivity)('UPLOAD_THEME_FAVICON', 'SETTINGS'), settingsController_1.uploadThemeFavicon);
router.get('/contestant-visibility', settingsController_1.getContestantVisibilitySettings);
router.put('/contestant-visibility', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), (0, errorHandler_1.logActivity)('UPDATE_CONTESTANT_VISIBILITY_SETTINGS', 'SETTINGS'), settingsController_1.updateContestantVisibilitySettings);
router.get('/database-connection-info', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), settingsController_1.getDatabaseConnectionInfo);
exports.default = router;
module.exports = router;
//# sourceMappingURL=settingsRoutes.js.map