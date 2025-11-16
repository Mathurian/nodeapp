"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const judgeContestantCertificationController_1 = require("../controllers/judgeContestantCertificationController");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/category/:categoryId/status', (0, auth_1.requireRole)(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), judgeContestantCertificationController_1.getCategoryCertificationStatus);
exports.default = router;
module.exports = router;
//# sourceMappingURL=judgeCertificationsRoutes.js.map