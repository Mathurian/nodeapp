"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const testEventSetupController_1 = require("../controllers/testEventSetupController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/', (0, auth_1.requireRole)(['ADMIN']), (0, errorHandler_1.logActivity)('CREATE_TEST_EVENT', 'EVENT'), testEventSetupController_1.createTestEvent);
exports.default = router;
module.exports = router;
//# sourceMappingURL=testEventSetupRoutes.js.map