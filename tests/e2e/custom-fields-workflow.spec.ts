/**
 * E2E Tests: Custom Fields Complete Workflow
 * Tests custom field creation, assignment, data entry, and reporting
 */

import { test, expect } from '@playwright/test';

test.describe('Custom Fields Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should create custom field with all field types', async ({ page }) => {
    await page.goto('/admin/custom-fields');

    // Create text field
    await page.click('button:has-text("Add Custom Field")');
    await page.fill('input[name="fieldName"]', 'Contestant Bio');
    await page.fill('textarea[name="description"]', 'Brief biography of contestant');
    await page.selectOption('select[name="fieldType"]', 'TEXT');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.check('input[name="required"]');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Contestant Bio')).toBeVisible();

    // Create number field
    await page.click('button:has-text("Add Custom Field")');
    await page.fill('input[name="fieldName"]', 'Age');
    await page.selectOption('select[name="fieldType"]', 'NUMBER');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.fill('input[name="min"]', '5');
    await page.fill('input[name="max"]', '100');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Age')).toBeVisible();

    // Create select field
    await page.click('button:has-text("Add Custom Field")');
    await page.fill('input[name="fieldName"]', 'Skill Level');
    await page.selectOption('select[name="fieldType"]', 'SELECT');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.fill('textarea[name="options"]', 'Beginner\nIntermediate\nAdvanced\nProfessional');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Skill Level')).toBeVisible();

    // Create date field
    await page.click('button:has-text("Add Custom Field")');
    await page.fill('input[name="fieldName"]', 'Registration Date');
    await page.selectOption('select[name="fieldType"]', 'DATE');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Registration Date')).toBeVisible();

    // Create boolean field
    await page.click('button:has-text("Add Custom Field")');
    await page.fill('input[name="fieldName"]', 'First Time Competitor');
    await page.selectOption('select[name="fieldType"]', 'BOOLEAN');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=First Time Competitor')).toBeVisible();
  });

  test('should use custom fields in contestant form', async ({ page }) => {
    // Assume custom fields are already created
    await page.goto('/admin/contestants/new');

    // Fill standard fields
    await page.fill('input[name="name"]', 'Test Contestant');
    await page.fill('input[name="email"]', 'contestant@test.com');
    await page.fill('input[name="contestantNumber"]', '123');

    // Fill custom fields
    await page.fill('textarea[name="customField_bio"]', 'This is a test biography');
    await page.fill('input[name="customField_age"]', '25');
    await page.selectOption('select[name="customField_skillLevel"]', 'Intermediate');
    await page.fill('input[name="customField_registrationDate"]', '2025-11-01');
    await page.check('input[name="customField_firstTimeCompetitor"]');

    // Submit form
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });

  test('should validate custom field constraints', async ({ page }) => {
    await page.goto('/admin/contestants/new');

    // Fill standard fields
    await page.fill('input[name="name"]', 'Test Contestant 2');
    await page.fill('input[name="email"]', 'contestant2@test.com');

    // Try to submit without required custom field
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Bio is required')).toBeVisible();

    // Fill with invalid number (out of range)
    await page.fill('textarea[name="customField_bio"]', 'Bio text');
    await page.fill('input[name="customField_age"]', '150');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Age must be between 5 and 100')).toBeVisible();
  });

  test('should edit custom fields', async ({ page }) => {
    await page.goto('/admin/custom-fields');

    // Find and edit a field
    const field = page.locator('[data-testid="custom-field-item"]').first();
    await field.locator('button:has-text("Edit")').click();

    // Update field properties
    await page.fill('input[name="fieldName"]', 'Updated Field Name');
    await page.fill('textarea[name="description"]', 'Updated description');
    await page.click('button[type="submit"]');

    // Verify update
    await expect(page.locator('text=Updated Field Name')).toBeVisible();
  });

  test('should delete custom field with confirmation', async ({ page }) => {
    await page.goto('/admin/custom-fields');

    const field = page.locator('[data-testid="custom-field-item"]').last();
    await field.locator('button:has-text("Delete")').click();

    // Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await expect(page.locator('text=This will delete all data for this field')).toBeVisible();
    await page.click('button:has-text("Confirm Delete")');

    await expect(page.locator('[data-testid="delete-success"]')).toBeVisible();
  });

  test('should filter and search custom fields', async ({ page }) => {
    await page.goto('/admin/custom-fields');

    // Filter by entity type
    await page.selectOption('select[name="entityTypeFilter"]', 'CONTESTANT');
    await expect(page.locator('[data-testid="custom-field-item"]')).toHaveCount(5); // Assuming 5 contestant fields

    // Filter by field type
    await page.selectOption('select[name="fieldTypeFilter"]', 'TEXT');
    await expect(page.locator('[data-testid="custom-field-item"]')).toHaveCount(1);

    // Search by name
    await page.fill('input[name="search"]', 'Age');
    await expect(page.locator('text=Age')).toBeVisible();
  });

  test('should export custom field data', async ({ page }) => {
    await page.goto('/admin/reports');

    // Generate custom fields report
    await page.click('button:has-text("Custom Fields Report")');
    await page.selectOption('select[name="entityType"]', 'CONTESTANT');
    await page.click('button:has-text("Generate Report")');

    // Wait for report
    await expect(page.locator('[data-testid="report-ready"]')).toBeVisible({ timeout: 10000 });

    // Download report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download CSV")')
    ]);

    expect(download.suggestedFilename()).toContain('custom-fields');
  });

  test('should bulk import custom field data', async ({ page }) => {
    await page.goto('/admin/bulk-operations/custom-fields');

    // Upload CSV with custom field data
    const csvContent = `contestantId,bio,age,skillLevel
contestant-1,Bio 1,25,Intermediate
contestant-2,Bio 2,30,Advanced`;

    const fs = require('fs');
    const path = require('path');
    const csvPath = path.join(__dirname, '../fixtures/custom-fields.csv');
    fs.writeFileSync(csvPath, csvContent);

    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await page.click('button:has-text("Confirm Import")');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible();

    fs.unlinkSync(csvPath);
  });

  test('should display custom fields in contestant view', async ({ page }) => {
    await page.goto('/admin/contestants');

    // Click on a contestant
    await page.locator('[data-testid="contestant-row"]').first().click();

    // Verify custom fields are displayed
    await expect(page.locator('[data-testid="custom-field-bio"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-field-age"]')).toBeVisible();
    await expect(page.locator('[data-testid="custom-field-skillLevel"]')).toBeVisible();
  });
});
