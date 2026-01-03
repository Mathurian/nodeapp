import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests - Main Pages
 *
 * These tests capture screenshots of critical pages and compare them
 * against baseline images to detect unintended visual changes.
 *
 * To update baselines when changes are intentional:
 *   npm run test:visual:update
 */

// Helper to wait for page to be ready
async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');

  // Disable animations for consistent screenshots
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // Wait a bit for any final renders
  await page.waitForTimeout(500);
}

// Helper to login (if needed)
async function login(page: Page) {
  // TODO: Implement login helper if needed
  // For now, tests will run on public pages or you can set auth token in localStorage
}

test.describe('Public Pages', () => {
  test.describe.configure({ mode: 'parallel' });

  test('Login page', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });

  test('404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('404-page.png', {
      fullPage: true,
    });
  });
});

test.describe('Authenticated Pages', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
    });
  });

  test('Events list', async ({ page }) => {
    await page.goto('/events');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('events-list.png', {
      fullPage: true,
    });
  });

  test('Settings page', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('settings.png', {
      fullPage: true,
    });
  });
});

test.describe('Responsive Design', () => {
  test('Dashboard - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
    });
  });

  test('Dashboard - Tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await login(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      fullPage: true,
    });
  });

  test('Dashboard - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto('/dashboard');
    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      fullPage: true,
    });
  });
});

test.describe('Dark Mode', () => {
  test('Dashboard - Dark Mode', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');

    // Enable dark mode (adjust selector based on your implementation)
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });

    await waitForPageReady(page);

    await expect(page).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
    });
  });
});
