/**
 * MFA Routes
 *
 * Routes for Multi-Factor Authentication operations
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { MFAController } from '../controllers/mfaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const mfaController = container.resolve(MFAController);

// All MFA routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/mfa/setup
 * @desc    Generate MFA secret and QR code for enrollment
 * @access  Private
 */
router.post('/setup', (req, res) => mfaController.setupMFA(req, res));

/**
 * @route   POST /api/mfa/enable
 * @desc    Verify and enable MFA for user
 * @access  Private
 */
router.post('/enable', (req, res) => mfaController.enableMFA(req, res));

/**
 * @route   POST /api/mfa/disable
 * @desc    Disable MFA for user
 * @access  Private
 */
router.post('/disable', (req, res) => mfaController.disableMFA(req, res));

/**
 * @route   POST /api/mfa/verify
 * @desc    Verify MFA token during login
 * @access  Private
 */
router.post('/verify', (req, res) => mfaController.verifyMFA(req, res));

/**
 * @route   POST /api/mfa/backup-codes/regenerate
 * @desc    Regenerate backup codes
 * @access  Private
 */
router.post('/backup-codes/regenerate', (req, res) => mfaController.regenerateBackupCodes(req, res));

/**
 * @route   GET /api/mfa/status
 * @desc    Get MFA status for current user
 * @access  Private
 */
router.get('/status', (req, res) => mfaController.getMFAStatus(req, res));

export default router;
