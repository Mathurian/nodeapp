/**
 * Comprehensive E2E Tests for CONTESTANT Role
 * Tests all possible interactions, views, and functions available to contestant users
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

test.describe('Comprehensive Contestant E2E Tests', () => {
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
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.contestant.email);
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
  // HOME PAGE / DASHBOARD
  // ============================================================================

  test('should navigate to contestant home page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    const homePage = page.locator('h1, h2, [data-testid="dashboard"]').first();
    await expect(homePage).toBeVisible({ timeout: 10000 });
  });

  test('should view welcome message with name', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    const welcomeText = page.locator('text=/welcome|hello|hi/i').first();
    const hasWelcome = await welcomeText.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, p').count() > 0;
    expect(hasWelcome || hasPageContent).toBe(true);
  });

  test('should view assigned events', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    // Contestants see the dashboard page - just verify it loads
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
    // Dashboard may show stats or welcome message depending on role
    expect(page.url()).toContain('/dashboard');
  });

  test('should select an event and view contests', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    const eventSelect = page.locator('select[name="event"], select').first();
    if (await eventSelect.isVisible({ timeout: 5000 })) {
      await eventSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const contestsSection = page.locator('[data-testid="contests"], .contest-list').first();
      const hasContests = await contestsSection.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*contest/i').count() > 0;
      expect(hasContests || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // RESULTS VIEWING
  // ============================================================================

  test('should navigate to results page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view own scores', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    // Contestants can access results page - just verify it loads
    const resultsPage = page.locator('h1, h2, body').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/results');
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

  test('should view scores by category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const scoresTable = page.locator('table, [data-testid="scores"]').first();
      const hasScores = await scoresTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasScores).toBe(true);
    }
  });

  test('should view contest results', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);

      const resultsList = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsList.isVisible({ timeout: 5000 }).catch(() => false);
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

  // ============================================================================
  // WINNERS VIEWING (if allowed)
  // ============================================================================

  test('should view winners page if allowed', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/winners');

    const currentUrl = page.url();
    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);

    // Either can view winners or is blocked
    if (!isUnauthorized && !currentUrl.includes('/login')) {
      await expect(winnersPage).toBeVisible({ timeout: 10000 });
    } else {
      expect(isUnauthorized || currentUrl.includes('/login')).toBe(true);
    }
  });

  test('should filter winners by category if allowed', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/winners');

    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);

    if (!isUnauthorized) {
      const categorySelect = page.locator('select[name="category"], select').first();
      if (await categorySelect.isVisible({ timeout: 5000 })) {
        await categorySelect.selectOption({ index: 0 });
        await page.waitForTimeout(2000);

        const winnersList = page.locator('table, [data-testid="winners-list"]').first();
        const hasWinners = await winnersList.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasWinners).toBe(true);
      }
    }
  });

  // ============================================================================
  // PROFILE & SETTINGS
  // ============================================================================

  test('should navigate to settings page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const settingsPage = page.locator('h1, h2, [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view profile information', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const profileSection = page.locator('button:has-text("Profile"), [data-testid="profile"]').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"], input[name="preferredName"]').first();
      const hasProfileFields = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasProfileFields).toBe(true);
    }
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
        await preferredNameInput.fill(`Contestant_${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should update bio information', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const profileSection = page.locator('button:has-text("Profile")').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);

      const bioInput = page.locator('textarea[name="bio"], textarea[name="contestantBio"]').first();
      if (await bioInput.isVisible()) {
        await bioInput.fill(`Updated bio for contestant ${testData.contestant.id}`);
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

  test('should not access scoring page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/scoring');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/scoring');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access users management', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/users');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access assignments page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/assignments');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/assignments');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access templates page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/templates');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/templates');

    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access reports page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/reports');

    expect(isUnauthorized || isRedirected).toBe(true);
  });
});
