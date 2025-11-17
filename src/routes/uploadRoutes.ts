import express, { Router } from 'express';
import multer from 'multer';
import { uploadFile, uploadImage, deleteFile, getFiles } from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';

const router: Router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: maxFileSize } // Configurable via MAX_FILE_SIZE_MB env var (default 20MB)
})

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
router.post('/', upload.single('file'), logActivity('UPLOAD_FILE', 'FILE'), uploadFile)

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload an image
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 */
router.post('/image', upload.single('image'), logActivity('UPLOAD_IMAGE', 'FILE'), uploadImage)

/**
 * @swagger
 * /api/upload/files:
 *   get:
 *     summary: Get uploaded files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 */
router.get('/files', getFiles)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;