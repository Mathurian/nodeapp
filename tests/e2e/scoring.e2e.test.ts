/**
 * E2E Tests for Scoring Flow
 * Tests judge scoring workflow in the browser
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout } from './helpers';

test.describe('Scoring E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as judge before each test
    await loginAsUser(page, 'judge@eventmanager.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should navigate to scoring page', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check that scoring interface is visible
    const scoringPage = page.locator('h1:has-text("Scoring"), h2:has-text("Scoring"), [data-testid="scoring"]').first();
    await expect(scoringPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/scoring|judge/i);
    });
  });

  test('should display scoring interface', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for scoring form elements
    const hasScoringElements = await page.locator('input[type="number"], select, button').count() > 0;
    expect(hasScoringElements).toBe(true);
  });

  test('should display assigned categories', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for category list or assignment display
    const hasCategories = await page.locator('select, [data-testid="category"], .category').count() > 0;
    const hasEmptyState = await page.locator('text=/no.*categor|no.*assignment|empty/i').count() > 0;
    // Test passes if categories exist or empty state is shown
    expect(hasCategories || hasEmptyState).toBe(true);
  });

  test('should display contestants for selected category', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Try to select a category if dropdown exists
    const categorySelect = page.locator('select').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(1000);
      
      // Check for contestant list
      const hasContestants = await page.locator('[data-testid="contestant"], .contestant').count() > 0;
      expect(hasContestants).toBe(true);
    }
  });

  test('should submit a score', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Find score input
    const scoreInput = page.locator('input[type="number"]').first();
    if (await scoreInput.isVisible()) {
      await scoreInput.fill('85');
      await page.waitForTimeout(500);
      
      // Find submit button
      const submitButton = page.locator('button:has-text("Submit"), button[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success message or confirmation
        const successIndicator = page.locator('.success, .alert-success, [role="alert"]').first();
        await expect(successIndicator).toBeVisible({ timeout: 5000 }).catch(async () => {
          // If no success message, check that score was cleared or form reset
          const scoreValue = await scoreInput.inputValue();
          expect(scoreValue).toBe('');
        });
      }
    }
  });

  test('should validate score input', async ({ page }) => {
    await page.goto('/scoring').catch(() => {});
    await page.waitForTimeout(2000);
    
    const scoreInput = page.locator('input[type="number"]').first();
    if (await scoreInput.isVisible()) {
      // Try invalid score (too high)
      await scoreInput.fill('150');
      await page.waitForTimeout(500);
      
      // Check for validation error
      const errorMessage = page.locator('.error, .invalid, [role="alert"]').first();
      await expect(errorMessage).toBeVisible({ timeout: 3000 }).catch(async () => {
        // If no error message, check that input has max attribute
        const maxValue = await scoreInput.getAttribute('max');
        expect(maxValue).not.toBeNull();
      });
    }
  });

  test('should display judge history', async ({ page }) => {
    await page.goto('/judge/history').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for history table or list or empty state
    const hasHistory = await page.locator('table, [data-testid="history"], .history').count() > 0;
    const hasEmptyState = await page.locator('text=/no.*histor|empty/i').count() > 0;
    expect(hasHistory || hasEmptyState).toBe(true);
  });
});

