/**
 * Events Log Routes
 */

import { Router } from 'express';
import * as eventsLogController from '../controllers/eventsLogController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// Event Logs - accessible by Admin and Auditor
router.get('/', eventsLogController.listEventLogs);
router.get('/:id', eventsLogController.getEventLog);

// Webhooks - Admin only
router.get('/webhooks', requireRole(['ADMIN']), eventsLogController.listWebhooks);
router.post('/webhooks', requireRole(['ADMIN']), eventsLogController.createWebhook);
router.put('/webhooks/:id', requireRole(['ADMIN']), eventsLogController.updateWebhook);
router.delete('/webhooks/:id', requireRole(['ADMIN']), eventsLogController.deleteWebhook);

export default router;
