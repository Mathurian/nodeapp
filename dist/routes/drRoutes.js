"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drController = __importStar(require("../controllers/drController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
router.get('/config', (0, auth_1.requireRole)(['ADMIN']), drController.getDRConfig);
router.put('/config/:id', (0, auth_1.requireRole)(['ADMIN']), drController.updateDRConfig);
router.get('/schedules', (0, auth_1.requireRole)(['ADMIN']), drController.listBackupSchedules);
router.post('/schedules', (0, auth_1.requireRole)(['ADMIN']), drController.createBackupSchedule);
router.put('/schedules/:id', (0, auth_1.requireRole)(['ADMIN']), drController.updateBackupSchedule);
router.delete('/schedules/:id', (0, auth_1.requireRole)(['ADMIN']), drController.deleteBackupSchedule);
router.get('/targets', (0, auth_1.requireRole)(['ADMIN']), drController.listBackupTargets);
router.post('/targets', (0, auth_1.requireRole)(['ADMIN']), drController.createBackupTarget);
router.put('/targets/:id', (0, auth_1.requireRole)(['ADMIN']), drController.updateBackupTarget);
router.delete('/targets/:id', (0, auth_1.requireRole)(['ADMIN']), drController.deleteBackupTarget);
router.post('/targets/:id/verify', (0, auth_1.requireRole)(['ADMIN']), drController.verifyBackupTarget);
router.post('/backup/execute', (0, auth_1.requireRole)(['ADMIN']), drController.executeBackup);
router.post('/test/execute', (0, auth_1.requireRole)(['ADMIN']), drController.executeDRTest);
router.get('/metrics', (0, auth_1.requireRole)(['ADMIN']), drController.getDRMetrics);
router.get('/dashboard', (0, auth_1.requireRole)(['ADMIN']), drController.getDRDashboard);
router.get('/rto-rpo', (0, auth_1.requireRole)(['ADMIN']), drController.checkRTORPO);
exports.default = router;
//# sourceMappingURL=drRoutes.js.map