"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAController = void 0;
const tsyringe_1 = require("tsyringe");
const MFAService_1 = require("../services/MFAService");
const ErrorHandlingService_1 = require("../services/ErrorHandlingService");
let MFAController = class MFAController {
    mfaService;
    errorHandler;
    constructor(mfaService, errorHandler) {
        this.mfaService = mfaService;
        this.errorHandler = errorHandler;
    }
    async setupMFA(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const setup = await this.mfaService.generateMFASecret(userId);
            res.status(200).json({
                success: true,
                data: setup
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'setupMFA', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to generate MFA setup',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async enableMFA(req, res) {
        try {
            const userId = req.user?.id;
            const { secret, token, backupCodes } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (!secret || !token || !backupCodes) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }
            const result = await this.mfaService.enableMFA(userId, secret, token, backupCodes);
            res.status(200).json({
                success: result.success,
                message: result.message
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'enableMFA', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to enable MFA',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async disableMFA(req, res) {
        try {
            const userId = req.user?.id;
            const { password } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (!password) {
                res.status(400).json({ error: 'Password is required' });
                return;
            }
            const result = await this.mfaService.disableMFA(userId, password);
            res.status(200).json({
                success: result.success,
                message: result.message
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'disableMFA', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to disable MFA',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async verifyMFA(req, res) {
        try {
            const userId = req.user?.id;
            const { token } = req.body;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (!token) {
                res.status(400).json({ error: 'Verification code is required' });
                return;
            }
            const result = await this.mfaService.verifyMFAToken(userId, token);
            res.status(200).json({
                success: result.success,
                message: result.message,
                remainingBackupCodes: result.remainingBackupCodes
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'verifyMFA', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to verify MFA token',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async regenerateBackupCodes(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const backupCodes = await this.mfaService.regenerateBackupCodes(userId);
            res.status(200).json({
                success: true,
                data: { backupCodes }
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'regenerateBackupCodes', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to regenerate backup codes',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async getMFAStatus(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            const status = await this.mfaService.getMFAStatus(userId);
            res.status(200).json({
                success: true,
                data: status
            });
        }
        catch (error) {
            this.errorHandler.logError(error, { method: 'getMFAStatus', userId: req.user?.id });
            res.status(500).json({
                error: 'Failed to get MFA status',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
};
exports.MFAController = MFAController;
exports.MFAController = MFAController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)(MFAService_1.MFAService)),
    __param(1, (0, tsyringe_1.inject)(ErrorHandlingService_1.ErrorHandlingService)),
    __metadata("design:paramtypes", [MFAService_1.MFAService,
        ErrorHandlingService_1.ErrorHandlingService])
], MFAController);
exports.default = MFAController;
//# sourceMappingURL=mfaController.js.map