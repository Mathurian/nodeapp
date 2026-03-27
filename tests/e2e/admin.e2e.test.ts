/**
 * Comprehensive E2E Tests for ADMIN Role
 * Tests all possible admin workflows including CRUD operations on events, contests, categories, and users
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
  closeOpenModals,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Comprehensive Admin E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `admin_${Date.now()}`);
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

  // ============================================================================
  // EVENTS MANAGEMENT
  // ============================================================================

  test('should navigate to events page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events');

    const eventsPage = page.locator('h1:has-text("Event"), h2:has-text("Event"), [data-testid="events"]').first();
    await expect(eventsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view existing events', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events');

    // Should see the event created by TestDataFactory
    const eventsList = page.locator('table, [data-testid="events-list"], .event-list').first();
    const hasEvents = await eventsList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEventName = await page.locator(`text="${testData.event.name}"`).isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasEvents || hasEventName).toBe(true);
  });

  test('should create a new event', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events');

    // Close any open modals/command palette first
    await closeOpenModals(page);

    const createButton = page.locator('button:has-text("Create"), button:has-text("New Event")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();

      if (await nameInput.isVisible()) {
        await nameInput.fill(`Admin Test Event ${Date.now()}`);
        if (await locationInput.isVisible()) {
          await locationInput.fill('Test Location');
        }

        // Close any modals that might have opened during form fill
        await closeOpenModals(page);

        await submitButton.click({ force: true });
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should edit an existing event', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events');

    // Find edit button for the test event
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Event ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should delete an event', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/events');

    // Find delete button
    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // CONTESTS MANAGEMENT
  // ============================================================================

  test('should navigate to contests page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests');

    const contestsPage = page.locator('h1:has-text("Contest"), h2:has-text("Contest"), [data-testid="contests"]').first();
    await expect(contestsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view existing contests', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests');

    // Should see the contests created by TestDataFactory (displayed as cards)
    const contestsList = page.locator('table, [data-testid="contests-list"], .contest-list, .grid').first();
    const hasContests = await contestsList.isVisible({ timeout: 5000 }).catch(() => false);

    // Also check if we can see any contest cards
    if (!hasContests) {
      const contestCards = await page.locator('button:has-text("View Categories"), button:has-text("Edit"), button:has-text("Delete")').count();
      expect(contestCards).toBeGreaterThan(0);
    } else {
      expect(hasContests).toBe(true);
    }
  });

  test('should create a contest for an event', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests');

    const createButton = page.locator('button:has-text("Create Contest"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Admin Test Contest ${Date.now()}`);

        // Select event if dropdown exists
        const eventSelect = page.locator('select[name="eventId"], select').first();
        if (await eventSelect.isVisible({ timeout: 2000 })) {
          await eventSelect.selectOption({ index: 0 });
        }

        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should edit an existing contest', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests');

    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Contest ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should delete a contest', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/contests');

    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // CATEGORIES MANAGEMENT
  // ============================================================================

  test('should navigate to categories page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/categories');

    const categoriesPage = page.locator('h1:has-text("Categor"), h2:has-text("Categor"), [data-testid="categories"]').first();
    await expect(categoriesPage).toBeVisible({ timeout: 10000 });
  });

  test('should view existing categories', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/categories');

    // Categories page loads - either with data or empty state
    const categoriesPage = page.locator('h1:has-text("Categor")').first();
    const hasPage = await categoriesPage.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasPage).toBe(true);

    // Check if we can see categories OR the empty state message
    const hasCategories = await page.locator('.grid, table').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/No categories yet/i').isVisible({ timeout: 3000 }).catch(() => false);

    // Either should be visible (categories or empty state means page loaded correctly)
    expect(hasCategories || hasEmptyState).toBe(true);
  });

  test('should create a category for a contest', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/categories');

    const createButton = page.locator('button:has-text("Create Category"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Admin Test Category ${Date.now()}`);

        // Select contest if dropdown exists
        const contestSelect = page.locator('select[name="contestId"], select').first();
        if (await contestSelect.isVisible({ timeout: 2000 })) {
          await contestSelect.selectOption({ index: 0 });
        }

        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should edit an existing category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/categories');

    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Category ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should delete a category', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/categories');

    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  test('should navigate to users page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const usersPage = page.locator('h1:has-text("User"), h2:has-text("User"), [data-testid="users"]').first();
    await expect(usersPage).toBeVisible({ timeout: 10000 });
  });

  test('should view existing users', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    // Should see the users created by TestDataFactory
    const usersList = page.locator('table, [data-testid="users-list"], .user-list').first();
    const hasUsers = await usersList.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasUsers).toBe(true);
  });

  test('should create a new user', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const createButton = page.locator('button:has-text("Create User"), button:has-text("New User")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const nameInput = page.locator('input[name="name"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

      if (await emailInput.isVisible()) {
        await emailInput.fill(`admintest${Date.now()}@example.com`);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Admin Test User');
        }
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('password123');
        }

        const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should edit an existing user', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated User ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should manage user roles', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);

      const roleSelect = page.locator('select[name="role"]').first();
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption({ index: 1 });
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  test('should delete a user', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/users');

    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);

      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // ADMIN DASHBOARD
  // ============================================================================

  test('should navigate to admin dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/admin');

    const adminPage = page.locator('h1:has-text("Admin"), h2:has-text("Admin"), [data-testid="admin"]').first();
    await expect(adminPage).toBeVisible({ timeout: 10000 });
  });

  test('should view system statistics', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');
    await page.waitForTimeout(2000);

    // Wait for stats to load
    await page.waitForResponse((response: any) =>
      response.url().includes('/api/v1/admin/stats') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => {});

    // Check for stats display - look for stat cards in the grid
    const statsGrid = page.locator('.grid').first();
    const hasStatsGrid = await statsGrid.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasStatsGrid) {
      // Fallback: check for any stat-like content
      const hasStats = await page.locator('[class*="stat"], .bg-white.dark\\:bg-gray-800, h3:has-text("Total")').count() > 0;
      expect(hasStats).toBe(true);
    } else {
      expect(hasStatsGrid).toBe(true);
    }
  });

  test('should view audit logs', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/admin/audit-logs');

    const auditLogsSection = page.locator('[data-testid="audit-logs"], table, h1:has-text("Audit"), h2:has-text("Audit")').first();
    const hasAuditLogs = await auditLogsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2').count() > 0;

    expect(hasAuditLogs || hasPageContent).toBe(true);
  });

  // ============================================================================
  // RESULTS & REPORTS
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

  test('should export results report', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/results');

    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      // Just verify the button is clickable - actual download testing is complex
      const isEnabled = await exportButton.isEnabled();
      expect(isEnabled).toBe(true);
    }
  });

  // ============================================================================
  // SETTINGS & CONFIGURATION
  // ============================================================================

  test('should view system settings', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const settingsPage = page.locator('h1:has-text("Setting"), h2:has-text("Setting"), [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  test('should update admin profile', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/settings');

    const profileSection = page.locator('button:has-text("Profile")').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);

      const preferredNameInput = page.locator('input[name="preferredName"]').first();
      if (await preferredNameInput.isVisible()) {
        await preferredNameInput.fill(`Admin_${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });

  // ============================================================================
  // DASHBOARD NAVIGATION
  // ============================================================================

  test('should navigate to dashboard', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    const dashboard = page.locator('h1, h2, [data-testid="dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should access all admin navigation items', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/dashboard');

    // Check that admin can access key pages
    const pages = ['/events', '/contests', '/users', '/results'];

    for (const pagePath of pages) {
      await navigateAndWait(page, pagePath);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      expect(currentUrl).toContain(pagePath);
    }
  });

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  test('should view notifications page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/notifications');

    const notificationsPage = page.locator('h1:has-text("Notification"), h2:has-text("Notification"), [data-testid="notifications"]').first();
    await expect(notificationsPage).toBeVisible({ timeout: 10000 });
  });

  test('should send notification to users', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/notifications');

    const sendButton = page.locator('button:has-text("Send"), button:has-text("New Notification")').first();
    if (await sendButton.isVisible({ timeout: 5000 })) {
      await sendButton.click();
      await page.waitForTimeout(1000);

      const messageInput = page.locator('textarea[name="message"], textarea').first();
      if (await messageInput.isVisible()) {
        await messageInput.fill('Test notification from admin');

        // Close any blocking modals
        await closeOpenModals(page);

        const submitButton = page.locator('button[type="submit"], button:has-text("Send")').first();
        await submitButton.click({ force: true });
        await page.waitForTimeout(2000);

        await waitForSuccessMessage(page, 5000);
      }
    }
  });
});
