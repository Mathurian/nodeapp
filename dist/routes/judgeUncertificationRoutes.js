"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const judgeUncertificationController_1 = require("../controllers/judgeUncertificationController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/request', (0, auth_1.requireRole)(['JUDGE']), (0, errorHandler_1.logActivity)('REQUEST_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), judgeUncertificationController_1.requestUncertification);
router.get('/requests', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), judgeUncertificationController_1.getUncertificationRequests);
router.get('/judge/requests', (0, auth_1.requireRole)(['JUDGE']), judgeUncertificationController_1.getJudgeUncertificationRequests);
router.post('/:id/approve', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), (0, errorHandler_1.logActivity)('APPROVE_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), judgeUncertificationController_1.approveUncertification);
router.post('/:id/reject', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), (0, errorHandler_1.logActivity)('REJECT_JUDGE_UNCERTIFICATION', 'CERTIFICATION'), judgeUncertificationController_1.rejectUncertification);
exports.default = router;
module.exports = router;
//# sourceMappingURL=judgeUncertificationRoutes.js.map