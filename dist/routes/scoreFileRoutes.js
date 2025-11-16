"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scoreFileController_1 = require("../controllers/scoreFileController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), (0, errorHandler_1.logActivity)('UPLOAD_SCORE_FILE', 'SCORE'), scoreFileController_1.uploadScoreFile);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.getAllScoreFiles);
router.get('/:id', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.getScoreFileById);
router.get('/category/:categoryId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.getScoreFilesByCategory);
router.get('/judge/:judgeId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.getScoreFilesByJudge);
router.get('/contestant/:contestantId', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.getScoreFilesByContestant);
router.patch('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_SCORE_FILE', 'SCORE'), scoreFileController_1.updateScoreFile);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER']), (0, errorHandler_1.logActivity)('DELETE_SCORE_FILE', 'SCORE'), scoreFileController_1.deleteScoreFile);
router.get('/download/:id', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), scoreFileController_1.downloadScoreFile);
exports.default = router;
module.exports = router;
//# sourceMappingURL=scoreFileRoutes.js.map