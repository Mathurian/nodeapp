"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exportController_1 = require("../controllers/exportController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/event/excel', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('EXPORT_EVENT_EXCEL', 'EXPORT'), exportController_1.exportEventToExcel);
router.get('/history', exportController_1.getExportHistory);
exports.default = router;
module.exports = router;
//# sourceMappingURL=exportRoutes.js.map