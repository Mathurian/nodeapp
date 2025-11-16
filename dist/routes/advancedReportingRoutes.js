"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const advancedReportingController_1 = require("../controllers/advancedReportingController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/event', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('GENERATE_EVENT_REPORT', 'REPORT'), advancedReportingController_1.generateEventReport);
exports.default = router;
module.exports = router;
//# sourceMappingURL=advancedReportingRoutes.js.map