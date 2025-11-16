"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const navigation_1 = require("../middleware/navigation");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', navigation_1.getNavigationData);
exports.default = router;
module.exports = router;
//# sourceMappingURL=navigationRoutes.js.map