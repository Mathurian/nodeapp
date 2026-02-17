import { Request, Response } from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { createLogger } from '../utils/logger';

const logger = createLogger('TestRunner');
const TESTS_DIR = path.join(process.cwd(), 'tests', 'e2e');
const MAX_TEST_PATTERN_LENGTH = 200;

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
  testFilePath: string;
  testPattern?: string;
}> = [];

interface DiscoveredTestFile {
  displayName: string;
  relativePath: string;
  absolutePath: string;
  category: string;
  description: string;
}

const normalizePath = (input: string): string => input.replace(/\\/g, '/');

const isValidPattern = (pattern: string): boolean => {
  const trimmed = pattern.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TEST_PATTERN_LENGTH) return false;
  // Keep pattern printable and bounded (spawn avoids shell injection regardless).
  return /^[\x20-\x7E]+$/.test(trimmed);
};

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

async function discoverTestFiles(): Promise<DiscoveredTestFile[]> {
  const discovered: DiscoveredTestFile[] = [];
  const stack: string[] = [TESTS_DIR];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) continue;

    let entries: fsSync.Dirent[];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.spec.ts')) continue;

      const relativePath = normalizePath(path.relative(process.cwd(), absolutePath));
      const relativeToE2e = normalizePath(path.relative(TESTS_DIR, absolutePath));
      const { category, description } = getTestMetadata(entry.name, relativeToE2e);

      discovered.push({
        displayName: relativeToE2e,
        relativePath,
        absolutePath,
        category,
        description,
      });
    }
  }

  return discovered.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.displayName.localeCompare(b.displayName);
  });
}

function resolveRequestedTestFile(
  requested: string,
  discovered: DiscoveredTestFile[]
): DiscoveredTestFile | null {
  const normalized = normalizePath(String(requested || '').trim()).replace(/^\.?\//, '');
  if (!normalized) return null;

  return discovered.find((item) => {
    if (item.displayName === normalized) return true;
    if (item.relativePath === normalized) return true;
    if (`tests/e2e/${item.displayName}` === normalized) return true;
    return false;
  }) || null;
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
    const discovered = await discoverTestFiles();
    const testFiles = discovered.map((entry) => ({
      name: entry.displayName,
      path: entry.relativePath,
      category: entry.category,
      description: entry.description
    }));

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

    const discovered = await discoverTestFiles();
    const resolvedTestFile = resolveRequestedTestFile(String(testFile), discovered);
    if (!resolvedTestFile) {
      res.status(400).json({
        success: false,
        message: 'Invalid testFile. Use /api/v1/test-runner/files to select an allowed test file.'
      });
      return;
    }

    const normalizedPattern = typeof testPattern === 'string' ? testPattern.trim() : undefined;
    if (normalizedPattern && !isValidPattern(normalizedPattern)) {
      res.status(400).json({
        success: false,
        message: `Invalid testPattern. Pattern must be printable ASCII and <= ${MAX_TEST_PATTERN_LENGTH} chars.`
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
        testFile: resolvedTestFile.displayName,
        testPattern: normalizedPattern
      });

      testQueue.push({
        runId,
        testFile: resolvedTestFile.displayName,
        testFilePath: resolvedTestFile.absolutePath,
        testPattern: normalizedPattern
      });

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
    executeTest(runId, resolvedTestFile.displayName, resolvedTestFile.absolutePath, normalizedPattern);

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
function executeTest(runId: string, testFile: string, testFilePath: string, testPattern?: string): void {
  const outputFile = `/tmp/test-${runId}.log`;
  const args = ['playwright', 'test', testFilePath, '--workers=2'];
  if (testPattern) {
    args.push('-g', testPattern);
  }

  // Update test run status
  const run = activeTestRuns.get(runId);
  if (run) {
    run.status = 'running';
    run.output = 'Test execution started...\n';
  }

  const outputStream = fsSync.createWriteStream(outputFile, { flags: 'a' });
  outputStream.write(`Running test file: ${testFile}\nCommand: npx ${args.join(' ')}\n\n`);

  const child = spawn('npx', args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let outputBuffer = '';
  const appendOutput = (chunk: Buffer): void => {
    const text = chunk.toString();
    outputStream.write(text);
    outputBuffer += text;
    // Keep in-memory output bounded.
    if (outputBuffer.length > 500_000) {
      outputBuffer = outputBuffer.slice(outputBuffer.length - 500_000);
    }
  };

  child.stdout.on('data', appendOutput);
  child.stderr.on('data', appendOutput);

  const timeoutHandle = setTimeout(() => {
    child.kill('SIGTERM');
  }, 300_000);

  child.on('exit', async (code, signal) => {
    clearTimeout(timeoutHandle);
    outputStream.end();
    const run = activeTestRuns.get(runId);
    if (run) {
      try {
        const output = await fs.readFile(outputFile, 'utf-8').catch(() => outputBuffer);
        run.output = output;
        run.status = code === 0 && !signal ? 'completed' : 'failed';
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
    executeTest(next.runId, next.testFile, next.testFilePath, next.testPattern);
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

/**
 * Get tenant-scoped UAT IDs and suggested scenarios.
 * Intended for browser-only AI/manual operators who cannot access filesystem scripts.
 */
export async function getUatIds(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    if (!tenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context is required'
      });
      return;
    }

    const rows = await prisma.$queryRaw<Array<{ payload: unknown }>>(Prisma.sql`
      WITH tenant AS (
        SELECT id, slug, name
        FROM tenants
        WHERE id = ${tenantId}
        LIMIT 1
      ),
      category_data AS (
        SELECT
          ca.id AS category_id,
          ca.name AS category_name,
          ca."contestId" AS contest_id,
          co."eventId" AS event_id,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', con.id,
                'name', con.name,
                'contestantNumber', con."contestantNumber"
              )
            ) FILTER (WHERE con.id IS NOT NULL),
            '[]'::jsonb
          ) AS contestants,
          COALESCE(
            jsonb_agg(DISTINCT con.id) FILTER (WHERE con.id IS NOT NULL),
            '[]'::jsonb
          ) AS contestant_ids,
          COUNT(DISTINCT con.id)::int AS contestant_count
        FROM tenant t
        JOIN categories ca
          ON ca."tenantId" = t.id
         AND ca."deletedAt" IS NULL
        JOIN contests co
          ON co.id = ca."contestId"
         AND co."tenantId" = t.id
         AND co."deletedAt" IS NULL
        JOIN events e
          ON e.id = co."eventId"
         AND e."tenantId" = t.id
         AND e."deletedAt" IS NULL
        LEFT JOIN category_contestants cc
          ON cc."tenantId" = t.id
         AND cc."categoryId" = ca.id
        LEFT JOIN contestants con
          ON con."tenantId" = t.id
         AND con.id = cc."contestantId"
        GROUP BY ca.id, ca.name, ca."contestId", co."eventId"
      ),
      contest_data AS (
        SELECT
          co.id AS contest_id,
          co.name AS contest_name,
          co."eventId" AS event_id,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', cd.category_id,
                'name', cd.category_name,
                'contestantCount', cd.contestant_count,
                'contestantIds', cd.contestant_ids,
                'contestants', cd.contestants
              )
              ORDER BY cd.category_name
            ) FILTER (WHERE cd.category_id IS NOT NULL),
            '[]'::jsonb
          ) AS categories,
          COUNT(cd.category_id)::int AS category_count,
          COUNT(*) FILTER (WHERE cd.contestant_count > 0)::int AS categories_with_contestants
        FROM tenant t
        JOIN contests co
          ON co."tenantId" = t.id
         AND co."deletedAt" IS NULL
        JOIN events e
          ON e.id = co."eventId"
         AND e."tenantId" = t.id
         AND e."deletedAt" IS NULL
        LEFT JOIN category_data cd
          ON cd.contest_id = co.id
        GROUP BY co.id, co.name, co."eventId"
      ),
      event_data AS (
        SELECT
          e.id AS event_id,
          e.name AS event_name,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', ct.contest_id,
                'name', ct.contest_name,
                'categoryCount', ct.category_count,
                'categoriesWithContestants', ct.categories_with_contestants,
                'categories', ct.categories
              )
              ORDER BY ct.contest_name
            ) FILTER (WHERE ct.contest_id IS NOT NULL),
            '[]'::jsonb
          ) AS contests
        FROM tenant t
        JOIN events e
          ON e."tenantId" = t.id
         AND e."deletedAt" IS NULL
        LEFT JOIN contest_data ct
          ON ct.event_id = e.id
        GROUP BY e.id, e.name
      ),
      single_category_suggestion AS (
        SELECT jsonb_build_object(
          'eventId', e.id,
          'eventName', e.name,
          'contestId', co.id,
          'contestName', co.name,
          'categoryId', ca.id,
          'categoryName', ca.name,
          'contestantIds', cd.contestant_ids
        ) AS payload
        FROM tenant t
        JOIN events e
          ON e."tenantId" = t.id
         AND e."deletedAt" IS NULL
        JOIN contests co
          ON co."tenantId" = t.id
         AND co."eventId" = e.id
         AND co."deletedAt" IS NULL
        JOIN categories ca
          ON ca."tenantId" = t.id
         AND ca."contestId" = co.id
         AND ca."deletedAt" IS NULL
        JOIN category_data cd
          ON cd.category_id = ca.id
        WHERE cd.contestant_count > 0
        ORDER BY e.name, co.name, ca.name
        LIMIT 1
      ),
      multi_category_suggestion AS (
        SELECT jsonb_build_object(
          'eventId', e.id,
          'eventName', e.name,
          'contestId', co.id,
          'contestName', co.name,
          'categoryIds', (
            SELECT COALESCE(jsonb_agg(cd.category_id ORDER BY cd.category_name), '[]'::jsonb)
            FROM category_data cd
            WHERE cd.contest_id = co.id
              AND cd.contestant_count > 0
          ),
          'contestantIds', (
            SELECT COALESCE(jsonb_agg(DISTINCT cc."contestantId"), '[]'::jsonb)
            FROM category_contestants cc
            JOIN categories ca2 ON ca2.id = cc."categoryId"
            WHERE cc."tenantId" = t.id
              AND ca2."contestId" = co.id
              AND ca2."deletedAt" IS NULL
          )
        ) AS payload
        FROM tenant t
        JOIN events e
          ON e."tenantId" = t.id
         AND e."deletedAt" IS NULL
        JOIN contests co
          ON co."tenantId" = t.id
         AND co."eventId" = e.id
         AND co."deletedAt" IS NULL
        JOIN contest_data ctd
          ON ctd.contest_id = co.id
        WHERE ctd.categories_with_contestants >= 2
        ORDER BY e.name, co.name
        LIMIT 1
      )
      SELECT jsonb_build_object(
        'generatedAt', NOW(),
        'tenant', (SELECT jsonb_build_object('id', id, 'slug', slug, 'name', name) FROM tenant),
        'singleCategoryScenario', (SELECT payload FROM single_category_suggestion),
        'multiCategoryScenario', (SELECT payload FROM multi_category_suggestion),
        'events', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', ed.event_id,
                'name', ed.event_name,
                'contests', ed.contests
              )
              ORDER BY ed.event_name
            ),
            '[]'::jsonb
          )
          FROM event_data ed
        )
      ) AS payload;
    `);

    const payload = rows?.[0]?.payload;
    if (!payload) {
      res.status(404).json({
        success: false,
        message: 'No UAT ID data available for tenant'
      });
      return;
    }

    res.json({
      success: true,
      data: payload
    });
  } catch (error) {
    logger.error('Failed to build UAT IDs payload', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to generate UAT IDs payload',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
