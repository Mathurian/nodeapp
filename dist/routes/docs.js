"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const docsController_1 = require("../controllers/docsController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', docsController_1.listDocs);
router.get('/search', docsController_1.searchDocs);
router.get('/category/:category', docsController_1.getDocsByCategory);
router.get('/*', docsController_1.getDoc);
exports.default = router;
//# sourceMappingURL=docs.js.map