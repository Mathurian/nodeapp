"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const assignmentsController_1 = require("../controllers/assignmentsController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const assignmentValidation_1 = require("../middleware/assignmentValidation");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', assignmentValidation_1.validateAssignmentQuery, assignmentsController_1.getAllAssignments);
router.post('/', assignmentValidation_1.validateAssignmentCreation, (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('CREATE_ASSIGNMENT', 'ASSIGNMENT'), assignmentsController_1.createAssignment);
router.get('/judges', assignmentsController_1.getJudges);
router.get('/categories', assignmentsController_1.getCategories);
router.get('/contestants', assignmentsController_1.getContestants);
router.get('/contestants/assignments', assignmentsController_1.getAllContestantAssignments);
router.get('/category/:categoryId/contestants', assignmentsController_1.getCategoryContestants);
router.post('/contestants', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('ASSIGN_CONTESTANT', 'ASSIGNMENT'), assignmentsController_1.assignContestantToCategory);
router.delete('/category/:categoryId/contestant/:contestantId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('REMOVE_CONTESTANT', 'ASSIGNMENT'), assignmentsController_1.removeContestantFromCategory);
router.post('/judge', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('ASSIGN_JUDGE', 'ASSIGNMENT'), assignmentsController_1.assignJudge);
router.put('/remove/:assignmentId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('REMOVE_ASSIGNMENT', 'ASSIGNMENT'), assignmentsController_1.removeAssignment);
exports.default = router;
module.exports = router;
//# sourceMappingURL=assignmentsRoutes.js.map