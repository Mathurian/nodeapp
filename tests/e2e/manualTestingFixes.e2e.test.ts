/**
 * E2E Tests for Fixed Issues
 * Tests the fixes discovered during manual testing
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  createAuthContext,
  cleanupContexts,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Manual Testing Fixes - E2E', () => {
  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public',
        },
      },
    });
    await prisma.$connect();
  });

  test.beforeEach(async () => {
    factory = new TestDataFactory(prisma, `manual_fix_${Date.now()}`);
    testData = await factory.createCompleteEnvironment({
      createMultipleContests: true,
      createScores: true,
    });
    authContext = await createAuthContext(browser, testData.users.admin.email, 'password123', testData.tenant.slug);
  });

  test.afterEach(async () => {
    await cleanupContexts({ main: authContext });
    await factory.cleanup();
    const cleanupSuccess = await factory.verifyCleanup();
    if (!cleanupSuccess) {
      console.error('⚠️  Test data cleanup verification failed');
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Contestant visibility settings should be parsed correctly', async () => {
    const { request } = authContext;

    // Get visibility settings
    const response = await request.get('/api/settings/contestant-visibility');

    expect(response.ok()).toBe(true);
    const data = await response.json();

    // Should return transformed format
    expect(data.data || data).toHaveProperty('canViewWinners');
    expect(data.data || data).toHaveProperty('canViewOverallResults');
    expect(typeof (data.data || data).canViewWinners).toBe('boolean');
    expect(typeof (data.data || data).canViewOverallResults).toBe('boolean');
  });

  test('Database browser should show all tables', async () => {
    const { request } = authContext;

    const response = await request.get('/api/admin/database/tables');

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

  test('GET /api/contests/{id} should not return 500', async () => {
    const { request } = authContext;

    // Use contest from test data
    const contestId = testData.contests[0].id;

    const response = await request.get(`/api/contests/${contestId}`);

    expect(response.status()).not.toBe(500);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.data?.id || data.id).toBe(contestId);
  });

  test('GET /api/judge-certifications/category/{id}/status should work for admins', async () => {
    const { request } = authContext;

    // Use category from test data
    const categoryId = testData.categories[0].id;

    const response = await request.get(`/api/judge-certifications/category/${categoryId}/status`);

    expect(response.status()).not.toBe(404);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.data || data).toHaveProperty('categoryId');
    expect(data.data || data).toHaveProperty('completionPercentage');
  });

  test('GET /api/auditor/completed-audits should not return 404', async () => {
    const { request } = authContext;

    const response = await request.get('/api/auditor/completed-audits');

    expect(response.status()).not.toBe(404);
    // Should return 200 or 403 (if not authorized), but not 404
    expect([200, 403]).toContain(response.status());
  });

  test('GET /api/board/certification-status should not return 404', async () => {
    const { request } = authContext;

    const response = await request.get('/api/board/certification-status');

    expect(response.status()).not.toBe(404);
    // Should return 200 or 403 (if not authorized), but not 404
    expect([200, 403]).toContain(response.status());
  });

  test('GET /api/tally-master/contest/{id}/certifications should not return 501', async () => {
    const { request } = authContext;

    // Use contest from test data
    const contestId = testData.contests[0].id;

    const response = await request.get(`/api/tally-master/contest/${contestId}/certifications`);

    expect(response.status()).not.toBe(501);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('contestId');
    expect(data).toHaveProperty('categories');
    expect(Array.isArray(data.categories)).toBe(true);
  });
});
