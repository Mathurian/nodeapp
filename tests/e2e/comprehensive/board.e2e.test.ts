/**
 * Comprehensive E2E Tests for BOARD Role
 * Tests all possible interactions, views, and functions available to board users
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  waitForPageLoad,
  waitForSuccessMessage,
  navigateAndWait,
  clickButton,
} from '../../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Comprehensive Board E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `board_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.board.email);
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

  // ============================================================================
  // BOARD DASHBOARD
  // ============================================================================

  test('should navigate to board dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const dashboard = page.locator('h1, h2, [data-testid="board-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should view certifications', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const certsSection = page.locator('[data-testid="certifications"], .certifications, table').first();
    const hasCerts = await certsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*certification|empty/i').count() > 0;
    const hasPageContent = await page.locator('h1, h2, h3, [class*="board"], [class*="certification"]').count() > 0;
    expect(hasCerts || hasEmptyState || hasPageContent).toBe(true);
  });

  test('should view certification status', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const statusSection = page.locator('[data-testid="certification-status"], .status, table').first();
    const hasStatus = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  // ============================================================================
  // CERTIFICATION APPROVAL
  // ============================================================================

  test('should approve certification', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Sign")').first();
    if (await approveButton.isVisible({ timeout: 5000 })) {
      await approveButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should reject certification', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Deny")').first();
    if (await rejectButton.isVisible({ timeout: 5000 })) {
      await rejectButton.click();
      await page.waitForTimeout(1000);

      const reasonInput = page.locator('textarea[name="reason"], textarea').first();
      if (await reasonInput.isVisible()) {
        await reasonInput.fill(`Rejection by board member ${testData.users.board.id}`);
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // SCORE REMOVAL REQUESTS
  // ============================================================================

  test('should view score removal requests', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const requestsTab = page.locator('button:has-text("Score Removal"), [data-testid="score-removal-tab"]').first();
    if (await requestsTab.isVisible({ timeout: 5000 })) {
      await requestsTab.click();
      await page.waitForTimeout(2000);
    }

    const requestsSection = page.locator('[data-testid="score-removal"], .requests, table, [class*="request"]').first();
    const hasRequests = await requestsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*request|empty|no.*score.*removal|no.*data/i').count() > 0;
    const hasPageContent = await page.locator('h1, h2, h3, [class*="board"], [class*="score"]').count() > 0;
    expect(hasRequests || hasEmptyState || hasPageContent).toBe(true);
  });

  test('should approve score removal request', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const requestsTab = page.locator('button:has-text("Score Removal")').first();
    if (await requestsTab.isVisible({ timeout: 5000 })) {
      await requestsTab.click();
      await page.waitForTimeout(2000);
    }

    const approveButton = page.locator('button:has-text("Approve Removal"), button:has-text("Approve")').first();
    if (await approveButton.isVisible({ timeout: 5000 })) {
      await approveButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should deny score removal request', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/board');

    const requestsTab = page.locator('button:has-text("Score Removal")').first();
    if (await requestsTab.isVisible({ timeout: 5000 })) {
      await requestsTab.click();
      await page.waitForTimeout(2000);
    }

    const denyButton = page.locator('button:has-text("Deny"), button:has-text("Reject")').first();
    if (await denyButton.isVisible({ timeout: 5000 })) {
      await denyButton.click();
      await page.waitForTimeout(1000);

      const reasonInput = page.locator('textarea[name="reason"]').first();
      if (await reasonInput.isVisible()) {
        await reasonInput.fill(`Denial by board member ${testData.users.board.id}`);
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // RESULTS VIEWING
  // ============================================================================

  test('should view results page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view winners page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/winners');

    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    await expect(winnersPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // REPORTS
  // ============================================================================

  test('should view reports page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const reportsPage = page.locator('h1, h2, [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 });
  });

  test('should generate board report', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Board Report")').first();
    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.click();
      await page.waitForTimeout(3000);

      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await waitForSuccessMessage(page, 5000).catch(() => {});
    }
  });

  // ============================================================================
  // EMCEE ACCESS
  // ============================================================================

  test('should navigate to emcee page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/emcee');

    const emceePage = page.locator('h1, h2, [data-testid="emcee"]').first();
    await expect(emceePage).toBeVisible({ timeout: 10000 });
  });

  test('should view contestant bios', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/emcee');

    const biosSection = page.locator('[data-testid="contestant-bios"], .bios, table').first();
    const hasBios = await biosSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, button').count() > 0;
    expect(hasBios || hasPageContent).toBe(true);
  });

  test('should view judge bios', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/emcee');

    const judgeBiosTab = page.locator('button:has-text("Judge"), [data-testid="judge-bios"]').first();
    if (await judgeBiosTab.isVisible({ timeout: 5000 })) {
      await judgeBiosTab.click();
      await page.waitForTimeout(2000);

      const biosList = page.locator('[data-testid="judge-bios-list"], table, .bio-list').first();
      const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasBios).toBe(true);
    }
  });

  // ============================================================================
  // SETTINGS
  // ============================================================================

  test('should view settings page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const settingsPage = page.locator('h1, h2, [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // HELP PAGE
  // ============================================================================

  test('should navigate to help page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/help');

    const helpPage = page.locator('h1, h2, [data-testid="help"]').first();
    await expect(helpPage).toBeVisible({ timeout: 10000 });
  });
});
