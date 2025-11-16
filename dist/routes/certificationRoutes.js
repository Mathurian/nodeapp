"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const certificationController_1 = require("../controllers/certificationController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', certificationController_1.getAllCertifications);
router.get('/stats', certificationController_1.getCertificationStats);
router.get('/:id', certificationController_1.getCertificationById);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_CERTIFICATION', 'CERTIFICATION'), certificationController_1.createCertification);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_CERTIFICATION', 'CERTIFICATION'), certificationController_1.updateCertification);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_CERTIFICATION', 'CERTIFICATION'), certificationController_1.deleteCertification);
router.post('/:id/certify-judge', (0, auth_1.requireRole)(['ADMIN', 'JUDGE']), (0, errorHandler_1.logActivity)('CERTIFY_JUDGE', 'CERTIFICATION'), certificationController_1.certifyJudge);
router.post('/:id/certify-tally', (0, auth_1.requireRole)(['ADMIN', 'TALLY_MASTER']), (0, errorHandler_1.logActivity)('CERTIFY_TALLY', 'CERTIFICATION'), certificationController_1.certifyTally);
router.post('/:id/certify-auditor', (0, auth_1.requireRole)(['ADMIN', 'AUDITOR']), (0, errorHandler_1.logActivity)('CERTIFY_AUDITOR', 'CERTIFICATION'), certificationController_1.certifyAuditor);
router.post('/:id/approve-board', (0, auth_1.requireRole)(['ADMIN', 'BOARD']), (0, errorHandler_1.logActivity)('APPROVE_BOARD', 'CERTIFICATION'), certificationController_1.approveBoard);
router.post('/:id/reject', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('REJECT_CERTIFICATION', 'CERTIFICATION'), certificationController_1.rejectCertification);
exports.default = router;
module.exports = router;
//# sourceMappingURL=certificationRoutes.js.map