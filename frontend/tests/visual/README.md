# Visual Regression Tests

## Quick Start

### Run Tests

```bash
# Run all visual tests
npm run test:visual

# Update baselines (when UI changes are intentional)
npm run test:visual:update

# Run in UI mode (interactive)
npm run test:visual:ui

# Run in debug mode
npm run test:visual:debug

# View test report
npm run test:visual:report
```

### First Time Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Run tests to generate baseline screenshots
npm run test:visual:update
```

## Test Structure

```
tests/visual/
├── pages.spec.ts         # Full page screenshots
├── components.spec.ts    # Component-level screenshots
├── helpers.ts            # Shared utilities
└── screenshots/
    ├── baseline/         # Reference screenshots (in git)
    ├── current/          # Latest test run (ignored)
    └── diff/             # Visual differences (ignored)
```

## Writing Tests

### Basic Page Test

```typescript
import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test('Dashboard page', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForPageReady(page);

  await expect(page).toHaveScreenshot('dashboard.png', {
    fullPage: true,
  });
});
```

### Component Test

```typescript
test('Event card component', async ({ page }) => {
  await page.goto('/events');
  await waitForPageReady(page);

  const card = page.locator('[data-testid="event-card"]').first();
  await expect(card).toHaveScreenshot('event-card.png');
});
```

### Responsive Test

```typescript
import { setViewport } from './helpers';

test('Mobile dashboard', async ({ page }) => {
  await setViewport(page, 'mobile');
  await page.goto('/dashboard');
  await waitForPageReady(page);

  await expect(page).toHaveScreenshot('dashboard-mobile.png');
});
```

## When Tests Fail

1. **Check the diff images** in `tests/screenshots/diff/`
2. **Review the changes**:
   - If intentional: `npm run test:visual:update`
   - If a bug: fix the UI issue
3. **Commit baseline updates** (if intentional)

## Best Practices

- ✅ Disable animations for stable screenshots
- ✅ Wait for network idle before capturing
- ✅ Mask dynamic content (timestamps, avatars)
- ✅ Use consistent test data
- ✅ Test critical user paths only
- ❌ Don't test admin pages with changing data
- ❌ Don't test pages requiring complex setup

## Helpers

See `helpers.ts` for available utilities:

- `waitForPageReady()` - Wait for page stability
- `login()` - Authenticate user
- `mockApiResponse()` - Mock API calls
- `enableDarkMode()` - Switch to dark theme
- `setViewport()` - Responsive testing
- `hideDynamicElements()` - Hide timestamps, etc.

## Configuration

See `playwright.config.ts` for:

- Screenshot comparison settings
- Browser configurations
- Viewport sizes
- Timeout values

## CI/CD

Visual tests run automatically on:
- Pull requests to `main`
- Pushes to `main`

See `.github/workflows/visual-regression.yml` for details.

## Troubleshooting

### Tests failing randomly

```typescript
// Increase wait time
await waitForPageReady(page, { waitTime: 1000 });

// Increase diff threshold
await expect(page).toHaveScreenshot({
  maxDiffPixels: 200,
});
```

### Different on CI vs local

```typescript
// Use specific browser
test.use({ browserName: 'chromium' });

// Allow more tolerance
await expect(page).toHaveScreenshot({
  maxDiffPixelRatio: 0.02,
});
```

### Screenshots too large

```typescript
// Screenshot only viewport
await expect(page).toHaveScreenshot({
  fullPage: false,
});
```

## Resources

- [Full Documentation](../../docs/VISUAL-REGRESSION-TESTING.md)
- [Playwright Docs](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://www.browserstack.com/guide/visual-regression-testing)
