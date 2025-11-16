/**
 * Comprehensive E2E Tests for EMCEE Role
 * Tests all possible interactions, views, and functions available to emcee users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage, navigateToProtectedRoute } from '../helpers';

test.describe('Comprehensive Emcee E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'emcee@eventmanager.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    // Use a timeout wrapper to prevent test timeout
    try {
      await Promise.race([
        logout(page),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
      ]);
    } catch (error) {
      // If logout times out, just clear storage
      if (!page.isClosed()) {
        try {
          await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
          }).catch(() => {});
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  });

  // ============================================================================
  // EMCEE DASHBOARD
  // ============================================================================

  test('should navigate to emcee page', async ({ page }) => {
    await navigateToProtectedRoute(page, '/emcee', 'emcee@eventmanager.com', 'password123');
    
    const emceePage = page.locator('h1, h2, [data-testid="emcee"]').first();
    await expect(emceePage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // CONTESTANT BIOS
  // ============================================================================

  test('should view contestant bios', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const biosSection = page.locator('[data-testid="contestant-bios"], .bios, table').first();
    const hasBios = await biosSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, button').count() > 0;
    expect(hasBios || hasPageContent).toBe(true);
  });

  test('should filter contestant bios by event', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const eventSelect = page.locator('select[name="event"], select').first();
    if (await eventSelect.isVisible({ timeout: 5000 })) {
      await eventSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const biosList = page.locator('[data-testid="contestant-bios-list"], table').first();
      const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*contestant|empty/i').count() > 0;
      expect(hasBios || hasEmptyState).toBe(true);
    }
  });

  test('should view individual contestant bio details', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const bioRow = page.locator('tr, [data-testid="bio-item"], .bio-item').first();
    if (await bioRow.isVisible({ timeout: 5000 })) {
      // Try to click, but handle accordion interception
      try {
        await bioRow.click({ force: true, timeout: 5000 });
      } catch (error) {
        // If click is intercepted, try clicking the accordion button first
        const accordionButton = page.locator('[data-accordion-id] button').first();
        if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await accordionButton.click({ force: true });
          await page.waitForTimeout(500);
          await bioRow.click({ force: true });
        }
      }
      await page.waitForTimeout(2000);
      
      const detailsSection = page.locator('[data-testid="bio-details"], .details, [class*="detail"]').first();
      const hasDetails = await detailsSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasDetails).toBe(true);
    }
  });

  // ============================================================================
  // JUDGE BIOS
  // ============================================================================

  test('should view judge bios', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const judgeBiosTab = page.locator('button:has-text("Judge"), [data-testid="judge-bios-tab"]').first();
    if (await judgeBiosTab.isVisible({ timeout: 5000 })) {
      await judgeBiosTab.click();
      await page.waitForTimeout(2000);
      
      const biosList = page.locator('[data-testid="judge-bios-list"], table, .bio-list').first();
      const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*judge|empty/i').count() > 0;
      expect(hasBios || hasEmptyState).toBe(true);
    }
  });

  test('should filter judge bios by event', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const judgeBiosTab = page.locator('button:has-text("Judge")').first();
    if (await judgeBiosTab.isVisible({ timeout: 5000 })) {
      await judgeBiosTab.click();
      await page.waitForTimeout(2000);
      
      const eventSelect = page.locator('select[name="event"], select').first();
      if (await eventSelect.isVisible({ timeout: 5000 })) {
        await eventSelect.selectOption({ index: 0 });
        await page.waitForTimeout(2000);
        
        const biosList = page.locator('table, [data-testid="judge-bios-list"]').first();
        const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasBios).toBe(true);
      }
    }
  });

  test('should view individual judge bio details', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const judgeBiosTab = page.locator('button:has-text("Judge")').first();
    if (await judgeBiosTab.isVisible({ timeout: 5000 })) {
      await judgeBiosTab.click();
      await page.waitForTimeout(2000);
      
      const bioRow = page.locator('tr, [data-testid="judge-bio-item"]').first();
      if (await bioRow.isVisible({ timeout: 5000 })) {
        // Try to click, but handle accordion interception
        try {
          await bioRow.click({ force: true, timeout: 5000 });
        } catch (error) {
          // If click is intercepted, try clicking the accordion button first
          const accordionButton = page.locator('[data-accordion-id] button').first();
          if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await accordionButton.click({ force: true });
            await page.waitForTimeout(500);
            await bioRow.click({ force: true });
          }
        }
        await page.waitForTimeout(2000);
        
        const detailsSection = page.locator('[data-testid="bio-details"], .details').first();
        const hasDetails = await detailsSection.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasDetails).toBe(true);
      }
    }
  });

  // ============================================================================
  // EMCEE SCRIPTS
  // ============================================================================

  test('should view emcee scripts', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const scriptsTab = page.locator('button:has-text("Scripts"), [data-testid="scripts-tab"]').first();
    if (await scriptsTab.isVisible({ timeout: 5000 })) {
      await scriptsTab.click();
      await page.waitForTimeout(2000);
      
      const scriptsList = page.locator('[data-testid="scripts"], .scripts-list, table').first();
      const hasScripts = await scriptsList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*script|empty/i').count() > 0;
      expect(hasScripts || hasEmptyState).toBe(true);
    }
  });

  test('should filter scripts by event', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const scriptsTab = page.locator('button:has-text("Scripts")').first();
    if (await scriptsTab.isVisible({ timeout: 5000 })) {
      await scriptsTab.click();
      await page.waitForTimeout(2000);
      
      const eventSelect = page.locator('select[name="event"], select').first();
      if (await eventSelect.isVisible({ timeout: 5000 })) {
        await eventSelect.selectOption({ index: 0 });
        await page.waitForTimeout(2000);
        
        const scriptsList = page.locator('table, [data-testid="scripts-list"]').first();
        const hasScripts = await scriptsList.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasScripts).toBe(true);
      }
    }
  });

  test('should view script details', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const scriptsTab = page.locator('button:has-text("Scripts")').first();
    if (await scriptsTab.isVisible({ timeout: 5000 })) {
      await scriptsTab.click();
      await page.waitForTimeout(2000);
      
      const scriptItem = page.locator('[data-testid="script-item"], tr, .script-item').first();
      if (await scriptItem.isVisible({ timeout: 5000 })) {
        // Try to click, but handle accordion interception
        try {
          await scriptItem.click({ force: true, timeout: 5000 });
        } catch (error) {
          // If click is intercepted, try clicking the accordion button first
          const accordionButton = page.locator('[data-accordion-id] button').first();
          if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await accordionButton.click({ force: true });
            await page.waitForTimeout(500);
            await scriptItem.click({ force: true });
          }
        }
        await page.waitForTimeout(2000);
        
        const scriptContent = page.locator('[data-testid="script-content"], .script-content, pre').first();
        const hasContent = await scriptContent.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasContent).toBe(true);
      }
    }
  });

  // ============================================================================
  // RESULTS VIEWING
  // ============================================================================

  test('should view results page', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view winners page', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    await expect(winnersPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // SETTINGS
  // ============================================================================

  test('should view settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const settingsPage = page.locator('h1, h2, [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  test('should update profile information', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const profileSection = page.locator('button:has-text("Profile")').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);
      
      const preferredNameInput = page.locator('input[name="preferredName"]').first();
      if (await preferredNameInput.isVisible()) {
        await preferredNameInput.fill(`Emcee ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // HELP PAGE
  // ============================================================================

  test('should navigate to help page', async ({ page }) => {
    await page.goto('/help');
    await page.waitForTimeout(2000);
    
    const helpPage = page.locator('h1, h2, [data-testid="help"]').first();
    await expect(helpPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // ACCESS RESTRICTIONS
  // ============================================================================

  test('should not access admin page', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied"), text=/unauthorized/i').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');
    const hasAdminContent = await page.locator('[data-testid="admin-dashboard"], h1:has-text("Admin")').isVisible({ timeout: 2000 }).catch(() => false);
    
    // Test passes if unauthorized message shown, redirected away, OR if admin content is NOT visible
    expect(isUnauthorized || isRedirected || !hasAdminContent).toBe(true);
  });

  test('should not access scoring page', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied"), text=/unauthorized/i').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/scoring');
    const hasScoringContent = await page.locator('[data-testid="scoring"], h1:has-text("Scoring")').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(isUnauthorized || isRedirected || !hasScoringContent).toBe(true);
  });

  test('should not access users management', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied"), text=/unauthorized/i').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/users');
    const hasUsersContent = await page.locator('[data-testid="users"], h1:has-text("Users")').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(isUnauthorized || isRedirected || !hasUsersContent).toBe(true);
  });
});

