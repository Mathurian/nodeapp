"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const printController_1 = require("../controllers/printController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/templates', printController_1.getPrintTemplates);
router.post('/templates', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_PRINT_TEMPLATE', 'TEMPLATE'), printController_1.createPrintTemplate);
router.post('/event-report', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('PRINT_EVENT_REPORT', 'PRINT'), printController_1.printEventReport);
router.post('/contest-results', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('PRINT_CONTEST_RESULTS', 'PRINT'), printController_1.printContestResults);
router.post('/judge-performance', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR']), (0, errorHandler_1.logActivity)('PRINT_JUDGE_PERFORMANCE', 'PRINT'), printController_1.printJudgePerformance);
router.get('/contestant/:id', printController_1.printContestantReport);
router.get('/judge/:id', printController_1.printJudgeReport);
router.get('/category/:id', printController_1.printCategoryReport);
router.get('/contest/:id', printController_1.printContestReport);
router.get('/archived-contest/:id', printController_1.printArchivedContestReport);
exports.default = router;
module.exports = router;
//# sourceMappingURL=printRoutes.js.map