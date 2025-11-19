import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { container } from '../config/container';
import { AssignmentService } from '../services/AssignmentService';
import { sendSuccess } from '../utils/responseHelpers';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/judges:
 *   get:
 *     summary: Get all judges
 *     tags: [Judges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Judges retrieved successfully
 *   post:
 *     summary: Create a new judge
 *     tags: [Judges]
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
 *         description: Judge created successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const assignmentService = container.resolve(AssignmentService);
    const judges = await assignmentService.getJudges();
    return sendSuccess(res, judges, 'Judges retrieved successfully');
  } catch (error) {
    return next(error);
  }
});

router.post('/', 
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('CREATE_JUDGE', 'JUDGE'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const judge = await assignmentService.createJudge(req.body);
      return sendSuccess(res, judge, 'Judge created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.put('/:id',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('UPDATE_JUDGE', 'JUDGE'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const judge = await assignmentService.updateJudge(req.params['id'], req.body);
      return sendSuccess(res, judge, 'Judge updated successfully');
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/bulk-delete',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('BULK_DELETE_JUDGES', 'JUDGE'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const { judgeIds } = req.body;
      if (!Array.isArray(judgeIds) || judgeIds.length === 0) {
        return res.status(400).json({ success: false, message: 'judgeIds array is required' });
      }
      const result = await assignmentService.bulkDeleteJudges(judgeIds);
      return sendSuccess(res, result, `${result.deletedCount} judge(s) deleted successfully`);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete('/:id',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('DELETE_JUDGE', 'JUDGE'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      await assignmentService.deleteJudge(req.params['id']);
      return sendSuccess(res, null, 'Judge deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;

