import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getStats,
  getScripts,
  getScript,
  getContestantBios,
  getJudgeBios,
  getEvents,
  getEvent,
  getContests,
  getContest,
  uploadScript,
  updateScript,
  deleteScript,
  toggleScript,
  serveScriptFile,
  getFileViewUrl
} from '../controllers/emceeController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';

const router: Router = express.Router();

// Configure multer for emcee script uploads
const emceeScriptStorage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/emcee/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'script-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const emceeScriptUpload = multer({
  storage: emceeScriptStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate MIME types for documents
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.') as any, false);
    }
  }
})

// Script view endpoint - BEFORE auth middleware (allows signed URLs)
router.get('/scripts/:scriptId/view', serveScriptFile)

// Apply authentication to all other routes
router.use(authenticateToken)
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'EMCEE', 'ORGANIZER', 'BOARD']))

/**
 * @swagger
 * /api/emcee/stats:
 *   get:
 *     summary: Get emcee statistics
 *     tags: [Emcee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Emcee statistics retrieved successfully
 */
router.get('/stats', getStats)

/**
 * @swagger
 * /api/emcee/scripts:
 *   get:
 *     summary: Get emcee scripts
 *     tags: [Emcee]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scripts retrieved successfully
 */
router.get('/scripts', getScripts)

// Script access
router.get('/scripts', getScripts)
router.get('/scripts/:scriptId', getScript)
router.get('/scripts/:scriptId/view-url', getFileViewUrl) // Get signed URL (requires auth)

// Script management (upload/manage)
router.post('/scripts', 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), 
  emceeScriptUpload.single('script'),
  logActivity('UPLOAD_EMCEE_SCRIPT', 'EMCEE'), 
  uploadScript
)
router.put('/scripts/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_EMCEE_SCRIPT', 'EMCEE'), updateScript)
router.delete('/scripts/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_EMCEE_SCRIPT', 'EMCEE'), deleteScript)
router.patch('/scripts/:id/toggle', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), logActivity('TOGGLE_EMCEE_SCRIPT', 'EMCEE'), toggleScript)

// Contestant bios
router.get('/contestant-bios', getContestantBios)

// Judge bios
router.get('/judge-bios', getJudgeBios)

// Event management
router.get('/events', getEvents)
router.get('/events/:eventId', getEvent)

// Contest management
router.get('/contests', getContests)
router.get('/contests/:contestId', getContest)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;