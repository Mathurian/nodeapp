"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const backupController_1 = require("../controllers/backupController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: 'temp/' });
router.use(auth_1.authenticateToken);
router.get('/', backupController_1.listBackups);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_BACKUP', 'BACKUP'), backupController_1.createBackup);
router.post('/create', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_BACKUP', 'BACKUP'), backupController_1.createBackup);
router.post('/restore', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), upload.single('backup'), (0, errorHandler_1.logActivity)('RESTORE_BACKUP', 'BACKUP'), backupController_1.restoreBackup);
router.get('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), backupController_1.getBackupSettings);
router.post('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), (0, errorHandler_1.logActivity)('CREATE_BACKUP_SETTING', 'BACKUP'), backupController_1.createBackupSetting);
router.put('/settings/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), (0, errorHandler_1.logActivity)('UPDATE_BACKUP_SETTING', 'BACKUP'), backupController_1.updateBackupSetting);
router.delete('/settings/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), (0, errorHandler_1.logActivity)('DELETE_BACKUP_SETTING', 'BACKUP'), backupController_1.deleteBackupSetting);
router.post('/settings/test/run', (0, auth_1.requireRole)(['ADMIN']), (0, errorHandler_1.logActivity)('TEST_SCHEDULED_BACKUP', 'BACKUP'), backupController_1.runScheduledBackup);
router.get('/schedules/active', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), backupController_1.getActiveSchedules);
router.get('/settings/debug', (0, auth_1.requireRole)(['ADMIN']), backupController_1.debugBackupSettings);
exports.default = router;
module.exports = router;
//# sourceMappingURL=backupRoutes.js.map