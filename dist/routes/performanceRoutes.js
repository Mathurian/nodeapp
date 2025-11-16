"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const performanceController_1 = require("../controllers/performanceController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/metrics', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), performanceController_1.getSystemMetrics);
router.get('/stats', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), performanceController_1.getPerformanceStats);
exports.default = router;
module.exports = router;
//# sourceMappingURL=performanceRoutes.js.map