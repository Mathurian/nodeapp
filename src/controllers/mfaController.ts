/**
 * MFA Controller
 *
 * Handles HTTP requests for Multi-Factor Authentication operations
 */

import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { MFAService } from '../services/MFAService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';

@injectable()
export class MFAController {
  constructor(
    @inject(MFAService) private mfaService: MFAService,
    @inject(ErrorHandlingService) private errorHandler: ErrorHandlingService
  ) {}

  /**
   * Generate MFA secret and QR code for enrollment
   * POST /api/mfa/setup
   */
  async setupMFA(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'setupMFA', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to generate MFA setup',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify and enable MFA
   * POST /api/mfa/enable
   */
  async enableMFA(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'enableMFA', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to enable MFA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Disable MFA
   * POST /api/mfa/disable
   */
  async disableMFA(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'disableMFA', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to disable MFA',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify MFA token during login
   * POST /api/mfa/verify
   */
  async verifyMFA(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'verifyMFA', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to verify MFA token',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Regenerate backup codes
   * POST /api/mfa/backup-codes/regenerate
   */
  async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'regenerateBackupCodes', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to regenerate backup codes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get MFA status
   * GET /api/mfa/status
   */
  async getMFAStatus(req: Request, res: Response): Promise<void> {
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
    } catch (error) {
      this.errorHandler.logError(error, { method: 'getMFAStatus', userId: req.user?.id });
      res.status(500).json({
        error: 'Failed to get MFA status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default MFAController;
