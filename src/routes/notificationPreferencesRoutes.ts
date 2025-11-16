/**
 * Notification Preferences Routes
 */

import { Router } from 'express';
import {
  getPreferences,
  updatePreferences,
  resetPreferences,
} from '../controllers/notificationPreferencesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get notification preferences
router.get('/', getPreferences);

// Update notification preferences
router.put('/', updatePreferences);

// Reset preferences to default
router.post('/reset', resetPreferences);

export default router;
