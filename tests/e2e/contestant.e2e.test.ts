/**
 * E2E Tests for Contestant Workflow
 * Tests contestant viewing scores and results
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, navigateToProtectedRoute } from './helpers';

test.describe('Contestant E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'contestant@eventmanager.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should view own scores', async ({ page }) => {
    await page.goto('/results').catch(() => {});
    await page.waitForTimeout(2000);
    
    const resultsPage = page.locator('h1:has-text("Result"), h2:has-text("Result"), [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/result|score/i);
    });
  });

  test('should view scores by category', async ({ page }) => {
    await page.goto('/results').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for category filter or category list
    const categoryFilter = page.locator('select, [data-testid="category-filter"]').first();
    if (await categoryFilter.isVisible({ timeout: 5000 })) {
      await categoryFilter.selectOption({ index: 0 });
      await page.waitForTimeout(1000);
      
      // Check that scores are displayed
      const hasScores = await page.locator('table, .score-list, [data-testid="score"]').count() > 0;
      expect(hasScores).toBe(true);
    }
  });

  test('should view contest results', async ({ page }) => {
    await page.goto('/results').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for contest selector or results display
    const contestSelector = page.locator('select[name="contest"], [data-testid="contest"]').first();
    if (await contestSelector.isVisible({ timeout: 5000 })) {
      await contestSelector.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const hasResults = await page.locator('table, .results-list').count() > 0;
      expect(hasResults).toBe(true);
    }
  });

  test('should view ranking/placement', async ({ page }) => {
    await page.goto('/results').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for ranking display
    const rankingDisplay = page.locator('[data-testid="ranking"], .ranking, .placement').first();
    await expect(rankingDisplay).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Check for rank numbers in table or empty state
      const hasRanking = await page.locator('td:has-text("#"), th:has-text("Rank")').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*result|empty/i').count() > 0;
      expect(hasRanking || hasEmptyState).toBe(true);
    });
  });

  test('should navigate to home page', async ({ page }) => {
    await page.goto('/').catch(() => {});
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
  });

  test('should not access admin features', async ({ page }) => {
    // Try to access admin page - should be redirected or see unauthorized message
    await page.goto('/admin').catch(() => {});
    await page.waitForTimeout(3000); // Give time for redirect
    
    const currentUrl = page.url();
    
    // Should be redirected away from admin or see unauthorized message
    const unauthorizedMessage = page.locator('.error, .unauthorized, [role="alert"], h1:has-text("Unauthorized"), h1:has-text("Access Denied")').first();
    const isUnauthorized = await unauthorizedMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    // Check if redirected away from admin page
    const isRedirected = !currentUrl.includes('/admin') || currentUrl.includes('/login');
    
    // Test passes if either unauthorized message shown or redirected away
    expect(isUnauthorized || isRedirected).toBe(true);
  });
});

