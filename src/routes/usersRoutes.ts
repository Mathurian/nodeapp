import express, { Router } from 'express';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  getAllUsers, getUserById, createUser, updateUser, deleteUser, resetPassword, importUsersFromCSV, getCSVTemplate, updateLastLogin, bulkRemoveUsers, removeAllUsersByRole, getUsersByRole, updateUserRoleFields, getUserStats, uploadUserImage, uploadUserBioFile, bulkUploadUsers, bulkDeleteUsers, getBulkUploadTemplate
} from '../controllers/usersController';
import {
  authenticateToken, requireRole
} from '../middleware/auth';
import {
  validate, createUserSchema, updateUserSchema
} from '../middleware/validation';
import {
  logActivity
} from '../middleware/errorHandler';
import { maxFileSize } from '../utils/config';
import { prisma } from '../utils/prisma';

const router: Router = express.Router();

// Configure multer for user image uploads
const userImageStorage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/users/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const userImageUpload = multer({
  storage: userImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.') as any, false);
    }
  }
});

// Configure multer for user bio file uploads
const userBioStorage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, 'uploads/users/bios/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'bio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer for CSV bulk uploads
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.') as any, false);
    }
  }
});

const userBioUpload = multer({
  storage: userBioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validate MIME types for bio files
    const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.') as any, false);
    }
  }
});

// Apply authentication to all routes
router.use(authenticateToken)

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 */
router.get('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getAllUsers)

// Bulk template routes - must be before /:id route to avoid route conflict
router.get('/bulk-template', getBulkUploadTemplate)
router.get('/bulk-template/:userType', getBulkUploadTemplate)

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/:id', getUserById)

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ADMIN, ORGANIZER, JUDGE, CONTESTANT, BOARD, EMCEE, TALLY_MASTER, AUDITOR]
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), validate(createUserSchema), logActivity('CREATE_USER', 'USER'), createUser)
router.put('/:id', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), validate(updateUserSchema), logActivity('UPDATE_USER', 'USER'), updateUser)
router.put('/profile/:id', validate(updateUserSchema), logActivity('UPDATE_PROFILE', 'USER'), updateUser)
router.delete('/:id', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('DELETE_USER', 'USER'), deleteUser)
router.post('/:id/reset-password', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), resetPassword)

// Change password (self-service)
router.post('/:id/change-password', logActivity('CHANGE_PASSWORD', 'USER'), async (req, res) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (req.user && req.user.id !== id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    // Increment session version to invalidate all existing sessions
    await prisma.user.update({ 
      where: { id }, 
      data: { 
        password: hashed,
        sessionVersion: { increment: 1 }
      }
    })
    return res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// CSV Import routes
router.post('/import-csv', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('IMPORT_USERS_CSV', 'USER'), importUsersFromCSV)
router.get('/csv-template', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), getCSVTemplate)

// User management routes
router.put('/:id/last-login', updateLastLogin)
router.post('/bulk-remove', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('BULK_REMOVE_USERS', 'USER'), bulkRemoveUsers)
router.post('/remove-all/:role', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('REMOVE_ALL_USERS_BY_ROLE', 'USER'), removeAllUsersByRole)
router.get('/role/:role', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getUsersByRole)
router.put('/:id/role-fields', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), logActivity('UPDATE_USER_ROLE_FIELDS', 'USER'), updateUserRoleFields)
router.get('/stats', requireRole(['ADMIN', 'ORGANIZER', 'BOARD']), getUserStats)

// User image upload route (with activity logging, auth, and file validation)
// Allow users to upload their own image, or admins/organizers/board to upload for others
router.post('/:id/image', 
  userImageUpload.single('image'),
  async (req, res, next) => {
    // Allow users to upload their own image
    if (req.user && req.user.id === req.params.id) {
      return next();
    }
    // For other users, require admin/organizer/board role
    return requireRole(['ORGANIZER', 'BOARD', 'ADMIN'])(req, res, next);
  },
  logActivity('UPLOAD_USER_IMAGE', 'USER'),
  uploadUserImage
)

// User bio file upload route
router.post('/:id/bio-file', 
  requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), 
  userBioUpload.single('bioFile'),
  logActivity('UPLOAD_USER_BIO_FILE', 'USER'),
  uploadUserBioFile
)

// Bulk operations routes
router.post('/bulk-upload', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), csvUpload.single('file'), logActivity('BULK_UPLOAD_USERS', 'USERS'), bulkUploadUsers)
router.post('/bulk-delete', requireRole(['ORGANIZER', 'BOARD', 'ADMIN']), logActivity('BULK_DELETE_USERS', 'USERS'), bulkDeleteUsers)

export default router;

// CommonJS compatibility for server.ts
module.exports = router;