"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tsyringe_1 = require("tsyringe");
const mfaController_1 = require("../controllers/mfaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const mfaController = tsyringe_1.container.resolve(mfaController_1.MFAController);
router.use(auth_1.authenticateToken);
router.post('/setup', (req, res) => mfaController.setupMFA(req, res));
router.post('/enable', (req, res) => mfaController.enableMFA(req, res));
router.post('/disable', (req, res) => mfaController.disableMFA(req, res));
router.post('/verify', (req, res) => mfaController.verifyMFA(req, res));
router.post('/backup-codes/regenerate', (req, res) => mfaController.regenerateBackupCodes(req, res));
router.get('/status', (req, res) => mfaController.getMFAStatus(req, res));
exports.default = router;
//# sourceMappingURL=mfa.js.map