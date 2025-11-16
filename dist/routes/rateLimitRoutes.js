"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rateLimitController_1 = require("../controllers/rateLimitController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN']), rateLimitController_1.getAllConfigs);
router.get('/my-status', rateLimitController_1.getMyRateLimitStatus);
router.get('/:tier', (0, auth_1.requireRole)(['ADMIN']), rateLimitController_1.getConfig);
router.put('/:tier', (0, auth_1.requireRole)(['ADMIN']), rateLimitController_1.updateConfig);
exports.default = router;
module.exports = router;
//# sourceMappingURL=rateLimitRoutes.js.map