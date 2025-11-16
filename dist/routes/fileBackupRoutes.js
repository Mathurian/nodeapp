"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileBackupController_1 = require("../controllers/fileBackupController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/create', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('CREATE_FILE_BACKUP', 'BACKUP'), fileBackupController_1.createFileBackup);
router.get('/', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), fileBackupController_1.listFileBackups);
exports.default = router;
module.exports = router;
//# sourceMappingURL=fileBackupRoutes.js.map