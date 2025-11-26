# Accessibility Testing - Setup & Implementation Guide

## Implementation Summary

Automated accessibility testing has been implemented using axe-core with Playwright and Pa11y to ensure WCAG 2.1 Level AA compliance across the application.

## What Was Implemented

### 1. Core Infrastructure

- ✅ **axe-core Integration** (`@axe-core/playwright`)
  - Automated WCAG 2.1 compliance checks
  - Playwright test integration
  - Detailed violation reports

- ✅ **Pa11y Configuration** (`.pa11yci.json`)
  - Full-page accessibility scans
  - Multiple page testing
  - Screenshot capture of violations

- ✅ **Test Files**
  - `frontend/tests/a11y/pages.spec.ts` - Page accessibility tests
  - Tests for structure, contrast, forms, ARIA, images
  - Keyboard navigation tests

- ✅ **GitHub Actions Workflow** (`.github/workflows/accessibility.yml`)
  - Runs on PRs and main branch
  - Uploads violation reports
  - Comments on PRs with results

### 2. Test Coverage

**Automated Tests:**
- Page structure (headings, landmarks)
- Form accessibility (labels, errors)
- Color contrast (WCAG AA: 4.5:1)
- Image alt text
- ARIA attributes validity
- Keyboard navigation

**Manual Test Guidance:**
- Keyboard-only navigation
- Screen reader testing
- Focus management
- Error announcements

### 3. Documentation

- ✅ Comprehensive main documentation (`docs/ACCESSIBILITY-TESTING.md`)
- ✅ Quick reference guide (`frontend/tests/a11y/README.md`)
- ✅ This setup guide
- ✅ WCAG 2.1 AA checklist

### 4. CI/CD Integration

- Automatic test runs on pull requests
- Violation reports as artifacts
- PR comments with pass/fail status
- JSON reports for tracking

## Installation & First Run

### Prerequisites

```bash
# Ensure you're in the frontend directory
cd /var/www/event-manager/frontend
```

### Step 1: Install Dependencies

```bash
# Install axe-core, Pa11y, and related packages
npm install

# Install Playwright browsers (if not already done)
npx playwright install chromium
```

### Step 2: Start Development Server

```bash
# In one terminal
npm run dev
```

### Step 3: Run Accessibility Tests

```bash
# In another terminal

# Run Playwright accessibility tests
npm run test:a11y

# Run Pa11y scans
npm run pa11y
```

## Usage

### Running Tests

```bash
# Playwright accessibility tests
npm run test:a11y

# Interactive UI mode
npm run test:a11y:ui

# Debug mode
npm run test:a11y:debug

# Pa11y full-page scans
npm run pa11y

# Pa11y single page
npx pa11y http://localhost:5173/dashboard
```

### Adding New Tests

**Example: Test a new page**

```typescript
// frontend/tests/a11y/pages.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Advanced Reports page accessibility', async ({ page }) => {
  await page.goto('/reports/advanced');
  await page.waitForLoadState('networkidle');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Example: Test specific component**

```typescript
test('Analytics chart accessibility', async ({ page }) => {
  await page.goto('/dashboard');

  // Test only the chart component
  const results = await new AxeBuilder({ page })
    .include('[data-testid="analytics-chart"]')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

**Example: Add page to Pa11y config**

```json
// frontend/.pa11yci.json
{
  "urls": [
    {
      "url": "http://localhost:5173/reports/advanced",
      "screenCapture": "./pa11y-screenshots/reports-advanced.png"
    }
  ]
}
```

## Workflow

### Development Workflow

1. **Make UI changes** to components/pages
2. **Run accessibility tests**: `npm run test:a11y`
3. **Review violations**
4. **Fix issues** based on test results
5. **Re-run tests** until all pass

### Pull Request Workflow

1. **Create PR** with UI changes
2. **CI runs accessibility tests** automatically
3. **Review results**:
   - ✅ Pass: No violations
   - ❌ Fail: Download reports, fix issues
4. **Fix violations** and push updates
5. **Merge** when tests pass

### Fixing Violations

When tests fail:

1. **Check test output** for specific violations
2. **Download artifacts** from GitHub Actions:
   - `playwright-a11y-report` - Detailed Playwright report
   - `pa11y-results` - Pa11y JSON report + screenshots
3. **Identify issues**:
   - Violation rule (e.g., `color-contrast`, `label`)
   - Affected elements
   - Severity (critical, serious, moderate, minor)
4. **Fix code** following guidance in docs
5. **Re-run tests** locally
6. **Commit fixes**

## Common Violations & Fixes

### 1. Color Contrast Issues

**Violation:** `color-contrast`

**Fix:**
```css
/* Before: 3.2:1 ratio (fails) */
.text {
  color: #888;
  background: #fff;
}

/* After: 4.6:1 ratio (passes) */
.text {
  color: #595959;
  background: #fff;
}
```

Tool: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 2. Missing Form Labels

**Violation:** `label`, `label-title-only`

**Fix:**
```tsx
// Before
<input type="email" name="email" />

// After
<label htmlFor="email">Email Address</label>
<input type="email" id="email" name="email" />
```

### 3. Missing Alt Text

**Violation:** `image-alt`

**Fix:**
```tsx
// Before
<img src="/logo.png" />

// After - Informative image
<img src="/logo.png" alt="Company Logo" />

// After - Decorative image
<img src="/decoration.png" alt="" role="presentation" />
```

### 4. Heading Hierarchy

**Violation:** `heading-order`

**Fix:**
```tsx
// Before
<h1>Page Title</h1>
<h3>Section</h3> {/* Skips h2 */}

// After
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### 5. Missing Landmarks

**Violation:** `region`, `landmark-one-main`

**Fix:**
```tsx
// Before
<div className="header">...</div>
<div className="content">...</div>

// After
<header>...</header>
<main>...</main>
<footer>...</footer>
```

### 6. Invalid ARIA

**Violation:** `aria-allowed-attr`, `aria-valid-attr-value`

**Fix:**
```tsx
// Before
<div role="button" aria-pressed="yes">Toggle</div>

// After
<button type="button" aria-pressed="true">Toggle</button>
```

### 7. Keyboard Accessibility

**Violation:** Keyboard navigation fails (manual test)

**Fix:**
```tsx
// Before - Not keyboard accessible
<div onClick={handleClick}>Click me</div>

// After - Fully accessible
<button
  type="button"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Click me
</button>
```

## Configuration

### axe-core Rules

Customize in test files:

```typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa'])
  .disableRules(['color-contrast']) // Disable specific rule
  .options({
    rules: {
      'color-contrast': {
        enabled: true,
        // Custom options
      },
    },
  })
  .analyze();
```

### Pa11y Configuration

Edit `.pa11yci.json`:

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 30000,
    "threshold": 0,  // 0 = fail on any violation
    "hideElements": [".advertisement"],
    "runners": ["axe", "htmlcs"]
  },
  "urls": ["..."]
}
```

## Manual Testing

Automated tests catch only 30-50% of accessibility issues. Manual testing is essential.

### Keyboard Navigation Testing

**Steps:**
1. Close your mouse/trackpad
2. Use only keyboard:
   - **Tab** - Move forward
   - **Shift+Tab** - Move backward
   - **Enter/Space** - Activate
   - **Arrows** - Navigate within components
   - **Esc** - Close dialogs

**Check:**
- [ ] All interactive elements reachable
- [ ] Focus indicator clearly visible
- [ ] Logical tab order
- [ ] No keyboard traps
- [ ] Dialogs trap focus appropriately

### Screen Reader Testing

**Tools:**
- **VoiceOver** (macOS) - Cmd+F5 to toggle
- **NVDA** (Windows) - Free download
- **JAWS** (Windows) - Commercial

**VoiceOver Basic Commands:**
- `VO` = Ctrl+Option
- `VO+Right/Left` - Navigate
- `VO+Space` - Activate
- `VO+A` - Read page

**Check:**
- [ ] All images have meaningful descriptions
- [ ] Form fields announced with labels
- [ ] Buttons announce purpose
- [ ] Headings announce level
- [ ] Errors announced clearly
- [ ] Loading states announced

### Browser DevTools

**axe DevTools Extension:**
1. Install from Chrome/Firefox store
2. Open DevTools
3. Go to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review and fix highlighted issues

**Lighthouse Audit:**
1. Chrome DevTools → Lighthouse
2. Check "Accessibility" category
3. Generate report
4. Aim for 90+ score

## Best Practices

### Do's ✅

- Use semantic HTML (`<button>`, not `<div role="button">`)
- Provide alt text for all informative images
- Ensure 4.5:1 contrast ratio for normal text
- Label all form inputs properly
- Use heading hierarchy (h1, h2, h3...)
- Provide keyboard access to all functionality
- Show clear focus indicators
- Use ARIA only when HTML is insufficient
- Test with keyboard and screen reader
- Fix violations as you code

### Don'ts ❌

- Don't use `<div>` or `<span>` for interactive elements
- Don't rely on color alone to convey information
- Don't use placeholder as label
- Don't skip heading levels
- Don't create keyboard traps
- Don't use ARIA unnecessarily
- Don't hide focus indicators
- Don't ignore automated test failures
- Don't assume "looks good" means "is accessible"

## Coverage Roadmap

### Phase 1: Critical Pages (Current)
- [x] Set up infrastructure
- [x] Test public pages (login, 404)
- [ ] Test authenticated pages (dashboard, events, settings)
- [ ] Fix all critical violations

### Phase 2: Comprehensive Coverage (Next Sprint)
- [ ] Test all main workflows
- [ ] Test form flows
- [ ] Test error states
- [ ] Add component-level tests

### Phase 3: Advanced Testing (Future)
- [ ] Screen reader compatibility testing
- [ ] Mobile accessibility testing
- [ ] Dynamic content announcements
- [ ] Complex component testing (tables, modals, etc.)

## Performance

### Test Duration

- Single page axe scan: ~2-5 seconds
- Pa11y full scan (5 pages): ~30-60 seconds
- Full test suite: ~2-5 minutes
- CI/CD pipeline addition: ~5-10 minutes

### Optimization

```typescript
// Test multiple pages in parallel
test.describe.configure({ mode: 'parallel' });

// Test only changed components
const results = await new AxeBuilder({ page })
  .include('#new-feature')
  .analyze();
```

## Troubleshooting

### False Positives

Some violations may be false positives:

```typescript
// Exclude third-party content
const results = await new AxeBuilder({ page })
  .exclude('#chat-widget')
  .exclude('.advertisement')
  .analyze();
```

### Contrast Ratio Failures

- Use WebAIM Contrast Checker
- Consider both normal and large text sizes
- Test in light and dark modes

### Tests Failing in CI but Pass Locally

- Ensure same browser versions
- Check for dynamic content
- Verify all resources loaded

### ARIA Errors

- Prefer native HTML over ARIA
- Validate against [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- Test with actual screen readers

## Maintenance

### Weekly Tasks
- [ ] Review new violations in CI
- [ ] Fix critical violations
- [ ] Update Pa11y page list for new pages

### Monthly Tasks
- [ ] Run manual keyboard test on new features
- [ ] Screen reader test on critical flows
- [ ] Review axe-core and Pa11y versions
- [ ] Update documentation

### Quarterly Tasks
- [ ] Full manual accessibility audit
- [ ] Review WCAG compliance
- [ ] Train team on accessibility
- [ ] Update testing strategy

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Testing
- [Pa11y](https://pa11y.org/)
- [axe-core](https://github.com/dequelabs/axe-core)
- [Playwright Accessibility](https://playwright.dev/docs/accessibility-testing)

## Cost & Resources

### Costs
- ✅ **$0** - All open-source tools
- ✅ No external service fees
- ✅ No per-test charges

### Resources Required
- CI/CD time: +5-10 minutes per run
- Developer time: ~2-3 hours/week for fixing violations
- Initial audit: ~1-2 days to fix existing issues

## Next Steps

1. **Install dependencies** (see Installation section)
2. **Run tests on existing pages** to establish baseline
3. **Fix critical violations** (color contrast, missing labels)
4. **Add tests for new pages** as they're developed
5. **Integrate into development workflow** (run before commits)
6. **Train team** on accessibility best practices
7. **Schedule manual testing** (keyboard, screen reader) monthly

---

**Status:** ✅ Implemented
**Effort:** ~1 week
**Priority:** Medium
**Value:** WCAG 2.1 AA compliance, better UX for all users

*Last Updated: November 25, 2025*
*Owner: Engineering Team*
*Review: Every Sprint*
