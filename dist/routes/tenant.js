"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenantController_1 = __importDefault(require("../controllers/tenantController"));
const auth_1 = require("../middleware/auth");
const tenantMiddleware_1 = require("../middleware/tenantMiddleware");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/current', tenantController_1.default.getCurrentTenant);
router.get('/:id', tenantController_1.default.getTenant);
router.put('/:id', tenantController_1.default.updateTenant);
router.get('/:id/analytics', tenantController_1.default.getTenantAnalytics);
router.post('/:id/users/invite', tenantController_1.default.inviteUser);
router.get('/', tenantMiddleware_1.superAdminOnly, tenantController_1.default.listTenants);
router.post('/', tenantMiddleware_1.superAdminOnly, tenantController_1.default.createTenant);
router.post('/:id/activate', tenantMiddleware_1.superAdminOnly, tenantController_1.default.activateTenant);
router.post('/:id/deactivate', tenantMiddleware_1.superAdminOnly, tenantController_1.default.deactivateTenant);
router.delete('/:id', tenantMiddleware_1.superAdminOnly, tenantController_1.default.deleteTenant);
exports.default = router;
//# sourceMappingURL=tenant.js.map