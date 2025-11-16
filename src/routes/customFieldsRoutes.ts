/**
 * Custom Fields Routes
 */

import express from 'express';
import * as customFieldsController from '../controllers/customFieldsController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/custom-fields:
 *   post:
 *     summary: Create custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - key
 *               - type
 *               - entityType
 *             properties:
 *               name:
 *                 type: string
 *               key:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [TEXT, TEXT_AREA, NUMBER, DATE, BOOLEAN, SELECT, MULTI_SELECT, EMAIL, URL, PHONE]
 *               entityType:
 *                 type: string
 *               required:
 *                 type: boolean
 *               defaultValue:
 *                 type: string
 *               options:
 *                 type: object
 *               validation:
 *                 type: object
 *               order:
 *                 type: number
 *     responses:
 *       201:
 *         description: Custom field created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/',
  requireRole([UserRole.ADMIN]),
  customFieldsController.createCustomField
);

/**
 * @swagger
 * /api/custom-fields/{entityType}:
 *   get:
 *     summary: Get custom fields by entity type
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: activeOnly
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Custom fields retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/:entityType',
  customFieldsController.getCustomFieldsByEntityType
);

/**
 * @swagger
 * /api/custom-fields/field/{id}:
 *   get:
 *     summary: Get custom field by ID
 *     tags: [Custom Fields]
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
 *         description: Custom field retrieved
 *       404:
 *         description: Custom field not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/field/:id',
  customFieldsController.getCustomFieldById
);

/**
 * @swagger
 * /api/custom-fields/{id}:
 *   put:
 *     summary: Update custom field
 *     tags: [Custom Fields]
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
 *         description: Custom field updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Custom field not found
 */
router.put(
  '/:id',
  requireRole([UserRole.ADMIN]),
  customFieldsController.updateCustomField
);

/**
 * @swagger
 * /api/custom-fields/{id}:
 *   delete:
 *     summary: Delete custom field
 *     tags: [Custom Fields]
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
 *         description: Custom field deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Custom field not found
 */
router.delete(
  '/:id',
  requireRole([UserRole.ADMIN]),
  customFieldsController.deleteCustomField
);

/**
 * @swagger
 * /api/custom-fields/values:
 *   post:
 *     summary: Set custom field value
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customFieldId
 *               - entityId
 *               - value
 *             properties:
 *               customFieldId:
 *                 type: string
 *               entityId:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom field value set
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/values',
  customFieldsController.setCustomFieldValue
);

/**
 * @swagger
 * /api/custom-fields/values/bulk:
 *   post:
 *     summary: Bulk set custom field values
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityId
 *               - values
 *             properties:
 *               entityId:
 *                 type: string
 *               values:
 *                 type: object
 *     responses:
 *       200:
 *         description: Custom field values set
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/values/bulk',
  customFieldsController.bulkSetCustomFieldValues
);

/**
 * @swagger
 * /api/custom-fields/values/{entityId}:
 *   get:
 *     summary: Get custom field values for entity
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Custom field values retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/values/:entityId',
  customFieldsController.getCustomFieldValues
);

/**
 * @swagger
 * /api/custom-fields/values/{customFieldId}/{entityId}:
 *   delete:
 *     summary: Delete custom field value
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customFieldId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Custom field value deleted
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/values/:customFieldId/:entityId',
  customFieldsController.deleteCustomFieldValue
);

/**
 * @swagger
 * /api/custom-fields/reorder:
 *   post:
 *     summary: Reorder custom fields
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldIds
 *               - entityType
 *             properties:
 *               fieldIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               entityType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom fields reordered
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/reorder',
  requireRole([UserRole.ADMIN]),
  customFieldsController.reorderCustomFields
);

export default router;
