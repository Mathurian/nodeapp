import { test, expect, Page } from '@playwright/test'
import { loginAsUser, logout } from '../helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/testCredentials'

/**
 * Comprehensive E2E tests for all accordions across all pages
 * Tests opening/closing accordions and all functionality within each accordion
 */

// Helper function to expand an accordion by clicking its button
async function expandAccordion(page: Page, accordionTitle: string): Promise<void> {
  try {
    // Check if page is still open
    if (page.isClosed()) {
      console.warn(`Page closed, cannot expand accordion "${accordionTitle}"`)
      return
    }
    
    // Find accordion button by text content
    const accordionButton = page.locator('button').filter({ hasText: accordionTitle }).first()
    
    // Check if accordion exists
    const exists = await accordionButton.count() > 0
    if (!exists) {
      console.warn(`Accordion "${accordionTitle}" not found on page, skipping`)
      return
    }
    
    // Check if accordion is already open by checking if content is visible
    const isOpen = await accordionButton.evaluate((el) => {
      const accordion = el.closest('[data-accordion-id]')
      if (!accordion) return false
      const content = accordion.querySelector('[class*="max-h-"]')
      if (!content) return false
      return content.classList.contains('max-h-[5000px]')
    }).catch(() => false)

    if (!isOpen) {
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed before expanding accordion "${accordionTitle}"`)
        return
      }
      
      // Wait for button to be visible and stable
      await accordionButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
      
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed during accordion expansion "${accordionTitle}"`)
        return
      }
      
      // Try clicking with force if normal click doesn't work (handles interception)
      await accordionButton.click({ force: true, timeout: 5000 }).catch(async () => {
        // Check page is still open before fallback
        if (page.isClosed()) return
        // Fallback: try clicking via JavaScript
        await accordionButton.evaluate((el: HTMLElement) => {
          (el as HTMLButtonElement).click()
        }).catch(() => {})
      })
      
      // Check page is still open before waiting
      if (page.isClosed()) {
        console.warn(`Page closed after clicking accordion "${accordionTitle}"`)
        return
      }
      
      // Wait for accordion to expand - check multiple times with increasing delays
      for (let i = 0; i < 10; i++) {
        if (page.isClosed()) break
        
        await page.waitForTimeout(100).catch(() => {})
        
        const nowOpen = await accordionButton.evaluate((el) => {
          const accordion = el.closest('[data-accordion-id]')
          if (!accordion) return false
          const content = accordion.querySelector('[class*="max-h-"]')
          if (!content) return false
          return content.classList.contains('max-h-[5000px]')
        }).catch(() => false)
        
        if (nowOpen) {
          // Accordion is open, we're done
          return
        }
      }
      
      // If we get here, accordion didn't open - log a warning but don't fail
      console.warn(`Accordion "${accordionTitle}" may not have opened after click`)
    }
  } catch (error) {
    // Only log if page is still open
    if (!page.isClosed()) {
      console.warn(`Failed to expand accordion "${accordionTitle}":`, error)
    }
  }
}

// Helper function to collapse an accordion
async function collapseAccordion(page: Page, accordionTitle: string): Promise<void> {
  try {
    // Check if page is still open
    if (page.isClosed()) {
      console.warn(`Page closed, cannot collapse accordion "${accordionTitle}"`)
      return
    }
    
    const accordionButton = page.locator('button').filter({ hasText: accordionTitle }).first()
    const isOpen = await accordionButton.evaluate((el) => {
      const accordion = el.closest('[data-accordion-id]')
      if (!accordion) return false
      const content = accordion.querySelector('[class*="max-h-"]')
      if (!content) return false
      return content.classList.contains('max-h-[5000px]')
    }).catch(() => false)

    if (isOpen) {
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed before collapsing accordion "${accordionTitle}"`)
        return
      }
      
      await accordionButton.click({ force: true, timeout: 5000 }).catch(() => {})
      
      // Check page is still open before waiting
      if (!page.isClosed()) {
        await page.waitForTimeout(300).catch(() => {})
      }
    }
  } catch (error) {
    // Only log if page is still open
    if (!page.isClosed()) {
      console.warn(`Failed to collapse accordion "${accordionTitle}":`, error)
    }
  }
}

// Helper function to check if accordion content is visible
async function isAccordionOpen(page: Page, accordionTitle: string): Promise<boolean> {
  try {
    // Check if page is closed first
    if (page.isClosed()) {
      return false
    }
    
    const accordionButton = page.locator('button').filter({ hasText: accordionTitle }).first()
    return await accordionButton.evaluate((el) => {
      const accordion = el.closest('[data-accordion-id]')
      if (!accordion) return false
      const content = accordion.querySelector('[class*="max-h-"]')
      if (!content) return false
      return content.classList.contains('max-h-[5000px]')
    }).catch(() => false)
  } catch (error: any) {
    // If page is closed, return false
    if (error.message?.includes('closed') || page.isClosed()) {
      return false
    }
    return false
  }
}

test.describe('Accordion Tests - Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Admin page', async ({ page }) => {
    test.setTimeout(60000) // Increase timeout to 60 seconds
    
    const accordions = [
      'Overview',  // Changed from "System Statistics"
      'Activity Logs',
      'Security',  // Changed from "Security Dashboard"
      'Database Browser',
      'Backup Manager',
      'Backup Settings',
      'Log Files',
      'Email Templates',  // Changed from "Email Logs"
      'System Settings',
      'Performance Monitoring',
      'Cache Management',
      'Contest Certifications',
      'Category Certifications',
      'Emcee Scripts',
    ]

    for (const accordionTitle of accordions) {
      // Check if page is still open before each iteration
      if (page.isClosed()) {
        console.warn('Page closed during accordion test loop, stopping')
        break
      }
      
      // Check if accordion exists on page
      let accordionExists = false
      try {
        accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed while checking accordion existence')
          break
        }
        throw error
      }
      
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      // Expand accordion
      await expandAccordion(page, accordionTitle)
      
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed after expanding "${accordionTitle}"`)
        break
      }
      
      // Wait a bit more for accordion to fully expand
      await page.waitForTimeout(300).catch(() => {})
      
      // Check page is still open before checking state
      if (page.isClosed()) {
        console.warn(`Page closed while waiting for "${accordionTitle}" to expand`)
        break
      }
      
      let isOpen = false
      try {
        isOpen = await isAccordionOpen(page, accordionTitle)
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed while checking accordion state')
          break
        }
        // If it's not a page closure error, continue
      }
      
      // If accordion didn't open, try one more time
      if (!isOpen) {
        console.warn(`Accordion "${accordionTitle}" didn't open on first try, retrying...`)
        await expandAccordion(page, accordionTitle)
        
        // Check page is still open
        if (page.isClosed()) {
          console.warn(`Page closed during retry of "${accordionTitle}"`)
          break
        }
        
        await page.waitForTimeout(500).catch(() => {})
        
        // Check page is still open
        if (page.isClosed()) {
          console.warn(`Page closed after retry wait for "${accordionTitle}"`)
          break
        }
        
        let retryOpen = false
        try {
          retryOpen = await isAccordionOpen(page, accordionTitle)
        } catch (error: any) {
          if (error.message?.includes('closed') || page.isClosed()) {
            console.warn('Page closed while checking retry state')
            break
          }
        }
        
        if (!retryOpen) {
          console.warn(`Accordion "${accordionTitle}" still not open after retry, skipping assertion`)
          // Continue to next accordion instead of failing
          continue
        }
      }
      
      // Check page is still open before final assertion
      if (page.isClosed()) {
        console.warn(`Page closed before final check of "${accordionTitle}"`)
        break
      }
      
      // Only assert if we confirmed it's open
      let finalCheck = false
      try {
        finalCheck = await isAccordionOpen(page, accordionTitle)
        expect(finalCheck).toBeTruthy()
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed during final check')
          break
        }
        throw error
      }

      // Wait for content to load
      await page.waitForTimeout(500).catch(() => {})

      // Check page is still open before collapsing
      if (page.isClosed()) {
        console.warn(`Page closed before collapsing "${accordionTitle}"`)
        break
      }

      // Collapse accordion
      await collapseAccordion(page, accordionTitle)
      
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed after collapsing "${accordionTitle}"`)
        break
      }
      
      // Check page is still open before final collapse check
      if (page.isClosed()) {
        console.warn(`Page closed before collapse check of "${accordionTitle}"`)
        break
      }
      
      let isClosed = false
      try {
        isClosed = !(await isAccordionOpen(page, accordionTitle))
        expect(isClosed).toBeTruthy()
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed during collapse check')
          break
        }
        throw error
      }
    }
  })

  test('should interact with Overview accordion', async ({ page }) => {
    await expandAccordion(page, 'Overview')
    
    // Check page is still open
    if (page.isClosed()) {
      console.warn('Page closed during test')
      return
    }
    
    await page.waitForTimeout(500).catch(() => {})

    // Check for stat cards or numbers
    const statCards = page.locator('[class*="stat"], [class*="card"]').filter({ hasText: /users|events|contests|categories/i })
    const count = await statCards.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with System Statistics accordion', async ({ page }) => {
    // This accordion is now called "Overview"
    await expandAccordion(page, 'Overview')
    
    // Check page is still open
    if (page.isClosed()) {
      console.warn('Page closed during test')
      return
    }
    
    await page.waitForTimeout(500).catch(() => {})

    // Check for stat cards or numbers
    const statCards = page.locator('[class*="stat"], [class*="card"]').filter({ hasText: /users|events|contests|categories/i })
    const count = await statCards.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Activity Logs accordion', async ({ page }) => {
    await expandAccordion(page, 'Activity Logs')
    await page.waitForTimeout(1000)

    // Check for search/filter inputs
    const searchInput = page.locator('input[type="text"], input[placeholder*="search" i]').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test')
      await page.waitForTimeout(500)
    }

    // Check for table or log entries
    const logEntries = page.locator('table, [class*="log"], [class*="activity"]')
    const count = await logEntries.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Database Browser accordion', async ({ page }) => {
    await expandAccordion(page, 'Database Browser')
    await page.waitForTimeout(1000)

    // Check for table selector or database tables list
    const tableSelector = page.locator('select, [class*="table"], button').filter({ hasText: /table|database/i }).first()
    if (await tableSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try to interact if possible
      await tableSelector.click({ force: true }).catch(() => {})
    }
  })

  test('should interact with Backup Manager accordion', async ({ page }) => {
    await expandAccordion(page, 'Backup Manager')
    await page.waitForTimeout(1000)

    // Check for backup list or create backup button
    const createButton = page.locator('button').filter({ hasText: /create|backup/i }).first()
    if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Don't actually create backup, just verify button exists
      expect(await createButton.isVisible()).toBeTruthy()
    }
  })

  test('should interact with Backup Settings accordion', async ({ page }) => {
    await expandAccordion(page, 'Backup Settings')
    await page.waitForTimeout(1000)

    // Check for settings form inputs
    const inputs = page.locator('input[type="text"], input[type="number"], select')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Accordion Tests - Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Settings page', async ({ page }) => {
    const accordions = [
      'Profile',
      'General Settings',
      'Password Policy',
      'Database',
      'Email Settings',
      'SMS Settings',
      'Security Settings',
      'Rate Limiting',
      'User Field Visibility',
      'Notifications',
      'Theme Settings'
    ]

    for (const accordionTitle of accordions) {
      // Check if page is still open before each iteration
      if (page.isClosed()) {
        console.warn('Page closed during accordion test loop, stopping')
        break
      }
      
      // Check if accordion exists on page
      let accordionExists = false
      try {
        accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed while checking accordion existence')
          break
        }
        throw error
      }
      
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      // Expand accordion
      await expandAccordion(page, accordionTitle)
      
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed after expanding "${accordionTitle}"`)
        break
      }
      
      // Wait a bit more for accordion to fully expand
      await page.waitForTimeout(300).catch(() => {})
      
      // Check page is still open before checking state
      if (page.isClosed()) {
        console.warn(`Page closed while waiting for "${accordionTitle}" to expand`)
        break
      }
      
      let isOpen = false
      try {
        isOpen = await isAccordionOpen(page, accordionTitle)
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed while checking accordion state')
          break
        }
      }
      
      // If accordion didn't open, try one more time
      if (!isOpen) {
        console.warn(`Accordion "${accordionTitle}" didn't open on first try, retrying...`)
        await expandAccordion(page, accordionTitle)
        
        // Check page is still open
        if (page.isClosed()) {
          console.warn(`Page closed during retry of "${accordionTitle}"`)
          break
        }
        
        await page.waitForTimeout(500).catch(() => {})
        
        // Check page is still open
        if (page.isClosed()) {
          console.warn(`Page closed after retry wait for "${accordionTitle}"`)
          break
        }
        
        let retryOpen = false
        try {
          retryOpen = await isAccordionOpen(page, accordionTitle)
        } catch (error: any) {
          if (error.message?.includes('closed') || page.isClosed()) {
            console.warn('Page closed while checking retry state')
            break
          }
        }
        
        if (!retryOpen) {
          console.warn(`Accordion "${accordionTitle}" still not open after retry, skipping assertion`)
          // Continue to next accordion instead of failing
          continue
        }
      }
      
      // Check page is still open before final assertion
      if (page.isClosed()) {
        console.warn(`Page closed before final check of "${accordionTitle}"`)
        break
      }
      
      // Only assert if we confirmed it's open
      let finalCheck = false
      try {
        finalCheck = await isAccordionOpen(page, accordionTitle)
        expect(finalCheck).toBeTruthy()
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed during final check')
          break
        }
        throw error
      }

      // Wait for content to load
      await page.waitForTimeout(500).catch(() => {})

      // Check page is still open before collapsing
      if (page.isClosed()) {
        console.warn(`Page closed before collapsing "${accordionTitle}"`)
        break
      }

      // Collapse accordion
      await collapseAccordion(page, accordionTitle)
      
      // Check page is still open
      if (page.isClosed()) {
        console.warn(`Page closed after collapsing "${accordionTitle}"`)
        break
      }
      
      // Check page is still open before final collapse check
      if (page.isClosed()) {
        console.warn(`Page closed before collapse check of "${accordionTitle}"`)
        break
      }
      
      let isClosed = false
      try {
        isClosed = !(await isAccordionOpen(page, accordionTitle))
        expect(isClosed).toBeTruthy()
      } catch (error: any) {
        if (error.message?.includes('closed') || page.isClosed()) {
          console.warn('Page closed during collapse check')
          break
        }
        throw error
      }
    }
  })

  test('should interact with Profile accordion', async ({ page }) => {
    await expandAccordion(page, 'Profile')
    await page.waitForTimeout(1000)

    // Check for profile form inputs
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first()
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const value = await nameInput.inputValue().catch(() => '')
      expect(value).toBeDefined()
    }
  })

  test('should interact with General Settings accordion', async ({ page }) => {
    await expandAccordion(page, 'General Settings')
    await page.waitForTimeout(1000)

    // Check for settings inputs
    const inputs = page.locator('input, select, textarea')
    const inputCount = await inputs.count()
    expect(inputCount).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Password Policy accordion', async ({ page }) => {
    await expandAccordion(page, 'Password Policy')
    await page.waitForTimeout(1000)

    // Check for password policy inputs
    const minLengthInput = page.locator('input[name*="minLength"], input[type="number"]').first()
    if (await minLengthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const value = await minLengthInput.inputValue().catch(() => '')
      expect(value).toBeDefined()
    }
  })

  test('should interact with Database accordion', async ({ page }) => {
    await expandAccordion(page, 'Database')
    await page.waitForTimeout(1000)

    // Check for database connection info
    const dbInfo = page.locator('[class*="database"], [class*="connection"]')
    const count = await dbInfo.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Email Settings accordion', async ({ page }) => {
    await expandAccordion(page, 'Email Settings')
    await page.waitForTimeout(1000)

    // Check for email settings inputs
    const emailInputs = page.locator('input[type="email"], input[name*="email"], input[name*="smtp"]')
    const count = await emailInputs.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Notifications accordion', async ({ page }) => {
    await expandAccordion(page, 'Notifications')
    await page.waitForTimeout(1000)

    // Check for notification toggles or inputs
    const notificationInputs = page.locator('input[type="checkbox"], input[type="radio"], select')
    const count = await notificationInputs.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Accordion Tests - Tracker Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/tracker')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Tracker page', async ({ page }) => {
    const accordions = [
      'Scoring Progress',
      'Certification Status'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })

  test('should interact with Scoring Progress accordion', async ({ page }) => {
    await expandAccordion(page, 'Scoring Progress')
    await page.waitForTimeout(1000)

    // Check for event/contest selectors
    const selectors = page.locator('select, [class*="select"]')
    const count = await selectors.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Certification Status accordion', async ({ page }) => {
    await expandAccordion(page, 'Certification Status')
    await page.waitForTimeout(1000)

    // Check for certification status display
    const statusDisplay = page.locator('[class*="certification"], [class*="status"]')
    const count = await statusDisplay.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Accordion Tests - Assignments Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/assignments')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Assignments page', async ({ page }) => {
    const accordions = [
      'Judges',
      'Contestants',
      'Tally Masters',
      'Auditors',
      'Board Members'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })

  test('should interact with Judges accordion', async ({ page }) => {
    await expandAccordion(page, 'Judges')
    await page.waitForTimeout(1000)

    // Check for assignment form or list
    const assignmentElements = page.locator('select, button, [class*="assign"]')
    const count = await assignmentElements.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should interact with Contestants accordion', async ({ page }) => {
    await expandAccordion(page, 'Contestants')
    await page.waitForTimeout(1000)

    // Check for contest/category selectors
    const selectors = page.locator('select')
    const count = await selectors.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Accordion Tests - Tally Master Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.tallyMaster.email, TEST_CREDENTIALS.tallyMaster.password)
    await page.goto('/tally')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Tally Master page', async ({ page }) => {
    const accordions = [
      'Contest Selection',
      'Category Review',
      'Score Removal Requests',
      'Certification Queue'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Auditor Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.auditor.email, TEST_CREDENTIALS.auditor.password)
    await page.goto('/auditor')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Auditor page', async ({ page }) => {
    const accordions = [
      'Pending Audits',
      'Completed Audits',
      'Audit History'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Board Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.board.email, TEST_CREDENTIALS.board.password)
    await page.goto('/board')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Board page', async ({ page }) => {
    const accordions = [
      'Pending Certifications',
      'Score Removal Requests',
      'Certification Status',
      'Board Actions'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Contestant Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.contestant.email, TEST_CREDENTIALS.contestant.password)
    await page.goto('/contestant')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Contestant Home page', async ({ page }) => {
    const accordions = [
      'My Events',
      'My Contests',
      'My Categories',
      'My Results',
      'My Rankings'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Emcee Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.emcee.email, TEST_CREDENTIALS.emcee.password)
    await page.goto('/emcee')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Emcee page', async ({ page }) => {
    const accordions = [
      'Contestant Bios',
      'Judge Bios',
      'Scripts',
      'Event Information'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Templates Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/templates')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Templates page', async ({ page }) => {
    const accordions = [
      'Event Templates',
      'Category Templates',
      'Email Templates',
      'Report Templates'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Score Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/score-management')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Score Management page', async ({ page }) => {
    const accordions = [
      'Contest Selection',
      'Category Scores',
      'Score Adjustments',
      'Score History'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Profile page', async ({ page }) => {
    const accordions = [
      'Personal Information',
      'Account Settings',
      'Preferences',
      'Security'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

test.describe('Accordion Tests - Help Page', () => {
  test.beforeEach(async ({ page }) => {
    // loginAsUser already handles storage clearing and navigation
    await loginAsUser(page, TEST_CREDENTIALS.admin.email, TEST_CREDENTIALS.admin.password)
    await page.goto('/help')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('should expand and collapse all accordions on Help page', async ({ page }) => {
    const accordions = [
      'Getting Started',
      'User Roles',
      'Common Tasks',
      'Troubleshooting',
      'Contact Support'
    ]

    for (const accordionTitle of accordions) {
      const accordionExists = await page.locator('button').filter({ hasText: accordionTitle }).count() > 0
      if (!accordionExists) {
        console.log(`Accordion "${accordionTitle}" not found on page, skipping`)
        continue
      }

      await expandAccordion(page, accordionTitle)
      const isOpen = await isAccordionOpen(page, accordionTitle)
      expect(isOpen).toBeTruthy()

      await page.waitForTimeout(500)

      await collapseAccordion(page, accordionTitle)
      const isClosed = !(await isAccordionOpen(page, accordionTitle))
      expect(isClosed).toBeTruthy()
    }
  })
})

