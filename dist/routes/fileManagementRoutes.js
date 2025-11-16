"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileManagementController_1 = require("../controllers/fileManagementController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/files', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), fileManagementController_1.getFilesWithFilters);
router.get('/files/search', fileManagementController_1.getFileSearchSuggestions);
router.get('/files/analytics', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), fileManagementController_1.getFileAnalytics);
router.get('/files/:fileId/integrity', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), fileManagementController_1.checkFileIntegrity);
router.post('/files/integrity/bulk', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('BULK_INTEGRITY_CHECK', 'FILE'), fileManagementController_1.bulkCheckFileIntegrity);
exports.default = router;
module.exports = router;
//# sourceMappingURL=fileManagementRoutes.js.map