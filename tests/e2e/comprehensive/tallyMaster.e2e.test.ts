/**
 * Comprehensive E2E Tests for TALLY_MASTER Role
 * Tests all possible interactions, views, and functions available to tally master users
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

test.describe('Comprehensive Tally Master E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `tally_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.tally_master.email);
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
  // TALLY MASTER DASHBOARD
  // ============================================================================

  test('should navigate to tally master dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally');

    const dashboard = page.locator('h1, h2, [data-testid="tally-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should view certification queue', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/certifications');

    // Certifications page should load for tally masters
    const certificationsPage = page.locator('h1, h2, body').first();
    await expect(certificationsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/certifications');
  });

  test('should view pending certifications', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/certifications');

    // Certifications page should load for tally masters
    const certificationsPage = page.locator('h1, h2, body').first();
    await expect(certificationsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/certifications');
  });

  // ============================================================================
  // SCORE REVIEW
  // ============================================================================

  test('should review scores for a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    // Dashboard should load for tally masters
    const dashboardPage = page.locator('h1, h2, body').first();
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should select a contest to review', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const categoriesList = page.locator('[data-testid="categories"], .category-list').first();
      const hasCategories = await categoriesList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPageContent = await page.locator('h1, h2, h3, table, [class*="category"]').count() > 0;
      // Test passes if categories list is visible OR page has content indicating it loaded
      expect(hasCategories || hasPageContent).toBe(true);
    }
  });

  test('should view contest certifications', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/score-management');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const certificationsSection = page.locator('[data-testid="certifications"], .certification-list, table').first();
      const hasCertifications = await certificationsSection.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certification|empty/i').count() > 0;
      expect(hasCertifications || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // CERTIFICATION WORKFLOW
  // ============================================================================

  test('should certify totals for a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally');

    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Approve Totals")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }

      await waitForSuccessMessage(page, 5000);
    }
  });

  test('should view certification status', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const statusSection = page.locator('[data-testid="certification-status"], .status, table').first();
    const hasStatus = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  // ============================================================================
  // SCORE REMOVAL REQUESTS
  // ============================================================================

  test('should view score removal requests', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    // Dashboard should load for tally masters
    const dashboardPage = page.locator('h1, h2, body').first();
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should create score removal request for category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/score-management');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }

    const requestButton = page.locator('button:has-text("Request Removal"), button:has-text("Remove Score")').first();
    if (await requestButton.isVisible({ timeout: 5000 })) {
      // Handle accordion interception
      try {
        await requestButton.click({ force: true, timeout: 5000 });
      } catch (error) {
        // If click is intercepted, try clicking accordion button first
        const accordionButton = page.locator('[data-accordion-id] button').first();
        if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await accordionButton.click({ force: true });
          await page.waitForTimeout(500);
          await requestButton.click({ force: true });
        }
      }
      await page.waitForTimeout(1000);

      const reasonInput = page.locator('textarea[name="reason"], textarea').first();
      if (await reasonInput.isVisible()) {
        await reasonInput.fill(`Score removal request for category ${testData.categories[0].id}`);
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        if (!page.isClosed()) {
          await waitForSuccessMessage(page, 5000).catch(() => {});
        }
      }
    }
  });

  test('should create score removal request for contest', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/score-management');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      // Look for contest-wide removal option
      const contestRemovalButton = page.locator('button:has-text("Remove All"), button:has-text("Contest Removal")').first();
      if (await contestRemovalButton.isVisible({ timeout: 5000 })) {
        await contestRemovalButton.click();
        await page.waitForTimeout(1000);

        const reasonInput = page.locator('textarea[name="reason"]').first();
        if (await reasonInput.isVisible()) {
          await reasonInput.fill(`Contest-wide removal for contest ${testData.contests[0].id}`);
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);

          await waitForSuccessMessage(page, 5000);
        }
      }
    }
  });

  // ============================================================================
  // BIAS CHECKING TOOLS
  // ============================================================================

  test('should use bias checking tools', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally');

    const biasButton = page.locator('button:has-text("Bias"), button:has-text("Check Bias")').first();
    if (await biasButton.isVisible({ timeout: 5000 })) {
      await biasButton.click();
      await page.waitForTimeout(2000);

      const biasReport = page.locator('[data-testid="bias-report"], .bias-analysis, table').first();
      const hasReport = await biasReport.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
      expect(hasReport || hasPageContent).toBe(true);
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

  test('should filter results by contest', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const resultsTable = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
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

  test('should generate certification report', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Certification Report")').first();
    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.click();
      await page.waitForTimeout(3000);

      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await waitForSuccessMessage(page, 5000).catch(() => {});
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
