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
 * @swagger
 * /api/mfa/setup:
 *   post:
 *     summary: Generate MFA secret and QR code for enrollment
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Initiates MFA setup by generating a secret and QR code for authenticator app
 *     responses:
 *       200:
 *         description: MFA setup initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 secret:
 *                   type: string
 *                   description: Base32 encoded secret for manual entry
 *                   example: "JBSWY3DPEHPK3PXP"
 *                 qrCode:
 *                   type: string
 *                   description: Base64 encoded QR code image
 *                   example: "data:image/png;base64,iVBORw0KGgo..."
 *                 backupCodes:
 *                   type: array
 *                   description: One-time backup codes
 *                   items:
 *                     type: string
 *                   example: ["ABC123", "DEF456", "GHI789"]
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: MFA already enabled
 */
router.post('/setup', (req, res) => mfaController.setupMFA(req, res));

/**
 * @swagger
 * /api/mfa/enable:
 *   post:
 *     summary: Verify and enable MFA for user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Completes MFA enrollment by verifying a token from authenticator app
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code from authenticator app
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "MFA enabled successfully"
 *       400:
 *         description: Invalid token or MFA not set up
 *       401:
 *         description: Unauthorized
 */
router.post('/enable', (req, res) => mfaController.enableMFA(req, res));

/**
 * @swagger
 * /api/mfa/disable:
 *   post:
 *     summary: Disable MFA for user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Disables MFA protection for the user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *                 example: "MySecurePassword123!"
 *               token:
 *                 type: string
 *                 description: Current MFA token or backup code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: MFA disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "MFA disabled successfully"
 *       400:
 *         description: Invalid password or token
 *       401:
 *         description: Unauthorized
 */
router.post('/disable', (req, res) => mfaController.disableMFA(req, res));

/**
 * @swagger
 * /api/mfa/verify:
 *   post:
 *     summary: Verify MFA token during login
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Verifies MFA token as second factor during authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code or backup code
 *                 example: "123456"
 *               trustDevice:
 *                 type: boolean
 *                 description: Remember this device for 30 days
 *                 default: false
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "MFA verification successful"
 *       400:
 *         description: Invalid or expired token
 *       401:
 *         description: Unauthorized
 */
router.post('/verify', (req, res) => mfaController.verifyMFA(req, res));

/**
 * @swagger
 * /api/mfa/backup-codes/regenerate:
 *   post:
 *     summary: Regenerate MFA backup codes
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Generates new set of one-time backup codes, invalidating old ones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Current password for verification
 *                 example: "MySecurePassword123!"
 *     responses:
 *       200:
 *         description: Backup codes regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 backupCodes:
 *                   type: array
 *                   description: New one-time backup codes (store securely)
 *                   items:
 *                     type: string
 *                   example: ["NEW123", "NEW456", "NEW789", "NEW012", "NEW345"]
 *       400:
 *         description: Invalid password or MFA not enabled
 *       401:
 *         description: Unauthorized
 */
router.post('/backup-codes/regenerate', (req, res) => mfaController.regenerateBackupCodes(req, res));

/**
 * @swagger
 * /api/mfa/status:
 *   get:
 *     summary: Get MFA status for current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     description: Returns whether MFA is enabled and other MFA-related information
 *     responses:
 *       200:
 *         description: MFA status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mfaEnabled:
 *                   type: boolean
 *                   example: true
 *                 backupCodesRemaining:
 *                   type: integer
 *                   description: Number of unused backup codes
 *                   example: 5
 *                 lastVerified:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                   description: Last successful MFA verification timestamp
 *       401:
 *         description: Unauthorized
 */
router.get('/status', (req, res) => mfaController.getMFAStatus(req, res));

export default router;
