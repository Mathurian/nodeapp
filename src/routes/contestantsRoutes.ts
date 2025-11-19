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
 * /api/contestants:
 *   get:
 *     summary: Get all contestants
 *     tags: [Contestants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contestants retrieved successfully
 *   post:
 *     summary: Create a new contestant
 *     tags: [Contestants]
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
 *         description: Contestant created successfully
 */
router.get('/', async (req, res, next) => {
  try {
    const assignmentService = container.resolve(AssignmentService);
    const contestants = await assignmentService.getContestants();
    return sendSuccess(res, contestants, 'Contestants retrieved successfully');
  } catch (error) {
    return next(error);
  }
});

router.post('/',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('CREATE_CONTESTANT', 'CONTESTANT'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const contestant = await assignmentService.createContestant(req.body);
      return sendSuccess(res, contestant, 'Contestant created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }
);

router.put('/:id',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('UPDATE_CONTESTANT', 'CONTESTANT'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const contestant = await assignmentService.updateContestant(req.params['id'], req.body);
      return sendSuccess(res, contestant, 'Contestant updated successfully');
    } catch (error) {
      return next(error);
    }
  }
);

router.post('/bulk-delete',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('BULK_DELETE_CONTESTANTS', 'CONTESTANT'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      const { contestantIds } = req.body;
      if (!Array.isArray(contestantIds) || contestantIds.length === 0) {
        return res.status(400).json({ success: false, message: 'contestantIds array is required' });
      }
      const result = await assignmentService.bulkDeleteContestants(contestantIds);
      return sendSuccess(res, result, `${result.deletedCount} contestant(s) deleted successfully`);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete('/:id',
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']),
  logActivity('DELETE_CONTESTANT', 'CONTESTANT'),
  async (req, res, next) => {
    try {
      const assignmentService = container.resolve(AssignmentService);
      await assignmentService.deleteContestant(req.params['id']);
      return sendSuccess(res, null, 'Contestant deleted successfully');
    } catch (error) {
      return next(error);
    }
  }
);

export default router;

// CommonJS compatibility for server.ts
module.exports = router;

