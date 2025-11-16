"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trackerController_1 = require("../controllers/trackerController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use((0, auth_1.requireRole)(['TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN']));
router.get('/scoring/contest/:contestId', trackerController_1.getScoringProgressByContest);
router.get('/scoring/category/:categoryId', trackerController_1.getScoringProgressByCategory);
router.get('/certification/status', trackerController_1.getCertificationStatus);
router.get('/certification/pending', trackerController_1.getPendingCertifications);
exports.default = router;
module.exports = router;
//# sourceMappingURL=trackerRoutes.js.map