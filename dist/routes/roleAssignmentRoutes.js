"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const roleAssignmentController_1 = require("../controllers/roleAssignmentController");
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), roleAssignmentController_1.getAllRoleAssignments);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), roleAssignmentController_1.createRoleAssignment);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), roleAssignmentController_1.updateRoleAssignment);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER']), roleAssignmentController_1.deleteRoleAssignment);
exports.default = router;
module.exports = router;
//# sourceMappingURL=roleAssignmentRoutes.js.map