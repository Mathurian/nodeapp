import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import * as testRunnerController from '../controllers/testRunnerController';

const router = express.Router();

// All test runner routes require SUPER_ADMIN role
router.use(authenticateToken);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

// Get available test files
router.get('/files', testRunnerController.getTestFiles);

// Start a new test run
router.post('/run', testRunnerController.startTestRun);

// Get specific test run status
router.get('/run/:runId', testRunnerController.getTestRunStatus);

// Get all test runs
router.get('/runs', testRunnerController.getAllTestRuns);

// Delete a test run
router.delete('/run/:runId', testRunnerController.deleteTestRun);

// Bulk cleanup completed/failed test runs
router.delete('/runs/cleanup', testRunnerController.bulkCleanupTestRuns);

export default router;
