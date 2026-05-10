import express, { Router } from 'express';
import multer from 'multer';
import { authenticateToken, requireRole } from '../middleware/auth';
import { logActivity } from '../middleware/errorHandler';
import {
  downloadJudgeScheduleTemplate,
  importJudgeSchedules,
  listJudgeSchedules,
} from '../controllers/judgeScheduleController';

const router: Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only CSV files are supported for judge schedule imports'));
  },
});

router.use(authenticateToken);

router.get(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'JUDGE']),
  listJudgeSchedules,
);

router.get(
  '/template',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  downloadJudgeScheduleTemplate,
);

router.post(
  '/import',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']),
  upload.single('file'),
  logActivity('IMPORT_JUDGE_SCHEDULES', 'SCHEDULE'),
  importJudgeSchedules,
);

export default router;

module.exports = router;
