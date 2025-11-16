"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandlingController_1 = require("../controllers/errorHandlingController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/statistics', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), errorHandlingController_1.getErrorStatistics);
exports.default = router;
module.exports = router;
//# sourceMappingURL=errorHandlingRoutes.js.map