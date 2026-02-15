import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import * as testRunnerController from '../controllers/testRunnerController';

const router = express.Router();

// All test runner routes require authentication
router.use(authenticateToken);

// Tenant-scoped UAT IDs for browser-only/manual AI operators
router.get('/uat-ids', requireRole(['SUPER_ADMIN', 'ADMIN', 'ORGANIZER']), testRunnerController.getUatIds);

// Remaining test-runner operations are admin-only
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
