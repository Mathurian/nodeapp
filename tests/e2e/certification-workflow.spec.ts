/**
 * E2E Tests: Multi-Role Certification Workflow
 * Tests complete certification process from scoring through final board approval
 */

import { test, expect } from '@playwright/test';

test.describe('Multi-Role Certification Workflow', () => {
  test('should complete full certification workflow with all roles', async ({ browser }) => {
    // Create contexts for different roles
    const adminContext = await browser.newContext();
    const judgeContext = await browser.newContext();
    const tallyMasterContext = await browser.newContext();
    const boardContext = await browser.newContext();

    const adminPage = await adminContext.newPage();
    const judgePage = await judgeContext.newPage();
    const tallyMasterPage = await tallyMasterContext.newPage();
    const boardPage = await boardContext.newPage();

    try {
      // 1. Admin creates event and assigns judges
      await adminPage.goto('/login');
      await adminPage.fill('input[name="email"]', 'admin@test.com');
      await adminPage.fill('input[name="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');

      await adminPage.goto('/events/new');
      await adminPage.fill('input[name="name"]', 'Test Certification Event');
      await adminPage.fill('input[name="startDate"]', '2025-12-01');
      await adminPage.fill('input[name="endDate"]', '2025-12-02');
      await adminPage.click('button[type="submit"]');
      await expect(adminPage.locator('[data-testid="success-message"]')).toBeVisible();

      // 2. Judge scores contestants
      await judgePage.goto('/login');
      await judgePage.fill('input[name="email"]', 'judge@test.com');
      await judgePage.fill('input[name="password"]', 'judge123');
      await judgePage.click('button[type="submit"]');

      await judgePage.goto('/judge/scoring');
      await judgePage.selectOption('select[name="category"]', 'category-1');
      await judgePage.fill('input[name="score-contestant-1"]', '85');
      await judgePage.fill('input[name="score-contestant-2"]', '92');
      await judgePage.fill('input[name="score-contestant-3"]', '78');
      await judgePage.click('button:has-text("Submit Scores")');
      await expect(judgePage.locator('[data-testid="success-message"]')).toBeVisible();

      // Judge certifies their scores
      await judgePage.click('button:has-text("Certify My Scores")');
      await expect(judgePage.locator('[data-testid="certification-dialog"]')).toBeVisible();
      await judgePage.click('button:has-text("Sign and Certify")');
      await expect(judgePage.locator('text=Scores certified successfully')).toBeVisible();

      // 3. Tally Master reviews and certifies
      await tallyMasterPage.goto('/login');
      await tallyMasterPage.fill('input[name="email"]', 'tallymaster@test.com');
      await tallyMasterPage.fill('input[name="password"]', 'tally123');
      await tallyMasterPage.click('button[type="submit"]');

      await tallyMasterPage.goto('/tally-master/certification');
      await tallyMasterPage.selectOption('select[name="category"]', 'category-1');

      // Review scores
      await expect(tallyMasterPage.locator('[data-testid="scores-summary"]')).toBeVisible();
      await expect(tallyMasterPage.locator('text=Total Scores: 3')).toBeVisible();

      // Certify category
      await tallyMasterPage.click('button:has-text("Certify Category")');
      await expect(tallyMasterPage.locator('[data-testid="certification-dialog"]')).toBeVisible();
      await tallyMasterPage.fill('textarea[name="notes"]', 'All scores verified and accurate');
      await tallyMasterPage.click('button:has-text("Sign and Certify")');
      await expect(tallyMasterPage.locator('text=Category certified')).toBeVisible();

      // 4. Board approves final results
      await boardPage.goto('/login');
      await boardPage.fill('input[name="email"]', 'board@test.com');
      await boardPage.fill('input[name="password"]', 'board123');
      await boardPage.click('button[type="submit"]');

      await boardPage.goto('/board/final-certification');
      await boardPage.selectOption('select[name="event"]', 'event-1');

      // Review all certifications
      await expect(boardPage.locator('[data-testid="certification-status"]')).toBeVisible();
      await expect(boardPage.locator('text=Judge: Certified')).toBeVisible();
      await expect(boardPage.locator('text=Tally Master: Certified')).toBeVisible();

      // Final board certification
      await boardPage.click('button:has-text("Final Certification")');
      await expect(boardPage.locator('[data-testid="final-certification-dialog"]')).toBeVisible();
      await boardPage.fill('textarea[name="boardNotes"]', 'All results approved by board');
      await boardPage.click('button:has-text("Approve and Finalize")');
      await expect(boardPage.locator('text=Results finalized and locked')).toBeVisible();

      // Verify locked status
      await expect(boardPage.locator('[data-testid="locked-badge"]')).toBeVisible();

    } finally {
      await adminContext.close();
      await judgeContext.close();
      await tallyMasterContext.close();
      await boardContext.close();
    }
  });

  test('should prevent unauthorized access to certification steps', async ({ page }) => {
    // Login as contestant
    await page.goto('/login');
    await page.fill('input[name="email"]', 'contestant@test.com');
    await page.fill('input[name="password"]', 'contestant123');
    await page.click('button[type="submit"]');

    // Try to access judge certification
    await page.goto('/judge/certification');
    await expect(page).toHaveURL(/\/unauthorized/);

    // Try to access tally master certification
    await page.goto('/tally-master/certification');
    await expect(page).toHaveURL(/\/unauthorized/);

    // Try to access board certification
    await page.goto('/board/final-certification');
    await expect(page).toHaveURL(/\/unauthorized/);
  });

  test('should handle certification audit trail', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.goto('/admin/audit-log');

    // Filter by certification events
    await page.selectOption('select[name="eventType"]', 'CERTIFICATION');

    // Verify audit entries
    await expect(page.locator('text=Judge certified scores')).toBeVisible();
    await expect(page.locator('text=Tally Master certified category')).toBeVisible();
    await expect(page.locator('text=Board finalized results')).toBeVisible();

    // Check timestamps and user info
    await expect(page.locator('[data-testid="audit-entry"]')).toHaveCount(3, { timeout: 5000 });
  });

  test('should support bulk certification reset with authorization', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.goto('/admin/bulk-certification-reset');

    // Select event
    await page.selectOption('select[name="event"]', 'event-1');

    // Select categories
    await page.check('input[name="category-1"]');
    await page.check('input[name="category-2"]');

    // Click reset
    await page.click('button:has-text("Reset Certifications")');

    // Confirm with reason
    await expect(page.locator('[data-testid="reset-confirmation"]')).toBeVisible();
    await page.fill('textarea[name="reason"]', 'Scores need to be re-verified');
    await page.click('button:has-text("Confirm Reset")');

    // Verify reset success
    await expect(page.locator('text=Certifications reset successfully')).toBeVisible();
  });
});
