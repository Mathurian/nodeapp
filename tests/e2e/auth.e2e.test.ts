/**
 * E2E Tests for Authentication Flow
 * Tests complete user authentication workflows in the browser
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
  navigateAndWait,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Authentication E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `auth_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: false,
      createScores: false,
    });
  });

  test.afterEach(async () => {
    if (authContext) {
      await cleanupContexts({ main: authContext });
      authContext = null;
    }
    await factory.cleanup();
    const cleanupSuccess = await factory.verifyCleanup();
    if (!cleanupSuccess) {
      console.error('⚠️  Test data cleanup verification failed');
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should display login page', async () => {
    // Create context without authentication to test login page
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-Tenant-Slug': testData.tenant.slug,
      },
    });
    const page = await context.newPage();

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Check that login form is visible
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first()).toBeVisible();

    await context.close();
  });

  test('should login successfully with valid credentials', async () => {
    // This test creates authenticated context which verifies login works
    authContext = await createAuthContext(
      browser,
      testData.users.admin.email,
      'password123',
      testData.tenant.slug
    );

    const { page } = authContext;

    // Check that we're logged in (not on login page)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');

    // Verify we can navigate to protected routes
    await navigateAndWait(page, '/dashboard');
    const dashboard = page.locator('h1, h2, [data-testid="dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should show error with invalid credentials', async () => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-Tenant-Slug': testData.tenant.slug,
      },
    });
    const page = await context.newPage();

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Check for error message or still on login page
    const errorMessage = page.locator('.error, .alert-error, [role="alert"]').first();
    const hasError = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
    const stillOnLogin = page.url().includes('/login');

    expect(hasError || stillOnLogin).toBe(true);

    await context.close();
  });

  test('should navigate to forgot password page', async () => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-Tenant-Slug': testData.tenant.slug,
      },
    });
    const page = await context.newPage();

    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Look for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot"), a:has-text("password")').first();

    if (await forgotPasswordLink.isVisible({ timeout: 3000 })) {
      await forgotPasswordLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('forgot-password');
    }

    await context.close();
  });

  test('should logout successfully', async () => {
    // Login first
    authContext = await createAuthContext(
      browser,
      testData.users.admin.email,
      'password123',
      testData.tenant.slug
    );

    const { page } = authContext;

    // Look for logout button/link
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]').first();

    if (await logoutButton.isVisible({ timeout: 5000 })) {
      await logoutButton.click();
      await page.waitForTimeout(2000);

      // Should be redirected to login page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/login');
    }
  });

  test('should prevent access to protected routes when not logged in', async () => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-Tenant-Slug': testData.tenant.slug,
      },
    });
    const page = await context.newPage();

    // Try to access protected route
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should be redirected to login
    expect(page.url()).toContain('/login');

    await context.close();
  });

  test('should maintain session across page navigation', async () => {
    // Login first
    authContext = await createAuthContext(
      browser,
      testData.users.admin.email,
      'password123',
      testData.tenant.slug
    );

    const { page } = authContext;

    // Navigate to different pages
    await navigateAndWait(page, '/events');
    await page.waitForTimeout(1000);

    // Check we're not redirected to login
    let currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');

    await navigateAndWait(page, '/users');
    await page.waitForTimeout(1000);

    // Should still be logged in (not redirected to login)
    currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    expect(currentUrl).toContain('/users');

    // Verify page content loaded (indicates successful authentication)
    const pageHeading = page.locator('h1, h2').first();
    const hasPageContent = await pageHeading.isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasPageContent).toBe(true);
  });

  test('should handle password reset flow', async () => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'X-Tenant-Slug': testData.tenant.slug,
      },
    });
    const page = await context.newPage();

    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').first();

    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(testData.users.admin.email);
      const resetResponsePromise = page.waitForResponse((response) =>
        response.url().includes('/auth/forgot-password') && response.request().method() === 'POST'
      );
      await submitButton.click();
      const resetResponse = await resetResponsePromise;
      const resetBody = await resetResponse.text();
      expect(
        resetResponse.ok(),
        `Forgot password response ${resetResponse.status()}: ${resetBody}`
      ).toBe(true);
      await expect(page.getByText('If the account exists, a password reset email has been sent.')).toBeVisible({ timeout: 5000 });
      await expect(emailInput).toHaveValue('');
      expect(page.url()).toContain('/forgot-password');
    }

    await context.close();
  });
});
