import express, { Router } from 'express';
import { getAllCategories, getCategoryById, getCategoriesByContest, createCategory, updateCategory, deleteCategory, restoreCategory, getCategoryCriteria, createCriterion, updateCriterion, deleteCriterion, updateCategoryWithTimeLimit, bulkDeleteCriteria, bulkUpdateCriteria } from '../controllers/categoriesController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate, createCategorySchema, updateCategorySchema } from '../middleware/validation';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getAllCategories);

/**
 * @swagger
 * /api/categories/contest/{contestId}:
 *   get:
 *     summary: Get categories by contest ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of categories for the contest
 */
router.get('/contest/:contestId', getCategoriesByContest);

/**
 * @swagger
 * /api/categories/contest/{contestId}:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: contestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post('/contest/:contestId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createCategorySchema), logActivity('CREATE_CATEGORY', 'CATEGORY'), createCategory); // Contest-specific POST
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(createCategorySchema), logActivity('CREATE_CATEGORY', 'CATEGORY'), createCategory); // Generic POST
router.get('/:id', getCategoryById);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), validate(updateCategorySchema), logActivity('UPDATE_CATEGORY', 'CATEGORY'), updateCategory);
router.put('/:id/time-limit', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_CATEGORY_TIME_LIMIT', 'CATEGORY'), updateCategoryWithTimeLimit);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_CATEGORY', 'CATEGORY'), deleteCategory);
// S4-3: Restore soft-deleted categories
router.post('/:id/restore', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('RESTORE_CATEGORY', 'CATEGORY'), restoreCategory);

// Criteria endpoints - read access for all
router.get('/:categoryId/criteria', getCategoryCriteria);
// Bulk operations for criteria
router.post('/:categoryId/criteria/bulk-delete', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('BULK_DELETE_CRITERIA', 'CRITERION'), bulkDeleteCriteria);
router.post('/:categoryId/criteria/bulk-update', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('BULK_UPDATE_CRITERIA', 'CRITERION'), bulkUpdateCriteria);
// Create/Update/Delete restricted to ADMIN, ORGANIZER, BOARD only
router.post('/:categoryId/criteria', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('CREATE_CRITERION', 'CRITERION'), createCriterion);
router.put('/criteria/:criterionId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_CRITERION', 'CRITERION'), updateCriterion);
router.delete('/criteria/:criterionId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_CRITERION', 'CRITERION'), deleteCriterion);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
