# Accessibility Tests

## Quick Start

```bash
# Run Playwright accessibility tests
npm run test:a11y

# Run in UI mode (interactive)
npm run test:a11y:ui

# Run in debug mode
npm run test:a11y:debug

# Run Pa11y on all configured pages
npm run pa11y

# Run Pa11y on single page
npx pa11y http://localhost:5173/dashboard
```

## What We Test

### Playwright + axe-core Tests

Automated tests for WCAG 2.1 Level AA compliance:

- **Page structure** - Headings, landmarks, semantic HTML
- **Forms** - Labels, error messages, keyboard access
- **Color contrast** - Text, buttons, UI components
- **Images** - Alt text, decorative images
- **ARIA** - Valid attributes, roles, states
- **Keyboard navigation** - Tab order, focus management

### Pa11y Scans

Full-page accessibility scans using multiple runners:

- Checks against WCAG 2.1 AA standards
- Captures screenshots of violations
- JSON report for CI/CD integration

## Test Structure

```
tests/a11y/
├── pages.spec.ts    # Page-level accessibility tests
└── README.md        # This file
```

## Common Violations

### Missing Alt Text

```tsx
// ❌ Bad
<img src="logo.png" />

// ✅ Good
<img src="logo.png" alt="Company Logo" />
```

### Poor Color Contrast

```css
/* ❌ Bad: Contrast ratio < 4.5:1 */
.text { color: #777; background: #fff; }

/* ✅ Good: Contrast ratio >= 4.5:1 */
.text { color: #333; background: #fff; }
```

### Missing Form Labels

```tsx
// ❌ Bad
<input type="email" name="email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input type="email" id="email" name="email" />
```

### Invalid ARIA

```tsx
// ❌ Bad
<div role="button">Click me</div>

// ✅ Good
<button type="button">Click me</button>
```

## Adding Tests

### Test a New Page

```typescript
test('Reports page should have no violations', async ({ page }) => {
  await page.goto('/reports');
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Test Specific Component

```typescript
test('Navigation should be accessible', async ({ page }) => {
  await page.goto('/');

  // Test only <nav> element
  const results = await new AxeBuilder({ page })
    .include('nav')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

### Exclude Third-Party Content

```typescript
test('Page accessible (excluding ads)', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page })
    .exclude('.advertisement')
    .exclude('#chat-widget')
    .analyze();

  expect(results.violations).toEqual([]);
});
```

## CI/CD

Tests run automatically on:
- Pull requests
- Pushes to main branch

See `.github/workflows/accessibility.yml`

## Manual Testing

Automated tests catch ~30-50% of issues. Also test manually:

### Keyboard Navigation

1. Use only Tab, Shift+Tab, Enter, Space, Arrow keys
2. Verify all interactive elements are reachable
3. Check focus indicator is visible
4. Ensure no keyboard traps

### Screen Readers

Test with:
- **VoiceOver** (macOS) - Cmd+F5
- **NVDA** (Windows, Free)
- **JAWS** (Windows)

Verify:
- All images described
- Form fields labeled
- Errors announced
- Headings describe structure

### Browser DevTools

**axe DevTools Extension:**
1. Install from [deque.com](https://www.deque.com/axe/devtools/)
2. Open DevTools → "axe DevTools" tab
3. Click "Scan ALL of my page"
4. Review and fix issues

**Lighthouse:**
1. Chrome DevTools → Lighthouse
2. Check "Accessibility"
3. Generate report
4. Review score and issues

## Resources

- [Full Documentation](../../docs/ACCESSIBILITY-TESTING.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

## Troubleshooting

### Tests Failing for Third-Party Content

```typescript
// Exclude elements you don't control
const results = await new AxeBuilder({ page })
  .exclude('#chat-widget')
  .analyze();
```

### Color Contrast Failures

Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Form Label Issues

Ensure every input has:
- Associated `<label>` with matching `for`/`id`
- OR `aria-label` attribute
- OR `aria-labelledby` reference

### ARIA Role Errors

- Use native HTML elements when possible
- Only use ARIA when necessary
- Validate against [ARIA spec](https://www.w3.org/TR/wai-aria/)

## Best Practices

- ✅ Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- ✅ Provide text alternatives for non-text content
- ✅ Ensure sufficient color contrast (4.5:1 for text)
- ✅ Make all functionality keyboard accessible
- ✅ Provide clear focus indicators
- ✅ Use proper heading hierarchy (h1, h2, h3...)
- ✅ Label all form inputs
- ✅ Provide error messages that are accessible
- ✅ Use ARIA only when HTML isn't sufficient
- ❌ Don't rely on color alone to convey information
- ❌ Don't create keyboard traps
- ❌ Don't use ARIA unnecessarily

## WCAG 2.1 AA Checklist

### Level A

- [ ] 1.1.1 - Non-text content has alternatives
- [ ] 2.1.1 - Keyboard accessible
- [ ] 2.1.2 - No keyboard trap
- [ ] 3.1.1 - Page language declared
- [ ] 4.1.1 - Valid HTML
- [ ] 4.1.2 - Name, role, value for UI components

### Level AA

- [ ] 1.4.3 - Color contrast minimum (4.5:1)
- [ ] 1.4.5 - Images of text (avoid)
- [ ] 2.4.6 - Headings and labels descriptive
- [ ] 2.4.7 - Focus visible
- [ ] 3.2.3 - Consistent navigation
- [ ] 3.3.3 - Error suggestions
- [ ] 3.3.4 - Error prevention

## Contact

Questions? Issues?
- Read [full docs](../../docs/ACCESSIBILITY-TESTING.md)
- Ask in #engineering Slack channel
- File issue on GitHub
