/**
 * Tenant Routes
 *
 * Routes for tenant management operations
 */

import express from 'express';
import TenantController from '../controllers/tenantController';
import { authenticateToken } from '../middleware/auth';
import { superAdminOnly } from '../middleware/tenantMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Public tenant routes (authenticated users)
 */

/**
 * @swagger
 * /api/tenants/current:
 *   get:
 *     summary: Get current tenant information
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Returns information about the tenant associated with the authenticated user
 *     responses:
 *       200:
 *         description: Current tenant information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tenant not found
 */
router.get('/current', TenantController.getCurrentTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get specific tenant by ID
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Get tenant information (own tenant or super admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     responses:
 *       200:
 *         description: Tenant information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only access own tenant unless super admin
 *       404:
 *         description: Tenant not found
 */
router.get('/:id', TenantController.getTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update tenant information
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Update tenant (own tenant admins or super admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Organization Name"
 *               domain:
 *                 type: string
 *                 example: "custom.domain.com"
 *               settings:
 *                 type: object
 *                 description: Tenant-specific settings
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Tenant not found
 */
router.put('/:id', TenantController.updateTenant);

/**
 * @swagger
 * /api/tenants/{id}/analytics:
 *   get:
 *     summary: Get tenant analytics and usage statistics
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Get usage statistics for tenant (own tenant or super admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Analytics period
 *     responses:
 *       200:
 *         description: Tenant analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userCount:
 *                   type: integer
 *                 eventCount:
 *                   type: integer
 *                 contestCount:
 *                   type: integer
 *                 storageUsed:
 *                   type: integer
 *                   description: Storage used in bytes
 *                 apiCallsThisMonth:
 *                   type: integer
 *                 activeUsers:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/:id/analytics', TenantController.getTenantAnalytics);

/**
 * @swagger
 * /api/tenants/{id}/users/invite:
 *   post:
 *     summary: Invite user to tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Send invitation email to join tenant (tenant admins or super admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newuser@example.com"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, ORGANIZER, JUDGE, CONTESTANT, BOARD, EMCEE, TALLY_MASTER, AUDITOR]
 *                 example: "JUDGE"
 *               name:
 *                 type: string
 *                 example: "Jane Doe"
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 invitationId:
 *                   type: string
 *       400:
 *         description: Invalid email or role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires admin permissions
 */
router.post('/:id/users/invite', TenantController.inviteUser);

/**
 * Super admin only routes
 */

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: List all tenants (Super Admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Get list of all tenants in the system (requires super admin)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, suspended]
 *       - in: query
 *         name: planType
 *         schema:
 *           type: string
 *           enum: [free, pro, enterprise]
 *     responses:
 *       200:
 *         description: List of tenants
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
 *                     $ref: '#/components/schemas/Tenant'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super admin
 */
router.get('/', superAdminOnly, TenantController.listTenants);

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Create new tenant (Super Admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Create a new tenant organization (requires super admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Organization"
 *               slug:
 *                 type: string
 *                 example: "new-org"
 *                 description: URL-friendly identifier (must be unique)
 *               domain:
 *                 type: string
 *                 example: "neworg.example.com"
 *               planType:
 *                 type: string
 *                 enum: [free, pro, enterprise]
 *                 default: free
 *               maxUsers:
 *                 type: integer
 *                 nullable: true
 *               maxEvents:
 *                 type: integer
 *                 nullable: true
 *               maxStorage:
 *                 type: integer
 *                 nullable: true
 *                 description: Storage limit in bytes
 *     responses:
 *       201:
 *         description: Tenant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Invalid input or slug already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super admin
 */
router.post('/', superAdminOnly, TenantController.createTenant);

/**
 * @swagger
 * /api/tenants/{id}/activate:
 *   post:
 *     summary: Activate tenant (Super Admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Activate a suspended or cancelled tenant
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant activated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super admin
 *       404:
 *         description: Tenant not found
 */
router.post('/:id/activate', superAdminOnly, TenantController.activateTenant);

/**
 * @swagger
 * /api/tenants/{id}/deactivate:
 *   post:
 *     summary: Deactivate tenant (Super Admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Suspend tenant access (data preserved)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Non-payment"
 *     responses:
 *       200:
 *         description: Tenant deactivated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super admin
 *       404:
 *         description: Tenant not found
 */
router.post('/:id/deactivate', superAdminOnly, TenantController.deactivateTenant);

/**
 * @swagger
 * /api/tenants/{id}:
 *   delete:
 *     summary: Delete tenant (Super Admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     description: Permanently delete tenant and all associated data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: confirm
 *         required: true
 *         schema:
 *           type: string
 *         description: Must be "DELETE" to confirm deletion
 *     responses:
 *       200:
 *         description: Tenant deleted successfully
 *       400:
 *         description: Missing or invalid confirmation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires super admin
 *       404:
 *         description: Tenant not found
 */
router.delete('/:id', superAdminOnly, TenantController.deleteTenant);

export default router;
