"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const cacheController_1 = require("../controllers/cacheController");
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']));
router.get('/stats', cacheController_1.getCacheStats);
router.get('/status', cacheController_1.getCacheStatus);
router.post('/flush', cacheController_1.flushCache);
router.delete('/key/:key', cacheController_1.deleteCacheKey);
router.post('/pattern', cacheController_1.deleteCachePattern);
exports.default = router;
module.exports = router;
//# sourceMappingURL=cacheRoutes.js.map