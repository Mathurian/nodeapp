import express, { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcrypt';
import { createLogger } from '../utils/logger';

const logger = createLogger('UsersRoutes');
import {
  getAllUsers, getUserById, createUser, updateUser, deleteUser, resetPassword, importUsersFromCSV, getCSVTemplate, updateLastLogin, bulkRemoveUsers, removeAllUsersByRole, getUsersByRole, updateUserRoleFields, getUserStats, uploadUserImage, uploadUserBioFile, bulkUploadUsers, bulkDeleteUsers, getBulkUploadTemplate, getContestantPrivateProfile, uploadContestantPrivateFiles, downloadContestantPrivateFile, deleteContestantPrivateFile
} from '../controllers/usersController';
import {
  authenticateToken, requireAnyPermission, requirePermission, requireRole
} from '../middleware/auth';
import {
  validate, createUserSchema, updateUserSchema
} from '../middleware/validation';
import {
  logActivity
} from '../middleware/errorHandler';
import { FILE_SIZE } from '../config/constants';

const router: Router = express.Router();
const requireUsersRead = requirePermission('users:read');
const requireUsersWrite = requirePermission('users:write');
const requireUsersOrContestantsRead = requireAnyPermission(['users:read', 'contestants:read']);

const getRequestPrisma = (req: express.Request, res: express.Response) => {
  if (!req.prisma) {
    res.status(500).json({ error: 'Database context not initialized' });
    return null;
  }
  return req.prisma;
};

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

const contestantPrivateDocumentStorage = multer.diskStorage({
  destination: (_req: express.Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    fs.mkdirSync('uploads/users/contestant-private/', { recursive: true });
    cb(null, 'uploads/users/contestant-private/');
  },
  filename: (_req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'contestant-private-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const contestantPrivateDocumentUpload = multer({
  storage: contestantPrivateDocumentStorage,
  limits: { fileSize: FILE_SIZE.MAX_DOCUMENT_UPLOAD },
  fileFilter: (_req: express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only TXT, PDF, DOC, and DOCX files are allowed.') as any, false);
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
router.get('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getAllUsers)

// Bulk template routes - must be before /:id route to avoid route conflict
router.get('/bulk-template', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getBulkUploadTemplate)
router.get('/bulk-template/:userType', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getBulkUploadTemplate)
router.get('/csv-template', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getCSVTemplate)

// Role-based user lookup — must be before /:id to prevent route shadowing
router.get('/role/:role', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getUsersByRole)
router.get('/stats', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getUserStats)
router.get('/:id/contestant-private-profile', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE']), requireUsersOrContestantsRead, getContestantPrivateProfile)
router.post('/:id/contestant-private-files', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireUsersWrite, contestantPrivateDocumentUpload.array('files', 10), logActivity('UPLOAD_CONTESTANT_PRIVATE_FILES', 'USER'), uploadContestantPrivateFiles)
router.get('/:id/contestant-private-files/:fileId/download', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE']), requireUsersOrContestantsRead, downloadContestantPrivateFile)
router.delete('/:id/contestant-private-files/:fileId', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), requireUsersWrite, logActivity('DELETE_CONTESTANT_PRIVATE_FILE', 'USER'), deleteContestantPrivateFile)

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
router.get('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersRead, getUserById)

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
 *                 enum: [SUPER_ADMIN, ADMIN, ORGANIZER, JUDGE, DELEGATE, CONTESTANT, BOARD, EMCEE, TALLY_MASTER, AUDITOR]
 *               boardRole:
 *                 type: string
 *                 description: Optional board title/position (BOARD users only)
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, validate(createUserSchema), logActivity('CREATE_USER', 'USER'), createUser)
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, validate(updateUserSchema), logActivity('UPDATE_USER', 'USER'), updateUser)
router.put('/profile/:id', validate(updateUserSchema), logActivity('UPDATE_PROFILE', 'USER'), updateUser)
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, logActivity('DELETE_USER', 'USER'), deleteUser)
router.post('/:id/reset-password', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, resetPassword)

// Change password (self-service)
router.post('/:id/change-password', logActivity('CHANGE_PASSWORD', 'USER'), async (req, res) => {
  try {
    const { id } = req.params
    const { currentPassword, newPassword } = req.body
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }
    if (req.user && req.user.id !== id && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const user = await requestPrisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const ok = await bcrypt.compare(currentPassword, user.password)
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    // Increment session version to invalidate all existing sessions
    await requestPrisma.user.update({
      where: { id }, 
      data: { 
        password: hashed,
        sessionVersion: { increment: 1 }
      }
    })
    return res.json({ message: 'Password changed successfully' })
  } catch (error) {
    logger.error('Change password error', { error })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// CSV Import routes
router.post('/import-csv', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, csvUpload.single('file'), logActivity('IMPORT_USERS_CSV', 'USER'), importUsersFromCSV)

// User management routes
router.put('/:id/last-login', updateLastLogin)
router.post('/bulk-remove', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, logActivity('BULK_REMOVE_USERS', 'USER'), bulkRemoveUsers)
router.post('/remove-all/:role', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, logActivity('REMOVE_ALL_USERS_BY_ROLE', 'USER'), removeAllUsersByRole)
router.put('/:id/role-fields', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, logActivity('UPDATE_USER_ROLE_FIELDS', 'USER'), updateUserRoleFields)

// User image upload route (with activity logging, auth, and file validation)
// Allow users to upload their own image, or admins/organizers/board to upload for others
router.post('/:id/image', 
  userImageUpload.single('image'),
  async (req, res, next) => {
    // Allow users to upload their own image
    if (req.user && req.user.id === req.params['id']) {
      return next();
    }
    // For other users, require admin/organizer/board role
    return requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'])(req, res, () =>
      requireUsersWrite(req, res, next)
    );
  },
  logActivity('UPLOAD_USER_IMAGE', 'USER'),
  uploadUserImage
)

// User bio file upload route
// Allow users to upload their own bio file, or admins/organizers/board to upload for others
router.post('/:id/bio-file',
  userBioUpload.single('bioFile'),
  async (req, res, next) => {
    // Allow users to upload their own bio file
    if (req.user && req.user.id === req.params['id']) {
      return next();
    }
    // For other users, require admin/organizer/board role
    return requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'])(req, res, () =>
      requireUsersWrite(req, res, next)
    );
  },
  logActivity('UPLOAD_USER_BIO_FILE', 'USER'),
  uploadUserBioFile
)

// Bulk operations routes
router.post('/bulk-upload', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, csvUpload.single('file'), logActivity('BULK_UPLOAD_USERS', 'USERS'), bulkUploadUsers)
router.post('/bulk-delete', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']), requireUsersWrite, logActivity('BULK_DELETE_USERS', 'USERS'), bulkDeleteUsers)

// Tenant reassignment (SUPER_ADMIN only)
router.put('/:id/tenant', requireRole(['SUPER_ADMIN']), logActivity('REASSIGN_USER_TENANT', 'USER'), async (req, res, next) => {
  try {
    const { id } = req.params
    const { tenantId } = req.body
    const requestPrisma = getRequestPrisma(req, res);
    if (!requestPrisma) return;

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'tenantId is required' })
    }

    // Verify tenant exists
    const tenant = await requestPrisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' })
    }

    // Get user to verify it exists
    const user = await requestPrisma.user.findUnique({ where: { id } })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    // Update user's tenant
    const updatedUser = await requestPrisma.user.update({
      where: { id },
      data: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true
      }
    })

    return res.json({
      success: true,
      message: `User "${updatedUser.name}" reassigned to tenant "${tenant.name}"`,
      data: updatedUser
    })
  } catch (error) {
    return next(error)
  }
})

export default router;

// CommonJS compatibility for server.ts
module.exports = router;
