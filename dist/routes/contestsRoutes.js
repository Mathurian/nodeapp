"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contestsController_1 = require("../controllers/contestsController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/event/:eventId', contestsController_1.getContestsByEvent);
router.get('/:id', contestsController_1.getContestById);
router.post('/event/:eventId', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.createContestSchema), (0, errorHandler_1.logActivity)('CREATE_CONTEST', 'CONTEST'), contestsController_1.createContest);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.updateContestSchema), (0, errorHandler_1.logActivity)('UPDATE_CONTEST', 'CONTEST'), contestsController_1.updateContest);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_CONTEST', 'CONTEST'), contestsController_1.deleteContest);
router.post('/:id/archive', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('ARCHIVE_CONTEST', 'CONTEST'), contestsController_1.archiveContest);
router.post('/:id/reactivate', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('REACTIVATE_CONTEST', 'CONTEST'), contestsController_1.reactivateContest);
exports.default = router;
module.exports = router;
//# sourceMappingURL=contestsRoutes.js.map