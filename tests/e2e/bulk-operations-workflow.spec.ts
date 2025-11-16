/**
 * E2E Tests: Bulk Operations Complete Workflow
 * Tests end-to-end bulk operations including import, validation, execution, and rollback
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Bulk Operations Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should perform complete bulk user import workflow', async ({ page }) => {
    // Navigate to bulk operations
    await page.goto('/admin/bulk-operations/users');

    // Create CSV file
    const csvContent = `name,email,role
Test User 1,testuser1@test.com,JUDGE
Test User 2,testuser2@test.com,CONTESTANT
Test User 3,testuser3@test.com,ORGANIZER`;

    const csvPath = path.join(__dirname, '../fixtures/bulk-users.csv');
    fs.writeFileSync(csvPath, csvContent);

    // Upload CSV file
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for validation
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="valid-rows"]')).toContainText('3');

    // Review and confirm
    await page.click('button:has-text("Review Import")');
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();

    // Execute import
    await page.click('button:has-text("Confirm Import")');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 10000 });

    // Verify users were created
    await page.goto('/admin/users');
    await expect(page.locator('text=Test User 1')).toBeVisible();
    await expect(page.locator('text=Test User 2')).toBeVisible();
    await expect(page.locator('text=Test User 3')).toBeVisible();

    // Cleanup
    fs.unlinkSync(csvPath);
  });

  test('should handle bulk import validation errors', async ({ page }) => {
    await page.goto('/admin/bulk-operations/users');

    // Create CSV with invalid data
    const csvContent = `name,email,role
,invalidemail,INVALID_ROLE
Test User,duplicate@test.com,JUDGE
Test User,duplicate@test.com,JUDGE`;

    const csvPath = path.join(__dirname, '../fixtures/bulk-users-invalid.csv');
    fs.writeFileSync(csvPath, csvContent);

    // Upload CSV file
    await page.setInputFiles('input[type="file"]', csvPath);

    // Wait for validation
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="invalid-rows"]')).toContainText('3');

    // Verify error messages are shown
    await expect(page.locator('text=Invalid email')).toBeVisible();
    await expect(page.locator('text=Invalid role')).toBeVisible();
    await expect(page.locator('text=Duplicate')).toBeVisible();

    // Cleanup
    fs.unlinkSync(csvPath);
  });

  test('should perform bulk event creation', async ({ page }) => {
    await page.goto('/admin/bulk-operations/events');

    const csvContent = `name,startDate,endDate,location
Event 1,2025-12-01,2025-12-02,Location 1
Event 2,2025-12-15,2025-12-16,Location 2`;

    const csvPath = path.join(__dirname, '../fixtures/bulk-events.csv');
    fs.writeFileSync(csvPath, csvContent);

    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await page.click('button:has-text("Confirm Import")');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 10000 });

    // Verify events
    await page.goto('/events');
    await expect(page.locator('text=Event 1')).toBeVisible();
    await expect(page.locator('text=Event 2')).toBeVisible();

    fs.unlinkSync(csvPath);
  });

  test('should perform bulk assignment operations', async ({ page }) => {
    // First create necessary data
    await page.goto('/admin/bulk-operations/assignments');

    // TODO: Create test data setup
    const csvContent = `judgeId,categoryId,priority
judge-1,category-1,5
judge-1,category-2,4
judge-2,category-1,3`;

    const csvPath = path.join(__dirname, '../fixtures/bulk-assignments.csv');
    fs.writeFileSync(csvPath, csvContent);

    await page.setInputFiles('input[type="file"]', csvPath);
    await expect(page.locator('[data-testid="validation-results"]')).toBeVisible();
    await page.click('button:has-text("Confirm Import")');
    await expect(page.locator('[data-testid="import-success"]')).toBeVisible({ timeout: 10000 });

    // Verify assignments
    await page.goto('/admin/assignments');
    await expect(page.locator('[data-testid="assignment-list"]')).toContainText('judge-1');

    fs.unlinkSync(csvPath);
  });

  test('should support bulk update operations', async ({ page }) => {
    await page.goto('/admin/users');

    // Select multiple users
    await page.click('[data-testid="select-all-checkbox"]');
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('selected');

    // Open bulk update dialog
    await page.click('button:has-text("Bulk Update")');
    await expect(page.locator('[data-testid="bulk-update-dialog"]')).toBeVisible();

    // Update role
    await page.selectOption('select[name="role"]', 'ORGANIZER');
    await page.click('button:has-text("Apply Changes")');

    // Verify update success
    await expect(page.locator('[data-testid="update-success"]')).toBeVisible();
  });

  test('should support bulk delete operations with confirmation', async ({ page }) => {
    await page.goto('/admin/users');

    // Select users to delete
    await page.click('input[type="checkbox"][data-user-id="user-1"]');
    await page.click('input[type="checkbox"][data-user-id="user-2"]');

    // Click bulk delete
    await page.click('button:has-text("Bulk Delete")');

    // Confirm deletion
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await expect(page.locator('text=Are you sure you want to delete 2 users?')).toBeVisible();
    await page.click('button:has-text("Confirm Delete")');

    // Verify deletion success
    await expect(page.locator('[data-testid="delete-success"]')).toBeVisible();
  });

  test('should handle bulk operation rollback', async ({ page }) => {
    await page.goto('/admin/bulk-operations/history');

    // Find recent operation
    const operation = page.locator('[data-testid="operation-item"]').first();
    await expect(operation).toBeVisible();

    // Click rollback
    await operation.locator('button:has-text("Rollback")').click();

    // Confirm rollback
    await expect(page.locator('[data-testid="rollback-confirmation"]')).toBeVisible();
    await page.click('button:has-text("Confirm Rollback")');

    // Verify rollback success
    await expect(page.locator('[data-testid="rollback-success"]')).toBeVisible();
  });
});
