"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const archiveController_1 = require("../controllers/archiveController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', archiveController_1.getAllArchives);
router.post('/event/:eventId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('ARCHIVE_EVENT', 'EVENT'), archiveController_1.archiveEvent);
router.post('/event/:eventId/restore', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('RESTORE_EVENT', 'EVENT'), archiveController_1.restoreEvent);
router.post('/events/:eventId/restore', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('RESTORE_EVENT', 'EVENT'), archiveController_1.restoreEvent);
router.delete('/event/:eventId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_ARCHIVE', 'EVENT'), archiveController_1.deleteArchivedItem);
router.delete('/events/:eventId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_ARCHIVE', 'EVENT'), archiveController_1.deleteArchivedItem);
exports.default = router;
module.exports = router;
//# sourceMappingURL=archiveRoutes.js.map