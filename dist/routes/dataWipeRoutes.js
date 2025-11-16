"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataWipeController_1 = require("../controllers/dataWipeController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/all', (0, auth_1.requireRole)(['ADMIN']), (0, errorHandler_1.logActivity)('WIPE_ALL_DATA', 'SYSTEM'), dataWipeController_1.wipeAllData);
router.post('/event/:eventId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), (0, errorHandler_1.logActivity)('WIPE_EVENT_DATA', 'EVENT'), dataWipeController_1.wipeEventData);
exports.default = router;
module.exports = router;
//# sourceMappingURL=dataWipeRoutes.js.map