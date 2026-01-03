import { Page } from '@playwright/test';

/**
 * Helper utilities for visual regression testing
 */

/**
 * Wait for page to be fully loaded and stable for screenshots
 */
export async function waitForPageReady(page: Page, options?: {
  disableAnimations?: boolean;
  waitTime?: number;
}): Promise<void> {
  const { disableAnimations = true, waitTime = 500 } = options || {};

  // Wait for network to be idle
  await page.waitForLoadState('networkidle');

  // Disable animations for consistent screenshots
  if (disableAnimations) {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }

  // Wait for any final renders
  await page.waitForTimeout(waitTime);
}

/**
 * Login helper for authenticated pages
 */
export async function login(page: Page, credentials?: {
  email?: string;
  password?: string;
}): Promise<void> {
  const email = credentials?.email || process.env.TEST_USER_EMAIL || 'test@example.com';
  const password = credentials?.password || process.env.TEST_USER_PASSWORD || 'password123';

  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard or home
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

/**
 * Login using stored auth token (faster than form login)
 */
export async function loginWithToken(page: Page, token?: string): Promise<void> {
  const authToken = token || process.env.TEST_AUTH_TOKEN;

  if (!authToken) {
    throw new Error('No auth token provided. Set TEST_AUTH_TOKEN environment variable.');
  }

  // Set token in localStorage
  await page.addInitScript((token) => {
    localStorage.setItem('authToken', token);
  }, authToken);

  await page.goto('/dashboard');
}

/**
 * Mock API responses for consistent test data
 */
export async function mockApiResponse(
  page: Page,
  endpoint: string,
  response: any,
  options?: {
    method?: string;
    status?: number;
  }
): Promise<void> {
  const { method = 'GET', status = 200 } = options || {};

  await page.route(`**/${endpoint}`, (route) => {
    if (route.request().method() === method) {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    } else {
      route.continue();
    }
  });
}

/**
 * Wait for specific element to be visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options?: {
    timeout?: number;
  }
): Promise<void> {
  const { timeout = 10000 } = options || {};

  await page.waitForSelector(selector, {
    state: 'visible',
    timeout,
  });
}

/**
 * Scroll to element before screenshot
 */
export async function scrollToElement(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(500); // Wait for scroll to complete
}

/**
 * Hide dynamic elements (timestamps, user avatars, etc.)
 */
export async function hideDynamicElements(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-testid="timestamp"],
      [data-testid="user-avatar"],
      [data-testid="relative-time"],
      .timestamp,
      .relative-time {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * Enable dark mode
 */
export async function enableDarkMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
}

/**
 * Enable light mode
 */
export async function enableLightMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
}

/**
 * Set viewport size for responsive testing
 */
export async function setViewport(
  page: Page,
  device: 'mobile' | 'tablet' | 'desktop' | 'wide'
): Promise<void> {
  const viewports = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1920, height: 1080 },
    wide: { width: 2560, height: 1440 },
  };

  await page.setViewportSize(viewports[device]);
}

/**
 * Fill form with test data
 */
export async function fillForm(
  page: Page,
  data: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(data)) {
    await page.fill(`input[name="${name}"], textarea[name="${name}"]`, value);
  }
}

/**
 * Wait for all images to load
 */
export async function waitForImages(page: Page): Promise<void> {
  await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve);
        });
      })
    );
  });
}

/**
 * Get screenshot with default options
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    maxDiffPixels?: number;
  }
) {
  const { fullPage = true, maxDiffPixels = 100 } = options || {};

  return page.screenshot({
    fullPage,
    maxDiffPixels,
  });
}
