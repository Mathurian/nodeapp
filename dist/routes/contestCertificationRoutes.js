"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const contestCertificationController_1 = require("../controllers/contestCertificationController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/:contestId/progress', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER', 'JUDGE']), contestCertificationController_1.getContestCertificationProgress);
exports.default = router;
module.exports = router;
//# sourceMappingURL=contestCertificationRoutes.js.map