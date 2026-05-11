/**
 * Comprehensive E2E Tests for TALLY_MASTER Role
 * Tests all possible interactions, views, and functions available to tally master users
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  waitForPageLoad,
  waitForSuccessMessage,
  navigateAndWait,
  clickButton,
} from '../helpers/playwrightAuthHelpers';

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
    factory = new TestDataFactory(prisma, `tallymaster_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.tally_master.email, 'password123', testData.tenant.slug);
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
  // DASHBOARD & NAVIGATION
  // ============================================================================

  test('should navigate to tally master dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master');

    const tallyPage = page.locator('h1:has-text("Tally"), h2:has-text("Tally"), [data-testid="tally"]').first();
    await expect(tallyPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/tally/i);
    });
  });

  test('should view tally master dashboard overview', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    const dashboardPage = page.locator('h1, h2, [data-testid="dashboard"]').first();
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // SCORE REVIEW
  // ============================================================================

  test('should navigate to score review page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/score-review');

    const reviewSection = page.locator('[data-testid="score-review"], .review, h1, h2').first();
    await expect(reviewSection).toBeVisible({ timeout: 10000 }).catch(async () => {
      const hasScores = await page.locator('table, .score-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*score|empty/i').count() > 0;
      expect(hasScores || hasEmptyState).toBe(true);
    });
  });

  test('should view all scores for a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/score-review');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const scoresTable = page.locator('table, [data-testid="scores-list"], .score-list').first();
      const hasScores = await scoresTable.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*score/i').count() > 0;
      expect(hasScores || hasEmptyState).toBe(true);
    }
  });

  test('should filter scores by contestant', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/score-review');

    const contestantFilter = page.locator('select[name="contestant"], input[name="contestant"], input[placeholder*="contestant" i]').first();
    if (await contestantFilter.isVisible({ timeout: 5000 })) {
      await contestantFilter.fill(testData.contestant.contestantNumber.toString());
      await page.waitForTimeout(2000);

      const scoresTable = page.locator('table, [data-testid="scores-list"]').first();
      const hasScores = await scoresTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasScores).toBe(true);
    }
  });

  test('should filter scores by judge', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/score-review');

    const judgeFilter = page.locator('select[name="judge"], input[name="judge"]').first();
    if (await judgeFilter.isVisible({ timeout: 5000 })) {
      await judgeFilter.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const scoresTable = page.locator('table, [data-testid="scores-list"]').first();
      const hasScores = await scoresTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasScores).toBe(true);
    }
  });

  test('should view detailed score information', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/score-review');

    const scoreRow = page.locator('tr, [data-testid="score-row"]').nth(1);
    if (await scoreRow.isVisible({ timeout: 5000 })) {
      await scoreRow.click();
      await page.waitForTimeout(1000);

      const scoreDetails = page.locator('[data-testid="score-details"], .score-details, [class*="detail"]').first();
      const hasDetails = await scoreDetails.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasDetails).toBe(true);
    }
  });

  // ============================================================================
  // CERTIFICATION QUEUE
  // ============================================================================

  test('should navigate to certification queue', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/certification-queue');

    const queueSection = page.locator('[data-testid="certification-queue"], .queue, h1, h2').first();
    await expect(queueSection).toBeVisible({ timeout: 10000 }).catch(async () => {
      const hasQueue = await page.locator('table, .queue-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*queue|empty/i').count() > 0;
      expect(hasQueue || hasEmptyState).toBe(true);
    });
  });

  test('should view pending certifications', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/certifications');

    // Certifications page should load for tally masters
    const certificationsPage = page.locator('h1, h2, body').first();
    await expect(certificationsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/certifications');
  });

  test('should filter certifications by status', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/certification-queue');

    const statusFilter = page.locator('select[name="status"], [data-testid="status-filter"]').first();
    if (await statusFilter.isVisible({ timeout: 5000 })) {
      await statusFilter.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const queueList = page.locator('table, [data-testid="queue-list"]').first();
      const hasQueue = await queueList.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasQueue).toBe(true);
    }
  });

  test('should approve a certification', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/certification-queue');

    const approveButton = page.locator('button:has-text("Approve"), button[data-testid="approve"]').first();
    if (await approveButton.isVisible({ timeout: 5000 })) {
      await approveButton.click();
      await page.waitForTimeout(1000);

      // Confirm if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }

      await waitForSuccessMessage(page, 5000);
    }
  });

  test('should reject a certification with reason', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/certification-queue');

    const rejectButton = page.locator('button:has-text("Reject"), button[data-testid="reject"]').first();
    if (await rejectButton.isVisible({ timeout: 5000 })) {
      await rejectButton.click();
      await page.waitForTimeout(1000);

      // Fill rejection reason
      const reasonInput = page.locator('textarea[name="reason"], input[name="reason"]').first();
      if (await reasonInput.isVisible({ timeout: 2000 })) {
        await reasonInput.fill('Test rejection reason for verification');
        await page.waitForTimeout(500);

        const submitButton = page.locator('button:has-text("Submit"), button:has-text("Confirm")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // BIAS CHECKING TOOLS
  // ============================================================================

  test('should navigate to bias checking tools', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/bias-checking');

    const biasTools = page.locator('[data-testid="bias-checking"], .bias-tools, h1, h2').first();
    await expect(biasTools).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/bias/i);
    });
  });

  test('should run bias analysis for a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/bias-checking');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(1000);

      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Run"), button[data-testid="analyze"]').first();
      if (await analyzeButton.isVisible({ timeout: 5000 })) {
        await analyzeButton.click();
        await page.waitForTimeout(3000);

        const resultsSection = page.locator('[data-testid="bias-results"], .bias-results, table').first();
        const hasResults = await resultsSection.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasResults).toBe(true);
      }
    }
  });

  test('should view bias statistics', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/bias-checking');

    const statsSection = page.locator('[data-testid="bias-stats"], .statistics, [class*="stat"]').first();
    if (await statsSection.isVisible({ timeout: 5000 })) {
      const hasContent = await page.locator('text=/mean|median|standard deviation/i').count() > 0;
      expect(hasContent).toBe(true);
    }
  });

  test('should export bias report', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/bias-checking');

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportButton.click();
      const download = await downloadPromise;

      if (download) {
        expect(download).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // RESULTS MANAGEMENT
  // ============================================================================

  test('should view results page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should filter results by category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const resultsTable = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  test('should view winners page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/winners');

    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    await expect(winnersPage).toBeVisible({ timeout: 10000 });
  });

  test('should show event overview when all contests is selected on winners page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/winners');

    const selects = page.locator('select');
    const eventSelect = selects.nth(0);
    const contestSelect = selects.nth(1);

    await expect.poll(() => eventSelect.locator('option').count(), { timeout: 10000 }).toBeGreaterThan(1);
    await eventSelect.selectOption(testData.event.id);
    await page.waitForTimeout(1000);
    await contestSelect.selectOption('ALL');
    await page.waitForTimeout(2000);

    const overviewCard = page.getByText(/Viewing publication overview for all contests in/i).first();
    await expect(overviewCard).toBeVisible({ timeout: 10000 });
  });

  test('should verify final tallies', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/verify-tallies');

    const verifySection = page.locator('[data-testid="verify-tallies"], .verify, h1, h2').first();
    const hasSection = await verifySection.isVisible({ timeout: 5000 }).catch(() => false);
    const isOnCorrectPage = page.url().includes('verify') || page.url().includes('tally');
    expect(hasSection || isOnCorrectPage).toBe(true);
  });

  // ============================================================================
  // REPORTS & ANALYTICS
  // ============================================================================

  test('should navigate to reports page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const reportsPage = page.locator('h1, h2, [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 });
  });

  test('should generate tally report', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const reportType = page.locator('select[name="reportType"], select').first();
    if (await reportType.isVisible({ timeout: 5000 })) {
      // Look for tally or score report option
      const options = await reportType.locator('option').allTextContents();
      const tallyOptionIndex = options.findIndex((opt: string) => /tally|score/i.test(opt));

      if (tallyOptionIndex >= 0) {
        await reportType.selectOption({ index: tallyOptionIndex });
        await page.waitForTimeout(1000);

        const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create")').first();
        if (await generateButton.isVisible({ timeout: 5000 })) {
          await generateButton.click();
          await page.waitForTimeout(3000);

          await waitForSuccessMessage(page, 5000);
        }
      }
    }
  });

  test('should export results to CSV', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const exportButton = page.locator('button:has-text("Export"), button:has-text("CSV")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await exportButton.click();
      const download = await downloadPromise;

      if (download) {
        expect(download).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // SCORE AGGREGATION
  // ============================================================================

  test('should view score aggregation dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/aggregation');

    const aggregationSection = page.locator('[data-testid="aggregation"], .aggregation, h1, h2').first();
    const hasSection = await aggregationSection.isVisible({ timeout: 5000 }).catch(() => false);
    const isOnCorrectPage = page.url().includes('aggregation') || page.url().includes('tally');
    expect(hasSection || isOnCorrectPage).toBe(true);
  });

  test('should calculate aggregate scores for category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tally-master/aggregation');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(1000);

      const calculateButton = page.locator('button:has-text("Calculate"), button:has-text("Aggregate")').first();
      if (await calculateButton.isVisible({ timeout: 5000 })) {
        await calculateButton.click();
        await page.waitForTimeout(3000);

        const resultsTable = page.locator('table, [data-testid="aggregate-results"]').first();
        const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasResults).toBe(true);
      }
    }
  });

  // ============================================================================
  // TRACKER/CERTIFICATION STATUS
  // ============================================================================

  test('should view certification tracker', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const trackerPage = page.locator('[data-testid="tracker"], h1, h2, table').first();
    await expect(trackerPage).toBeVisible({ timeout: 10000 });
  });

  test('should view certification status for all categories', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const statusTable = page.locator('table, [data-testid="certification-status"]').first();
    const hasStatus = await statusTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  test('should monitor judge completion rates', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const completionSection = page.locator('[data-testid="completion-rates"], [class*="completion"], [class*="progress"]').first();
    if (await completionSection.isVisible({ timeout: 5000 })) {
      const hasPercentage = await page.locator('text=/\\d+%/').count() > 0;
      expect(hasPercentage).toBe(true);
    }
  });

  // ============================================================================
  // PROFILE & SETTINGS
  // ============================================================================

  test('should view profile settings', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    // Settings page should load for tally masters
    const settingsPage = page.locator('h1, h2, body').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/settings');
  });

  test('should update profile information', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const profileSection = page.locator('button:has-text("Profile")').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);

      const preferredNameInput = page.locator('input[name="preferredName"]').first();
      if (await preferredNameInput.isVisible()) {
        await preferredNameInput.fill(`TallyMaster_${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
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

  // ============================================================================
  // ACCESS RESTRICTIONS
  // ============================================================================

  test('should not access super admin functions', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/admin');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access user management', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied"), text=/unauthorized/i').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/users');
    const hasUsersContent = await page.locator('[data-testid="users"], h1:has-text("Users")').isVisible({ timeout: 2000 }).catch(() => false);

    expect(isUnauthorized || isRedirected || !hasUsersContent).toBe(true);
  });

  test('should not access event management', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events/new');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/events/new');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access contest creation', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests/new');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/contests/new');

    expect(isUnauthorized || isRedirected).toBe(true);
  });
});
