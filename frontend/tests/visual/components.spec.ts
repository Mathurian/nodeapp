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
    await page.goto('/dashboard');
    await waitForPageReady(page);

    const header = page.locator('header').first();
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
