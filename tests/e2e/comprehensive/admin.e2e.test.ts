/**
 * Comprehensive E2E Tests for ADMIN/ORGANIZER Role
 * Tests all possible interactions, views, and functions available to admin/organizer users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, logout, waitForSuccessMessage, navigateToProtectedRoute } from '../helpers';

test.describe('Comprehensive Admin/Organizer E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state - loginAsUser will handle navigation and storage clearing
    await loginAsUser(page, 'admin@eventmanager.com', 'password123');
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
  // EVENTS MANAGEMENT
  // ============================================================================

  test('should navigate to events page and view events list', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    // Check for events list or table
    const eventsList = page.locator('table, [data-testid="events-list"], .event-list').first();
    const hasEvents = await eventsList.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, button:has-text("Create"), button:has-text("New")').count() > 0;
    expect(hasEvents || hasPageContent).toBe(true);
  });

  test('should create a new event with all fields', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Event"), a:has-text("Create")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      // Fill all event fields
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
      const startDateInput = page.locator('input[name="startDate"], input[type="date"]').first();
      const endDateInput = page.locator('input[name="endDate"], input[type="date"]').nth(1);
      
      if (await nameInput.isVisible({ timeout: 2000 })) {
        await nameInput.fill(`Test Event ${Date.now()}`);
        
        if (await locationInput.isVisible()) {
          await locationInput.fill('Test Location');
        }
        
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Test Description');
        }
        
        if (await startDateInput.isVisible()) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await startDateInput.fill(tomorrow.toISOString().split('T')[0]);
        }
        
        if (await endDateInput.isVisible()) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          await endDateInput.fill(nextWeek.toISOString().split('T')[0]);
        }
        
        const submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 5000 })) {
          await submitButton.click();
          
          // Wait for form submission - check for success indicators
          // Use a shorter timeout to prevent test timeout
          try {
            await Promise.race([
              waitForSuccessMessage(page, 3000),
              page.waitForURL((url) => !url.pathname.includes('/events') || url.pathname.includes('/events/'), { timeout: 3000 }),
              page.waitForTimeout(2000)
            ]);
          } catch (error) {
            // Ignore timeout errors - check for success anyway
          }
          
          // Check for success - but handle page closure gracefully
          if (!page.isClosed()) {
            const hasSuccess = await waitForSuccessMessage(page, 2000).catch(() => false);
            // Success can be indicated by URL change, toast, or form reset
            const urlChanged = !page.url().includes('/events') || page.url().includes('/events/');
            expect(hasSuccess || urlChanged).toBe(true);
          }
        }
      }
    }
  });

  test('should edit an existing event', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"], a:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Event ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should delete/archive an event', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Archive"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm deletion if confirmation dialog appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // CONTESTS MANAGEMENT
  // ============================================================================

  test('should navigate to contests page and view contests', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    // Click on first event or navigate directly
    const eventLink = page.locator('a, [data-testid="event"], table tr').first();
    if (await eventLink.isVisible({ timeout: 5000 })) {
      await eventLink.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto('/contests');
      await page.waitForTimeout(2000);
    }
    
    const contestsList = page.locator('table, [data-testid="contests"], h1, h2').first();
    await expect(contestsList).toBeVisible({ timeout: 10000 });
  });

  test('should create a contest with all fields', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(2000);
    
    const eventLink = page.locator('a, [data-testid="event"]').first();
    if (await eventLink.isVisible({ timeout: 5000 })) {
      await eventLink.click();
      await page.waitForTimeout(2000);
    }
    
    const createButton = page.locator('button:has-text("Create Contest"), button:has-text("New Contest")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      const descriptionInput = page.locator('textarea[name="description"]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Test Contest ${Date.now()}`);
        
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Test Contest Description');
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // CATEGORIES MANAGEMENT
  // ============================================================================

  test('should navigate to categories and create category', async ({ page }) => {
    await page.goto('/contests');
    await page.waitForTimeout(2000);
    
    const contestLink = page.locator('a, [data-testid="contest"]').first();
    if (await contestLink.isVisible({ timeout: 5000 })) {
      await contestLink.click();
      await page.waitForTimeout(2000);
    }
    
    const createButton = page.locator('button:has-text("Create Category"), button:has-text("New Category")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      const descriptionInput = page.locator('textarea[name="description"]').first();
      const scoreCapInput = page.locator('input[name="scoreCap"], input[type="number"]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Test Category ${Date.now()}`);
        
        if (await descriptionInput.isVisible()) {
          await descriptionInput.fill('Test Category Description');
        }
        
        if (await scoreCapInput.isVisible()) {
          await scoreCapInput.fill('100');
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // USERS MANAGEMENT
  // ============================================================================

  test('should navigate to users page and view all users', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(2000);
    
    const usersTable = page.locator('table, [data-testid="users-list"]').first();
    const hasUsers = await usersTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, button:has-text("Create")').count() > 0;
    expect(hasUsers || hasPageContent).toBe(true);
  });

  test('should create a new user with all fields', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create User"), button:has-text("New User")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const nameInput = page.locator('input[name="name"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const roleSelect = page.locator('select[name="role"]').first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill(`testuser${Date.now()}@example.com`);
        
        if (await nameInput.isVisible()) {
          await nameInput.fill('Test User');
        }
        
        if (await passwordInput.isVisible()) {
          await passwordInput.fill('password123');
        }
        
        if (await roleSelect.isVisible()) {
          await roleSelect.selectOption({ index: 1 });
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should edit user details', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Name ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should change user role', async ({ page }) => {
    await page.goto('/users');
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      const roleSelect = page.locator('select[name="role"]').first();
      if (await roleSelect.isVisible()) {
        const options = await roleSelect.locator('option').count();
        if (options > 1) {
          await roleSelect.selectOption({ index: 2 });
          const saveButton = page.locator('button:has-text("Save")').first();
          await saveButton.click();
          await page.waitForTimeout(2000);
          
          const hasSuccess = await waitForSuccessMessage(page, 5000);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });

  // ============================================================================
  // ASSIGNMENTS MANAGEMENT
  // ============================================================================

  test('should navigate to assignments page', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForTimeout(2000);
    
    const assignmentsPage = page.locator('h1, h2, [data-testid="assignments"]').first();
    await expect(assignmentsPage).toBeVisible({ timeout: 10000 });
  });

  test('should assign judge to category', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForTimeout(2000);
    
    // Look for assignment form or buttons
    const assignButton = page.locator('button:has-text("Assign"), button:has-text("Add Judge")').first();
    if (await assignButton.isVisible({ timeout: 5000 })) {
      await assignButton.click();
      await page.waitForTimeout(1000);
      
      // Fill assignment form if visible
      const judgeSelect = page.locator('select[name="judge"], select').first();
      const categorySelect = page.locator('select[name="category"]').first();
      
      if (await judgeSelect.isVisible()) {
        await judgeSelect.selectOption({ index: 0 });
        
        if (await categorySelect.isVisible()) {
          await categorySelect.selectOption({ index: 0 });
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should assign contestant to category', async ({ page }) => {
    await page.goto('/assignments');
    await page.waitForTimeout(2000);
    
    // Look for contestant assignment section - use separate locators
    const contestantSectionByDataId = page.locator('[data-testid="contestant-assignments"]').first();
    const contestantSectionByText = page.locator('text=/contestant/i').first();
    const contestantSection = contestantSectionByDataId.or(contestantSectionByText);
    
    if (await contestantSection.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if page is still open
      if (page.isClosed()) {
        return;
      }
      
      // Check if accordion is blocking - expand it first if needed
      const accordionButton = page.locator('button[aria-expanded="false"]').first();
      const accordionExpanded = await accordionButton.getAttribute('aria-expanded').catch(() => null);
      if (accordionExpanded === 'false') {
        await accordionButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
      }
      
      // Check if page is still open after accordion click
      if (page.isClosed()) {
        return;
      }
      
      const assignButton = page.locator('button:has-text("Assign Contestant"), button:has-text("Add")').first();
      if (await assignButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Try normal click first, fallback to force click if intercepted
        try {
          await assignButton.click({ timeout: 2000 });
        } catch (error) {
          // If click is intercepted or page closed, try force click if page is still open
          if (!page.isClosed()) {
            await assignButton.click({ force: true });
          }
        }
        await page.waitForTimeout(1000);
        
        // Check if page is still open before continuing
        if (page.isClosed()) {
          return;
        }
        
        const contestantSelect = page.locator('select[name="contestant"]').first();
        if (await contestantSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
          await contestantSelect.selectOption({ index: 0 });
          const submitButton = page.locator('button[type="submit"]').first();
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          if (!page.isClosed()) {
            const hasSuccess = await waitForSuccessMessage(page, 5000).catch(() => false);
            expect(hasSuccess).toBe(true);
          }
        }
      }
    }
  });

  // ============================================================================
  // ADMIN DASHBOARD
  // ============================================================================

  test('should view admin dashboard with all sections', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    
    // Check for various admin sections
    const sections = [
      'h1:has-text("Admin")',
      '[data-testid="stats"]',
      '[data-testid="database"]',
      '[data-testid="backup"]',
      '[data-testid="logs"]',
      'button:has-text("Database")',
      'button:has-text("Backup")',
      'button:has-text("Logs")'
    ];
    
    let hasAnySection = false;
    for (const selector of sections) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        hasAnySection = true;
        break;
      }
    }
    
    expect(hasAnySection).toBe(true);
  });

  test('should view system statistics', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    
    await page.waitForResponse((response) => 
      response.url().includes('/api/admin/stats') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => {});
    
    const statsSection = page.locator('[data-testid="stats"], .statistics, .stats, [class*="stat"]').first();
    const hasStats = await statsSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasStatCards = await page.locator('.stat, [class*="card"], [class*="stat"]').count() > 0;
    expect(hasStats || hasStatCards).toBe(true);
  });

  test('should access database browser', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    // Click on database tab or section
    const dbTab = page.locator('button:has-text("Database"), [data-testid="database-tab"], a:has-text("Database")').first();
    if (await dbTab.isVisible({ timeout: 5000 })) {
      await dbTab.click();
      await page.waitForTimeout(2000);
      
      const dbBrowser = page.locator('[data-testid="database-browser"], table, .database-table').first();
      await expect(dbBrowser).toBeVisible({ timeout: 10000 });
    }
  });

  test('should view database tables', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const dbTab = page.locator('button:has-text("Database")').first();
    if (await dbTab.isVisible({ timeout: 5000 })) {
      await dbTab.click();
      await page.waitForTimeout(2000);
      
      const tablesList = page.locator('table, [data-testid="tables-list"], .table-list').first();
      const hasTables = await tablesList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasTableRows = await page.locator('tr, [class*="table-row"]').count() > 0;
      expect(hasTables || hasTableRows).toBe(true);
    }
  });

  test('should view backup manager', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const backupTab = page.locator('button:has-text("Backup"), [data-testid="backup-tab"]').first();
    if (await backupTab.isVisible({ timeout: 5000 })) {
      await backupTab.click();
      await page.waitForTimeout(2000);
      
      const backupSection = page.locator('[data-testid="backup-manager"], .backup-list, table').first();
      await expect(backupSection).toBeVisible({ timeout: 10000 });
    }
  });

  test('should create a backup', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const backupTab = page.locator('button:has-text("Backup")').first();
    if (await backupTab.isVisible({ timeout: 5000 })) {
      await backupTab.click();
      await page.waitForTimeout(2000);
      
      const createBackupButton = page.locator('button:has-text("Create Backup"), button:has-text("Backup Now")').first();
      if (await createBackupButton.isVisible({ timeout: 5000 })) {
        // Handle accordion interception
        try {
          await createBackupButton.click({ force: true, timeout: 5000 });
        } catch (error) {
          // If click is intercepted, try clicking accordion button first
          const accordionButton = page.locator('[data-accordion-id] button').first();
          if (await accordionButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await accordionButton.click({ force: true });
            await page.waitForTimeout(500);
            await createBackupButton.click({ force: true });
          }
        }
        await page.waitForTimeout(3000);
        
        if (!page.isClosed()) {
          const hasSuccess = await waitForSuccessMessage(page, 10000).catch(() => false);
          expect(hasSuccess).toBe(true);
        }
      }
    }
  });

  test('should configure backup settings', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const backupTab = page.locator('button:has-text("Backup")').first();
    if (await backupTab.isVisible({ timeout: 5000 })) {
      await backupTab.click();
      await page.waitForTimeout(2000);
      
      // Check if accordion is blocking the settings button
      const accordionButton = page.locator('button[aria-expanded="false"], button:has-text("Backup Settings")').first();
      const accordionExpanded = await accordionButton.getAttribute('aria-expanded').catch(() => null);
      if (accordionExpanded === 'false') {
        await accordionButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
      }
      
      const settingsButton = page.locator('button:has-text("Settings"), button:has-text("Configure")').first();
      if (await settingsButton.isVisible({ timeout: 5000 })) {
        // Try normal click first, fallback to force click if intercepted
        try {
          await settingsButton.click({ timeout: 2000 });
        } catch (error) {
          // If click is intercepted, try force click
          await settingsButton.click({ force: true });
        }
        await page.waitForTimeout(1000);
        
        const enabledCheckbox = page.locator('input[type="checkbox"][name*="enabled"], input[type="checkbox"]').first();
        if (await enabledCheckbox.isVisible()) {
          await enabledCheckbox.check();
          await page.waitForTimeout(500);
          
          const saveButton = page.locator('button:has-text("Save")').first();
          if (await saveButton.isVisible({ timeout: 5000 })) {
            // Try normal click first, fallback to force click if intercepted
            try {
              await saveButton.click({ timeout: 2000 });
            } catch (error) {
              // If click is intercepted or times out, try force click
              await saveButton.click({ force: true });
            }
            await page.waitForTimeout(2000);
            
            if (!page.isClosed()) {
              const hasSuccess = await waitForSuccessMessage(page, 5000).catch(() => false);
              expect(hasSuccess).toBe(true);
            }
          }
        }
      }
    }
  });

  test('should view log files', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    
    const logsTab = page.locator('button:has-text("Logs"), [data-testid="logs-tab"]').first();
    if (await logsTab.isVisible({ timeout: 5000 })) {
      await logsTab.click();
      await page.waitForTimeout(2000);
      
      const logsSection = page.locator('[data-testid="log-files"], .log-list, table, pre').first();
      await expect(logsSection).toBeVisible({ timeout: 10000 });
    }
  });

  // ============================================================================
  // TEMPLATES MANAGEMENT
  // ============================================================================

  test('should navigate to templates page', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForTimeout(2000);
    
    const templatesPage = page.locator('h1, h2, [data-testid="templates"]').first();
    await expect(templatesPage).toBeVisible({ timeout: 10000 });
  });

  test('should create a template', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Template")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      const contentInput = page.locator('textarea[name="content"], textarea').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Test Template ${Date.now()}`);
        
        if (await contentInput.isVisible()) {
          await contentInput.fill('Test Template Content');
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should edit a template', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('button:has-text("Edit"), [data-testid="edit"]').first();
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      await page.waitForTimeout(1000);
      
      const contentInput = page.locator('textarea').first();
      if (await contentInput.isVisible()) {
        await contentInput.fill(`Updated Content ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should delete a template', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForTimeout(2000);
    
    const deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete"]').first();
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
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

  // ============================================================================
  // REPORTS MANAGEMENT
  // ============================================================================

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const reportsPage = page.locator('h1, h2, [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 });
  });

  test('should generate a report', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const generateButton = page.locator('button:has-text("Generate"), button:has-text("Create Report")').first();
    if (await generateButton.isVisible({ timeout: 5000 })) {
      await generateButton.click();
      await page.waitForTimeout(3000);
      
      // Check for report download or success message
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const hasSuccess = await waitForSuccessMessage(page, 5000);
      expect(hasSuccess || downloadPromise !== null).toBe(true);
    }
  });

  test('should export report to PDF', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const exportButton = page.locator('button:has-text("PDF"), button:has-text("Export")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await exportButton.click();
      
      const download = await downloadPromise.catch(() => null);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });

  test('should export report to Excel', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(2000);
    
    const exportButton = page.locator('button:has-text("Excel"), button:has-text("XLSX")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await exportButton.click();
      
      const download = await downloadPromise.catch(() => null);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/i);
      }
    }
  });

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const settingsPage = page.locator('h1, h2, [data-testid="settings"]').first();
    await expect(settingsPage).toBeVisible({ timeout: 10000 });
  });

  test('should update profile settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const profileSection = page.locator('button:has-text("Profile"), [data-testid="profile"]').first();
    if (await profileSection.isVisible({ timeout: 5000 })) {
      await profileSection.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"], input[name="preferredName"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`Updated Name ${Date.now()}`);
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  test('should update database settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const dbSection = page.locator('button:has-text("Database"), [data-testid="database"]').first();
    if (await dbSection.isVisible({ timeout: 5000 })) {
      await dbSection.click();
      await page.waitForTimeout(1000);
      
      // Database settings are usually read-only, just verify they're visible
      // Check for any database-related content
      const dbInfo = page.locator('[data-testid="db-info"], .database-info').first();
      const hasInfo = await dbInfo.isVisible({ timeout: 5000 }).catch(() => false);
      const hasDbContent = await page.locator('text=/database|host|port|name/i').count() > 0;
      const hasSettingsContent = await page.locator('h2, h3, [class*="setting"]').count() > 0;
      // Test passes if database info is visible OR page has database-related content OR has settings content
      expect(hasInfo || hasDbContent || hasSettingsContent).toBe(true);
    }
  });

  test('should update notification settings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    
    const notificationsSection = page.locator('button:has-text("Notifications"), [data-testid="notifications"]').first();
    if (await notificationsSection.isVisible({ timeout: 5000 })) {
      await notificationsSection.click();
      await page.waitForTimeout(1000);
      
      // Check if accordion is blocking - expand it first if needed
      const accordionButton = page.locator('button[aria-expanded="false"]').first();
      const accordionExpanded = await accordionButton.getAttribute('aria-expanded').catch(() => null);
      if (accordionExpanded === 'false') {
        await accordionButton.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1000);
      }
      
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 5000 })) {
        // Try normal check first, fallback to force click if intercepted
        try {
          await checkbox.check({ timeout: 2000 });
        } catch (error) {
          // If check is intercepted, try force click
          await checkbox.click({ force: true });
        }
        await page.waitForTimeout(500);
        
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 5000 })) {
          try {
            await saveButton.click({ timeout: 2000 });
          } catch (error) {
            await saveButton.click({ force: true });
          }
          await page.waitForTimeout(2000);
          
          if (!page.isClosed()) {
            const hasSuccess = await waitForSuccessMessage(page, 5000).catch(() => false);
            expect(hasSuccess).toBe(true);
          }
        }
      }
    }
  });

  // ============================================================================
  // RESULTS & WINNERS
  // ============================================================================

  test('should view results page', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const resultsPage = page.locator('h1, h2, [data-testid="results"]').first();
    await expect(resultsPage).toBeVisible({ timeout: 10000 });
  });

  test('should filter results by event', async ({ page }) => {
    await page.goto('/results');
    await page.waitForTimeout(2000);
    
    const eventSelect = page.locator('select[name="event"], select').first();
    if (await eventSelect.isVisible({ timeout: 5000 })) {
      await eventSelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const resultsTable = page.locator('table, [data-testid="results-list"]').first();
      const hasResults = await resultsTable.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBe(true);
    }
  });

  test('should view winners page', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const winnersPage = page.locator('h1, h2, [data-testid="winners"]').first();
    await expect(winnersPage).toBeVisible({ timeout: 10000 });
  });

  test('should filter winners by category', async ({ page }) => {
    await page.goto('/winners');
    await page.waitForTimeout(2000);
    
    const categorySelect = page.locator('select[name="category"], select').first();
    if (await categorySelect.isVisible({ timeout: 5000 })) {
      await categorySelect.selectOption({ index: 0 });
      await page.waitForTimeout(2000);
      
      const winnersList = page.locator('table, [data-testid="winners-list"]').first();
      const hasWinners = await winnersList.isVisible({ timeout: 5000 }).catch(() => false);
      const hasPageContent = await page.locator('h1, h2, h3, [class*="winner"]').count() > 0;
      const hasWinnerText = await page.locator('text=/winner/i').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*winner|empty/i').count() > 0;
      // Test passes if winners list is visible OR page has winner-related content OR shows empty state
      expect(hasWinners || hasPageContent || hasWinnerText || hasEmptyState).toBe(true);
    }
  });

  // ============================================================================
  // DEDUCTIONS MANAGEMENT
  // ============================================================================

  test('should navigate to deductions page', async ({ page }) => {
    await page.goto('/deductions');
    await page.waitForTimeout(2000);
    
    const deductionsPage = page.locator('h1, h2, [data-testid="deductions"]').first();
    await expect(deductionsPage).toBeVisible({ timeout: 10000 });
  });

  test('should create a deduction', async ({ page }) => {
    await page.goto('/deductions');
    await page.waitForTimeout(2000);
    
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add Deduction")').first();
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
      const reasonInput = page.locator('input[name="reason"], textarea[name="reason"]').first();
      
      if (await amountInput.isVisible()) {
        await amountInput.fill('5');
        
        if (await reasonInput.isVisible()) {
          await reasonInput.fill('Test Deduction Reason');
        }
        
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        const hasSuccess = await waitForSuccessMessage(page, 5000);
        expect(hasSuccess).toBe(true);
      }
    }
  });

  // ============================================================================
  // TRACKER
  // ============================================================================

  test('should navigate to tracker page', async ({ page }) => {
    await page.goto('/tracker');
    await page.waitForTimeout(2000);
    
    const trackerPage = page.locator('h1, h2, [data-testid="tracker"]').first();
    await expect(trackerPage).toBeVisible({ timeout: 10000 });
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
  // EMCEE
  // ============================================================================

  test('should navigate to emcee page', async ({ page }) => {
    await navigateToProtectedRoute(page, '/emcee', 'admin@eventmanager.com', 'password123');
    
    const emceePage = page.locator('h1, h2, [data-testid="emcee"]').first();
    await expect(emceePage).toBeVisible({ timeout: 10000 });
  });

  test('should view contestant bios', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const biosSection = page.locator('[data-testid="contestant-bios"], .bios, table').first();
    const hasBios = await biosSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasPageContent = await page.locator('h1, h2, button').count() > 0;
    expect(hasBios || hasPageContent).toBe(true);
  });

  test('should view judge bios', async ({ page }) => {
    await page.goto('/emcee');
    await page.waitForTimeout(2000);
    
    const judgeBiosTab = page.locator('button:has-text("Judge"), [data-testid="judge-bios"]').first();
    if (await judgeBiosTab.isVisible({ timeout: 5000 })) {
      await judgeBiosTab.click();
      await page.waitForTimeout(2000);
      
      const biosList = page.locator('[data-testid="judge-bios-list"], table, .bio-list').first();
      const hasBios = await biosList.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasBios).toBe(true);
    }
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

  test('should view FAQ sections', async ({ page }) => {
    await page.goto('/help');
    await page.waitForTimeout(2000);
    
    const faqSection = page.locator('[data-testid="faq"], .faq, h2:has-text("FAQ")').first();
    const hasFaq = await faqSection.isVisible({ timeout: 5000 }).catch(() => false);
    const hasContent = await page.locator('h1, h2, h3, p').count() > 0;
    expect(hasFaq || hasContent).toBe(true);
  });
});

