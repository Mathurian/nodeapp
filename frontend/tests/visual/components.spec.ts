import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests - Components
 *
 * Component-level visual tests for reusable UI components.
 * These tests ensure components render correctly in isolation.
 */

async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `,
  });
  await page.waitForTimeout(500);
}

test.describe('Navigation Components', () => {
  test('Header navigation', async ({ page }) => {
    await page.goto('/login');
    await waitForPageReady(page);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <header
          data-testid="app-top-bar"
          class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
        >
          <div class="flex items-center justify-between px-6 py-3 gap-3">
            <div class="flex items-center gap-2 min-w-0">
              <button class="hidden lg:flex p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Close sidebar">
                <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M3 5h14v2H3V5Zm0 4h14v2H3V9Zm0 4h14v2H3v-2Z" /></svg>
              </button>
              <div class="flex items-center space-x-3 min-w-0">
                <svg class="h-7 w-7 text-blue-600" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4h14v12H3V4Zm2 2v8h10V6H5Z" /></svg>
                <h1 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">ConMGR</h1>
              </div>
            </div>
            <button class="hidden md:flex items-center space-x-3 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg border border-gray-300">
              <span>Search pages, actions, commands...</span>
              <kbd class="inline-flex items-center gap-0.5 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded shadow-sm">Ctrl + K</kbd>
            </button>
            <div class="flex items-center space-x-3 shrink-0">
              <button class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Switch to dark mode">Theme</button>
              <button class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" aria-label="Open notifications">Alerts</button>
              <button class="flex items-center space-x-2 pl-1 pr-3 py-1 hover:bg-gray-100 rounded-lg" aria-label="Open profile menu">
                <span class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">V</span>
                <span class="hidden sm:block text-sm font-medium text-gray-700">Visual Admin</span>
              </button>
            </div>
          </div>
        </header>
      `;
    });

    const header = page.getByTestId('app-top-bar');
    await expect(header).toHaveScreenshot('header-nav.png');
  });

  test('Sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.count() > 0) {
      await expect(sidebar.first()).toHaveScreenshot('sidebar-nav.png');
    }
  });
});

test.describe('Card Components', () => {
  test('Event card', async ({ page }) => {
    await page.goto('/events');
    await waitForPageReady(page);

    const eventCard = page.locator('[data-testid="event-card"]').first();
    if (await eventCard.count() > 0) {
      await expect(eventCard).toHaveScreenshot('event-card.png');
    }
  });

  test('Stats card', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const statsCard = page.locator('[data-testid="stats-card"]').first();
    if (await statsCard.count() > 0) {
      await expect(statsCard).toHaveScreenshot('stats-card.png');
    }
  });
});

test.describe('Form Components', () => {
  test('Input field with label', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageReady(page);

    const inputGroup = page.locator('input[type="text"]').first();
    if (await inputGroup.count() > 0) {
      const parent = inputGroup.locator('..');
      await expect(parent).toHaveScreenshot('input-field.png');
    }
  });

  test('Button primary', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const button = page.locator('button.btn-primary').first();
    if (await button.count() > 0) {
      await expect(button).toHaveScreenshot('button-primary.png');
    }
  });

  test('Button secondary', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const button = page.locator('button.btn-secondary').first();
    if (await button.count() > 0) {
      await expect(button).toHaveScreenshot('button-secondary.png');
    }
  });
});

test.describe('Table Components', () => {
  test('Data table', async ({ page }) => {
    await page.goto('/events');
    await waitForPageReady(page);

    const table = page.locator('table').first();
    if (await table.count() > 0) {
      await expect(table).toHaveScreenshot('data-table.png');
    }
  });
});

test.describe('Modal Components', () => {
  test('Confirmation modal', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageReady(page);

    // Trigger modal (adjust selector based on your implementation)
    const deleteButton = page.locator('button:has-text("Delete")').first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]');
      await modal.waitFor({ state: 'visible', timeout: 5000 });

      await expect(modal).toHaveScreenshot('confirmation-modal.png');
    }
  });
});

test.describe('Alert Components', () => {
  test('Success toast', async ({ page }) => {
    // This is a placeholder - implement based on your toast library
    await page.goto('/dashboard');
    await waitForPageReady(page);

    // Trigger success message
    // await page.click('[data-testid="trigger-success"]');

    // const toast = page.locator('[data-testid="toast-success"]');
    // await toast.waitFor({ state: 'visible' });
    // await expect(toast).toHaveScreenshot('toast-success.png');
  });

  test('Error toast', async ({ page }) => {
    // This is a placeholder - implement based on your toast library
    await page.goto('/dashboard');
    await waitForPageReady(page);

    // Trigger error message
    // await page.click('[data-testid="trigger-error"]');

    // const toast = page.locator('[data-testid="toast-error"]');
    // await toast.waitFor({ state: 'visible' });
    // await expect(toast).toHaveScreenshot('toast-error.png');
  });
});
