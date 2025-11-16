"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const resultsController_1 = require("../controllers/resultsController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'CONTESTANT', 'EMCEE']));
router.get('/', resultsController_1.getAllResults);
router.get('/categories', resultsController_1.getCategories);
router.get('/contestant/:contestantId', resultsController_1.getContestantResults);
router.get('/category/:categoryId', resultsController_1.getCategoryResults);
router.get('/contest/:contestId', resultsController_1.getContestResults);
router.get('/event/:eventId', resultsController_1.getEventResults);
exports.default = router;
module.exports = router;
//# sourceMappingURL=resultsRoutes.js.map