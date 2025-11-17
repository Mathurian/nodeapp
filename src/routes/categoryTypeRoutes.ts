import express, { Router } from 'express';
import {
  getAllCategoryTypes,
  createCategoryType,
  deleteCategoryType
} from '../controllers/categoryTypeController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/category-types:
 *   get:
 *     summary: Get all category types
 *     tags: [Category Types]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category types retrieved successfully
 *   post:
 *     summary: Create category type
 *     tags: [Category Types]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Category type created successfully
 */
router.get('/', getAllCategoryTypes)
router.post('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_CATEGORY_TYPE', 'CATEGORY_TYPE'), createCategoryType)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;