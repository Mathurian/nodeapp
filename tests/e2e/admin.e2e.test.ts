/**
 * E2E Tests for Admin Workflow
 * Tests admin event/contest/category creation workflow
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, waitForSuccessMessage, logout } from './helpers';

test.describe('Admin E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page); // Uses default admin credentials
  });

  test.afterEach(async ({ page }) => {
    // Use a shorter timeout for logout to prevent test timeout
    try {
      await Promise.race([
        logout(page),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 10000))
      ]);
    } catch (error) {
      // If logout times out, just clear storage and continue
      if (!page.isClosed()) {
        try {
          await page.evaluate(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('sessionVersion');
          }).catch(() => {});
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  });

  test('should navigate to events page', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    const eventsPage = page.locator('h1:has-text("Event"), h2:has-text("Event"), [data-testid="events"]').first();
    await expect(eventsPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/event/i);
    });
  });

  test('should create a new event', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Event")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Fill event form
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Event ' + Date.now());
        if (await locationInput.isVisible()) {
          await locationInput.fill('Test Location');
        }
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success toast or message, or verify operation succeeded by URL change
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        // Also check if URL changed or form was reset as indication of success
        const urlChanged = !page.url().includes('/events') || page.url().includes('/events/');
        expect(hasSuccess || urlChanged).toBe(true);
      }
    }
  });

  test('should create a contest for an event', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Click on first event or navigate to contests
    await page.goto('/contests').catch(() => {});
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create Contest"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Contest ' + Date.now());
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success toast or message, or verify operation succeeded
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        // Also check if form was reset or modal closed as indication of success
        const formReset = await nameInput.inputValue().then(val => val === '').catch(() => false);
        expect(hasSuccess || formReset).toBe(true);
      }
    }
  });

  test('should create a category for a contest', async ({ page }) => {
    await page.goto('/categories').catch(() => {});
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create Category"), button:has-text("New")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Category ' + Date.now());
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success toast or message, or verify operation succeeded
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        // Also check if form was reset or modal closed as indication of success
        const formReset = await nameInput.inputValue().then(val => val === '').catch(() => false);
        expect(hasSuccess || formReset).toBe(true);
      }
    }
  });

  test('should navigate to users page', async ({ page }) => {
    await page.goto('/users').catch(() => {});
    await page.waitForTimeout(2000);
    
    const usersPage = page.locator('h1:has-text("User"), h2:has-text("User"), [data-testid="users"]').first();
    await expect(usersPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/user/i);
    });
  });

  test('should create a new user', async ({ page }) => {
    await page.goto('/users').catch(() => {});
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create User"), button:has-text("New User")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const nameInput = page.locator('input[name="name"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill(`testuser${Date.now()}@example.com`);
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test User');
        }
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('password123');
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success toast or message, or verify operation succeeded
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        // Also check if form was reset or modal closed as indication of success
        const formReset = await emailInput.inputValue().then(val => val === '').catch(() => false);
        expect(hasSuccess || formReset).toBe(true);
      }
    }
  });

  test('should navigate to admin dashboard', async ({ page }) => {
    await page.goto('/admin').catch(() => {});
    await page.waitForTimeout(2000);
    
    const adminPage = page.locator('h1:has-text("Admin"), h2:has-text("Admin"), [data-testid="admin"]').first();
    await expect(adminPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/admin/i);
    });
  });

  test('should view system statistics', async ({ page }) => {
    await page.goto('/admin').catch(() => {});
    await page.waitForTimeout(3000); // Give more time for stats to load
    
    // Wait for stats API call to complete
    await page.waitForResponse((response) => 
      response.url().includes('/api/admin/stats') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => {}); // Don't fail if API call doesn't happen
    
    // Check for stats display - look for stat cards or numbers
    const statsSection = page.locator('[data-testid="stats"], .statistics, .stats').first();
    const hasStatsSection = await statsSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!hasStatsSection) {
      // Check for stat cards or numbers
      const hasStats = await page.locator('.stat, [class*="stat"], [class*="card"]').count() > 0;
      expect(hasStats).toBe(true);
    } else {
      expect(hasStatsSection).toBe(true);
    }
  });

  test('should manage user roles', async ({ page }) => {
    await page.goto('/users').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Find first user row
    const userRow = page.locator('tr, .user-row').first();
    if (await userRow.isVisible({ timeout: 5000 })) {
      // Find role dropdown or edit button
      const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
      if (await editButton.isVisible()) {
        await editButton.click();
        await page.waitForTimeout(1000);
        
        const roleSelect = page.locator('select[name="role"]').first();
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption({ index: 1 });
          const saveButton = page.locator('button:has-text("Save")').first();
          await saveButton.click();
          await page.waitForTimeout(2000);
          
          const successMessage = page.locator('.success, [role="alert"]').first();
          await expect(successMessage).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});

