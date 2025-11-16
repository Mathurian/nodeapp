"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const emailController_1 = require("../controllers/emailController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/templates', emailController_1.getTemplates);
router.post('/templates', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_EMAIL_TEMPLATE', 'EMAIL'), emailController_1.createTemplate);
router.get('/campaigns', emailController_1.getCampaigns);
router.post('/campaigns', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_EMAIL_CAMPAIGN', 'EMAIL'), emailController_1.createCampaign);
router.post('/send-multiple', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('SEND_MULTIPLE_EMAILS', 'EMAIL'), emailController_1.sendMultipleEmails);
router.post('/send-by-role', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('SEND_EMAIL_BY_ROLE', 'EMAIL'), emailController_1.sendEmailByRole);
router.get('/logs', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), emailController_1.getLogs);
exports.default = router;
module.exports = router;
//# sourceMappingURL=emailRoutes.js.map