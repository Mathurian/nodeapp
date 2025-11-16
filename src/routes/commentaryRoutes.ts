import express, { Router } from 'express';
import {
  createScoreComment,
  getScoreComments,
  updateScoreComment,
  deleteScoreComment,
  createComment,
  getCommentsForScore,
  updateComment,
  deleteComment,
  getCommentsByContestant
} from '../controllers/commentaryController';
const router: Router = express.Router();

import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/commentary/scores:
 *   post:
 *     summary: Create score comment
 *     tags: [Commentary]
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
 *         description: Comment created successfully
 */
router.post("/scores", requireRole(["ADMIN", "JUDGE"]), logActivity("CREATE_SCORE_COMMENT", "COMMENTARY"), createScoreComment)

/**
 * @swagger
 * /api/commentary:
 *   post:
 *     summary: Create commentary
 *     tags: [Commentary]
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
 *         description: Commentary created successfully
 */
router.post('/', requireRole(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), logActivity('CREATE_COMMENT', 'COMMENTARY'), createComment)
router.get('/score/:scoreId', getCommentsForScore)
router.put('/:id', requireRole(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), logActivity('UPDATE_COMMENT', 'COMMENTARY'), updateComment)
router.delete('/:id', requireRole(['JUDGE', 'ORGANIZER', 'BOARD', 'ADMIN']), logActivity('DELETE_COMMENT', 'COMMENTARY'), deleteComment)
router.get('/contestant/:contestantId', getCommentsByContestant)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;