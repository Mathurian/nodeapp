import { Router } from 'express';
import { container } from 'tsyringe';
import multer from 'multer';
import { BulkUserController } from '../controllers/BulkUserController';
import { BulkEventController } from '../controllers/BulkEventController';
import { BulkContestController } from '../controllers/BulkContestController';
import { BulkAssignmentController } from '../controllers/BulkAssignmentController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (in-memory storage for CSV)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Get controller instances from DI container
const bulkUserController = container.resolve(BulkUserController);
const bulkEventController = container.resolve(BulkEventController);
const bulkContestController = container.resolve(BulkContestController);
const bulkAssignmentController = container.resolve(BulkAssignmentController);

// All bulk routes require authentication and ADMIN role
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// ===== User Bulk Operations =====
router.post('/users/activate', (req, res) =>
  bulkUserController.activateUsers(req, res)
);

router.post('/users/deactivate', (req, res) =>
  bulkUserController.deactivateUsers(req, res)
);

router.post('/users/delete', (req, res) =>
  bulkUserController.deleteUsers(req, res)
);

router.post('/users/change-role', (req, res) =>
  bulkUserController.changeUserRoles(req, res)
);

router.post('/users/import', upload.single('file'), (req, res) =>
  bulkUserController.importUsers(req, res)
);

router.get('/users/export', (req, res) =>
  bulkUserController.exportUsers(req, res)
);

router.get('/users/template', (req, res) =>
  bulkUserController.getImportTemplate(req, res)
);

// ===== Event Bulk Operations =====
router.post('/events/status', (req, res) =>
  bulkEventController.changeEventStatus(req, res)
);

router.post('/events/delete', (req, res) =>
  bulkEventController.deleteEvents(req, res)
);

router.post('/events/clone', (req, res) =>
  bulkEventController.cloneEvents(req, res)
);

// ===== Contest Bulk Operations =====
router.post('/contests/status', (req, res) =>
  bulkContestController.changeContestStatus(req, res)
);

router.post('/contests/certify', (req, res) =>
  bulkContestController.certifyContests(req, res)
);

router.post('/contests/delete', (req, res) =>
  bulkContestController.deleteContests(req, res)
);

// ===== Assignment Bulk Operations =====
router.post('/assignments/create', (req, res) =>
  bulkAssignmentController.createAssignments(req, res)
);

router.post('/assignments/delete', (req, res) =>
  bulkAssignmentController.deleteAssignments(req, res)
);

router.post('/assignments/reassign', (req, res) =>
  bulkAssignmentController.reassignJudges(req, res)
);

export default router;
