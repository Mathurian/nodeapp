import express, { Router } from 'express';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import {
  getFieldVisibilitySettings,
  updateFieldVisibility,
  resetFieldVisibility
} from '../controllers/userFieldVisibilityController';

/**
 * @swagger
 * /api/user-field-visibility:
 *   get:
 *     summary: Get field visibility settings
 *     tags: [User Field Visibility]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Field visibility settings retrieved successfully
 */
router.get('/', authenticateToken, getFieldVisibilitySettings)

// Update field visibility
router.put('/:field', authenticateToken, requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_FIELD_VISIBILITY', 'SETTINGS'), updateFieldVisibility)

// Reset field visibility to defaults
router.post('/reset', authenticateToken, requireRole(['ADMIN']), logActivity('RESET_FIELD_VISIBILITY', 'SETTINGS'), resetFieldVisibility)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;