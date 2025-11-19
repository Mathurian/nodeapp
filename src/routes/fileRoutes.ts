import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAllFiles,
  getFileStats
} from '../controllers/fileController';
import { authenticateToken } from '../middleware/auth';
import { env } from '../config/env';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, env.get('UPLOAD_DIR') || 'uploads/');
  },
  filename: function (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

const router: Router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: Get all files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/', getAllFiles)

/**
 * @swagger
 * /api/files/stats:
 *   get:
 *     summary: Get file statistics
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File statistics retrieved successfully
 */
router.get('/stats', getFileStats)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;