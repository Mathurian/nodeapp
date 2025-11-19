/**
 * Custom Field Routes
 * Manage custom field definitions and values for extensible entity data
 */

import { Router } from 'express';
import { customFieldController } from '../controllers/CustomFieldController';
import { authenticateToken, checkRoles } from '../middleware/auth';

const router = Router();

// All custom field routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/custom-fields/{entityType}:
 *   get:
 *     summary: Get custom fields for entity type
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all custom field definitions for a specific entity type
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EVENT, CONTEST, USER, CONTESTANT, CATEGORY]
 *         description: Entity type to get custom fields for
 *         example: "EVENT"
 *     responses:
 *       200:
 *         description: List of custom field definitions
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
 *                         example: "Sponsorship Level"
 *                       fieldType:
 *                         type: string
 *                         enum: [TEXT, NUMBER, DATE, BOOLEAN, SELECT, MULTISELECT]
 *                       required:
 *                         type: boolean
 *                       options:
 *                         type: array
 *                         items:
 *                           type: string
 *                       order:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/custom-fields/:entityType', customFieldController.getCustomFields.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/field/{id}:
 *   get:
 *     summary: Get custom field by ID
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a specific custom field definition
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *     responses:
 *       200:
 *         description: Custom field details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Custom field not found
 */
router.get('/custom-fields/field/:id', customFieldController.getCustomFieldById.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields:
 *   post:
 *     summary: Create new custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Create a custom field definition (Admin/Organizer only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - entityType
 *               - fieldType
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Event Sponsor"
 *               entityType:
 *                 type: string
 *                 enum: [EVENT, CONTEST, USER, CONTESTANT, CATEGORY]
 *                 example: "EVENT"
 *               fieldType:
 *                 type: string
 *                 enum: [TEXT, NUMBER, DATE, BOOLEAN, SELECT, MULTISELECT]
 *                 example: "SELECT"
 *               description:
 *                 type: string
 *                 example: "Primary event sponsor"
 *               required:
 *                 type: boolean
 *                 default: false
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Options for SELECT/MULTISELECT fields
 *                 example: ["Gold", "Silver", "Bronze"]
 *               defaultValue:
 *                 type: string
 *                 description: Default value for the field
 *               validation:
 *                 type: object
 *                 description: Validation rules (regex, min, max, etc.)
 *     responses:
 *       201:
 *         description: Custom field created successfully
 *       400:
 *         description: Invalid field definition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 */
router.post('/custom-fields', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.createCustomField.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/{id}:
 *   put:
 *     summary: Update custom field definition
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Update a custom field definition (Admin/Organizer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               required:
 *                 type: boolean
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               defaultValue:
 *                 type: string
 *     responses:
 *       200:
 *         description: Custom field updated successfully
 *       400:
 *         description: Invalid update data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 *       404:
 *         description: Custom field not found
 */
router.put('/custom-fields/:id', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.updateCustomField.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/{id}:
 *   delete:
 *     summary: Delete custom field
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Delete a custom field definition (Admin/Organizer only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *     responses:
 *       200:
 *         description: Custom field deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 *       404:
 *         description: Custom field not found
 */
router.delete('/custom-fields/:id', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.deleteCustomField.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/reorder:
 *   post:
 *     summary: Reorder custom fields
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Update display order of custom fields (Admin/Organizer only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fieldIds
 *             properties:
 *               fieldIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of field IDs in desired order
 *                 example: ["field-id-1", "field-id-2", "field-id-3"]
 *     responses:
 *       200:
 *         description: Custom fields reordered successfully
 *       400:
 *         description: Invalid field IDs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires ADMIN or ORGANIZER role
 */
router.post('/custom-fields/reorder', checkRoles(['ADMIN', 'ORGANIZER']), customFieldController.reorderCustomFields.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/values/{entityId}:
 *   get:
 *     summary: Get custom field values for entity
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all custom field values for a specific entity instance
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity instance ID
 *     responses:
 *       200:
 *         description: Custom field values
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
 *                       customFieldId:
 *                         type: string
 *                       fieldName:
 *                         type: string
 *                       value:
 *                         type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/custom-fields/values/:entityId', customFieldController.getCustomFieldValues.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/values:
 *   post:
 *     summary: Set custom field value
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Set or update a custom field value for an entity
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
 *                 description: Custom field definition ID
 *               entityId:
 *                 type: string
 *                 description: Entity instance ID
 *               value:
 *                 type: string
 *                 description: Value to set (will be validated based on field type)
 *                 example: "Gold"
 *     responses:
 *       200:
 *         description: Custom field value set successfully
 *       400:
 *         description: Invalid value or validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Custom field or entity not found
 */
router.post('/custom-fields/values', customFieldController.setCustomFieldValue.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/values/bulk:
 *   post:
 *     summary: Set multiple custom field values
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Set or update multiple custom field values at once
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
 *                 description: Entity instance ID
 *               values:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customFieldId:
 *                       type: string
 *                     value:
 *                       type: string
 *                 example:
 *                   - customFieldId: "field-1"
 *                     value: "Gold"
 *                   - customFieldId: "field-2"
 *                     value: "100"
 *     responses:
 *       200:
 *         description: Custom field values set successfully
 *       400:
 *         description: Invalid values or validation failed
 *       401:
 *         description: Unauthorized
 */
router.post('/custom-fields/values/bulk', customFieldController.bulkSetCustomFieldValues.bind(customFieldController));

/**
 * @swagger
 * /api/custom-fields/values/{customFieldId}/{entityId}:
 *   delete:
 *     summary: Delete custom field value
 *     tags: [Custom Fields]
 *     security:
 *       - bearerAuth: []
 *     description: Remove a custom field value for an entity
 *     parameters:
 *       - in: path
 *         name: customFieldId
 *         required: true
 *         schema:
 *           type: string
 *         description: Custom field ID
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity instance ID
 *     responses:
 *       200:
 *         description: Custom field value deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Custom field value not found
 */
router.delete('/custom-fields/values/:customFieldId/:entityId', customFieldController.deleteCustomFieldValue.bind(customFieldController));

export default router;
