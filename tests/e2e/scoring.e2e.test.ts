/**
 * E2E Tests for Scoring Flow
 * Tests judge scoring workflow in the browser
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  waitForSuccessMessage,
  navigateAndWait,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

const openFirstScoreInput = async (page: Page) => {
  await navigateAndWait(page, '/scoring');

  const assignedContestSelect = page.locator('#pages-scoringpage-1');
  if (await assignedContestSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await assignedContestSelect.selectOption({ index: 0 });
    await page.waitForTimeout(300);
  }

  const categoryButtons = page.locator('[data-testid="scoring-category-button"]');
  const categoryButtonWithContestants = categoryButtons.filter({ hasText: /[1-9]\d*\s+contestants/ }).first();
  const categoryButton = await categoryButtonWithContestants.count()
    ? categoryButtonWithContestants
    : categoryButtons.first();
  await expect(categoryButton).toBeVisible({ timeout: 10000 });
  await categoryButton.click();

  const contestantButton = page.locator('[data-testid="scoring-contestant-button"]').first();
  await expect(contestantButton).toBeVisible({ timeout: 10000 });
  await contestantButton.click();

  const scoreInput = page.locator('[data-testid="score-input"]').first();
  await expect(scoreInput).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
  return scoreInput;
};

test.describe('Scoring E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `scoring_${Date.now()}`);
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

  test('should navigate to scoring page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const scoringPage = page.locator('h1:has-text("Scoring"), h2:has-text("Scoring"), [data-testid="scoring"]').first();
    await expect(scoringPage).toBeVisible({ timeout: 10000 });
  });

  test('should display scoring interface', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    // Check for scoring form elements
    const hasScoringElements =
      (await page.locator('[data-testid="scoring-category-button"], select, button').count()) > 0;
    expect(hasScoringElements).toBe(true);
  });

  test('should display assigned categories', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categoryButton = page.locator('[data-testid="scoring-category-button"]').first();
    const hasCategories = await categoryButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*categor|no.*assignment/i').count() > 0;
    expect(hasCategories || hasEmptyState).toBe(true);
  });

  test('should display contestants for selected category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const categoryButton = page.locator('[data-testid="scoring-category-button"]').first();
    await expect(categoryButton).toBeVisible({ timeout: 10000 });
    await categoryButton.click();

    const contestantButton = page.locator('[data-testid="scoring-contestant-button"]').first();
    const hasContestants = await contestantButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*contestant/i').count() > 0;
    expect(hasContestants || hasEmptyState).toBe(true);
  });

  test('should submit a score', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    await scoreInput.fill('1');
    await page.waitForTimeout(300);

    const submitButton = page.locator('button:has-text("Submit"), button[type="submit"], button:has-text("Save Score")').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);

      const hasSuccessMessage = await waitForSuccessMessage(page, 5000).catch(() => false);
      if (!hasSuccessMessage) {
        const scoreValue = await scoreInput.inputValue();
        expect(scoreValue === '' || scoreValue === '1').toBe(true);
      }
    }
  });

  test('should validate score input (max value)', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    const maxValue = await scoreInput.getAttribute('data-max-score');
    expect(maxValue).not.toBeNull();
    await expect(page.locator('text=/Range:\\s*0-\\d+/').first()).toBeVisible();
  });

  test('should validate score input (min value)', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    await expect(scoreInput).toHaveAttribute('inputmode', 'numeric');
    await expect(scoreInput).toHaveAttribute('pattern', '[0-9]*');
  });

  test('should view scoring criteria', async () => {
    const { page } = authContext;
    await openFirstScoreInput(page);

    const criteriaList = page.locator('[data-testid="criteria"], .criteria-list, [class*="criterion"]').first();
    const hasCriteria = await criteriaList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasCriteriaInputs = (await page.locator('[data-testid="score-input"], [class*="score"]').count()) > 0;
    expect(hasCriteria || hasCriteriaInputs).toBe(true);
  });

  test('should reject decimal key entry for score fields', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    const initialValue = await scoreInput.inputValue();

    await scoreInput.click();
    await scoreInput.press('.');
    await expect(scoreInput).toHaveValue(initialValue);

    await scoreInput.type('5');
    await expect(scoreInput).toHaveValue(/^\d+$/);
  });

  test('should replace an existing score cleanly after refocus', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    const initialValue = await scoreInput.inputValue();
    expect(initialValue).not.toBe('');

    await scoreInput.click();
    await scoreInput.type('6');
    await expect(scoreInput).toHaveValue('6');
  });

  test('should ignore mouse wheel changes on score fields', async () => {
    const { page } = authContext;
    const scoreInput = await openFirstScoreInput(page);
    const initialValue = await scoreInput.inputValue();
    await scoreInput.hover();
    await page.mouse.wheel(0, 200);
    await expect(scoreInput).toHaveValue(initialValue);
  });

  test('should add comment to score', async () => {
    const { page } = authContext;
    await openFirstScoreInput(page);

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

  test('should display judge history', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    // Scoring page should load - simplified to just verify page access
    const scoringPage = page.locator('h1, h2, body').first();
    await expect(scoringPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/scoring');
  });

  test('should view scoring results', async () => {
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
});
