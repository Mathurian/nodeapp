/**
 * Workflow Routes
 */

import { Router } from 'express';
import * as workflowController from '../controllers/workflowController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateToken);

/**
 * Workflow Templates
 */

/**
 * @swagger
 * /api/workflows/templates:
 *   get:
 *     summary: List all workflow templates
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all available workflow templates for the tenant
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of workflow templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                         example: "Contest Approval Workflow"
 *                       description:
 *                         type: string
 *                       steps:
 *                         type: array
 *                         items:
 *                           type: object
 *                       isActive:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/templates', workflowController.listTemplates);

/**
 * @swagger
 * /api/workflows/templates:
 *   post:
 *     summary: Create new workflow template (Admin only)
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Create a custom workflow template for business processes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - steps
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Contest Approval Workflow"
 *               description:
 *                 type: string
 *                 example: "Multi-stage approval process for contests"
 *               steps:
 *                 type: array
 *                 description: Ordered list of workflow steps
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Initial Review"
 *                     assignedRole:
 *                       type: string
 *                       enum: [ADMIN, ORGANIZER, BOARD, TALLY_MASTER, AUDITOR]
 *                     requiredAction:
 *                       type: string
 *                       enum: [APPROVE, REJECT, REVIEW, CERTIFY]
 *                     order:
 *                       type: integer
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Workflow template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid template configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN role
 */
router.post('/templates', requireRole(['SUPER_ADMIN', 'ADMIN']), workflowController.createTemplate);

/**
 * @swagger
 * /api/workflows/templates/{id}:
 *   get:
 *     summary: Get workflow template by ID
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve detailed information about a specific workflow template
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Workflow template details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: object
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template not found
 */
router.get('/templates/:id', workflowController.getTemplate);

/**
 * @swagger
 * /api/workflows/templates/{id}:
 *   put:
 *     summary: Update workflow template (Admin only)
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template not found
 */
router.put('/templates/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), workflowController.updateTemplate);

/**
 * @swagger
 * /api/workflows/templates/{id}:
 *   delete:
 *     summary: Delete workflow template (Admin only)
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Template not found
 */
router.delete('/templates/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), workflowController.deleteTemplate);

/**
 * Workflow Instances
 */

/**
 * @swagger
 * /api/workflows/instances:
 *   post:
 *     summary: Start a new workflow instance
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Initiate a workflow for a specific entity (event, contest, certification, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *               - entityType
 *               - entityId
 *             properties:
 *               templateId:
 *                 type: string
 *                 description: Workflow template to use
 *               entityType:
 *                 type: string
 *                 enum: [EVENT, CONTEST, CERTIFICATION, CATEGORY]
 *                 example: "CONTEST"
 *               entityId:
 *                 type: string
 *                 description: ID of the entity being processed
 *               metadata:
 *                 type: object
 *                 description: Additional context data
 *     responses:
 *       201:
 *         description: Workflow instance started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [IN_PROGRESS, COMPLETED, REJECTED]
 *                     currentStep:
 *                       type: integer
 *       400:
 *         description: Invalid workflow configuration
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Template or entity not found
 */
router.post('/instances', workflowController.startWorkflow);

/**
 * @swagger
 * /api/workflows/instances/{id}:
 *   get:
 *     summary: Get workflow instance details
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve current status and history of a workflow instance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow instance ID
 *     responses:
 *       200:
 *         description: Workflow instance details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     templateId:
 *                       type: string
 *                     entityType:
 *                       type: string
 *                     entityId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [IN_PROGRESS, COMPLETED, REJECTED]
 *                     currentStep:
 *                       type: integer
 *                     history:
 *                       type: array
 *                       description: Workflow execution history
 *                       items:
 *                         type: object
 *                         properties:
 *                           stepName:
 *                             type: string
 *                           action:
 *                             type: string
 *                           performedBy:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           comment:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Workflow instance not found
 */
router.get('/instances/:id', workflowController.getInstance);

/**
 * @swagger
 * /api/workflows/instances/{id}/advance:
 *   post:
 *     summary: Advance workflow to next step
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Perform an action on the current workflow step (approve, reject, etc.)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow instance ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT, REVIEW, CERTIFY]
 *                 example: "APPROVE"
 *               comment:
 *                 type: string
 *                 description: Optional comment for this action
 *                 example: "Approved - all requirements met"
 *     responses:
 *       200:
 *         description: Workflow advanced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     currentStep:
 *                       type: integer
 *                     completed:
 *                       type: boolean
 *       400:
 *         description: Invalid action or workflow state
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - user not assigned to current step
 *       404:
 *         description: Workflow instance not found
 */
router.post('/instances/:id/advance', workflowController.advanceWorkflow);

/**
 * @swagger
 * /api/workflows/instances/{entityType}/{entityId}:
 *   get:
 *     summary: List workflow instances for an entity
 *     tags: [Workflows]
 *     security:
 *       - bearerAuth: []
 *     description: Get all workflow instances associated with a specific entity
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EVENT, CONTEST, CERTIFICATION, CATEGORY]
 *         description: Type of entity
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [IN_PROGRESS, COMPLETED, REJECTED]
 *         description: Filter by workflow status
 *     responses:
 *       200:
 *         description: List of workflow instances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       templateId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       currentStep:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/instances/:entityType/:entityId', workflowController.listInstancesForEntity);

export default router;
