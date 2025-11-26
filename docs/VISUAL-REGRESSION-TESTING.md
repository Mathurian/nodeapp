# Visual Regression Testing

## Overview

Visual regression testing automatically detects unintended UI changes by comparing screenshots of your application before and after changes. This helps catch visual bugs that unit and integration tests might miss.

## Implementation

We use **Playwright** with **pixelmatch** for visual regression testing.

### Tools

- **Playwright** - Browser automation for screenshot capture
- **pixelmatch** - Pixel-level image comparison
- **pngjs** - PNG image processing

### Benefits

- ✅ Catch unintended UI changes automatically
- ✅ Prevent style regressions
- ✅ Document visual state of the application
- ✅ Open-source and free
- ✅ Works in CI/CD pipeline
- ✅ No external service dependencies

---

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install --save-dev @playwright/test pixelmatch pngjs
npx playwright install chromium
```

### 2. Configure Playwright

The configuration is in `frontend/playwright.config.ts`.

### 3. Directory Structure

```
frontend/
├── tests/
│   ├── visual/
│   │   ├── pages.spec.ts          # Visual regression tests
│   │   └── components.spec.ts      # Component-level tests
│   └── screenshots/
│       ├── baseline/                # Reference screenshots
│       ├── current/                 # Latest test run screenshots
│       └── diff/                    # Visual difference highlights
```

---

## Writing Visual Tests

### Basic Page Test

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should match baseline screenshot', async ({ page }) => {
    // Navigate to page
    await page.goto('http://localhost:5173/dashboard');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small differences
    });
  });
});
```

### Component-Level Test

```typescript
test('Event card should render correctly', async ({ page }) => {
  await page.goto('http://localhost:5173/events');

  // Wait for cards to load
  await page.waitForSelector('[data-testid="event-card"]');

  // Screenshot specific component
  const eventCard = page.locator('[data-testid="event-card"]').first();
  await expect(eventCard).toHaveScreenshot('event-card.png');
});
```

### Responsive Testing

```typescript
test('Dashboard should be responsive', async ({ page }) => {
  // Desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:5173/dashboard');
  await expect(page).toHaveScreenshot('dashboard-desktop.png');

  // Tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot('dashboard-tablet.png');

  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page).toHaveScreenshot('dashboard-mobile.png');
});
```

### Testing Dark Mode

```typescript
test('Dashboard in dark mode', async ({ page }) => {
  await page.goto('http://localhost:5173/dashboard');

  // Enable dark mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });

  await expect(page).toHaveScreenshot('dashboard-dark.png');
});
```

---

## Running Tests

### Local Development

```bash
# Run all visual tests
npm run test:visual

# Run specific test file
npx playwright test tests/visual/pages.spec.ts

# Update baseline screenshots (when UI changes are intentional)
npm run test:visual:update

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

### CI/CD Pipeline

Visual tests run automatically in GitHub Actions on:
- Pull requests
- Pushes to main branch

See `.github/workflows/visual-regression.yml` for configuration.

---

## Reviewing Visual Differences

### When Tests Fail

1. **Check the Diff Images**
   ```bash
   # Diff images are saved to:
   frontend/tests/screenshots/diff/
   ```

2. **Compare Screenshots**
   - Red pixels indicate differences
   - Review if changes are intentional or bugs

3. **Update Baselines (if intentional)**
   ```bash
   npm run test:visual:update
   git add tests/screenshots/baseline/
   git commit -m "Update visual regression baselines"
   ```

### In CI/CD

When visual tests fail in CI:
1. Download test artifacts from GitHub Actions
2. Review diff images
3. If intentional: update baselines and push
4. If bug: fix the issue

---

## Best Practices

### 1. Stable Test Data

```typescript
// Mock API responses for consistent visuals
await page.route('**/api/events', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockEvents),
  });
});
```

### 2. Wait for Stability

```typescript
// Wait for animations to complete
await page.waitForTimeout(500);

// Wait for images to load
await page.waitForLoadState('networkidle');

// Wait for specific elements
await page.waitForSelector('[data-testid="loaded"]');
```

### 3. Mask Dynamic Content

```typescript
// Mask timestamps, user-specific data
await expect(page).toHaveScreenshot({
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
  ],
});
```

### 4. Threshold Configuration

```typescript
// Allow minor pixel differences (anti-aliasing, etc.)
await expect(page).toHaveScreenshot({
  maxDiffPixels: 100,      // Max different pixels
  threshold: 0.2,          // Per-pixel difference threshold (0-1)
});
```

### 5. Test Critical Paths Only

Focus on:
- ✅ Public-facing pages
- ✅ Dashboard and main workflows
- ✅ Complex UI components
- ✅ Responsive breakpoints

Avoid:
- ❌ Admin pages with frequently changing data
- ❌ Pages with lots of dynamic content
- ❌ Pages requiring complex authentication

---

## Page Coverage

### Priority 1 (Critical)

- [ ] Login page
- [ ] Dashboard
- [ ] Events list
- [ ] Event details
- [ ] Contest scoring interface
- [ ] Results/leaderboard

### Priority 2 (Important)

- [ ] User profile
- [ ] Settings pages
- [ ] Reports
- [ ] Judge assignment
- [ ] Category management

### Priority 3 (Nice to Have)

- [ ] Admin pages
- [ ] Error pages (404, 500)
- [ ] Email templates preview
- [ ] Print layouts

---

## Troubleshooting

### Tests Failing Randomly

**Cause:** Animations, dynamic content, or timing issues

**Solution:**
```typescript
// Disable animations
await page.addStyleTag({
  content: '* { animation: none !important; transition: none !important; }',
});

// Wait for specific state
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);
```

### Screenshots Look Different on CI vs Local

**Cause:** Different fonts, anti-aliasing, or OS rendering

**Solution:**
```typescript
// Use consistent browser
test.use({
  browserName: 'chromium',
  viewport: { width: 1920, height: 1080 },
});

// Increase threshold
await expect(page).toHaveScreenshot({
  maxDiffPixelRatio: 0.01, // Allow 1% difference
});
```

### Large Screenshot Files

**Cause:** Full-page screenshots can be large

**Solution:**
```bash
# Optimize PNG files
npm install --save-dev pngquant-bin

# Add to package.json scripts
"optimize-screenshots": "find tests/screenshots -name '*.png' -exec pngquant --force --ext .png {} +"
```

### Baseline Updates Not Working

**Cause:** Old baselines cached

**Solution:**
```bash
# Delete all baselines and regenerate
rm -rf tests/screenshots/baseline/*
npm run test:visual:update
```

---

## Performance

### Screenshot Storage

- Baseline screenshots: ~200KB each (full page)
- Total for 40+ pages: ~10MB
- Store in Git LFS if repo size is a concern

### Test Duration

- Single page screenshot: ~2-5 seconds
- Full test suite (40 pages): ~5-10 minutes
- Run only on critical paths for faster feedback

### Optimization

```typescript
// Run visual tests in parallel
test.describe.configure({ mode: 'parallel' });

// Screenshot only viewport (faster)
await expect(page).toHaveScreenshot({
  fullPage: false, // Only visible viewport
});
```

---

## Integration with Existing Tests

### Run Visual Tests Separately

```json
{
  "scripts": {
    "test": "jest",                    // Unit/integration tests
    "test:visual": "playwright test",  // Visual regression tests
    "test:all": "npm test && npm run test:visual"
  }
}
```

### Conditional in CI/CD

```yaml
# Only run visual tests on certain branches
- name: Visual Regression Tests
  if: github.ref == 'refs/heads/main' || github.event_name == 'pull_request'
  run: npm run test:visual
```

---

## Alternatives Considered

### Percy (Commercial)

**Pros:**
- Excellent UI for reviewing changes
- Parallel test execution
- Cross-browser testing

**Cons:**
- ~$500/month for team plan
- External service dependency

### Chromatic (Storybook)

**Pros:**
- Deep Storybook integration
- Component-level testing
- Great diffing UI

**Cons:**
- ~$150/month
- Requires Storybook setup

### BackstopJS

**Pros:**
- Open source
- Simple configuration

**Cons:**
- Less active development
- Limited TypeScript support
- Older architecture

**Decision:** Playwright + pixelmatch provides the best balance of features, cost, and flexibility.

---

## Roadmap

### Phase 1 (Current)
- ✅ Set up Playwright
- ✅ Configure visual testing
- ✅ Document workflow
- ⏳ Add Priority 1 pages

### Phase 2 (Next Sprint)
- [ ] Add Priority 2 pages
- [ ] Integrate with CI/CD
- [ ] Set up GitHub Actions workflow
- [ ] Create review process documentation

### Phase 3 (Future)
- [ ] Add component-level tests
- [ ] Test responsive breakpoints
- [ ] Test dark mode variants
- [ ] Optimize screenshot storage with Git LFS

---

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Pixelmatch Documentation](https://github.com/mapbox/pixelmatch)
- [Best Practices for Visual Testing](https://www.browserstack.com/guide/visual-regression-testing)

---

*Last Updated: November 25, 2025*
*Owner: Engineering Team*
*Review Frequency: Quarterly*
