# Accessibility Testing

## Overview

Automated accessibility testing ensures our application is usable by everyone, including people with disabilities. We aim for **WCAG 2.1 Level AA** compliance.

## Why Accessibility Matters

- **Legal Compliance** - Many jurisdictions require WCAG compliance
- **Inclusive Design** - Makes the app usable for everyone
- **Better UX** - Accessibility improvements benefit all users
- **SEO Benefits** - Better semantic HTML improves search rankings
- **Keyboard Navigation** - Critical for power users

## Implementation

We use multiple tools for comprehensive accessibility testing:

1. **axe-core** (via Playwright) - Automated rule-based testing
2. **Pa11y** - Full page accessibility scans
3. **Manual Testing** - Keyboard navigation, screen readers

### Tools

- **@axe-core/playwright** - Accessibility testing in browser automation
- **pa11y** - CLI tool for accessibility testing
- **pa11y-ci** - CI/CD integration
- **axe DevTools** - Browser extension for manual testing

---

## Setup

### 1. Install Dependencies

```bash
cd frontend
npm install --save-dev @axe-core/playwright pa11y pa11y-ci
```

### 2. Configure Tests

Accessibility tests are integrated with Playwright tests in `frontend/tests/a11y/`.

---

## Writing Accessibility Tests

### Playwright + axe-core Tests

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('Homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### Testing Specific Components

```typescript
test('Dashboard navigation should be accessible', async ({ page }) => {
  await page.goto('/dashboard');

  // Test only the navigation component
  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('nav')
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Testing With Exclusions

```typescript
test('Dashboard should be accessible (excluding third-party widgets)', async ({ page }) => {
  await page.goto('/dashboard');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .exclude('#third-party-chat-widget')
    .exclude('.advertisement')
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Custom Rules

```typescript
test('Custom accessibility rules', async ({ page }) => {
  await page.goto('/dashboard');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .disableRules(['color-contrast']) // Disable specific rules if needed
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

---

## Pa11y Testing

### Single Page Scan

```bash
# Test a single page
npx pa11y http://localhost:5173/dashboard

# Test with specific standard
npx pa11y --standard WCAG2AA http://localhost:5173/dashboard

# Test with reporter
npx pa11y --reporter cli http://localhost:5173/dashboard
```

### Multiple Pages (pa11y-ci)

Configuration file `.pa11yci.json`:

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 10000,
    "wait": 1000,
    "chromeLaunchConfig": {
      "args": ["--no-sandbox", "--disable-dev-shm-usage"]
    }
  },
  "urls": [
    "http://localhost:5173/",
    "http://localhost:5173/login",
    "http://localhost:5173/dashboard",
    "http://localhost:5173/events",
    "http://localhost:5173/settings"
  ]
}
```

Run all tests:

```bash
npx pa11y-ci
```

---

## Running Tests

### Local Development

```bash
# Run Playwright accessibility tests
npm run test:a11y

# Run Pa11y on single page
npx pa11y http://localhost:5173/dashboard

# Run Pa11y on all configured pages
npx pa11y-ci

# Generate HTML report
npx pa11y-ci --reporter html > a11y-report.html
```

### CI/CD Pipeline

Accessibility tests run automatically in GitHub Actions:
- On pull requests
- On pushes to main
- See `.github/workflows/accessibility.yml`

---

## Common Accessibility Issues

### 1. Missing Alt Text

**Issue:**
```html
<img src="logo.png">
```

**Fix:**
```html
<img src="logo.png" alt="Company Logo">
```

### 2. Poor Color Contrast

**Issue:** Text with insufficient contrast ratio

**Fix:**
```css
/* Bad: Contrast ratio < 4.5:1 */
.text { color: #777; background: #fff; }

/* Good: Contrast ratio >= 4.5:1 */
.text { color: #333; background: #fff; }
```

Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 3. Missing Form Labels

**Issue:**
```html
<input type="text" name="email">
```

**Fix:**
```html
<label for="email">Email Address</label>
<input type="text" id="email" name="email">
```

Or use `aria-label`:
```html
<input type="text" name="email" aria-label="Email Address">
```

### 4. Non-Semantic HTML

**Issue:**
```html
<div class="button" onclick="submit()">Submit</div>
```

**Fix:**
```html
<button type="submit">Submit</button>
```

### 5. Missing ARIA Labels

**Issue:**
```html
<button><IconX /></button>
```

**Fix:**
```html
<button aria-label="Close dialog">
  <IconX />
</button>
```

### 6. Keyboard Navigation Issues

**Issue:** Elements not focusable or no visible focus indicator

**Fix:**
```css
/* Add visible focus indicator */
button:focus,
a:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* For custom interactive elements */
.custom-button {
  tabindex: 0;
}
```

### 7. Missing Heading Hierarchy

**Issue:**
```html
<h1>Page Title</h1>
<h3>Section Title</h3>  <!-- Skips h2 -->
```

**Fix:**
```html
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

### 8. Missing Landmark Regions

**Issue:** No semantic landmarks

**Fix:**
```html
<header>...</header>
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<aside aria-label="Sidebar">...</aside>
<footer>...</footer>
```

---

## WCAG 2.1 Level AA Checklist

### Perceivable

- [ ] **1.1.1** All images have alt text
- [ ] **1.3.1** Semantic HTML (headings, lists, landmarks)
- [ ] **1.4.3** Color contrast ratio >= 4.5:1 (normal text)
- [ ] **1.4.3** Color contrast ratio >= 3:1 (large text)
- [ ] **1.4.11** UI components have 3:1 contrast ratio

### Operable

- [ ] **2.1.1** All functionality available via keyboard
- [ ] **2.1.2** No keyboard traps
- [ ] **2.4.1** Skip to main content link
- [ ] **2.4.2** Pages have descriptive titles
- [ ] **2.4.3** Focus order is logical
- [ ] **2.4.7** Focus indicator is visible

### Understandable

- [ ] **3.1.1** Page language is declared (`<html lang="en">`)
- [ ] **3.2.1** Focus doesn't trigger unexpected context changes
- [ ] **3.3.1** Form errors are identified
- [ ] **3.3.2** Form fields have labels or instructions
- [ ] **3.3.3** Error suggestions provided

### Robust

- [ ] **4.1.1** Valid HTML (no parsing errors)
- [ ] **4.1.2** ARIA roles, states, properties are valid
- [ ] **4.1.3** Status messages are announced

---

## Manual Testing

Automated tools catch ~30-50% of accessibility issues. Manual testing is essential.

### Keyboard Navigation

Test all pages using only keyboard:

1. **Tab** - Navigate forward through interactive elements
2. **Shift+Tab** - Navigate backward
3. **Enter/Space** - Activate buttons/links
4. **Arrow Keys** - Navigate menus, radio buttons
5. **Esc** - Close modals/dialogs

**Requirements:**
- ✅ All interactive elements are reachable
- ✅ Focus indicator is clearly visible
- ✅ Tab order is logical
- ✅ No keyboard traps

### Screen Reader Testing

Test with screen readers:

- **NVDA** (Windows, Free)
- **JAWS** (Windows, Commercial)
- **VoiceOver** (macOS/iOS, Built-in)
- **TalkBack** (Android, Built-in)

**Basic VoiceOver Commands (macOS):**
- `Cmd+F5` - Toggle VoiceOver
- `VO+Right/Left` - Navigate elements
- `VO+Space` - Activate element
- `VO+A` - Read entire page

**Test Checklist:**
- [ ] All images have meaningful descriptions
- [ ] Form fields are properly labeled
- [ ] Headings describe page structure
- [ ] Errors are announced
- [ ] Dynamic content changes are announced

### Browser DevTools

**axe DevTools Extension:**
1. Install [axe DevTools](https://www.deque.com/axe/devtools/)
2. Open DevTools
3. Go to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review and fix issues

**Lighthouse Accessibility Audit:**
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Check "Accessibility"
4. Click "Generate report"
5. Review score and issues

---

## Best Practices

### HTML

```html
<!-- Use semantic HTML -->
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>

<main>
  <h1>Page Title</h1>
  <section aria-labelledby="section-heading">
    <h2 id="section-heading">Section Title</h2>
    <p>Content...</p>
  </section>
</main>

<footer>
  <p>&copy; 2025 Company Name</p>
</footer>
```

### Forms

```html
<!-- Proper form labels -->
<form>
  <div>
    <label for="name">Full Name</label>
    <input type="text" id="name" name="name" required>
  </div>

  <div>
    <label for="email">Email</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-describedby="email-help"
    >
    <span id="email-help" class="help-text">
      We'll never share your email.
    </span>
  </div>

  <!-- Error messages -->
  <div>
    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      aria-invalid="true"
      aria-describedby="password-error"
    >
    <span id="password-error" role="alert" class="error">
      Password must be at least 8 characters
    </span>
  </div>

  <button type="submit">Submit</button>
</form>
```

### Interactive Components

```html
<!-- Custom button -->
<div
  role="button"
  tabindex="0"
  aria-label="Close dialog"
  @click="closeDialog"
  @keydown.enter="closeDialog"
  @keydown.space.prevent="closeDialog"
>
  <IconX />
</div>

<!-- Toggle button -->
<button
  type="button"
  aria-pressed="false"
  @click="toggleSidebar"
>
  Toggle Sidebar
</button>

<!-- Modal dialog -->
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Delete</h2>
  <p id="dialog-description">
    Are you sure you want to delete this item?
  </p>
  <button>Cancel</button>
  <button>Delete</button>
</div>
```

### ARIA Live Regions

```html
<!-- Status messages -->
<div role="status" aria-live="polite">
  File uploaded successfully
</div>

<!-- Alerts -->
<div role="alert" aria-live="assertive">
  Error: Unable to save changes
</div>

<!-- Loading states -->
<div role="status" aria-live="polite" aria-busy="true">
  <span class="sr-only">Loading...</span>
  <SpinnerIcon />
</div>
```

### Skip Links

```html
<!-- First element in <body> -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<header>...</header>

<main id="main-content">
  <!-- Main content here -->
</main>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
    z-index: 999;
  }

  .skip-link:focus {
    left: 0;
    padding: 1rem;
    background: #000;
    color: #fff;
  }
</style>
```

---

## React/TypeScript Examples

### Accessible Button Component

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({
  children,
  onClick,
  ariaLabel,
  type = 'button',
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="btn"
    >
      {children}
    </button>
  );
}

// Usage
<Button ariaLabel="Close modal" onClick={closeModal}>
  <IconX />
</Button>
```

### Accessible Form Field

```tsx
interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helpText?: string;
  required?: boolean;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  helpText,
  required = false,
}: TextFieldProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-label="required"> *</span>}
      </label>

      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={!!error}
        aria-describedby={`${helpText ? helpId : ''} ${error ? errorId : ''}`.trim()}
      />

      {helpText && (
        <span id={helpId} className="help-text">
          {helpText}
        </span>
      )}

      {error && (
        <span id={errorId} role="alert" className="error-text">
          {error}
        </span>
      )}
    </div>
  );
}
```

### Accessible Modal

```tsx
import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store previously focused element
      previousFocus.current = document.activeElement as HTMLElement;

      // Focus first focusable element in modal
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      // Restore focus when modal closes
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={dialogRef}
    >
      <div className="modal-content">
        <h2 id="modal-title">{title}</h2>
        {children}
        <button onClick={onClose} aria-label="Close modal">
          Close
        </button>
      </div>
    </div>
  );
}
```

---

## Resources

### Tools

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Chrome DevTools audit
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)

### Testing

- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Pa11y Documentation](https://pa11y.org/)
- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

---

*Last Updated: November 25, 2025*
*Owner: Engineering Team*
*WCAG Target: Level AA*
*Review Frequency: Every Sprint*
