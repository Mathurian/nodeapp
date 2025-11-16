"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const userFieldVisibilityController_1 = require("../controllers/userFieldVisibilityController");
router.get('/', auth_1.authenticateToken, userFieldVisibilityController_1.getFieldVisibilitySettings);
router.put('/:field', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_FIELD_VISIBILITY', 'SETTINGS'), userFieldVisibilityController_1.updateFieldVisibility);
router.post('/reset', auth_1.authenticateToken, (0, auth_1.requireRole)(['ADMIN']), (0, errorHandler_1.logActivity)('RESET_FIELD_VISIBILITY', 'SETTINGS'), userFieldVisibilityController_1.resetFieldVisibility);
exports.default = router;
module.exports = router;
//# sourceMappingURL=userFieldVisibilityRoutes.js.map