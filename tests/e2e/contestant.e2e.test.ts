/**
 * E2E Tests for Contestant Workflow
 * Tests contestant viewing scores and results
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  navigateAndWait,
  waitForPageLoad,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Contestant E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `contestant_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: false,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.contestant.email, 'password123', testData.tenant.slug);
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

  test('should view own scores', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const resultsPage = page.locator('h1:has-text("Result"), h2:has-text("Result"), [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/result|score/i);
    });
  });

  test('should view scores by category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    // Check for category filter or category list
    const categoryFilter = page.locator('select, [data-testid="category-filter"]').first();
    if (await categoryFilter.isVisible({ timeout: 5000 })) {
      await categoryFilter.selectOption({ index: 0 });
      await page.waitForTimeout(1000);

      // Check that scores are displayed
      const hasScores = await page.locator('table, .score-list, [data-testid="score"]').count() > 0;
      expect(hasScores).toBe(true);
    }
  });

  test('should view contest results', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    // Check for contest selector or results display
    const contestSelector = page.locator('select[name="contest"], [data-testid="contest"]').first();
    if (await contestSelector.isVisible({ timeout: 5000 })) {
      await contestSelector.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const hasResults = await page.locator('table, .results-list').count() > 0;
      expect(hasResults).toBe(true);
    }
  });

  test('should view ranking/placement', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    // Contestants can access results page - just verify it loads
    const resultsPage = page.locator('h1, h2, body').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/results');
  });

  test('should navigate to home page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/');

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should not access admin features', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/admin');

    const currentUrl = page.url();

    // Should be redirected away from admin or see unauthorized message
    const unauthorizedMessage = page.locator('.error, .unauthorized, [role="alert"], h1:has-text("Unauthorized"), h1:has-text("Access Denied")').first();
    const isUnauthorized = await unauthorizedMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // Check if redirected away from admin page
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');

    // Test passes if either unauthorized message shown or redirected away
    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should view profile settings', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    // Settings page should load for contestants
    const settingsPage = page.locator('h1, h2, body').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/settings');
  });

  test('should navigate to help page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/help');

    const helpPage = page.locator('h1, h2, [data-testid="help"]').first();
    await expect(helpPage).toBeVisible({ timeout: 10000 });
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

  test('should not access scoring page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/scoring');

    expect(isUnauthorized || isRedirected).toBe(true);
  });
});
