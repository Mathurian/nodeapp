"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const commentaryController_1 = require("../controllers/commentaryController");
const router = express_1.default.Router();
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
router.use(auth_1.authenticateToken);
router.post("/scores", (0, auth_1.requireRole)(["ADMIN", "JUDGE"]), (0, errorHandler_1.logActivity)("CREATE_SCORE_COMMENT", "COMMENTARY"), commentaryController_1.createScoreComment);
router.post('/', (0, auth_1.requireRole)(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('CREATE_COMMENT', 'COMMENTARY'), commentaryController_1.createComment);
router.get('/score/:scoreId', commentaryController_1.getCommentsForScore);
router.put('/:id', (0, auth_1.requireRole)(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('UPDATE_COMMENT', 'COMMENTARY'), commentaryController_1.updateComment);
router.delete('/:id', (0, auth_1.requireRole)(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('DELETE_COMMENT', 'COMMENTARY'), commentaryController_1.deleteComment);
router.get('/contestant/:contestantId', commentaryController_1.getCommentsByContestant);
exports.default = router;
module.exports = router;
//# sourceMappingURL=commentaryRoutes.js.map