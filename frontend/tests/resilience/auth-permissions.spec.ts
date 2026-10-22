import { expect, test } from '@playwright/test'
import {
  ROLE_WELCOME_GUIDE_DISABLED_STORAGE_PREFIX,
  ROLE_WELCOME_GUIDE_VERSION,
} from '../../src/constants/onboarding'

test('a permissions outage stops retrying and recovers when retried', async ({ page }) => {
  let permissionRequests = 0
  let permissionsAvailable = false

  const guideStorageKey = `${ROLE_WELCOME_GUIDE_DISABLED_STORAGE_PREFIX}:${ROLE_WELCOME_GUIDE_VERSION}:no-tenant:test-admin:ADMIN`
  await page.addInitScript((key) => window.localStorage.setItem(key, 'true'), guideStorageKey)

  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const corsHeaders = {
      'access-control-allow-origin': route.request().headers().origin || 'http://localhost:4189',
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': route.request().headers()['access-control-request-headers'] || 'content-type',
    }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
      return
    }
    const fulfill = (status: number, data: unknown) => route.fulfill({
      status,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ success: status < 400, data }),
    })

    if (path.endsWith('/auth/profile')) {
      await fulfill(200, {
        id: 'test-admin',
        name: 'Test Admin',
        email: 'admin@example.test',
        role: 'ADMIN',
        tenant: null,
      })
    } else if (path.endsWith('/auth/permissions')) {
      permissionRequests += 1
      await fulfill(permissionsAvailable ? 200 : 500, permissionsAvailable
        ? { role: 'ADMIN', permissions: ['*'], resourceScopes: {} }
        : { message: 'Service unavailable' })
    } else if (path.endsWith('/csrf-token')) {
      await fulfill(200, { csrfToken: 'test-token' })
    } else if (path.endsWith('/tenants/slug/default')) {
      await fulfill(200, { id: 'test-tenant', name: 'Default', slug: 'default', isActive: true })
    } else if (path.endsWith('/admin/logs')) {
      await fulfill(200, { data: [] })
    } else {
      await fulfill(200, {})
    }
  })

  await page.goto('/default/dashboard')
  await expect(page.getByRole('heading', { name: 'Unable to verify access' })).toBeVisible()
  expect(permissionRequests).toBeGreaterThan(0)
  const requestsAfterFailure = permissionRequests

  await page.waitForTimeout(800)
  expect(permissionRequests).toBe(requestsAfterFailure)
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()

  permissionsAvailable = true
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome to your Admin Dashboard' })).toBeVisible()
  expect(permissionRequests).toBe(requestsAfterFailure + 1)
})
