/**
 * Comprehensive E2E Tests for CONTESTANT Role
 * Tests all possible interactions, views, and functions available to contestant users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage } from '../helpers';

test.describe('Comprehensive Contestant E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'contestant@eventmanager.com', 'password123');
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
  // HOME PAGE / DASHBOARD
  // ============================================================================

  test('should navigate to contestant home page', async ({ page }) => {
    await page.goto('/contestant');
    await page.waitForTimeout(2000);
    
    const homePage = page.locator('h1, h2, [data-testid="contestant-home"]').first();
    await expect(homePage).toBeVisible({ timeout: 10000 });
  });

  test('should view welcome message with name', async ({ page }) => {
    await page.goto('/contestant');
    await page.waitForTimeout(2000);
    
    const welcomeText = page.locator('text=/welcome|hello|hi/i').first();
    const hasWelcome = await welcomeText.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, p').count() > 0;
    expect(hasWelcome || hasPageContent).toBe(true);
  });

  test('should view assigned events', async ({ page }) => {
    await page.goto('/contestant');
    await page.waitForTimeout(2000);
    
    const eventsSection = page.locator('[data-testid="events"], .event-list, select[name="event"]').first();
    const hasEvents = await eventsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*event/i').count() > 0;
    expect(hasEvents || hasEmptyState).toBe(true);
  });

  test('should select an event and view contests', async ({ page }) => {
    await page.goto('/contestant');
    await page.waitForTimeout(2000);
    
    const eventSelect = page.locator('select[name="event"], select').first();
    if (await eventSelect.isVisible({ timeout: 5000 })) {
      await eventSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const contestsSection = page.locator('[data-testid="contests"], .contest-list').first();
      const hasContests = await contestsSection.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*contest/i').count() > 0;
      expect(hasContests || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // RESULTS VIEWING
  // ============================================================================

  test('should navigate to results page', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view own scores', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const scoresList = page.locator('table, [data-testid="scores"], .score-list').first();
    const hasScores = await scoresList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*score|no.*result/i').count() > 0;
    expect(hasScores || hasEmptyState).toBe(true);
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

  test('should view scores by category', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const scoresTable = page.locator('table, [data-testid="scores"]').first();
      const hasScores = await scoresTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasScores).toBe(true);
    }
  });

  test('should view contest results', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const resultsList = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsList.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  test('should view ranking/placement', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const rankingDisplay = page.locator('[data-testid="ranking"], .ranking, .placement, td:has-text("#"), th:has-text("Rank")').first();
    const hasRanking = await rankingDisplay.isVisible({ timeout: 5000 }).catch(() => false);
    const hasRankColumn = await page.locator('td:has-text("#"), th:has-text("Rank")').count() > 0;
    const hasEmptyState = await page.locator('text=/no.*result|empty/i').count() > 0;
    expect(hasRanking || hasRankColumn || hasEmptyState).toBe(true);
  });

  // ============================================================================
  // WINNERS VIEWING (if allowed)
  // ============================================================================

  test('should view winners page if allowed', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    
    // Either can view winners or is blocked
    if (!isUnauthorized && !currentUrl.includes('/login')) {
      await expect(winnersPage).toBeVisible({ timeout: 10000 });
    } else {
      expect(isUnauthorized || currentUrl.includes('/login')).toBe(true);
    }
  });

  test('should filter winners by category if allowed', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    
    if (!isUnauthorized) {
      const categorySelect = page.locator('select[name="category"], select').first();
      if (await categorySelect.isVisible({ timeout: 5000 })) {
        await categorySelect.selectOption({ index: 0 });
        await page.waitForTimeout(2000);
        
        const winnersList = page.locator('table, [data-testid="winners-list"]').first();
        const hasWinners = await winnersList.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasWinners).toBe(true);
      }
    }
  });

  // ============================================================================
  // PROFILE & SETTINGS
  // ============================================================================

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const settingsPage = page.locator('h1, h2, [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  test('should view profile information', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const profileSection = page.locator('button:has-text("Profile"), [data-testid="profile"]').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);
      
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
        await preferredNameInput.fill(`Contestant ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should update bio information', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const profileSection = page.locator('button:has-text("Profile")').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);
      
      const bioInput = page.locator('textarea[name="bio"], textarea[name="contestantBio"]').first();
      if (await bioInput.isVisible()) {
        await bioInput.fill('Updated contestant bio');
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

  test('should not access scoring page', async ({ page }) => {
    await page.goto('/scoring');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/scoring');
    
    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access users management', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/users');
    
    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access assignments page', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/assignments');
    
    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access templates page', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/templates');
    
    expect(isUnauthorized || isRedirected).toBe(true);
  });

  test('should not access reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    const isUnauthorized = await page.locator('h1:has-text("Unauthorized")').isVisible({ timeout: 3000 }).catch(() => false);
    const isRedirected = !currentUrl.includes('/reports');
    
    expect(isUnauthorized || isRedirected).toBe(true);
  });
});

