import express, { Router } from 'express';
import {
  uploadScoreFile,
  getScoreFileById,
  getScoreFilesByCategory,
  getScoreFilesByJudge,
  getScoreFilesByContestant,
  getAllScoreFiles,
  updateScoreFile,
  deleteScoreFile,
  downloadScoreFile
} from '../controllers/scoreFileController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/score-files:
 *   post:
 *     summary: Upload a score file
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', requireRole(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), logActivity('UPLOAD_SCORE_FILE', 'SCORE'), uploadScoreFile);

/**
 * @swagger
 * /api/score-files:
 *   get:
 *     summary: Get all score files with optional filters
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getAllScoreFiles);

/**
 * @swagger
 * /api/score-files/{id}:
 *   get:
 *     summary: Get score file by ID
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', requireRole(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getScoreFileById);

/**
 * @swagger
 * /api/score-files/category/{categoryId}:
 *   get:
 *     summary: Get files for a category
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/category/:categoryId', requireRole(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getScoreFilesByCategory);

/**
 * @swagger
 * /api/score-files/judge/{judgeId}:
 *   get:
 *     summary: Get files for a judge
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/judge/:judgeId', requireRole(['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getScoreFilesByJudge);

/**
 * @swagger
 * /api/score-files/contestant/{contestantId}:
 *   get:
 *     summary: Get files for a contestant
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/contestant/:contestantId', requireRole(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), getScoreFilesByContestant);

/**
 * @swagger
 * /api/score-files/{id}:
 *   patch:
 *     summary: Update score file status/notes
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_SCORE_FILE', 'SCORE'), updateScoreFile);

/**
 * @swagger
 * /api/score-files/{id}:
 *   delete:
 *     summary: Delete score file
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireRole(['ADMIN', 'JUDGE', 'ORGANIZER']), logActivity('DELETE_SCORE_FILE', 'SCORE'), deleteScoreFile);

/**
 * @swagger
 * /api/score-files/download/{id}:
 *   get:
 *     summary: Download a score file
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/download/:id', requireRole(['ADMIN', 'JUDGE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), downloadScoreFile);

export default router;

// CommonJS compatibility
module.exports = router;
