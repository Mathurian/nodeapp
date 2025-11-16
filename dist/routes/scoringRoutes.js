"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scoringController_1 = require("../controllers/scoringController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/categories', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), scoringController_1.getCategories);
router.post('/category/:categoryId/contestant/:contestantId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('SUBMIT_SCORE', 'SCORE'), scoringController_1.submitScore);
router.post('/category/:categoryId/certify', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('CERTIFY_SCORES', 'SCORE'), scoringController_1.certifyScores);
router.post('/category/:categoryId/certify-totals', (0, auth_1.requireRole)(['ADMIN', 'TALLY_MASTER']), scoringController_1.certifyTotals);
router.post('/category/:categoryId/final-certification', (0, auth_1.requireRole)(['ADMIN', 'AUDITOR']), scoringController_1.finalCertification);
router.post('/category/:categoryId/uncertify', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'ORGANIZER']), (0, errorHandler_1.logActivity)('UNCERTIFY_CATEGORY', 'SCORE'), scoringController_1.uncertifyCategory);
router.put('/:scoreId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('UPDATE_SCORE', 'SCORE'), scoringController_1.updateScore);
router.delete('/:scoreId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('DELETE_SCORE', 'SCORE'), scoringController_1.deleteScore);
router.post('/:scoreId/certify', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('CERTIFY_SCORE', 'SCORE'), scoringController_1.certifyScore);
router.post('/:scoreId/unsign', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UNSIGN_SCORE', 'SCORE'), scoringController_1.unsignScore);
router.post('/deductions', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), (0, errorHandler_1.logActivity)('REQUEST_DEDUCTION', 'DEDUCTION'), scoringController_1.requestDeduction);
router.get('/deductions', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), scoringController_1.getDeductions);
router.post('/deductions/:deductionId/approve', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'AUDITOR', 'TALLY_MASTER']), (0, errorHandler_1.logActivity)('APPROVE_DEDUCTION', 'DEDUCTION'), scoringController_1.approveDeduction);
router.post('/deductions/:deductionId/reject', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('REJECT_DEDUCTION', 'DEDUCTION'), scoringController_1.rejectDeduction);
exports.default = router;
module.exports = router;
//# sourceMappingURL=scoringRoutes.js.map