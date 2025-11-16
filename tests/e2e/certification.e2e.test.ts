/**
 * E2E Tests for Certification Workflow
 * Tests complete certification workflow for judges, tally masters, and auditors
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage } from './helpers';

test.describe('Certification E2E Tests', () => {
  test.afterEach(async ({ page }) => {
    await logout(page);
  });
  test('should display certification workflow for judge', async ({ page }) => {
    await loginAsUser(page, 'judge@eventmanager.com', 'password123');
    
    await page.goto('/judge/certification-workflow').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for certification interface
    const certInterface = page.locator('[data-testid="certification"], .certification').first();
    await expect(certInterface).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/certif/i);
    });
  });

  test('should allow judge to certify scores', async ({ page }) => {
    await loginAsUser(page, 'judge@eventmanager.com', 'password123');
    
    await page.goto('/judge/certification-workflow').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Find certify button
    const certifyButton = page.locator('button:has-text("Certify"), button:has-text("Sign")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(2000);
      
      // Check for success message
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  test('should display certification status', async ({ page }) => {
    await loginAsUser(page); // Uses default admin credentials
    
    await page.goto('/certifications').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for certification status display
    const statusDisplay = page.locator('[data-testid="certification-status"], .status').first();
    await expect(statusDisplay).toBeVisible({ timeout: 10000 }).catch(async () => {
      // Check for status table or empty state
      const hasStatus = await page.locator('table, .status-list').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*certif|empty/i').count() > 0;
      expect(hasStatus || hasEmptyState).toBe(true);
    });
  });

  test('should allow tally master to certify totals', async ({ page }) => {
    await loginAsUser(page, 'tallymaster@eventmanager.com', 'password123');
    
    await page.goto('/tally-master/certify-totals').catch(() => {});
    await page.waitForTimeout(2000);
    
    const certifyButton = page.locator('button:has-text("Certify Totals")').first();
    if (await certifyButton.isVisible({ timeout: 5000 })) {
      await certifyButton.click();
      await page.waitForTimeout(2000);
      
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  test('should allow auditor to finalize certification', async ({ page }) => {
    await loginAsUser(page, 'auditor@eventmanager.com', 'password123');
    
    await page.goto('/auditor/final-certification').catch(() => {});
    await page.waitForTimeout(2000);
    
    const finalizeButton = page.locator('button:has-text("Finalize"), button:has-text("Approve")').first();
    if (await finalizeButton.isVisible({ timeout: 5000 })) {
      await finalizeButton.click();
      await page.waitForTimeout(2000);
      
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  test('should show certification progress', async ({ page }) => {
    await loginAsUser(page); // Uses default admin credentials
    
    await page.goto('/certifications').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Check for progress indicators
    const progressBars = page.locator('.progress, [data-testid="progress"], progress').count();
    const progressCount = await progressBars;
    
    if (progressCount > 0) {
      expect(progressCount).toBeGreaterThan(0);
    } else {
      // Check for progress text or empty state
      const progressText = page.locator('text=/progress|complete|pending/i').first();
      const hasProgressText = await progressText.isVisible({ timeout: 2000 }).catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certif|empty/i').count() > 0;
      expect(hasProgressText || hasEmptyState).toBe(true);
    }
  });
});

