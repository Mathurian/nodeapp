"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const logFilesController_1 = require("../controllers/logFilesController");
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']));
router.get('/files', logFilesController_1.getLogFiles);
router.get('/files/:filename', logFilesController_1.getLogFileContents);
router.get('/files/:filename/download', logFilesController_1.downloadLogFile);
router.delete('/files/:filename', logFilesController_1.deleteLogFile);
router.post('/cleanup', logFilesController_1.cleanupOldLogs);
exports.default = router;
module.exports = router;
//# sourceMappingURL=logFilesRoutes.js.map