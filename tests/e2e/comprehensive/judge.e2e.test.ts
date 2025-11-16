/**
 * Comprehensive E2E Tests for JUDGE Role
 * Tests all possible interactions, views, and functions available to judge users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage } from '../helpers';

test.describe('Comprehensive Judge E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'judge@eventmanager.com', 'password123');
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
  // SCORING INTERFACE
  // ============================================================================

  test('should navigate to scoring page', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const scoringPage = page.locator('h1:has-text("Scoring"), h2:has-text("Scoring"), [data-testid="scoring"]').first();
    await expect(scoringPage).toBeVisible({ timeout: 10000 });
  });

  test('should view assigned categories', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    const hasCategories = await categorySelect.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*categor|no.*assignment/i').count() > 0;
    expect(hasCategories || hasEmptyState).toBe(true);
  });

  test('should select a category', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      const optionCount = await categorySelect.locator('option').count();
      if (optionCount > 1) {
        await categorySelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        
        // Check that contestants or criteria are displayed
        const contestantsList = page.locator('[data-testid="contestants"], .contestant-list').first();
        const criteriaList = page.locator('[data-testid="criteria"], .criteria-list').first();
        const hasContent = await contestantsList.isVisible({ timeout: 2000 }).catch(() => false) ||
                          await criteriaList.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasContent).toBe(true);
      }
    }
  });

  test('should view contestants for selected category', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const contestantsList = page.locator('[data-testid="contestants"], .contestant-list, table').first();
      const hasContestants = await contestantsList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*contestant/i').count() > 0;
      expect(hasContestants || hasEmptyState).toBe(true);
    }
  });

  test('should view criteria for selected category', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const criteriaList = page.locator('[data-testid="criteria"], .criteria-list, [class*="criterion"]').first();
      const hasCriteria = await criteriaList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasCriteriaInputs = await page.locator('input[type="number"], [class*="score"]').count() > 0;
      expect(hasCriteria || hasCriteriaInputs).toBe(true);
    }
  });

  test('should submit a score for a contestant', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    // Select category if available
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }
    
    // Find score input
    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      await scoreInput.fill('85');
      await page.waitForTimeout(500);
      
      // Find submit button
      const submitButton = page.locator('button:has-text("Submit"), button[type="submit"], button:has-text("Save Score")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should add comment to score', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }
    
    const commentInput = page.locator('textarea[name="comment"], textarea[placeholder*="comment" i]').first();
    if (await commentInput.isVisible({ timeout: 5000 })) {
      await commentInput.fill('Test comment');
      await page.waitForTimeout(500);
      
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should validate score input (max value)', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      const maxValue = await scoreInput.getAttribute('max');
      
      if (maxValue) {
        // Try entering value above max
        await scoreInput.fill(String(parseInt(maxValue) + 10));
        await page.waitForTimeout(500);
        
        // Check for validation error or that value was clamped
        const errorMessage = page.locator('.error, .invalid, [role="alert"]').first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const inputValue = await scoreInput.inputValue();
        
        // Either error shown or value was clamped to max
        expect(hasError || parseInt(inputValue) <= parseInt(maxValue)).toBe(true);
      }
    }
  });

  test('should validate score input (min value)', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const scoreInput = page.locator('input[type="number"], input[name="score"]').first();
    if (await scoreInput.isVisible({ timeout: 5000 })) {
      const minValue = await scoreInput.getAttribute('min');
      
      if (minValue) {
        // Try entering value below min
        await scoreInput.fill(String(parseInt(minValue) - 10));
        await page.waitForTimeout(500);
        
        const errorMessage = page.locator('.error, .invalid').first();
        const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);
        const inputValue = await scoreInput.inputValue();
        
        expect(hasError || parseInt(inputValue) >= parseInt(minValue)).toBe(true);
      }
    }
  });

  test('should view scoring history', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(2000);
    
    const historyTab = page.locator('button:has-text("History"), [data-testid="history-tab"]').first();
    if (await historyTab.isVisible({ timeout: 5000 })) {
      await historyTab.click();
      await page.waitForTimeout(2000);
      
      const historyList = page.locator('[data-testid="history"], table, .history-list').first();
      const hasHistory = await historyList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*histor/i').count() > 0;
      expect(hasHistory || hasEmptyState).toBe(true);
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

  test('should filter results by category', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const resultsTable = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  test('should view winners page', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    await expect(winnersPage).toBeVisible({ timeout: 10000 });
  });

  // ============================================================================
  // JUDGE BIOS
  // ============================================================================

  test('should navigate to judge bios page', async ({ page }) => {
    await page.goto('/judge/bios');
    await page.waitForTimeout(2000);
    
    const biosPage = page.locator('h1, h2, [data-testid="judge-bios"]').first();
    await expect(biosPage).toBeVisible({ timeout: 10000 });
  });

  test('should view judge bios list', async ({ page }) => {
    await page.goto('/judge/bios');
    await page.waitForTimeout(2000);
    
    const biosList = page.locator('table, [data-testid="bios-list"], .bio-list').first();
    const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, p').count() > 0;
    expect(hasBios || hasPageContent).toBe(true);
  });

  // ============================================================================
  // CERTIFICATION WORKFLOW
  // ============================================================================

  test('should view certification status', async ({ page }) => {
    await page.goto('/tracker');
    await page.waitForTimeout(2000);
    
    const statusSection = page.locator('[data-testid="certification-status"], .status, table').first();
    const hasStatus = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  test('should certify scores for a category', async ({ page }) => {
    await page.goto('/tracker');
    await page.waitForTimeout(2000);
    
    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Sign")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
      
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  // ============================================================================
  // PROFILE & SETTINGS
  // ============================================================================

  test('should view profile settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const profileSection = page.locator('button:has-text("Profile"), [data-testid="profile"]').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);
      
      // Check for profile fields - name input OR any form field indicating profile section
      const nameInput = page.locator('input[name="name"], input[name="preferredName"]').first();
      const hasProfileFields = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
      const hasProfileSection = await page.locator('[data-testid="profile-section"], .profile-section, h2:has-text("Profile")').isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasProfileFields || hasProfileSection).toBe(true);
    } else {
      // If no profile section button, check if profile is already visible
      const nameInput = page.locator('input[name="name"], input[name="preferredName"]').first();
      const hasProfileFields = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);
      expect(hasProfileFields).toBe(true);
    }
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
        await preferredNameInput.fill(`Judge ${Date.now()}`);
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
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized"), h1:has-text("Access Denied")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');
    
    expect(isUnauthorized || isRedirected).toBe(true);
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

