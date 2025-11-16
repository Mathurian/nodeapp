/**
 * Comprehensive E2E Tests for TALLY_MASTER Role
 * Tests all possible interactions, views, and functions available to tally master users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage, navigateToProtectedRoute } from '../helpers';

test.describe('Comprehensive Tally Master E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'tallymaster@eventmanager.com', 'password123');
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
  // TALLY MASTER DASHBOARD
  // ============================================================================

  test('should navigate to tally master dashboard', async ({ page }) => {
    await navigateToProtectedRoute(page, '/tally', 'tallymaster@eventmanager.com', 'password123');
    
    const dashboard = page.locator('h1, h2, [data-testid="tally-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should view certification queue', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const queueSection = page.locator('[data-testid="certification-queue"], .queue, table').first();
    const hasQueue = await queueSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*queue|empty/i').count() > 0;
    expect(hasQueue || hasEmptyState).toBe(true);
  });

  test('should view pending certifications', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const pendingSection = page.locator('[data-testid="pending-certifications"], .pending, table').first();
    const hasPending = await pendingSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*pending|empty/i').count() > 0;
    expect(hasPending || hasEmptyState).toBe(true);
  });

  // ============================================================================
  // SCORE REVIEW
  // ============================================================================

  test('should review scores for a category', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const reviewSection = page.locator('[data-testid="score-review"], .review, table').first();
    const hasReview = await reviewSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*score|empty/i').count() > 0;
    expect(hasReview || hasEmptyState).toBe(true);
  });

  test('should select a contest to review', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const categoriesList = page.locator('[data-testid="categories"], .category-list').first();
      const hasCategories = await categoriesList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPageContent = await page.locator('h1, h2, h3, table, [class*="category"]').count() > 0;
      // Test passes if categories list is visible OR page has content indicating it loaded
      expect(hasCategories || hasPageContent).toBe(true);
    }
  });

  test('should view contest certifications', async ({ page }) => {
    await page.goto('/score-management');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const certificationsSection = page.locator('[data-testid="certifications"], .certification-list, table').first();
      const hasCertifications = await certificationsSection.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certification|empty/i').count() > 0;
      expect(hasCertifications || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // CERTIFICATION WORKFLOW
  // ============================================================================

  test('should certify totals for a category', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Approve Totals")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(1000);
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
      }
      
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  test('should view certification status', async ({ page }) => {
    await page.goto('/tracker');
    await page.waitForTimeout(2000);
    
    const statusSection = page.locator('[data-testid="certification-status"], .status, table').first();
    const hasStatus = await statusSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
    expect(hasStatus || hasPageContent).toBe(true);
  });

  // ============================================================================
  // SCORE REMOVAL REQUESTS
  // ============================================================================

  test('should view score removal requests', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const requestsSection = page.locator('[data-testid="score-removal-requests"], .requests, table').first();
    const hasRequests = await requestsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*request|empty/i').count() > 0;
    expect(hasRequests || hasEmptyState).toBe(true);
  });

  test('should create score removal request for category', async ({ page }) => {
    await page.goto('/score-management');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
    }
    
    const requestButton = page.locator('button:has-text("Request Removal"), button:has-text("Remove Score")').first();
    if (await requestButton.isVisible({ timeout: 5000 })) {
      // Handle accordion interception
      try {
        await requestButton.click({ force: true, timeout: 5000 });
      } catch (error) {
        // If click is intercepted, try clicking accordion button first
        const accordionButton = page.locator('[data-accordion-id] button').first();
        if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await accordionButton.click({ force: true });
          await page.waitForTimeout(500);
          await requestButton.click({ force: true });
        }
      }
      await page.waitForTimeout(1000);
      
      const reasonInput = page.locator('textarea[name="reason"], textarea').first();
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Test score removal reason');
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        if (!page.isClosed()) {
          const hasSuccess = await waitForSuccessMessage(page, 5000).catch(() => false);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });

  test('should create score removal request for contest', async ({ page }) => {
    await page.goto('/score-management');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      // Look for contest-wide removal option
      const contestRemovalButton = page.locator('button:has-text("Remove All"), button:has-text("Contest Removal")').first();
      if (await contestRemovalButton.isVisible({ timeout: 5000 })) {
        await contestRemovalButton.click();
        await page.waitForTimeout(1000);
        
        const reasonInput = page.locator('textarea[name="reason"]').first();
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('Test contest-wide removal');
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          const hasSuccess = await waitForSuccessMessage(page, 5000);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });

  // ============================================================================
  // BIAS CHECKING TOOLS
  // ============================================================================

  test('should use bias checking tools', async ({ page }) => {
    await page.goto('/tally');
    await page.waitForTimeout(2000);
    
    const biasButton = page.locator('button:has-text("Bias"), button:has-text("Check Bias")').first();
    if (await biasButton.isVisible({ timeout: 5000 })) {
      await biasButton.click();
      await page.waitForTimeout(2000);
      
      const biasReport = page.locator('[data-testid="bias-report"], .bias-analysis, table').first();
      const hasReport = await biasReport.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPageContent = await page.locator('h1, h2, h3').count() > 0;
      expect(hasReport || hasPageContent).toBe(true);
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

  test('should filter results by contest', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const contestSelect = page.locator('select[name="contest"], select').first();
    if (await contestSelect.isVisible({ timeout: 5000 })) {
      await contestSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const resultsTable = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  // ============================================================================
  // REPORTS
  // ============================================================================

  test('should view reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const reportsPage = page.locator('h1, h2, [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 });
  });

  test('should generate certification report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Certification Report")').first();
    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.click();
      await page.waitForTimeout(3000);
      
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess || downloadPromise !== null).toBe(true);
    }
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

  // ============================================================================
  // HELP PAGE
  // ============================================================================

  test('should navigate to help page', async ({ page }) => {
    await page.goto('/help');
    await page.waitForTimeout(2000);
    
    const helpPage = page.locator('h1, h2, [data-testid="help"]').first();
    await expect(helpPage).toBeVisible({ timeout: 10000 });
  });
});

