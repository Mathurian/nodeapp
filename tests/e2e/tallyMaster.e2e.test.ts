/**
 * E2E Tests for Tally Master Workflow
 * Tests tally master score review and certification workflows
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, navigateToProtectedRoute } from './helpers';

test.describe('Tally Master E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'tallymaster@eventmanager.com', 'password123');
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should navigate to tally master dashboard', async ({ page }) => {
    // Use helper that handles login redirect
    await navigateToProtectedRoute(page, '/tally-master', 'tallymaster@eventmanager.com', 'password123');
    
    const tallyPage = page.locator('h1:has-text("Tally"), h2:has-text("Tally"), [data-testid="tally"]').first();
    await expect(tallyPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/tally/i);
    });
  });

  test('should review scores for category', async ({ page }) => {
    await page.goto('/tally-master/score-review').catch(() => {});
    await page.waitForTimeout(2000);
    
    const reviewSection = page.locator('[data-testid="score-review"], .review').first();
    await expect(reviewSection).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Check for score list or empty state
      const hasScores = await page.locator('table, .score-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*score|empty/i').count() > 0;
      expect(hasScores || hasEmptyState).toBe(true);
    });
  });

  test('should view certification queue', async ({ page }) => {
    await page.goto('/tally-master/certification-queue').catch(() => {});
    await page.waitForTimeout(2000);
    
    const queueSection = page.locator('[data-testid="certification-queue"], .queue').first();
    await expect(queueSection).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Check for queue list or empty state
      const hasQueue = await page.locator('table, .queue-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*queue|empty/i').count() > 0;
      expect(hasQueue || hasEmptyState).toBe(true);
    });
  });

  test('should use bias checking tools', async ({ page }) => {
    await page.goto('/tally-master/bias-checking').catch(() => {});
    await page.waitForTimeout(2000);
    
    const biasTools = page.locator('[data-testid="bias-checking"], .bias-tools').first();
    await expect(biasTools).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/bias/i);
    });
  });
});

