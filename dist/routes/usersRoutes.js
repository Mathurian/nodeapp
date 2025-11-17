"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const usersController_1 = require("../controllers/usersController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const prisma_1 = require("../utils/prisma");
const router = express_1.default.Router();
const userImageStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'uploads/users/');
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'image-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const userImageUpload = (0, multer_1.default)({
    storage: userImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
        }
    }
});
const userBioStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, 'uploads/users/bios/');
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bio-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const csvUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
        if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only CSV files are allowed.'), false);
        }
    }
});
const userBioUpload = (0, multer_1.default)({
    storage: userBioStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
        }
    }
});
router.use(auth_1.authenticateToken);
router.get('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), usersController_1.getAllUsers);
router.get('/bulk-template', usersController_1.getBulkUploadTemplate);
router.get('/bulk-template/:userType', usersController_1.getBulkUploadTemplate);
router.get('/:id', usersController_1.getUserById);
router.post('/', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.createUserSchema), (0, errorHandler_1.logActivity)('CREATE_USER', 'USER'), usersController_1.createUser);
router.put('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, validation_1.validate)(validation_1.updateUserSchema), (0, errorHandler_1.logActivity)('UPDATE_USER', 'USER'), usersController_1.updateUser);
router.put('/profile/:id', (0, validation_1.validate)(validation_1.updateUserSchema), (0, errorHandler_1.logActivity)('UPDATE_PROFILE', 'USER'), usersController_1.updateUser);
router.delete('/:id', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('DELETE_USER', 'USER'), usersController_1.deleteUser);
router.post('/:id/reset-password', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), usersController_1.resetPassword);
router.post('/:id/change-password', (0, errorHandler_1.logActivity)('CHANGE_PASSWORD', 'USER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        if (req.user && req.user.id !== id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        const ok = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!ok)
            return res.status(400).json({ error: 'Current password is incorrect' });
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const hashed = await bcryptjs_1.default.hash(newPassword, 10);
        await prisma_1.prisma.user.update({
            where: { id },
            data: {
                password: hashed,
                sessionVersion: { increment: 1 }
            }
        });
        return res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/import-csv', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('IMPORT_USERS_CSV', 'USER'), usersController_1.importUsersFromCSV);
router.get('/csv-template', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), usersController_1.getCSVTemplate);
router.put('/:id/last-login', usersController_1.updateLastLogin);
router.post('/bulk-remove', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('BULK_REMOVE_USERS', 'USER'), usersController_1.bulkRemoveUsers);
router.post('/remove-all/:role', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('REMOVE_ALL_USERS_BY_ROLE', 'USER'), usersController_1.removeAllUsersByRole);
router.get('/role/:role', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), usersController_1.getUsersByRole);
router.put('/:id/role-fields', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), (0, errorHandler_1.logActivity)('UPDATE_USER_ROLE_FIELDS', 'USER'), usersController_1.updateUserRoleFields);
router.get('/stats', (0, auth_1.requireRole)(['ADMIN', 'ORGANIZER', 'BOARD']), usersController_1.getUserStats);
router.post('/:id/image', userImageUpload.single('image'), async (req, res, next) => {
    if (req.user && req.user.id === req.params.id) {
        return next();
    }
    return (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN'])(req, res, next);
}, (0, errorHandler_1.logActivity)('UPLOAD_USER_IMAGE', 'USER'), usersController_1.uploadUserImage);
router.post('/:id/bio-file', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), userBioUpload.single('bioFile'), (0, errorHandler_1.logActivity)('UPLOAD_USER_BIO_FILE', 'USER'), usersController_1.uploadUserBioFile);
router.post('/bulk-upload', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), csvUpload.single('file'), (0, errorHandler_1.logActivity)('BULK_UPLOAD_USERS', 'USERS'), usersController_1.bulkUploadUsers);
router.post('/bulk-delete', (0, auth_1.requireRole)(['ORGANIZER', 'BOARD', 'ADMIN']), (0, errorHandler_1.logActivity)('BULK_DELETE_USERS', 'USERS'), usersController_1.bulkDeleteUsers);
exports.default = router;
module.exports = router;
//# sourceMappingURL=usersRoutes.js.map