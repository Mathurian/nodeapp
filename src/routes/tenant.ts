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

// Get current tenant info
router.get('/current', TenantController.getCurrentTenant);

// Get specific tenant (own tenant or super admin)
router.get('/:id', TenantController.getTenant);

// Update tenant (own tenant or super admin)
router.put('/:id', TenantController.updateTenant);

// Get tenant analytics (own tenant or super admin)
router.get('/:id/analytics', TenantController.getTenantAnalytics);

// Invite user to tenant (admins of their own tenant or super admin)
router.post('/:id/users/invite', TenantController.inviteUser);

/**
 * Super admin only routes
 */

// List all tenants
router.get('/', superAdminOnly, TenantController.listTenants);

// Create new tenant
router.post('/', superAdminOnly, TenantController.createTenant);

// Activate tenant
router.post('/:id/activate', superAdminOnly, TenantController.activateTenant);

// Deactivate tenant
router.post('/:id/deactivate', superAdminOnly, TenantController.deactivateTenant);

// Delete tenant
router.delete('/:id', superAdminOnly, TenantController.deleteTenant);

export default router;
