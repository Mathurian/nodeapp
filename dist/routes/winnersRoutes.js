"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const winnersController_1 = require("../controllers/winnersController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), winnersController_1.getWinners);
router.get('/category/:categoryId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), winnersController_1.getWinnersByCategory);
router.get('/contest/:contestId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'EMCEE', 'TALLY_MASTER', 'AUDITOR']), winnersController_1.getWinnersByContest);
router.post('/category/:categoryId/sign', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), (0, errorHandler_1.logActivity)('SIGN_WINNERS', 'WINNER'), winnersController_1.signWinners);
router.get('/category/:categoryId/signatures', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), winnersController_1.getSignatureStatus);
router.get('/category/:categoryId/certification-progress', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), winnersController_1.getCertificationProgress);
router.get('/category/:categoryId/certification-status/:role', (0, auth_1.requireRole)(['ADMIN', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'JUDGE']), winnersController_1.getRoleCertificationStatus);
router.post('/category/:categoryId/certify', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), (0, errorHandler_1.logActivity)('CERTIFY_SCORES', 'CERTIFICATION'), winnersController_1.certifyScores);
exports.default = router;
module.exports = router;
//# sourceMappingURL=winnersRoutes.js.map