/**
 * E2E Tests for Fixed Issues
 * Tests the fixes discovered during manual testing
 */

import { test, expect } from '@playwright/test';

test.describe('Manual Testing Fixes - E2E', () => {
  let authToken: string;
  let adminAuthToken: string;

  test.beforeAll(async ({ request }) => {
    // Login as admin
    const adminResponse = await request.post('/api/auth/login', {
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@eventmanager.com',
        password: process.env.ADMIN_PASSWORD || 'password123'
      }
    });
    
    if (adminResponse.ok()) {
      const adminData = await adminResponse.json();
      adminAuthToken = adminData.token || adminData.data?.token;
    }
  });

  test('Contestant visibility settings should be parsed correctly', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    // Get visibility settings
    const response = await request.get('/api/settings/contestant-visibility', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    
    // Should return transformed format
    expect(data.data || data).toHaveProperty('canViewWinners');
    expect(data.data || data).toHaveProperty('canViewOverallResults');
    expect(typeof (data.data || data).canViewWinners).toBe('boolean');
    expect(typeof (data.data || data).canViewOverallResults).toBe('boolean');
  });

  test('Database browser should show all tables', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    const response = await request.get('/api/admin/database/tables', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    expect(response.ok()).toBe(true);
    const data = await response.json();
    const tables = data.data || data;

    expect(Array.isArray(tables)).toBe(true);
    expect(tables.length).toBeGreaterThan(5); // Should have more than just a few tables

    // Check for common tables
    const tableNames = tables.map((t: any) => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('events');
    expect(tableNames).toContain('contests');
  });

  test('GET /api/contests/{id} should not return 500', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    // First get a contest ID
    const contestsResponse = await request.get('/api/contests', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    if (contestsResponse.ok()) {
      const contestsData = await contestsResponse.json();
      const contests = contestsData.data || contestsData;
      
      if (Array.isArray(contests) && contests.length > 0) {
        const contestId = contests[0].id;
        
        const response = await request.get(`/api/contests/${contestId}`, {
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        });

        expect(response.status()).not.toBe(500);
        expect(response.ok()).toBe(true);
      }
    }
  });

  test('GET /api/judge-certifications/category/{id}/status should work for admins', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    // Get a category ID
    const categoriesResponse = await request.get('/api/categories', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    if (categoriesResponse.ok()) {
      const categoriesData = await categoriesResponse.json();
      const categories = categoriesData.data || categoriesData;
      
      if (Array.isArray(categories) && categories.length > 0) {
        const categoryId = categories[0].id;
        
        const response = await request.get(`/api/judge-certifications/category/${categoryId}/status`, {
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        });

        expect(response.status()).not.toBe(404);
        expect(response.ok()).toBe(true);
        
        const data = await response.json();
        expect(data.data || data).toHaveProperty('categoryId');
        expect(data.data || data).toHaveProperty('completionPercentage');
      }
    }
  });

  test('GET /api/auditor/completed-audits should not return 404', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    const response = await request.get('/api/auditor/completed-audits', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    expect(response.status()).not.toBe(404);
    // Should return 200 or 403 (if not authorized), but not 404
    expect([200, 403]).toContain(response.status());
  });

  test('GET /api/board/certification-status should not return 404', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    const response = await request.get('/api/board/certification-status', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    expect(response.status()).not.toBe(404);
    // Should return 200 or 403 (if not authorized), but not 404
    expect([200, 403]).toContain(response.status());
  });

  test('GET /api/tally-master/contest/{id}/certifications should not return 501', async ({ request }) => {
    if (!adminAuthToken) {
      test.skip();
      return;
    }

    // Get a contest ID
    const contestsResponse = await request.get('/api/contests', {
      headers: {
        'Authorization': `Bearer ${adminAuthToken}`
      }
    });

    if (contestsResponse.ok()) {
      const contestsData = await contestsResponse.json();
      const contests = contestsData.data || contestsData;
      
      if (Array.isArray(contests) && contests.length > 0) {
        const contestId = contests[0].id;
        
        const response = await request.get(`/api/tally-master/contest/${contestId}/certifications`, {
          headers: {
            'Authorization': `Bearer ${adminAuthToken}`
          }
        });

        expect(response.status()).not.toBe(501);
        expect(response.ok()).toBe(true);
        
        const data = await response.json();
        expect(data).toHaveProperty('contestId');
        expect(data).toHaveProperty('categories');
        expect(Array.isArray(data.categories)).toBe(true);
      }
    }
  });
});

