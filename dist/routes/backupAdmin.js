"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const BackupAdminController_1 = __importDefault(require("../controllers/BackupAdminController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use((0, auth_1.checkRoles)(['ADMIN']));
router.get('/', BackupAdminController_1.default.listBackups.bind(BackupAdminController_1.default));
router.get('/stats', BackupAdminController_1.default.getStats.bind(BackupAdminController_1.default));
router.get('/latest', BackupAdminController_1.default.getLatest.bind(BackupAdminController_1.default));
router.get('/health', BackupAdminController_1.default.getHealth.bind(BackupAdminController_1.default));
router.get('/trend', BackupAdminController_1.default.getSizeTrend.bind(BackupAdminController_1.default));
router.get('/files', BackupAdminController_1.default.listBackupFiles.bind(BackupAdminController_1.default));
router.post('/verify', BackupAdminController_1.default.verifyBackups.bind(BackupAdminController_1.default));
router.post('/full', BackupAdminController_1.default.triggerFullBackup.bind(BackupAdminController_1.default));
router.post('/log', BackupAdminController_1.default.logBackup.bind(BackupAdminController_1.default));
router.post('/alert', BackupAdminController_1.default.receiveAlert.bind(BackupAdminController_1.default));
router.delete('/logs/cleanup', BackupAdminController_1.default.cleanupLogs.bind(BackupAdminController_1.default));
exports.default = router;
//# sourceMappingURL=backupAdmin.js.map