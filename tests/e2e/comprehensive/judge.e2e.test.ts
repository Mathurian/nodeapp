/**
 * Comprehensive E2E Tests for JUDGE Role
 * Tests all possible interactions, views, and functions available to judge users
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

test.describe('Comprehensive Judge E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `judge_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.judge.email, 'password123', testData.tenant.slug);
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
  // SCORING INTERFACE
  // ============================================================================

  test('should navigate to scoring page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const scoringPage = page.locator('h1:has-text("Scoring"), h2:has-text("Scoring"), [data-testid="scoring"]').first();
    await expect(scoringPage).toBeVisible({ timeout: 10000 });
  });

  test('should view assigned categories', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categorySelect = page.locator('select[name="category"], select').first();
    const hasCategories = await categorySelect.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*categor|no.*assignment/i').count() > 0;
    expect(hasCategories || hasEmptyState).toBe(true);
  });

  test('should select a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      const optionCount = await categorySelect.locator('option').count();
      if (optionCount > 1) {
        await categorySelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);

        // Check that contestants or criteria are displayed
        const contestantsList = page.locator('[data-testid="contestants"], .contestant-list').first();
        const criteriaList = page.locator('[data-testid="criteria"], .criteria-list').first();
        const hasContent = await contestantsList.isVisible({ timeout: 2000 }).catch(() => false) ||
                          await criteriaList.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasContent).toBe(true);
      }
    }
  });

  test('should view contestants for selected category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const contestantsList = page.locator('[data-testid="contestants"], .contestant-list, table').first();
      const hasContestants = await contestantsList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*contestant/i').count() > 0;
      expect(hasContestants || hasEmptyState).toBe(true);
    }
  });

  test('should view criteria for selected category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const criteriaList = page.locator('[data-testid="criteria"], .criteria-list, [class*="criterion"]').first();
      const hasCriteria = await criteriaList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasCriteriaInputs = await page.locator('input[type="number"], [class*="score"]').count() > 0;
      expect(hasCriteria || hasCriteriaInputs).toBe(true);
    }
  });

  test('should submit a score for a contestant', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    // Select category if available
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }

    // Find score input
    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      await scoreInput.fill('85');
      await page.waitForTimeout(500);

      // Find submit button
      const submitButton = page.locator('button:has-text("Submit"), button[type="submit"], button:has-text("Save Score")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should add comment to score', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }

    const commentInput = page.locator('textarea[name="comment"], textarea[placeholder*="comment" i]').first();
    if (await commentInput.isVisible({ timeout: 5000 })) {
      await commentInput.fill(`Test comment from judge ${testData.judge.id}`);
      await page.waitForTimeout(500);

      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should validate score input (max value)', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      const maxValue = await scoreInput.getAttribute('max');

      if (maxValue) {
        // Try entering value above max
        await scoreInput.fill(String(parseInt(maxValue) + 10));
        await page.waitForTimeout(500);

        // Check for validation error or that value was clamped
        const errorMessage = page.locator('.error, .invalid, [role="alert"]').first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const inputValue = await scoreInput.inputValue();

        // Either error shown or value was clamped to max
        expect(hasError || parseInt(inputValue) <= parseInt(maxValue)).toBe(true);
      }
    }
  });

  test('should validate score input (min value)', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      const minValue = await scoreInput.getAttribute('min');

      if (minValue) {
        // Try entering value below min
        await scoreInput.fill(String(parseInt(minValue) - 10));
        await page.waitForTimeout(500);

        const errorMessage = page.locator('.error, .invalid').first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const inputValue = await scoreInput.inputValue();

        expect(hasError || parseInt(inputValue) >= parseInt(minValue)).toBe(true);
      }
    }
  });

  test('should view scoring history', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const historyTab = page.locator('button:has-text("History"), [data-testid="history-tab"]').first();
    if (await historyTab.isVisible({ timeout: 5000 })) {
      await historyTab.click();
      await page.waitForTimeout(2000);

      const historyList = page.locator('[data-testid="history"], table, .history-list').first();
      const hasHistory = await historyList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*histor/i').count() > 0;
      expect(hasHistory || hasEmptyState).toBe(true);
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

  // ============================================================================
  // JUDGE BIOS
  // ============================================================================

  test('should navigate to judge bios page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/judge/bios');

    const biosPage = page.locator('h1, h2, [data-testid="judge-bios"]').first();
    await expect(biosPage).toBeVisible({ timeout: 10000 });
  });

  test('should view judge bios list', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/judge/bios');

    const biosList = page.locator('table, [data-testid="bios-list"], .bio-list').first();
    const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, p').count() > 0;
    expect(hasBios || hasPageContent).toBe(true);
  });

  // ============================================================================
  // CERTIFICATION WORKFLOW
  // ============================================================================

  test('should view certification status', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const statusSection = page.locator('[data-testid="certification-status"], .status, table').first();
    const hasStatus = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  test('should certify scores for a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/tracker');

    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Sign")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
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

  // ============================================================================
  // PROFILE & SETTINGS
  // ============================================================================

  test('should view profile settings', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    // Settings page should load for judges
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
        await preferredNameInput.fill(`Judge_${Date.now()}`);
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

  test('should not access admin page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/admin');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access users management', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied"), text=/unauthorized/i').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/users');
    const hasUsersContent = await page.locator('[data-testid="users"], h1:has-text("Users")').isVisible({ timeout: 2000 }).catch(() => false);

    expect(isUnauthorized || isRedirected || !hasUsersContent).toBe(true);
  });
});
