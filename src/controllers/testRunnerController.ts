import { Request, Response } from 'express';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('TestRunner');

// Maximum concurrent test runs to prevent resource exhaustion
const MAX_CONCURRENT_TESTS = 2;

// Store active test runs
const activeTestRuns = new Map<string, {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  output: string;
  startTime: Date;
  endTime?: Date;
  testFile?: string;
  testPattern?: string;
}>();

// Test queue
const testQueue: Array<{
  runId: string;
  testFile: string;
  testPattern?: string;
}> = [];

// Test file descriptions mapping
const testDescriptions: Record<string, string> = {
  // Main E2E Tests
  'admin.e2e.test.ts': 'Admin panel functionality, user management, and system configuration',
  'auditor.e2e.test.ts': 'Score auditing, verification workflows, and audit trail',
  'auth.e2e.test.ts': 'Authentication flows, login/logout, password reset, and session management',
  'board.e2e.test.ts': 'Board member features, certifications, and score removal workflows',
  'contestant.e2e.test.ts': 'Contestant registration, profile management, and score viewing',
  'certification.e2e.test.ts': 'Certification workflows, judge certifications, and approval processes',
  'scoring.e2e.test.ts': 'Score entry, editing, validation, and submission',
  'tallyMaster.e2e.test.ts': 'Tally master operations, score finalization, and reporting',
  'reports.e2e.test.ts': 'Report generation, PDF exports, and data visualization',
  'eventManagement.e2e.test.ts': 'Event creation, editing, scheduling, and management',
  'manualTestingFixes.e2e.test.ts': 'Bug fixes and edge cases from manual testing',

  // Workflow Tests
  'bulk-operations-workflow.spec.ts': 'Bulk data operations, imports, exports, and batch processing',
  'certification-workflow.spec.ts': 'End-to-end certification approval and management workflows',
  'custom-fields-workflow.spec.ts': 'Custom field creation, validation, and usage across the system',

  // Comprehensive Tests (subdirectory)
  'accordions.e2e.test.ts': 'Navigation accordions, menu interactions, and UI state management',
  'comprehensive/admin.e2e.test.ts': 'Comprehensive admin functionality including advanced features',
  'comprehensive/auditor.e2e.test.ts': 'Complete auditor workflow including edge cases',
  'comprehensive/board.e2e.test.ts': 'Full board member feature set and permissions',
  'comprehensive/contestant.e2e.test.ts': 'Complete contestant journey from registration to results',
  'comprehensive/emcee.e2e.test.ts': 'Emcee features, announcements, and live event management',
  'comprehensive/judge.e2e.test.ts': 'Judge assignment, scoring interface, and certification',
  'comprehensive/superAdmin.e2e.test.ts': 'Super admin privileges, tenant management, and system settings',
  'comprehensive/tallyMaster.e2e.test.ts': 'Full tally master operations and final score calculations'
};

/**
 * Get category and description for a test file
 */
function getTestMetadata(filename: string, relativePath: string): { category: string; description: string } {
  // Determine category
  let category = 'other';
  if (relativePath.includes('comprehensive/')) {
    category = 'comprehensive';
  } else if (filename.includes('admin')) {
    category = 'admin';
  } else if (filename.includes('auth')) {
    category = 'auth';
  } else if (filename.includes('workflow')) {
    category = 'workflow';
  } else if (filename.includes('auditor') || filename.includes('board') || filename.includes('judge')) {
    category = 'roles';
  } else if (filename.includes('scoring') || filename.includes('tally')) {
    category = 'scoring';
  }

  // Get description
  const description = testDescriptions[relativePath] ||
                     testDescriptions[filename] ||
                     'E2E test suite';

  return { category, description };
}

/**
 * Load historical test runs from log files on startup
 * This restores test run history after service restarts
 */
async function loadHistoricalTestRuns(): Promise<void> {
  try {
    const tmpDir = '/tmp';
    const files = await fs.readdir(tmpDir);

    const testLogFiles = files.filter(f => f.startsWith('test-test-') && f.endsWith('.log'));

    logger.info(`Loading ${testLogFiles.length} historical test runs from /tmp`);

    for (const file of testLogFiles) {
      const filePath = path.join(tmpDir, file);

      try {
        const stats = await fs.stat(filePath);
        const runId = file.replace('test-', '').replace('.log', '');

        // Skip if already in map
        if (activeTestRuns.has(runId)) continue;

        // Read the log to determine status
        const output = await fs.readFile(filePath, 'utf-8');

        // Determine status from output
        let status: 'completed' | 'failed' = 'failed';
        if (output.includes('passed') || output.includes('✓')) {
          status = 'completed';
        }

        // Extract test file name if possible
        const testFileMatch = output.match(/npx playwright test ([\w\/\.\-]+)/);
        const testFile = testFileMatch ? testFileMatch[1] : 'unknown';

        activeTestRuns.set(runId, {
          id: runId,
          status,
          output,
          startTime: stats.mtime, // Use file modification time
          endTime: stats.mtime,
          testFile
        });
      } catch (error) {
        logger.warn(`Failed to load test run from ${file}:`, error);
      }
    }

    logger.info(`Loaded ${activeTestRuns.size} historical test runs`);
  } catch (error) {
    logger.error('Failed to load historical test runs:', error);
  }
}

// Load historical test runs on module initialization
loadHistoricalTestRuns().catch(err => {
  logger.error('Error during historical test run loading:', err);
});

/**
 * Get list of available test files
 */
export async function getTestFiles(_req: Request, res: Response): Promise<void> {
  try {
    const testsDir = path.join(process.cwd(), 'tests', 'e2e');

    // Read main directory
    const files = await fs.readdir(testsDir);
    const testFiles: any[] = [];

    // Process main directory files
    for (const file of files) {
      if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
        const { category, description } = getTestMetadata(file, file);
        testFiles.push({
          name: file,
          path: `tests/e2e/${file}`,
          category,
          description
        });
      }
    }

    // Read comprehensive subdirectory
    const comprehensiveDir = path.join(testsDir, 'comprehensive');
    try {
      const comprehensiveFiles = await fs.readdir(comprehensiveDir);
      for (const file of comprehensiveFiles) {
        if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
          const relativePath = `comprehensive/${file}`;
          const { category, description } = getTestMetadata(file, relativePath);
          testFiles.push({
            name: `comprehensive/${file}`,
            path: `tests/e2e/comprehensive/${file}`,
            category,
            description
          });
        }
      }
    } catch {
      // Comprehensive directory doesn't exist or isn't accessible
    }

    // Sort by category then name
    testFiles.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      success: true,
      data: testFiles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch test files',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Start a test run
 */
export async function startTestRun(req: Request, res: Response): Promise<void> {
  try {
    const { testFile, testPattern } = req.body;

    if (!testFile) {
      res.status(400).json({
        success: false,
        message: 'testFile is required'
      });
      return;
    }

    const runId = `test-${Date.now()}`;

    // Count currently running tests
    const runningTests = Array.from(activeTestRuns.values()).filter(t => t.status === 'running').length;

    // If at capacity, queue the test
    if (runningTests >= MAX_CONCURRENT_TESTS) {
      activeTestRuns.set(runId, {
        id: runId,
        status: 'queued',
        output: `Queued: Waiting for available slot (${runningTests}/${MAX_CONCURRENT_TESTS} tests running)...`,
        startTime: new Date(),
        testFile,
        testPattern
      });

      testQueue.push({ runId, testFile, testPattern });

      res.json({
        success: true,
        data: {
          runId,
          status: 'queued',
          message: `Test queued. ${runningTests} tests currently running.`,
          position: testQueue.length
        }
      });
      return;
    }

    // Start the test
    executeTest(runId, testFile, testPattern);

    res.json({
      success: true,
      data: {
        runId,
        status: 'started',
        message: 'Test run initiated'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start test run',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Execute a test run
 */
function executeTest(runId: string, testFile: string, testPattern?: string): void {
  const outputFile = `/tmp/test-${runId}.log`;

  // Build playwright command with reduced workers for GUI test runner
  // Use 2 workers instead of 6 to reduce resource usage
  let playwrightCmd = `DATABASE_URL="postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public" NODE_ENV=test timeout 300 npx playwright test ${testFile} --workers=2`;

  if (testPattern) {
    playwrightCmd += ` -g "${testPattern}"`;
  }

  // Wrap in bash to capture exit code from playwright command, not tee
  const command = `bash -c "${playwrightCmd} 2>&1 | tee ${outputFile}; exit \\$\\{PIPESTATUS[0]\\}"`;

  // Update test run status
  const run = activeTestRuns.get(runId);
  if (run) {
    run.status = 'running';
    run.output = 'Test execution started...\n';
  }

  // Execute test in background
  const child = exec(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer

  child.on('exit', async (code) => {
    const run = activeTestRuns.get(runId);
    if (run) {
      try {
        const output = await fs.readFile(outputFile, 'utf-8');
        run.output = output;
        run.status = code === 0 ? 'completed' : 'failed';
        run.endTime = new Date();
      } catch (error) {
        run.status = 'failed';
        run.output += `\nError reading output: ${error}`;
      }
    }

    // Process next queued test
    processQueue();
  });
}

/**
 * Process the next test in the queue
 */
function processQueue(): void {
  if (testQueue.length === 0) return;

  const runningTests = Array.from(activeTestRuns.values()).filter(t => t.status === 'running').length;
  if (runningTests >= MAX_CONCURRENT_TESTS) return;

  const next = testQueue.shift();
  if (next) {
    executeTest(next.runId, next.testFile, next.testPattern);
  }
}

/**
 * Get test run status
 */
export async function getTestRunStatus(req: Request, res: Response): Promise<void> {
  try {
    const { runId } = req.params;

    if (!runId) {
      res.status(400).json({
        success: false,
        message: 'Run ID is required'
      });
      return;
    }

    const run = activeTestRuns.get(runId);

    if (!run) {
      res.status(404).json({
        success: false,
        message: 'Test run not found'
      });
      return;
    }

    res.json({
      success: true,
      data: run
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get test run status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get all test runs
 */
export async function getAllTestRuns(_req: Request, res: Response): Promise<void> {
  try {
    logger.info(`[TESTRUNNER] getAllTestRuns called - activeTestRuns.size = ${activeTestRuns.size}`);

    const runs = Array.from(activeTestRuns.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 20); // Last 20 runs

    logger.info(`[TESTRUNNER] Returning ${runs.length} test runs`);

    res.json({
      success: true,
      data: runs
    });

  } catch (error) {
    logger.error('[TESTRUNNER] Error in getAllTestRuns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get test runs',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Delete a test run
 */
export async function deleteTestRun(req: Request, res: Response): Promise<void> {
  try {
    const { runId } = req.params;

    if (!runId) {
      res.status(400).json({
        success: false,
        message: 'Run ID is required'
      });
      return;
    }

    if (activeTestRuns.has(runId)) {
      activeTestRuns.delete(runId);
    }

    res.json({
      success: true,
      message: 'Test run deleted'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete test run',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Bulk cleanup completed and failed test runs
 */
export async function bulkCleanupTestRuns(_req: Request, res: Response): Promise<void> {
  try {
    let deletedCount = 0;

    // Delete all completed and failed test runs
    for (const [runId, run] of activeTestRuns.entries()) {
      if (run.status === 'completed' || run.status === 'failed') {
        activeTestRuns.delete(runId);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Cleared ${deletedCount} completed/failed test run${deletedCount !== 1 ? 's' : ''}`,
      data: {
        deletedCount
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup test runs',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
