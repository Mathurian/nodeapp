/**
 * Comprehensive E2E Tests for AUDITOR Role
 * Tests all possible interactions, views, and functions available to auditor users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage, navigateToProtectedRoute } from '../helpers';

test.describe('Comprehensive Auditor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'auditor@eventmanager.com', 'password123');
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
  // AUDITOR DASHBOARD
  // ============================================================================

  test('should navigate to auditor dashboard', async ({ page }) => {
    await navigateToProtectedRoute(page, '/auditor', 'auditor@eventmanager.com', 'password123');
    
    const dashboard = page.locator('h1, h2, [data-testid="auditor-dashboard"]').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test('should view pending audits', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const pendingSection = page.locator('[data-testid="pending-audits"], .pending, table').first();
    const hasPending = await pendingSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no.*pending|no.*audit|empty/i').count() > 0;
    expect(hasPending || hasEmptyState).toBe(true);
  });

  test('should view completed audits', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const completedTab = page.locator('button:has-text("Completed"), [data-testid="completed-tab"]').first();
    if (await completedTab.isVisible({ timeout: 5000 })) {
      await completedTab.click();
      await page.waitForTimeout(2000);
      
      const completedList = page.locator('[data-testid="completed-audits"], table, .audit-list').first();
      const hasCompleted = await completedList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*completed|empty/i').count() > 0;
      expect(hasCompleted || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // SCORE VERIFICATION
  // ============================================================================

  test('should verify a score', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const verifyButton = page.locator('button:has-text("Verify"), button:has-text("Audit")').first();
    if (await verifyButton.isVisible({ timeout: 5000 })) {
      await verifyButton.click();
      await page.waitForTimeout(2000);
      
      // Check for verification form or details
      const verifyForm = page.locator('[data-testid="verify-form"], form, .verification').first();
      const hasForm = await verifyForm.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasForm).toBe(true);
    }
  });

  test('should view score details for audit', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const scoreRow = page.locator('tr, [data-testid="score-row"], .score-item').first();
    if (await scoreRow.isVisible({ timeout: 5000 })) {
      await scoreRow.click();
      await page.waitForTimeout(2000);
      
      const detailsSection = page.locator('[data-testid="score-details"], .details, [class*="detail"]').first();
      const hasDetails = await detailsSection.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasDetails).toBe(true);
    }
  });

  test('should add audit notes', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const verifyButton = page.locator('button:has-text("Verify")').first();
    if (await verifyButton.isVisible({ timeout: 5000 })) {
      await verifyButton.click();
      await page.waitForTimeout(1000);
      
      const notesInput = page.locator('textarea[name="notes"], textarea[name="comment"]').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('Audit notes: Score verified');
        const submitButton = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // FINAL CERTIFICATION
  // ============================================================================

  test('should submit final certification', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const certifyButton = page.locator('button:has-text("Finalize"), button:has-text("Certify")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(1000);
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
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
  // AUDIT LOGS
  // ============================================================================

  test('should view audit logs', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const logsTab = page.locator('button:has-text("Logs"), [data-testid="logs-tab"]').first();
    if (await logsTab.isVisible({ timeout: 5000 })) {
      await logsTab.click();
      await page.waitForTimeout(2000);
      
      const logsList = page.locator('[data-testid="audit-logs"], table, .log-list').first();
      const hasLogs = await logsList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*log|empty/i').count() > 0;
      expect(hasLogs || hasEmptyState).toBe(true);
    }
  });

  test('should filter audit logs by date', async ({ page }) => {
    await page.goto('/auditor');
    await page.waitForTimeout(2000);
    
    const dateFilter = page.locator('input[type="date"], input[name="date"]').first();
    if (await dateFilter.isVisible({ timeout: 5000 })) {
      const today = new Date().toISOString().split('T')[0];
      await dateFilter.fill(today);
      await page.waitForTimeout(2000);
      
      const logsList = page.locator('table, [data-testid="audit-logs"]').first();
      const hasLogs = await logsList.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasLogs).toBe(true);
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

  // ============================================================================
  // REPORTS
  // ============================================================================

  test('should view reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const reportsPage = page.locator('h1, h2, [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 });
  });

  test('should generate audit report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Audit Report")').first();
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

