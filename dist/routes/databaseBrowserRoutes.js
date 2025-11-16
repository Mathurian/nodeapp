"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const databaseBrowserController_1 = require("../controllers/databaseBrowserController");
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']));
router.post('/query', (0, errorHandler_1.logActivity)('DATABASE_QUERY', 'DATABASE'), databaseBrowserController_1.executeQuery);
router.get('/tables', databaseBrowserController_1.getTables);
router.get('/tables/:tableName/schema', databaseBrowserController_1.getTableSchema);
router.get('/tables/:tableName/data', databaseBrowserController_1.getTableData);
router.get('/history', databaseBrowserController_1.getQueryHistory);
exports.default = router;
module.exports = router;
//# sourceMappingURL=databaseBrowserRoutes.js.map