"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const smsController_1 = require("../controllers/smsController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), smsController_1.getSMSConfig);
router.put('/settings', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_SMS_SETTINGS', 'SMS'), smsController_1.updateSMSConfig);
router.post('/send', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('SEND_SMS', 'SMS'), smsController_1.sendSMS);
exports.default = router;
module.exports = router;
//# sourceMappingURL=smsRoutes.js.map