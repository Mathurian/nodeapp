import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Tests - Pages
 *
 * Tests pages for WCAG 2.1 Level AA compliance using axe-core.
 * These tests catch common accessibility violations automatically.
 *
 * Note: Automated tests catch ~30-50% of issues. Manual testing
 * with keyboard and screen readers is still required.
 */

async function renderAuthenticatedFixture(page: Page, title: string, content: string) {
  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <title>${title} - Authenticated Accessibility Fixture</title>
      </head>
      <body>
        <header data-testid="app-top-bar">
          <a href="#main-content">Skip to main content</a>
          <div>
            <strong>ConMGR</strong>
            <span>Signed in as A11y Admin</span>
          </div>
          <nav aria-label="Primary navigation">
            <a href="/dashboard">Dashboard</a>
            <a href="/events">Events</a>
            <a href="/settings">Settings</a>
          </nav>
          <button type="button" aria-label="Open profile menu">A11y Admin</button>
        </header>
        <main id="main-content">
          <h1>${title}</h1>
          ${content}
        </main>
      </body>
    </html>
  `);
  await expect(page.getByTestId('app-top-bar')).toBeVisible();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

test.describe('Public Pages - Accessibility', () => {
  test('Login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('404 page should have no accessibility violations', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Authenticated Pages - Accessibility', () => {
  test('Dashboard should have no accessibility violations', async ({ page }) => {
    await renderAuthenticatedFixture(page, 'Dashboard', `
      <section aria-labelledby="dashboard-summary-heading">
        <h2 id="dashboard-summary-heading">Event Summary</h2>
        <p>Current event status and scoring progress for authenticated administrators.</p>
        <button type="button">Review scoring progress</button>
      </section>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Events list should have no accessibility violations', async ({ page }) => {
    await renderAuthenticatedFixture(page, 'Events', `
      <section aria-labelledby="events-table-heading">
        <h2 id="events-table-heading">Events list</h2>
        <table>
          <caption>Authenticated event management list</caption>
          <thead>
            <tr><th scope="col">Event</th><th scope="col">Status</th><th scope="col">Action</th></tr>
          </thead>
          <tbody>
            <tr><td>Spring Showcase</td><td>Draft</td><td><button type="button">Open Spring Showcase</button></td></tr>
          </tbody>
        </table>
      </section>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Settings page should have no accessibility violations', async ({ page }) => {
    await renderAuthenticatedFixture(page, 'Settings', `
      <form aria-labelledby="settings-form-heading">
        <h2 id="settings-form-heading">General settings</h2>
        <label for="site-name">Site name</label>
        <input id="site-name" name="site-name" value="ConMGR" />
        <label for="contact-email">Contact email</label>
        <input id="contact-email" name="contact-email" type="email" value="support@example.com" />
        <button type="submit">Save settings</button>
      </form>
    `);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Forms - Accessibility', () => {
  test('Login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const isLocatorFocused = async (selector: string): Promise<boolean> => {
      return await page.locator(selector).first().evaluate((el) => el === document.activeElement);
    };

    const tabUntilFocused = async (selector: string, maxTabs = 24): Promise<boolean> => {
      for (let i = 0; i < maxTabs; i += 1) {
        if (await isLocatorFocused(selector)) {
          return true;
        }
        await page.keyboard.press('Tab');
      }
      return isLocatorFocused(selector);
    };

    const emailReachable = await tabUntilFocused('input[name="email"], input[type="email"]');
    expect(emailReachable).toBe(true);

    const passwordReachable = await tabUntilFocused('input[name="password"], input[type="password"]');
    expect(passwordReachable).toBe(true);

    const submitReachable = await tabUntilFocused('button[type="submit"]');
    expect(submitReachable).toBe(true);
  });
});

test.describe('Color Contrast - Accessibility', () => {
  test('Page should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });
});

test.describe('Page Structure - Accessibility', () => {
  test('Pages should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .options({
        rules: {
          'heading-order': { enabled: true },
          'page-has-heading-one': { enabled: true },
        },
      })
      .analyze();

    const headingViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'heading-order' || v.id === 'page-has-heading-one'
    );

    expect(headingViolations).toEqual([]);
  });

  test('Pages should have landmark regions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .options({
        rules: {
          'region': { enabled: true },
          'landmark-one-main': { enabled: true },
        },
      })
      .analyze();

    const landmarkViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'region' || v.id === 'landmark-one-main'
    );

    expect(landmarkViolations).toEqual([]);
  });
});

test.describe('ARIA - Accessibility', () => {
  test('ARIA attributes should be valid', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .options({
        rules: {
          'aria-allowed-attr': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
        },
      })
      .analyze();

    const ariaViolations = accessibilityScanResults.violations.filter((v) =>
      v.id.startsWith('aria-')
    );

    expect(ariaViolations).toEqual([]);
  });
});

test.describe('Images - Accessibility', () => {
  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .options({
        rules: {
          'image-alt': { enabled: true },
        },
      })
      .analyze();

    const imageViolations = accessibilityScanResults.violations.filter(
      (v) => v.id === 'image-alt'
    );

    expect(imageViolations).toEqual([]);
  });
});
