# Visual Regression Testing - Setup & Implementation Guide

## Implementation Summary

Visual regression testing has been implemented using Playwright with pixel-perfect screenshot comparison. This allows automatic detection of unintended UI changes.

## What Was Implemented

### 1. Core Infrastructure

- ✅ **Playwright Configuration** (`frontend/playwright.config.ts`)
  - Screenshot comparison settings
  - Multiple browser support (chromium, firefox, webkit)
  - Responsive testing configurations
  - CI/CD optimizations

- ✅ **Test Files**
  - `frontend/tests/visual/pages.spec.ts` - Full page screenshots
  - `frontend/tests/visual/components.spec.ts` - Component-level tests
  - `frontend/tests/visual/helpers.ts` - Reusable utilities

- ✅ **GitHub Actions Workflow** (`.github/workflows/visual-regression.yml`)
  - Runs on PRs and main branch pushes
  - Uploads failure artifacts
  - Comments on PRs with results

### 2. Helper Utilities

- `waitForPageReady()` - Ensures page stability before screenshots
- `login()` - Authenticate for protected pages
- `mockApiResponse()` - Consistent test data
- `enableDarkMode()` / `enableLightMode()` - Theme testing
- `setViewport()` - Responsive testing
- `hideDynamicElements()` - Hide timestamps, avatars
- And more (see `helpers.ts`)

### 3. Documentation

- ✅ Comprehensive main documentation (`docs/VISUAL-REGRESSION-TESTING.md`)
- ✅ Quick reference guide (`frontend/tests/visual/README.md`)
- ✅ This setup guide

### 4. CI/CD Integration

- Automatic test runs on pull requests
- Screenshot diff artifacts on failures
- PR comments with test results
- Baseline update workflow

## Installation & First Run

### Prerequisites

```bash
# Ensure you're in the frontend directory
cd /var/www/event-manager/frontend
```

### Step 1: Install Dependencies

```bash
# Install Playwright and related packages
npm install

# Install browser binaries (chromium only for now)
npx playwright install chromium
```

### Step 2: Start Development Server

```bash
# In one terminal
npm run dev
```

### Step 3: Generate Baseline Screenshots

```bash
# In another terminal
npm run test:visual:update
```

This will:
1. Run all visual tests
2. Capture screenshots
3. Save them as baselines in `tests/screenshots/baseline/`

### Step 4: Commit Baselines

```bash
git add tests/screenshots/baseline/
git commit -m "Add visual regression test baselines"
```

## Usage

### Running Tests

```bash
# Run all visual tests
npm run test:visual

# Update baselines (after intentional UI changes)
npm run test:visual:update

# Interactive UI mode
npm run test:visual:ui

# Debug mode
npm run test:visual:debug

# View HTML report
npm run test:visual:report
```

### Adding New Tests

**Example: Add visual test for a new page**

```typescript
// frontend/tests/visual/pages.spec.ts
import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test('New Reports Page', async ({ page }) => {
  await page.goto('/reports/advanced');
  await waitForPageReady(page);

  await expect(page).toHaveScreenshot('reports-advanced.png', {
    fullPage: true,
  });
});
```

**Example: Add component test**

```typescript
// frontend/tests/visual/components.spec.ts
import { test, expect } from '@playwright/test';
import { waitForPageReady } from './helpers';

test('Analytics chart component', async ({ page }) => {
  await page.goto('/dashboard');
  await waitForPageReady(page);

  const chart = page.locator('[data-testid="analytics-chart"]').first();
  await expect(chart).toHaveScreenshot('analytics-chart.png');
});
```

## Workflow

### Development Workflow

1. **Make UI changes** to your components/pages
2. **Run visual tests**: `npm run test:visual`
3. **Review failures**:
   - If intentional: `npm run test:visual:update`
   - If bug: fix the issue
4. **Commit updates** if baselines changed

### Pull Request Workflow

1. **Create PR** with UI changes
2. **CI runs visual tests** automatically
3. **Review results**:
   - ✅ Pass: No visual regressions
   - ❌ Fail: Download artifacts, review diffs
4. **Update baselines** if changes are intentional
5. **Merge** when tests pass

### Reviewing Visual Differences

When tests fail:

1. **Check GitHub Actions artifacts**
   - Download `visual-regression-failures` artifact
   - Contains `current/` and `diff/` screenshots

2. **Compare images**
   - `baseline/` - Expected appearance
   - `current/` - How it looks now
   - `diff/` - Red pixels show differences

3. **Decide**
   - Intentional change → Update baselines
   - Bug → Fix the issue

## Configuration

### Playwright Config

Edit `frontend/playwright.config.ts` to adjust:

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,      // Max pixels that can differ
    threshold: 0.2,          // Per-pixel tolerance (0-1)
    maxDiffPixelRatio: 0.01, // Max 1% difference
  },
}
```

### Environment Variables

```bash
# Use different base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:visual

# Skip webServer startup (server already running)
CI=true npm run test:visual
```

### Test Selectors

Prefer `data-testid` attributes for stable selectors:

```tsx
// Component
<div data-testid="event-card">
  ...
</div>

// Test
const card = page.locator('[data-testid="event-card"]');
```

## Best Practices

### ✅ Do

- Disable animations for consistent screenshots
- Wait for network idle before capturing
- Mask dynamic content (timestamps, user avatars)
- Use consistent test data via mocks
- Test critical user flows
- Keep baseline screenshots in version control
- Review diffs carefully before updating baselines

### ❌ Don't

- Test pages with frequently changing data (without mocks)
- Commit `current/` or `diff/` screenshots
- Update baselines without reviewing changes
- Test every single page (focus on critical paths)
- Ignore test failures

## Coverage Roadmap

### Phase 1: Critical Pages (Current)
- [x] Login page
- [x] Dashboard
- [x] Events list
- [x] Settings
- [ ] Contest scoring interface
- [ ] Results/leaderboard

### Phase 2: Important Features (Next Sprint)
- [ ] User profile
- [ ] Category management
- [ ] Judge assignment
- [ ] Reports
- [ ] Print layouts

### Phase 3: Components (Future)
- [ ] Navigation components
- [ ] Card components
- [ ] Form components
- [ ] Table components
- [ ] Modal dialogs

### Phase 4: Responsive & Themes (Future)
- [ ] Mobile responsive tests
- [ ] Tablet responsive tests
- [ ] Dark mode variants

## Performance

### Optimization Tips

```typescript
// Run tests in parallel
test.describe.configure({ mode: 'parallel' });

// Screenshot only viewport (faster)
await expect(page).toHaveScreenshot({
  fullPage: false,
});

// Skip animations
await waitForPageReady(page, { disableAnimations: true });
```

### Expected Timings

- Single page screenshot: ~2-5 seconds
- Component screenshot: ~1-2 seconds
- Full test suite (40 pages): ~5-10 minutes
- CI/CD pipeline addition: ~5-10 minutes

## Troubleshooting

### Tests failing on CI but pass locally

**Cause:** Font rendering, OS differences

**Solution:**
```typescript
// Increase tolerance
await expect(page).toHaveScreenshot({
  maxDiffPixelRatio: 0.02, // 2% tolerance
});
```

### Flaky tests (fail randomly)

**Cause:** Animations, loading states

**Solution:**
```typescript
// Wait longer
await waitForPageReady(page, { waitTime: 1000 });

// Mock API responses
await mockApiResponse(page, 'api/events', mockEvents);
```

### Screenshots look different after system update

**Cause:** New OS, browser version

**Solution:**
```bash
# Regenerate all baselines
npm run test:visual:update
```

## Maintenance

### Weekly Tasks
- [ ] Review new test failures
- [ ] Update baselines for intentional changes
- [ ] Check coverage of new features

### Monthly Tasks
- [ ] Review test performance
- [ ] Update Playwright version
- [ ] Optimize slow tests
- [ ] Review and archive old screenshots

### Quarterly Tasks
- [ ] Audit test coverage
- [ ] Add tests for new critical features
- [ ] Remove tests for deprecated features
- [ ] Update documentation

## Cost & Resources

### Costs
- ✅ **$0** - All open-source tools
- ✅ No external service fees
- ✅ No per-test charges

### Resources Required
- Disk space: ~10-20MB for baselines
- CI/CD time: +5-10 minutes per run
- Developer time: ~1 hour/week for maintenance

## Alternatives Considered

| Tool | Pros | Cons | Cost |
|------|------|------|------|
| **Playwright** ✅ | Open-source, TypeScript, fast | Manual setup | Free |
| Percy | Great UI, easy setup | External service | $500/mo |
| Chromatic | Storybook integration | Requires Storybook | $150/mo |
| BackstopJS | Simple config | Limited features | Free |

**Decision:** Playwright provides the best balance of features, performance, and cost (free).

## Next Steps

1. **Install dependencies** and generate baselines (see Installation section)
2. **Add tests for Priority 1 pages** (login, dashboard, events, scoring)
3. **Run tests in CI/CD** to validate workflow
4. **Train team** on reviewing visual diffs
5. **Document page-specific test requirements**

## Resources

- [Main Documentation](../VISUAL-REGRESSION-TESTING.md)
- [Playwright Visual Comparisons Docs](https://playwright.dev/docs/test-snapshots)
- [Test Examples](../../frontend/tests/visual/)
- [GitHub Actions Workflow](../../.github/workflows/visual-regression.yml)

---

**Status:** ✅ Implemented
**Effort:** ~1 week
**Priority:** Medium
**Value:** Catch unintended UI changes automatically

*Last Updated: November 25, 2025*
*Owner: Engineering Team*
*Review: Sprint 5 Retrospective*
