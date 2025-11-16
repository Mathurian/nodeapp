"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
const categoryCertificationController_1 = require("../controllers/categoryCertificationController");
const auth_1 = require("../middleware/auth");
router.use(auth_1.authenticateToken);
router.get('/category/:categoryId/progress', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE']), categoryCertificationController_1.getCategoryCertificationProgress);
router.post('/category/:categoryId/contestant/:contestantId/certify', (0, auth_1.requireRole)(['ADMIN', 'TALLY_MASTER', 'AUDITOR']), categoryCertificationController_1.certifyContestant);
router.post('/category/:categoryId/judge/:judgeId/certify', (0, auth_1.requireRole)(['ADMIN', 'TALLY_MASTER', 'AUDITOR']), categoryCertificationController_1.certifyJudgeScores);
router.post('/category/:categoryId/certify', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'TALLY_MASTER', 'AUDITOR', 'BOARD']), categoryCertificationController_1.certifyCategory);
exports.default = router;
module.exports = router;
//# sourceMappingURL=categoryCertificationRoutes.js.map