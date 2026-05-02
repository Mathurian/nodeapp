/**
 * Playwright Authentication Helpers
 * Handle login, logout, and session management for E2E tests
 * Works with TestDataFactory to use dynamically created users
 */

import { Page, Browser, BrowserContext } from '@playwright/test';

export interface AuthContext {
  context: BrowserContext;
  page: Page;
  request: any;
  user: any;
  token: string;
}

/**
 * Fetch CSRF token from the backend
 * @param page - Playwright page object
 * @returns CSRF token string
 */
async function fetchCsrfToken(page: Page): Promise<string> {
  try {
    const response = await page.request.get('/api/csrf-token');
    if (response.ok()) {
      const data = await response.json();
      return data.csrfToken || data.token || '';
    }
  } catch (error) {
    console.warn('Failed to fetch CSRF token, continuing without it:', error);
  }
  return '';
}

/**
 * Login to the application
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password (default: 'password123')
 * @param tenantSlug - Tenant slug for multi-tenant login
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string = 'password123',
  tenantSlug?: string
): Promise<void> {
  // Navigate to login page first to establish session
  // Note: extraHTTPHeaders set at context level will be included automatically
  const loginUrl = tenantSlug ? `/${tenantSlug}/login` : '/login';
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

  // Fetch CSRF token for the login request
  const csrfToken = await fetchCsrfToken(page);

  // If we got a CSRF token, set it as a cookie so the frontend API client can use it
  if (csrfToken) {
    await page.context().addCookies([{
      name: '_csrf',
      value: csrfToken,
      domain: 'localhost',
      path: '/',
      httpOnly: false, // Frontend needs to read this
      sameSite: 'Lax',
    }]);
  }

  // Fill login form
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');

  // Wait for navigation away from login page
  await page.waitForURL(url => !url.pathname.includes('/login'), {
    timeout: 20000,
  });

  // Wait for page to be ready (use 'load' instead of 'networkidle' for faster tests)
  await page.waitForLoadState('load');
}

/**
 * Close any open modals, dialogs, or command palette
 * @param page - Playwright page object
 */
export async function closeOpenModals(page: Page): Promise<void> {
  try {
    // Press Escape multiple times to close any nested or multiple modals
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Wait for any portal content to be removed
    await page.waitForTimeout(500);

    // Click any visible close buttons in portals as fallback
    const closeButtons = page.locator('#headlessui-portal-root button[aria-label*="Close"], #headlessui-portal-root button:has-text("Close"), #headlessui-portal-root [data-testid="close"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      try {
        await closeButtons.nth(i).click({ timeout: 1000 });
        await page.waitForTimeout(200);
      } catch {
        // Continue if button not clickable
      }
    }
  } catch (error) {
    // Ignore errors - modals might already be closed
  }
}

/**
 * Wait for modal overlays to close before continuing.
 */
export async function waitForModalClose(page: Page, timeout: number = 5000): Promise<void> {
  await closeOpenModals(page);

  const modalSelector = '[class*="modal"], [class*="overlay"], [class*="fixed"][class*="inset-0"]';
  await page.waitForSelector(modalSelector, {
    state: 'hidden',
    timeout,
  }).catch(async () => {
    await page.waitForTimeout(500);
  });
}

/**
 * Logout from the application
 * @param page - Playwright page object
 */
export async function logoutUser(page: Page): Promise<void> {
  try {
    // Look for logout button/link
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), [data-testid="logout"]'
    ).first();

    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
      await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    }

    // Clear storage regardless
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {});

  } catch (error) {
    // Force clear storage if logout button not found
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    }).catch(() => {});
  }
}

/**
 * Create authenticated context for a specific user
 * @param browser - Playwright browser instance
 * @param email - User email
 * @param password - User password
 * @param tenantSlug - Tenant slug for multi-tenant login
 * @returns AuthContext with page, context, user data, and token
 */
export async function createAuthContext(
  browser: Browser,
  email: string,
  password: string = 'password123',
  tenantSlug?: string
): Promise<AuthContext> {
  // Create context with extra HTTP headers if tenant slug provided
  const contextOptions: any = {
    storageState: undefined,
  };

  if (tenantSlug) {
    contextOptions.extraHTTPHeaders = {
      'X-Tenant-Slug': tenantSlug,
    };
  }

  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();

  // Login with tenant slug
  await loginUser(page, email, password, tenantSlug);

  // Extract token from local storage
  const token = await page.evaluate(() => {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  });

  // Get user info
  let user: any = null;
  try {
    const response = await page.request.get('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok()) {
      const userData = await response.json();
      user = userData.data || userData.user || userData;
    }
  } catch (error) {
    console.warn('Failed to fetch user data:', error);
    // Use email as fallback
    user = { email };
  }

  return {
    context,
    page,
    request: page.request,
    user,
    token,
  };
}

/**
 * Create contexts for multiple users (all roles)
 * @param browser - Playwright browser instance
 * @param users - Map of role name to user object (with email property)
 * @returns Map of role name to AuthContext
 */
export async function createMultiRoleContexts(
  browser: Browser,
  users: Record<string, any>
): Promise<Record<string, AuthContext>> {
  const contexts: Record<string, AuthContext> = {};

  for (const [role, userData] of Object.entries(users)) {
    try {
      contexts[role] = await createAuthContext(browser, userData.email);
    } catch (error) {
      console.error(`Failed to create context for ${role}:`, error);
      throw error;
    }
  }

  return contexts;
}

/**
 * Cleanup all contexts
 * @param contexts - Map of role name to AuthContext
 */
export async function cleanupContexts(
  contexts: Record<string, AuthContext> | AuthContext[]
): Promise<void> {
  const contextArray = Array.isArray(contexts) ? contexts : Object.values(contexts);

  for (const authContext of contextArray) {
    try {
      if (authContext.page && !authContext.page.isClosed()) {
        await authContext.page.close().catch(() => {});
      }
      if (authContext.context) {
        await authContext.context.close().catch(() => {});
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check if user is logged in
 * @param page - Playwright page object
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const token = await page.evaluate(() => {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    });
    return !!token;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for page to be fully loaded
 * @param page - Playwright page object
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // Small buffer for animations
}

const KNOWN_APP_ROUTE_SEGMENTS = new Set([
  'login', 'register', 'forgot-password', 'dashboard', 'events', 'contests', 'categories',
  'scoring', 'results', 'users', 'admin', 'settings', 'profile', 'emcee',
  'templates', 'reports', 'notifications', 'backups', 'disaster-recovery',
  'workflows', 'files', 'email-templates', 'send-email', 'custom-fields',
  'tenants', 'mfa', 'database', 'cache', 'archive', 'deductions',
  'certifications', 'logs', 'performance', 'data-wipe', 'event-templates',
  'bulk-operations', 'category-types', 'field-visibility',
  'test-event-setup', 'help', 'bios', 'assignments', 'rate-limit-configs',
  'activity', 'auditor', 'board', 'permissions', 'test-runner', 'uat-ids', 'tally-master',
  'winners', 'score-governance', 'login-locations',
]);

function getTenantSlugFromPath(pathname: string): string | null {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  if (!firstSegment || KNOWN_APP_ROUTE_SEGMENTS.has(firstSegment)) {
    return null;
  }
  return firstSegment;
}

function resolveTenantAwareUrl(page: Page, url: string): string {
  if (!url.startsWith('/') || url.startsWith('//')) {
    return url;
  }

  const targetSegments = url.split('/').filter(Boolean);
  const targetFirstSegment = targetSegments[0];
  if (!targetFirstSegment || !KNOWN_APP_ROUTE_SEGMENTS.has(targetFirstSegment)) {
    return url;
  }

  const currentUrl = new URL(page.url());
  const currentTenantSlug = getTenantSlugFromPath(currentUrl.pathname);
  if (!currentTenantSlug) {
    return url;
  }

  return `/${currentTenantSlug}${url}`;
}

/**
 * Navigate to a page and wait for it to load
 * @param page - Playwright page object
 * @param url - URL to navigate to
 */
export async function navigateAndWait(page: Page, url: string): Promise<void> {
  await page.goto(resolveTenantAwareUrl(page, url));
  await waitForPageLoad(page);
  // Close any onboarding modals or command palette that might have opened
  await closeOpenModals(page);
}

/**
 * Wait for success message or toast
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForSuccessMessage(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.locator(
    'text=/success|saved|created|updated|deleted/i, [role="alert"], .toast, .notification'
  ).first().waitFor({ timeout, state: 'visible' }).catch(() => {
    // Message might disappear quickly, that's okay
  });
}

/**
 * Wait for error message
 * @param page - Playwright page object
 * @param timeout - Timeout in milliseconds
 */
export async function waitForErrorMessage(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.locator(
    'text=/error|failed|invalid/i, [role="alert"], .error, .alert-error'
  ).first().waitFor({ timeout, state: 'visible' });
}

/**
 * Fill form field by label
 * @param page - Playwright page object
 * @param label - Label text
 * @param value - Value to fill
 */
export async function fillByLabel(
  page: Page,
  label: string,
  value: string
): Promise<void> {
  const input = page.getByLabel(label, { exact: false });
  await input.fill(value);
}

/**
 * Select option by label
 * @param page - Playwright page object
 * @param label - Label text
 * @param option - Option to select
 */
export async function selectByLabel(
  page: Page,
  label: string,
  option: string
): Promise<void> {
  const select = page.getByLabel(label, { exact: false });
  await select.selectOption({ label: option });
}

/**
 * Click button by text
 * @param page - Playwright page object
 * @param text - Button text
 */
export async function clickButton(page: Page, text: string): Promise<void> {
  const button = page.getByRole('button', { name: new RegExp(text, 'i') });
  await button.click();
}

/**
 * Wait for navigation after action
 * @param page - Playwright page object
 * @param action - Function that triggers navigation
 */
export async function waitForNavigation(
  page: Page,
  action: () => Promise<void>
): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    action(),
  ]);
}

/**
 * Take screenshot for debugging
 * @param page - Playwright page object
 * @param name - Screenshot name
 */
export async function debugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `debug-screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  }).catch(() => {
    // Ignore if directory doesn't exist
  });
}

/**
 * Get current user role from UI
 * @param page - Playwright page object
 * @returns User role string or null
 */
export async function getCurrentUserRole(page: Page): Promise<string | null> {
  try {
    const roleText = await page.locator('[data-testid="user-role"], .user-role').textContent();
    return roleText?.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Verify page has no console errors
 * @param page - Playwright page object
 */
export function setupConsoleErrorCheck(page: Page): void {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  // Store errors for later retrieval
  (page as any).consoleErrors = errors;
}

/**
 * Get console errors
 * @param page - Playwright page object
 * @returns Array of error messages
 */
export function getConsoleErrors(page: Page): string[] {
  return (page as any).consoleErrors || [];
}
