import { test, expect } from '@playwright/test';
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
  test.skip('Dashboard should have no accessibility violations', async ({ page }) => {
    // TODO: Implement login helper
    // await login(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test.skip('Events list should have no accessibility violations', async ({ page }) => {
    // TODO: Implement login helper
    // await login(page);

    await page.goto('/events');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test.skip('Settings page should have no accessibility violations', async ({ page }) => {
    // TODO: Implement login helper
    // await login(page);

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});

test.describe('Forms - Accessibility', () => {
  test('Login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Focus email field
    const emailFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('type') === 'email' ||
             activeElement?.getAttribute('name') === 'email';
    });
    expect(emailFocused).toBe(true);

    await page.keyboard.press('Tab'); // Focus password field
    const passwordFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.getAttribute('type') === 'password' ||
             activeElement?.getAttribute('name') === 'password';
    });
    expect(passwordFocused).toBe(true);

    await page.keyboard.press('Tab'); // Focus submit button
    const buttonFocused = await page.evaluate(() => {
      const activeElement = document.activeElement;
      return activeElement?.tagName.toLowerCase() === 'button';
    });
    expect(buttonFocused).toBe(true);
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
