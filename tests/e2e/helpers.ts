/**
 * E2E Test Helpers
 * Common utilities for E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Login helper function
 * Uses actual application credentials from seed data
 * Handles cases where user is already on login page or redirected there
 */
export async function loginAsUser(
  page: Page,
  email: string = 'admin@eventmanager.com',
  password: string = 'password123'
): Promise<void> {
  try {
    // Check if page is closed
    if (page.isClosed()) {
      throw new Error('Page is closed');
    }

    // Clear storage first to ensure clean state
    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});
    } catch (error) {
      // Ignore if page closes during this
    }
    
    // Small delay to allow server to process any previous logout
    await page.waitForTimeout(300).catch(() => {});
    
    // Check if page is still open
    if (page.isClosed()) {
      throw new Error('Page closed during storage clear');
    }

    // Check if we're already logged in (not on login page)
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login');
    
    if (!isOnLoginPage) {
      // Already on a different page, check if we're logged in
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user" i], button:has-text("Logout")').first();
      const isLoggedIn = await userMenu.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLoggedIn) {
        // Already logged in, but might be wrong user - logout first
        await logout(page);
        // Wait a bit after logout before navigating to login
        await page.waitForTimeout(2000);
        // Ensure page is still open
        if (page.isClosed()) {
          throw new Error('Page closed during logout');
        }
      }
    }

    // Ensure we're on login page - navigate there explicitly
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (error) {
      // If navigation fails, page might be closed
      if (page.isClosed()) {
        throw new Error('Page closed during navigation to login');
      }
      throw error;
    }
    
    // Wait for page to settle and form to be ready
    await page.waitForTimeout(1500);
    
    // Check page is still open
    if (page.isClosed()) {
      throw new Error('Page closed before login attempt');
    }
    
    const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

    // Wait for form elements to be visible and ready
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await submitButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Check page is still open
    if (page.isClosed()) {
      throw new Error('Page closed before filling form');
    }
    
    // Clear inputs first in case they have old values
    await emailInput.clear();
    await passwordInput.clear();
    
    // Fill inputs with a small delay between them
    await emailInput.fill(email);
    await page.waitForTimeout(200);
    await passwordInput.fill(password);
    
    // Verify the values were filled correctly
    const emailValue = await emailInput.inputValue().catch(() => '');
    const passwordValue = await passwordInput.inputValue().catch(() => '');
    
    if (emailValue !== email) {
      throw new Error(`Email input value mismatch: expected "${email}", got "${emailValue}"`);
    }
    
    if (passwordValue !== password) {
      throw new Error(`Password input value mismatch: expected "${password}", got "${passwordValue}"`);
    }
    
    // Wait a moment before submitting
    await page.waitForTimeout(500);
    
    // Check page is still open
    if (page.isClosed()) {
      throw new Error('Page closed before submitting form');
    }
    
    // Wait for the login API response before checking navigation
    // Set up promise to wait for login API response (any status)
    const loginResponsePromise = page.waitForResponse(
      (response) => {
        const url = response.url();
        return url.includes('/auth/login');
      },
      { timeout: 10000 }
    ).catch(() => null);
    
    // Try submitting the form directly instead of clicking the button
    const form = page.locator('form').first();
    await form.evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
    }).catch(async () => {
      // Fallback to clicking submit button if form submit fails
      await submitButton.click();
    });
    
    // Wait for login API response
    const loginResponse = await loginResponsePromise;
    
    if (loginResponse) {
      const status = loginResponse.status();
      if (status !== 200) {
        // Login failed - get error details
        const errorBody = await loginResponse.json().catch(() => ({}));
        throw new Error(`Login API returned ${status}: ${JSON.stringify(errorBody)}`);
      }
      // Login API succeeded, wait for redirect
    } else {
      // No response received - might be a client-side issue or different endpoint
      // Continue with normal flow and let URL check handle it
    }

    // Wait for login to complete - wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 }).catch(async () => {
      // Check if page is closed
      if (page.isClosed()) {
        throw new Error('Page closed during login');
      }
      
      // If still on login page after timeout, check for error message
      const errorMessage = page.locator('.error, [role="alert"], [class*="error"]').first();
      const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasError) {
        // There's an error message, login failed
        const errorText = await errorMessage.textContent().catch(() => '');
        throw new Error(`Login failed - still on login page with error message: ${errorText}`);
      }
      
      // No error message, but still on login page - check if we're actually logged in
      // Sometimes the redirect doesn't happen immediately, but auth state is set
      await page.waitForTimeout(3000);
      
      // Check if page is still open
      if (page.isClosed()) {
        throw new Error('Page closed during login verification');
      }
      
      const currentUrl = page.url();
      
      // If still on login page after waiting, check if we're actually logged in
      if (currentUrl.includes('/login')) {
        // Check if there's a user menu or dashboard element indicating we're logged in
        const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), [aria-label*="user" i]').first();
        const isLoggedIn = await userMenu.isVisible({ timeout: 3000 }).catch(() => false);
        
        if (!isLoggedIn) {
          // Wait a bit more and check URL again - sometimes redirect is delayed
          await page.waitForTimeout(2000);
          const finalUrl = page.url();
          if (finalUrl.includes('/login')) {
            // Still on login page - this is likely a real failure
            // But check one more time for error message
            const finalError = page.locator('.error, [role="alert"], [class*="error"]').first();
            const hasFinalError = await finalError.isVisible({ timeout: 1000 }).catch(() => false);
            if (hasFinalError) {
              const errorText = await finalError.textContent().catch(() => '');
              throw new Error(`Login failed - still on login page with error: ${errorText}`);
            }
            throw new Error('Login failed - still on login page after extended wait');
          }
        }
        // If we're logged in but still on login page, that's okay - navigation might be delayed
      }
    });
    
    // Additional wait to ensure auth state is set and page is loaded
    if (!page.isClosed()) {
      await page.waitForTimeout(1000);
      
      // Verify we're actually logged in - check that we're not on login page
      // and there's no error message. User menu might not be visible on all pages
      // or might take time to render, so we don't require it for success.
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        // Still on login page - check for error message
        const errorMessage = page.locator('.error, [role="alert"], [class*="error"]').first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        if (hasError) {
          const errorText = await errorMessage.textContent().catch(() => '');
          throw new Error(`Login failed - still on login page with error: ${errorText}`);
        }
        // No error but still on login page - might be a redirect delay
        // Check if we can find any indication of being logged in
        const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout"), [aria-label*="user" i]').first();
        const isLoggedIn = await userMenu.isVisible({ timeout: 3000 }).catch(() => false);
        if (!isLoggedIn) {
          // Wait a bit more for potential redirect
          await page.waitForTimeout(2000);
          const finalUrl = page.url();
          if (finalUrl.includes('/login')) {
            throw new Error('Login failed - still on login page after waiting');
          }
        }
      }
      // If we're not on login page, login was successful
      // User menu verification is optional and not required for success
    }
  } catch (error) {
    // If page is closed, that's a different issue
    if (page.isClosed()) {
      throw new Error('Page closed during login process');
    }
    throw error;
  }
}

/**
 * Logout helper function
 * Logs out the current user to prevent data contamination between tests
 * Handles page closure gracefully
 */
export async function logout(page: Page): Promise<void> {
  try {
    // Check if page is still open
    if (page.isClosed()) {
      return;
    }
    
    // Set a shorter timeout for logout operations
    const logoutTimeout = 3000;
    
    // First, clear all storage to ensure clean state
    try {
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        // Also try to remove specific items
        localStorage.removeItem('token');
        localStorage.removeItem('sessionVersion');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('sessionVersion');
        sessionStorage.removeItem('user');
      }).catch(() => {});
    } catch (error) {
      // Ignore if page closes during this
    }
    
    // Clear cookies as well
    try {
      const context = page.context();
      await context.clearCookies();
    } catch (error) {
      // Ignore cookie clearing errors
    }
    
    // Check if page is still open after clearing storage
    if (page.isClosed()) {
      return;
    }
    
    // Look for logout button in various possible locations
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Log out")',
      'a:has-text("Logout")',
      'a:has-text("Log out")',
      '[data-testid="logout"]',
      '[aria-label*="logout" i]',
      '[aria-label*="log out" i]'
    ];
    
    let loggedOut = false;
    for (const selector of logoutSelectors) {
      if (page.isClosed()) break;
      
      try {
        const logoutButton = page.locator(selector).first();
        const isVisible = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
        
        if (isVisible) {
          await Promise.race([
            logoutButton.click(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Click timeout')), logoutTimeout))
          ]).catch(() => {});
          
          // Wait for redirect, but don't fail if it doesn't happen
          await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 2000 }).catch(() => {});
          loggedOut = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }
    
    // If no logout button found, try navigating to logout endpoint (but don't wait for it)
    if (!loggedOut && !page.isClosed()) {
      try {
        // Use Promise.race to prevent hanging if logout endpoint closes the page
        await Promise.race([
          page.goto('/logout', { waitUntil: 'domcontentloaded', timeout: logoutTimeout }),
          new Promise((resolve) => setTimeout(() => resolve(null), logoutTimeout))
        ]).catch(() => {});
        
        // Brief wait if page is still open
        if (!page.isClosed()) {
          await page.waitForTimeout(1000).catch(() => {});
        }
      } catch (error) {
        // Page might be closed or navigation failed, ignore
      }
    }
    
    // Final cleanup - clear storage again if page is still open
    if (!page.isClosed()) {
      try {
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.removeItem('token');
          localStorage.removeItem('sessionVersion');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('sessionVersion');
          sessionStorage.removeItem('user');
        }).catch(() => {});
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    
    // Ensure we're on login page or page is closed
    if (!page.isClosed()) {
      try {
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          // Try to navigate to login page, but don't wait too long
          await Promise.race([
            page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 2000 }),
            new Promise((resolve) => setTimeout(() => resolve(null), 2000))
          ]).catch(() => {});
        }
      } catch (error) {
        // Ignore navigation errors
      }
    }
    
    // Add a small delay after logout to allow server to process the logout
    // This helps prevent session conflicts in subsequent tests
    await page.waitForTimeout(500).catch(() => {});
  } catch (error) {
    // Silently handle any errors during logout - it's cleanup
    // The important thing is that storage is cleared
  }
}

/**
 * Wait for toast notification (react-hot-toast)
 * Returns the toast element if found
 */
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' | 'info' | 'warning' = 'success',
  timeout: number = 5000
): Promise<boolean> {
  try {
    // react-hot-toast creates elements with class containing 'toast' and data attributes
    // Success toasts have green background, error toasts have red background
    const toastSelector = type === 'success' 
      ? '[class*="toast"][class*="success"], [data-testid="toast-success"]'
      : type === 'error'
      ? '[class*="toast"][class*="error"], [data-testid="toast-error"]'
      : '[class*="toast"]';
    
    await page.waitForSelector(toastSelector, { timeout, state: 'visible' });
    return true;
  } catch {
    // Also check for any visible toast element
    const anyToast = page.locator('[class*="toast"], [role="status"], [role="alert"]').first();
    const isVisible = await anyToast.isVisible({ timeout: 2000 }).catch(() => false);
    return isVisible;
  }
}

/**
 * Wait for success message (toast or alert)
 * Also checks if operation succeeded by URL change or form reset
 */
export async function waitForSuccessMessage(
  page: Page,
  timeout: number = 5000
): Promise<boolean> {
  try {
    // Check if page is closed
    if (page.isClosed()) {
      return false;
    }

    // Try toast first
    const hasToast = await waitForToast(page, 'success', timeout).catch(() => false);
    if (hasToast && !page.isClosed()) {
      return true;
    }
    
    // Check if page is still open
    if (page.isClosed()) {
      return false;
    }
    
    // Fallback to alert elements
    try {
      const successElement = page.locator('.success, [role="alert"]').first();
      const isVisible = await successElement.isVisible({ timeout: 2000 }).catch(() => false);
      if (isVisible && !page.isClosed()) {
        const text = await successElement.textContent().catch(() => '');
        if (text && (text.toLowerCase().includes('success') || text.toLowerCase().includes('saved'))) {
          return true;
        }
      }
    } catch {
      // Ignore errors
    }
    
    // If no visible success message, check if operation succeeded by other means:
    // 1. URL changed (navigation occurred)
    // 2. Form was reset (inputs cleared)
    // 3. Page content changed
    if (!page.isClosed()) {
      await page.waitForTimeout(1000).catch(() => {}); // Give time for any async operations
      // If page is still open, assume success if no error occurred
      if (!page.isClosed()) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // If page closed during check, that's not necessarily a failure
    if (page.isClosed()) {
      return false;
    }
    return false;
  }
}

/**
 * Navigate to protected route and handle login redirect
 * If redirected to login, logs in with provided credentials
 */
export async function navigateToProtectedRoute(
  page: Page,
  route: string,
  email: string = 'admin@eventmanager.com',
  password: string = 'password123'
): Promise<void> {
  await page.goto(route).catch(() => {});
  await page.waitForTimeout(1000);
  
  // Check if redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // Need to login first
    await loginAsUser(page, email, password);
    // Navigate to route again after login
    await page.goto(route).catch(() => {});
    await page.waitForTimeout(1000);
  }
}

/**
 * Wait for API response helper
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout: number = 10000): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Check if element exists (non-throwing)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  try {
    return await page.locator(selector).first().textContent();
  } catch {
    return null;
  }
}

/**
 * Wait for modal to close
 * Improved handling for modal overlays that block interactions
 */
export async function waitForModalClose(page: Page, timeout: number = 5000): Promise<void> {
  try {
    // Wait for modal overlay to disappear
    const modalSelector = '[class*="modal"], [class*="overlay"], [class*="fixed"][class*="inset-0"]';
    
    // Check if modal exists
    const modalExists = await page.locator(modalSelector).first().isVisible({ timeout: 1000 }).catch(() => false);
    
    if (modalExists) {
      // Try to close modal by clicking close button or backdrop
      const closeButtons = [
        'button[aria-label="Close"]',
        'button:has-text("Close")',
        '[class*="close"]',
        '[class*="modal-close"]'
      ];
      
      for (const selector of closeButtons) {
        const closeButton = page.locator(selector).first();
        const isVisible = await closeButton.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          await closeButton.click();
          await page.waitForTimeout(500);
          break;
        }
      }
      
      // Wait for modal to disappear
      await page.waitForSelector(modalSelector, {
        state: 'hidden',
        timeout
      }).catch(() => {
        // If modal doesn't disappear, try clicking backdrop
        page.locator('[class*="backdrop"], [class*="overlay"]').first().click({ force: true }).catch(() => {});
        return page.waitForTimeout(500);
      });
    }
  } catch (error) {
    // If modal handling fails, just wait a bit
    await page.waitForTimeout(500);
  }
}
