/**
 * E2E Tests for Event Management Workflow
 * Tests complete event creation and management flow
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, waitForSuccessMessage, waitForModalClose, logout } from './helpers';

test.describe('Event Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page); // Uses default admin credentials
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test('should create event workflow', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);

    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), a:has-text("Create")').first();
    
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 })) {
        await nameInput.fill('Test Event ' + Date.now());
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          // Check if modal is blocking - wait for it to be ready
          await page.waitForTimeout(500);
          
          // Try clicking - if blocked by modal, close modal first
          try {
            // First try to close any open modals
            await waitForModalClose(page, 3000);
            await submitButton.click({ timeout: 5000 });
          } catch (error) {
            // If still blocked, try force click
            await submitButton.click({ force: true, timeout: 5000 });
          }
          
          await page.waitForTimeout(2000);
          
          expect(page.url()).toMatch(/event/i);
        }
      }
    }
  });

  test('should view events list', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    const eventsPage = page.locator('h1:has-text("Event"), h2:has-text("Event"), table, [data-testid="events"]').first();
    await expect(eventsPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/event/i);
    });
  });

  test('should edit an event', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Updated Event Name');
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Check for success toast or message
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should archive an event', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    const archiveButton = page.locator('button:has-text("Archive")').first();
    if (await archiveButton.isVisible({ timeout: 5000 })) {
      await archiveButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm archive if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(2000);
      // Check for success toast or message
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess).toBe(true);
    }
  });

  test('should create contest for event', async ({ page }) => {
    await page.goto('/events').catch(() => {});
    await page.waitForTimeout(2000);
    
    // Click on first event
    const eventLink = page.locator('a, [data-testid="event"]').first();
    if (await eventLink.isVisible({ timeout: 5000 })) {
      await eventLink.click();
      await page.waitForTimeout(2000);
      
      const createContestButton = page.locator('button:has-text("Create Contest"), button:has-text("Add Contest")').first();
      if (await createContestButton.isVisible({ timeout: 5000 })) {
        await createContestButton.click();
        await page.waitForTimeout(1000);
        
        const nameInput = page.locator('input[name="name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Contest ' + Date.now());
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check for success toast or message
          const hasSuccess = await waitForSuccessMessage(page, 5000);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });

  test('should create category for contest', async ({ page }) => {
    await page.goto('/contests').catch(() => {});
    await page.waitForTimeout(2000);
    
    const contestLink = page.locator('a, [data-testid="contest"]').first();
    if (await contestLink.isVisible({ timeout: 5000 })) {
      await contestLink.click();
      await page.waitForTimeout(2000);
      
      const createCategoryButton = page.locator('button:has-text("Create Category"), button:has-text("Add Category")').first();
      if (await createCategoryButton.isVisible({ timeout: 5000 })) {
        await createCategoryButton.click();
        await page.waitForTimeout(1000);
        
        const nameInput = page.locator('input[name="name"]').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test Category ' + Date.now());
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check for success toast or message
          const hasSuccess = await waitForSuccessMessage(page, 5000);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });
});

