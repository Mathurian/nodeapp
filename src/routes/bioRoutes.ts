import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
const router: Router = express.Router();
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getContestantBios,
  getJudgeBios,
  updateContestantBio,
  updateJudgeBio
} from '../controllers/bioController';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';

// Configure multer for bio image uploads
const bioImageStorage = multer.diskStorage({
  destination: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/bios/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const bioImageUpload = multer({
  storage: bioImageStorage,
  limits: { fileSize: maxFileSize },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate MIME types for images
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.') as any, false);
    }
  }
})

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/bios/contestants:
 *   get:
 *     summary: Get contestant bios
 *     tags: [Bios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contestant bios retrieved successfully
 */
router.get('/contestants', getContestantBios)

/**
 * @swagger
 * /api/bios/judges:
 *   get:
 *     summary: Get judge bios
 *     tags: [Bios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Judge bios retrieved successfully
 */
router.get('/judges', getJudgeBios)

// Update bios - restricted to ADMIN, ORGANIZER, BOARD
router.put('/contestants/:contestantId', 
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), 
  bioImageUpload.single('image'),
  logActivity('UPDATE_CONTESTANT_BIO', 'BIO'), 
  updateContestantBio
)
router.put('/judges/:judgeId', 
  requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), 
  bioImageUpload.single('image'),
  logActivity('UPDATE_JUDGE_BIO', 'BIO'), 
  updateJudgeBio
)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;