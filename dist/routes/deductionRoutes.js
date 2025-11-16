"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deductionController_1 = require("../controllers/deductionController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/request', (0, auth_1.requireRole)(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('CREATE_DEDUCTION_REQUEST', 'DEDUCTION'), deductionController_1.createDeductionRequest);
router.get('/pending', deductionController_1.getPendingDeductions);
router.post('/:id/approve', (0, auth_1.requireRole)(['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN']), (0, errorHandler_1.logActivity)('APPROVE_DEDUCTION', 'DEDUCTION'), deductionController_1.approveDeduction);
router.post('/:id/reject', (0, auth_1.requireRole)(['BOARD', 'ORGANIZER', 'ADMIN']), (0, errorHandler_1.logActivity)('REJECT_DEDUCTION', 'DEDUCTION'), deductionController_1.rejectDeduction);
router.get('/:id/approvals', deductionController_1.getApprovalStatus);
router.get('/history', deductionController_1.getDeductionHistory);
exports.default = router;
module.exports = router;
//# sourceMappingURL=deductionRoutes.js.map