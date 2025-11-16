"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const templatesController_1 = require("../controllers/templatesController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), templatesController_1.getAllTemplates);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_TEMPLATE', 'TEMPLATE'), templatesController_1.createTemplate);
exports.default = router;
module.exports = router;
//# sourceMappingURL=templatesRoutes.js.map