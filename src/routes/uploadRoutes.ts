import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { uploadFile, uploadImage, getFiles } from '../controllers/uploadController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';

const router: Router = express.Router();

// Allowed MIME types for security
const ALLOWED_FILE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// File size limit: 5MB (more restrictive than default)
const SECURE_FILE_SIZE_LIMIT = 5 * 1024 * 1024;

// Configure multer for secure file uploads
const storage = multer.diskStorage({
  destination: (req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    // Store files in tenant-specific directory for isolation
    const tenantId = req.tenantId || req.user?.tenantId || 'default';
    const uploadPath = path.join(process.cwd(), 'uploads', tenantId);
    cb(null, uploadPath);
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate secure random filename to prevent path traversal
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    // Sanitize extension - only allow alphanumeric and common extensions
    const safeExt = ext.match(/^\.(jpg|jpeg|png|gif|webp|pdf)$/i) ? ext : '';
    cb(null, `${randomName}${safeExt}`);
  }
});

// File filter for general uploads
const fileFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_FILE_MIME_TYPES.join(', ')}`));
  }
};

// Image-specific file filter
const imageFilter = (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image type. Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: Math.min(maxFileSize, SECURE_FILE_SIZE_LIMIT) // Use more restrictive limit
  }
});

const imageUpload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: SECURE_FILE_SIZE_LIMIT
  }
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
router.post('/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  upload.single('file'),
  logActivity('UPLOAD_FILE', 'FILE'),
  uploadFile
)

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
router.post('/image',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  imageUpload.single('image'),
  logActivity('UPLOAD_IMAGE', 'FILE'),
  uploadImage
)

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