"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const rateLimiting_1 = require("../middleware/rateLimiting");
const router = express_1.default.Router();
router.use(rateLimiting_1.authLimiter);
router.post('/login', authController_1.login);
router.post('/logout', authController_1.logout);
router.get('/logout', authController_1.logout);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPasswordWithToken);
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.get('/permissions', auth_1.authenticateToken, authController_1.getPermissions);
exports.default = router;
module.exports = router;
//# sourceMappingURL=authRoutes.js.map