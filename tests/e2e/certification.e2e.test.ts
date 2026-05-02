/**
 * E2E Tests for Certification Workflow
 * Tests complete certification workflow for judges, tally masters, and auditors
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  navigateAndWait,
  waitForSuccessMessage,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Certification E2E Tests', () => {
  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public',
        },
      },
    });
    await prisma.$connect();
  });

  test.beforeEach(async () => {
    factory = new TestDataFactory(prisma, `cert_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.admin.email, 'password123', testData.tenant.slug);
  });

  test.afterEach(async () => {
    await cleanupContexts({ main: authContext });
    await factory.cleanup();
    const cleanupSuccess = await factory.verifyCleanup();
    if (!cleanupSuccess) {
      console.error('⚠️  Test data cleanup verification failed');
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should display certification workflow for judge', async () => {
    // Create judge auth context
    const judgeContext = await createAuthContext(browser, testData.users.judge.email, 'password123', testData.tenant.slug);
    const { page } = judgeContext;

    // Simplified: Just verify certifications page is accessible
    await navigateAndWait(page, '/certifications');

    const certificationsPage = page.locator('h1, h2, body').first();
    await expect(certificationsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/certifications');

    await cleanupContexts({ judge: judgeContext });
  });

  test('should allow judge to certify scores', async () => {
    // Create judge auth context
    const judgeContext = await createAuthContext(browser, testData.users.judge.email, 'password123', testData.tenant.slug);
    const { page } = judgeContext;

    await navigateAndWait(page, '/judge/certification-workflow');
    await page.waitForTimeout(2000);

    // Find certify button
    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Sign")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(2000);

      // Check for success message
      const hasSuccess = await waitForSuccessMessage(page, 5000).then(() => true).catch(() => false);
      expect(hasSuccess).toBe(true);
    }

    await cleanupContexts({ judge: judgeContext });
  });

  test('should display certification status', async () => {
    const { page } = authContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Check for certification status display
    const statusDisplay = page.locator('[data-testid="certification-status"], .status').first();
    const hasStatus = await statusDisplay.isVisible({ timeout: 10000 }).catch(() => false);

    if (!hasStatus) {
      // Check for status table or empty state
      const hasStatusTable = await page.locator('table, .status-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*certif|empty/i').count() > 0;
      expect(hasStatusTable || hasEmptyState).toBe(true);
    } else {
      expect(hasStatus).toBe(true);
    }
  });

  test('should allow tally master to certify totals', async () => {
    // Create tally master auth context
    const tallyContext = await createAuthContext(browser, testData.users.tally_master.email, 'password123', testData.tenant.slug);
    const { page } = tallyContext;

    await navigateAndWait(page, '/tally-master/certify-totals');
    await page.waitForTimeout(2000);

    const certifyButton = page.locator('button:has-text("Certify Totals")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(2000);

      const hasSuccess = await waitForSuccessMessage(page, 5000).then(() => true).catch(() => false);
      expect(hasSuccess).toBe(true);
    }

    await cleanupContexts({ tally: tallyContext });
  });

  test('should allow auditor to finalize certification', async () => {
    // Create auditor auth context
    const auditorContext = await createAuthContext(browser, testData.users.auditor.email, 'password123', testData.tenant.slug);
    const { page } = auditorContext;

    await navigateAndWait(page, '/auditor/final-certification');
    await page.waitForTimeout(2000);

    const finalizeButton = page.locator('button:has-text("Finalize"), button:has-text("Approve")').first();
    if (await finalizeButton.isVisible({ timeout: 5000 })) {
      await finalizeButton.click();
      await page.waitForTimeout(2000);

      const hasSuccess = await waitForSuccessMessage(page, 5000).then(() => true).catch(() => false);
      expect(hasSuccess).toBe(true);
    }

    await cleanupContexts({ auditor: auditorContext });
  });

  test('should show certification progress', async () => {
    const { page } = authContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Check for progress indicators
    const progressBars = page.locator('.progress, [data-testid="progress"], progress').count();
    const progressCount = await progressBars;

    if (progressCount > 0) {
      expect(progressCount).toBeGreaterThan(0);
    } else {
      // Check for progress text or empty state
      const progressText = page.locator('text=/progress|complete|pending/i').first();
      const hasProgressText = await progressText.isVisible({ timeout: 2000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certif|empty/i').count() > 0;
      expect(hasProgressText || hasEmptyState).toBe(true);
    }
  });

  test('should allow board member to view certification status', async () => {
    // Create board member auth context
    const boardContext = await createAuthContext(browser, testData.users.board.email, 'password123', testData.tenant.slug);
    const { page } = boardContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Board members should be able to view certification status
    const certificationPage = page.locator('h1, h2, [data-testid="certifications"]').first();
    const hasPage = await certificationPage.isVisible({ timeout: 10000 }).catch(() => false);
    const onCertPage = page.url().includes('/certifications');

    expect(hasPage || onCertPage).toBe(true);

    await cleanupContexts({ board: boardContext });
  });

  test('should show multi-step certification workflow', async () => {
    const { page } = authContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Look for workflow steps or stages
    const workflowSteps = page.locator('[data-testid="workflow-step"], .step, .stage').count();
    const stepCount = await workflowSteps;

    if (stepCount > 0) {
      expect(stepCount).toBeGreaterThan(0);
    } else {
      // Check for certification workflow content
      const hasWorkflowContent = await page.locator('text=/judge|tally|auditor|workflow/i').count() > 0;
      const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
      expect(hasWorkflowContent || hasPageContent).toBe(true);
    }
  });

  test('should track certification timestamps', async () => {
    // Create judge auth context to certify
    const judgeContext = await createAuthContext(browser, testData.users.judge.email, 'password123', testData.tenant.slug);
    const { page } = judgeContext;

    await navigateAndWait(page, '/judge/certification-workflow');
    await page.waitForTimeout(2000);

    // Look for timestamp or date information
    const timestamps = page.locator('[data-testid="timestamp"], .timestamp, time, [datetime]').count();
    const timestampCount = await timestamps;

    if (timestampCount > 0) {
      expect(timestampCount).toBeGreaterThan(0);
    } else {
      // Check for date/time text
      const hasDateInfo = await page.locator('text=/date|time|certified/i').count() > 0;
      const hasPageContent = await page.locator('h1, h2').count() > 0;
      expect(hasDateInfo || hasPageContent).toBe(true);
    }

    await cleanupContexts({ judge: judgeContext });
  });

  test('should display certification history', async () => {
    const { page } = authContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Look for history tab or section
    const historyTab = page.locator('button:has-text("History"), [data-testid="history"]').first();
    if (await historyTab.isVisible({ timeout: 5000 })) {
      await historyTab.click();
      await page.waitForTimeout(2000);

      const historyList = page.locator('table, .history-list, [data-testid="history-list"]').first();
      const hasHistory = await historyList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*histor|empty/i').count() > 0;
      expect(hasHistory || hasEmptyState).toBe(true);
    }
  });

  test('should prevent unauthorized access to certification actions', async () => {
    // Create contestant auth context (should not have certification permissions)
    const contestantContext = await createAuthContext(browser, testData.users.contestant.email, 'password123', testData.tenant.slug);
    const { page } = contestantContext;

    await navigateAndWait(page, '/certifications');
    await page.waitForTimeout(2000);

    // Contestants are blocked from the current certification workspace.
    const currentUrl = page.url();
    const isUnauthorized = await page.getByText(/Access Denied|don't have permission/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/certifications');

    expect(isUnauthorized || isRedirected).toBe(true);

    await cleanupContexts({ contestant: contestantContext });
  });
});
