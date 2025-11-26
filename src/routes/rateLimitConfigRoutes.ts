/**
 * Rate Limit Configuration Routes
 *
 * Admin routes for managing rate limit configurations.
 * Super Admin access required.
 */

import express from 'express';
import { RateLimitConfigController } from '../controllers/RateLimitConfigController';
import { authenticateToken } from '../middleware/auth';
import { superAdminOnly } from '../middleware/superAdminOnly';

const router = express.Router();

// All routes require authentication and super admin role
router.use(authenticateToken);
router.use(superAdminOnly);

/**
 * @route   GET /api/admin/rate-limit-configs
 * @desc    Get all rate limit configurations
 * @access  Super Admin
 * @query   tenantId, userId, tier, endpoint, enabled
 */
router.get('/', RateLimitConfigController.getAll);

/**
 * @route   GET /api/admin/rate-limit-configs/tiers
 * @desc    Get available rate limit tiers
 * @access  Super Admin
 */
router.get('/tiers', RateLimitConfigController.getTiers);

/**
 * @route   GET /api/admin/rate-limit-configs/effective
 * @desc    Get effective rate limit configuration for tenant/user/endpoint
 * @access  Super Admin
 * @query   tenantId (required), userId (optional), endpoint (optional)
 */
router.get('/effective', RateLimitConfigController.getEffectiveConfig);

/**
 * @route   GET /api/admin/rate-limit-configs/:id
 * @desc    Get a single rate limit configuration by ID
 * @access  Super Admin
 */
router.get('/:id', RateLimitConfigController.getById);

/**
 * @route   POST /api/admin/rate-limit-configs
 * @desc    Create a new rate limit configuration
 * @access  Super Admin
 * @body    name, tier, tenantId, userId, endpoint, requestsPerHour, requestsPerMinute, burstLimit, enabled, priority, description
 */
router.post('/', RateLimitConfigController.create);

/**
 * @route   PUT /api/admin/rate-limit-configs/:id
 * @desc    Update an existing rate limit configuration
 * @access  Super Admin
 * @body    name, tier, tenantId, userId, endpoint, requestsPerHour, requestsPerMinute, burstLimit, enabled, priority, description
 */
router.put('/:id', RateLimitConfigController.update);

/**
 * @route   DELETE /api/admin/rate-limit-configs/:id
 * @desc    Delete a rate limit configuration
 * @access  Super Admin
 */
router.delete('/:id', RateLimitConfigController.delete);

export default router;
