import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  uploadScoreFile,
  getScoreFileById,
  getScoreFilesByCategory,
  getScoreFilesByJudge,
  getScoreFilesByContestant,
  getAllScoreFiles,
  updateScoreFile,
  deleteScoreFile,
  downloadScoreFile,
  processScoresheetImport,
  getScoresheetImportDraft,
} from '../controllers/scoreFileController';
import { authenticateToken, requireAnyPermission, requirePermission, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { resolveRequestTenantId } from '../utils/tenantContext';
import { idempotencyMiddleware } from '../middleware/idempotency';

const router: Router = express.Router();
const requireScoreFilesRead = requirePermission('score-files:read');
const requireScoreFilesUpload = requireAnyPermission(['score-files:upload', 'delegated-scores:write']);
const requireScoreFilesUpdate = requirePermission('score-files:update');
const requireScoreFilesDelete = requireAnyPermission(['score-files:delete', 'delegated-scores:write']);
const requireScoreFilesProcess = requireAnyPermission([
  'score-files:upload',
  'score-files:update',
  'delegated-scores:write',
]);

const ALLOWED_SCORE_FILE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain'
];

const SCORE_FILE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const scoreFileStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = resolveRequestTenantId(req);
    if (!tenantId) {
      cb(new Error('Tenant context is required for score file upload destination'), '');
      return;
    }
    const dir = path.join(process.cwd(), 'uploads', tenantId, 'score-files');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const scoreFileUpload = multer({
  storage: scoreFileStorage,
  limits: { fileSize: SCORE_FILE_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_SCORE_FILE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type for score commentary attachments'));
  }
});

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
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']),
  requireScoreFilesUpload,
  scoreFileUpload.single('file'),
  idempotencyMiddleware,
  logActivity('UPLOAD_SCORE_FILE', 'SCORE'),
  uploadScoreFile
);

/**
 * @swagger
 * /api/score-files:
 *   get:
 *     summary: Get all score files with optional filters
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR', 'EMCEE']), requireScoreFilesRead, getAllScoreFiles);

/**
 * @swagger
 * /api/score-files/category/{categoryId}:
 *   get:
 *     summary: Get files for a category
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/category/:categoryId', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoreFilesRead, getScoreFilesByCategory);

/**
 * @swagger
 * /api/score-files/judge/{judgeId}:
 *   get:
 *     summary: Get files for a judge
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/judge/:judgeId', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoreFilesRead, getScoreFilesByJudge);

/**
 * @swagger
 * /api/score-files/contestant/{contestantId}:
 *   get:
 *     summary: Get files for a contestant
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/contestant/:contestantId', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoreFilesRead, getScoreFilesByContestant);

/**
 * @swagger
 * /api/score-files/download/{id}:
 *   get:
 *     summary: Download a score file
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/download/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoreFilesRead, downloadScoreFile);

router.post(
  '/:id/process-scoresheet-import',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']),
  requireScoreFilesProcess,
  idempotencyMiddleware,
  logActivity('PROCESS_SCORESHEET_IMPORT', 'SCORE'),
  processScoresheetImport,
);

router.get(
  '/:id/scoresheet-import-draft',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']),
  requireScoreFilesRead,
  getScoresheetImportDraft,
);

/**
 * @swagger
 * /api/score-files/{id}:
 *   patch:
 *     summary: Update score file status/notes
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireScoreFilesUpdate, idempotencyMiddleware, logActivity('UPDATE_SCORE_FILE', 'SCORE'), updateScoreFile);

/**
 * @swagger
 * /api/score-files/{id}:
 *   delete:
 *     summary: Delete score file
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'ORGANIZER']), requireScoreFilesDelete, idempotencyMiddleware, logActivity('DELETE_SCORE_FILE', 'SCORE'), deleteScoreFile);

/**
 * @swagger
 * /api/score-files/{id}:
 *   get:
 *     summary: Get score file by ID
 *     tags: [Score Files]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'JUDGE', 'DELEGATE', 'CONTESTANT', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR']), requireScoreFilesRead, getScoreFileById);

export default router;

// CommonJS compatibility
module.exports = router;
