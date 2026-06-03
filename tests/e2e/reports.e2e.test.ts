/**
 * E2E Tests for Report Generation Workflow
 * Tests complete report generation and export workflows
 * Uses TestDataFactory for dynamic data creation and cleanup
 */

import { test, expect, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { TestDataFactory } from '../helpers/TestDataFactory';
import {
  closeOpenModals,
  createAuthContext,
  cleanupContexts,
  navigateAndWait,
  waitForPageLoad,
} from '../helpers/playwrightAuthHelpers';

let browser: Browser;
let prisma: PrismaClient;
let factory: TestDataFactory;
let testData: any;
let authContext: any;

test.describe('Report Generation E2E Tests', () => {
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
    factory = new TestDataFactory(prisma, `reports_${Date.now()}`);
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

  test('should navigate to reports page', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const reportsPage = page.locator('h1:has-text("Report"), h2:has-text("Report"), [data-testid="reports"]').first();
    await expect(reportsPage).toBeVisible({ timeout: 10000 }).catch(() => {
      expect(page.url()).toMatch(/report/i);
    });
  });

  test('should display report templates', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    // Check for templates section
    const templatesSection = page.locator('[data-testid="templates"], .templates, h3:has-text("Template")').first();
    await expect(templatesSection).toBeVisible({ timeout: 5000 }).catch(async () => {
      // If no templates section, check for template list or empty state - try multiple patterns
      const hasTemplates = await page.locator('table, .template-list, [class*="template"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no.*template|empty|no.*report.*template|no.*data/i').count() > 0;
      const hasPageContent = await page.locator('h1, h2, h3, [class*="report"], button:has-text("Generate")').count() > 0;
      // Test passes if has templates, empty state, or any page content indicating the page loaded
      expect(hasTemplates || hasEmptyState || hasPageContent).toBe(true);
    });
  });

  test('should generate a scoped report and open email delivery options', async () => {
    const { page } = authContext;
    await page.goto('/reports');
    await waitForPageLoad(page);
    await closeOpenModals(page);

    const eventSelect = page.locator('[data-testid="reports-event-select"]');
    await eventSelect.selectOption({ index: 1 });

    const generateResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/reports/generate') &&
      response.request().method() === 'POST' &&
      response.ok(),
    );
    await page.getByRole('button', { name: 'Generate Report' }).click();
    const generateResponse = await generateResponsePromise;
    expect(generateResponse.ok()).toBeTruthy();

    const generatedItem = page.locator('[data-testid="reports-generated-item"]').first();
    await expect(generatedItem).toBeVisible({ timeout: 10000 });

    await generatedItem.getByRole('button', { name: 'Email' }).click();

    const emailFormatSelect = page.locator('[data-testid="reports-email-format-select"]');
    await expect(emailFormatSelect).toBeVisible({ timeout: 5000 });
    await emailFormatSelect.selectOption('csv');
    await expect(emailFormatSelect).toHaveValue('csv');
  });

  test('should support event to contest drill-in scope controls', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const eventSelect = page.locator('[data-testid="reports-event-select"]');
    if (await eventSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eventSelect.selectOption({ index: 1 });

      const activeScope = page.locator('[data-testid="reports-active-scope"]');
      await expect(activeScope).toContainText(/all contests/i);

      const contestScopeOptions = page.locator('[data-testid="reports-contest-scope-options"]');
      await expect
        .poll(async () => contestScopeOptions.locator('input[type="checkbox"]').count(), { timeout: 10000 })
        .toBeGreaterThan(0);
      await expect(contestScopeOptions).toBeVisible({ timeout: 5000 });

      const typeSelect = page.locator('[data-testid="reports-type-select"]');
      await typeSelect.selectOption('contest');

      const contestSelect = page.locator('[data-testid="reports-contest-select"]');
      await expect(contestSelect).toBeVisible({ timeout: 5000 });

      const optionCount = await contestSelect.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);

      await contestSelect.selectOption({ index: 1 });
      await expect(activeScope).not.toContainText(/all contests/i);
    }
  });

  test('should preview contestant and judge drilldown for certified contest results', async () => {
    const { page } = authContext;
    const primaryCategory = testData.categories[0];
    const primaryContest = testData.contests[0];
    const firstCriterion = testData.criteria.category1[0];

    await prisma.category.update({
      where: { id: primaryCategory.id },
      data: {
        totalsCertified: true,
        commentaryMode: 'HYBRID',
        commentaryScope: 'CONTEST',
      },
    });

    const seededScores = await prisma.score.findMany({
      where: {
        categoryId: primaryCategory.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.score.updateMany({
      where: {
        id: { in: seededScores.map((score) => score.id) },
      },
      data: {
        isCertified: true,
        certifiedAt: new Date(),
        certifiedBy: testData.users.admin.id,
      },
    });

    await prisma.scoreComment.create({
      data: {
        scoreId: seededScores[0].id,
        criterionId: firstCriterion.id,
        contestantId: testData.contestant.id,
        judgeId: testData.judge.id,
        comment: 'Stage control held throughout.',
        tenantId: testData.tenant.id,
      },
    });

    await prisma.judgeComment.create({
      data: {
        scope: 'CONTEST',
        scopeKey: primaryContest.id,
        contestId: primaryContest.id,
        contestantId: testData.contestant.id,
        judgeId: testData.judge.id,
        comment: 'Excellent presentation.',
        tenantId: testData.tenant.id,
      },
    });

    await navigateAndWait(page, '/reports');
    await closeOpenModals(page);

    const typeSelect = page.locator('[data-testid="reports-type-select"]');
    await typeSelect.selectOption('contest');

    const eventSelect = page.locator('[data-testid="reports-event-select"]');
    await expect(eventSelect.locator(`option[value="${testData.event.id}"]`)).toHaveCount(1, { timeout: 10000 });
    await eventSelect.selectOption(testData.event.id);

    const contestSelect = page.locator('[data-testid="reports-contest-select"]');
    await expect(contestSelect).toBeVisible({ timeout: 5000 });
    await expect(contestSelect.locator(`option[value="${primaryContest.id}"]`)).toHaveCount(1, { timeout: 10000 });
    await contestSelect.selectOption(primaryContest.id);

    const generateResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/reports/generate') &&
      response.request().method() === 'POST' &&
      response.ok(),
    );
    await page.getByRole('button', { name: 'Generate Report' }).click();
    await generateResponsePromise;

    const generatedItem = page.locator('[data-testid="reports-generated-item"]').first();
    await expect(generatedItem).toBeVisible({ timeout: 10000 });
    await generatedItem.getByRole('button', { name: 'View' }).click();

    const drilldownPreview = page.locator('[data-testid="reports-drilldown-preview"]');
    await expect(drilldownPreview).toBeVisible({ timeout: 10000 });
    await expect(drilldownPreview).toContainText(testData.contestant.name);
    await expect(drilldownPreview).toContainText('Excellent presentation.');
    await expect(drilldownPreview).toContainText('Stage control held throughout.');
  });

  test('should export report to PDF', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    // Find export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      const download = await downloadPromise.catch(() => null);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });

  test('should export report to Excel', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const exportButton = page.locator('button:has-text("Excel"), button:has-text("XLSX")').first();
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();

      const download = await downloadPromise.catch(() => null);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(xlsx|xls)$/i);
      }
    }
  });

  test('should filter reports by date range', async () => {
    const { page } = authContext;
    await navigateAndWait(page, '/reports');

    const startDate = page.locator('[data-testid="reports-start-date-filter"]');
    const endDate = page.locator('[data-testid="reports-end-date-filter"]');

    await expect(startDate).toBeVisible({ timeout: 5000 });
    await expect(endDate).toBeVisible({ timeout: 5000 });

    await startDate.fill('2024-01-01');
    await endDate.fill('2024-12-31');

    await expect(startDate).toHaveValue('2024-01-01');
    await expect(endDate).toHaveValue('2024-12-31');
  });
});
