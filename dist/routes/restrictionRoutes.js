"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const restrictionController_1 = require("../controllers/restrictionController");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.post('/contestant-view', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('SET_CONTESTANT_VIEW_RESTRICTION', 'SETTING'), restrictionController_1.setContestantViewRestriction);
router.get('/contestant-view/check', restrictionController_1.canContestantView);
router.post('/lock', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('LOCK_EVENT_CONTEST', 'EVENT'), restrictionController_1.lockEventContest);
router.get('/lock/check', restrictionController_1.isLocked);
exports.default = router;
module.exports = router;
//# sourceMappingURL=restrictionRoutes.js.map