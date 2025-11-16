/**
 * Workflow Routes
 */

import { Router } from 'express';
import * as workflowController from '../controllers/workflowController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

// Templates - Admin only
router.get('/templates', workflowController.listTemplates);
router.post('/templates', requireRole(['ADMIN']), workflowController.createTemplate);
router.get('/templates/:id', workflowController.getTemplate);

// Instances
router.post('/instances', workflowController.startWorkflow);
router.get('/instances/:id', workflowController.getInstance);
router.post('/instances/:id/advance', workflowController.advanceWorkflow);
router.get('/instances/:entityType/:entityId', workflowController.listInstancesForEntity);

export default router;
