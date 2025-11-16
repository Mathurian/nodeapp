"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const eventTemplateController_1 = require("../controllers/eventTemplateController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', eventTemplateController_1.getTemplates);
router.get('/:id', eventTemplateController_1.getTemplate);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_EVENT_TEMPLATE', 'EVENT_TEMPLATE'), eventTemplateController_1.createTemplate);
exports.default = router;
module.exports = router;
//# sourceMappingURL=eventTemplateRoutes.js.map