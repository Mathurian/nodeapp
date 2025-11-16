"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const judgeController_1 = require("../controllers/judgeController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD']));
router.get('/stats', judgeController_1.getStats);
router.get('/assignments', judgeController_1.getAssignments);
router.get('/scoring/:categoryId', judgeController_1.getScoringInterface);
router.post('/scoring/submit', (0, errorHandler_1.logActivity)('SUBMIT_SCORE', 'SCORE'), judgeController_1.submitScore);
router.get('/certification-workflow/:categoryId', judgeController_1.getCertificationWorkflow);
router.get('/contestant-bios/:categoryId', judgeController_1.getContestantBios);
router.get('/contestant/:contestantNumber', judgeController_1.getContestantBio);
exports.default = router;
module.exports = router;
//# sourceMappingURL=judgeRoutes.js.map