import { test, expect, Page } from '@playwright/test'

const categories = [
  {
    id: 'cat-education',
    name: 'Education',
    contest: {
      id: 'contest-talent',
      name: 'Talent',
      event: {
        id: 'event-route-66',
        name: 'Route 66',
      },
    },
    contestants: [
      {
        id: 'contestant-retro',
        name: 'Retro',
        contestantNumber: 7,
      },
    ],
  },
]

const uatResult = {
  templateKey: 'education_omr_v3',
  sheetVersion: 'v3',
  templateVersion: 'education-omr-v3',
  upload: {
    fileName: 'phone-capture.jpg',
    originalFileType: 'image/jpeg',
    normalizedFileType: 'image/jpeg',
    fileSize: 12,
    converted: false,
    conversionStrategy: 'none',
  },
  context: {
    eventName: 'Route 66',
    contestName: 'Talent',
    categoryName: 'Education',
    judgeName: 'Daddie Danger',
    contestantName: 'Retro',
    evaluationOnly: true,
    certifiedOrLocked: true,
    certificationState: {
      categoryTotalsCertified: true,
      categoryBoardApproved: false,
      contestLocked: false,
      eventLocked: false,
    },
  },
  comparison: {
    groundTruthAvailable: true,
    exactRowCount: 2,
    rowCount: 3,
    exactRowMatchRate: 0.6667,
    expectedTotal: 25,
    computedTotal: 24,
    totalDelta: 1,
    ambiguousRowCount: 1,
    rejectedRowCount: 1,
    falseHighConfidenceMarkCount: 1,
  },
  routingRecommendation: {
    decision: 'manual_entry_required',
    retryable: true,
    recommendedAction: 'retry_upload_or_manual_entry',
    manualEntryOwner: 'attempting_user',
    attemptLimit: 3,
    attemptLedgerApplied: false,
    evaluationOnly: true,
  },
  extraction: {
    preprocessingMode: 'scan_bw',
    thresholdStrategy: 'otsu',
    normalizedImage: { width: 1700, height: 2200 },
    qualityGate: {
      decision: 'manual_entry_required',
      reasons: ['1 mark row rejected'],
      blockingReasons: ['1 mark row rejected'],
      retryable: true,
      attemptLimit: 3,
      recommendedAction: 'retry_upload_or_manual_entry',
      manualEntryOwner: 'attempting_user',
    },
    reviewBurdenMetrics: {
      rowCount: 3,
      detectedScoreRowCount: 3,
      ambiguousRowCount: 1,
      lowConfidenceRowCount: 0,
      missingScoreRowCount: 0,
      mismatchWarningCount: 1,
      rowsRequiringReviewCount: 1,
      estimatedManualCorrectionRows: 1,
      estimatedManualCorrectionRatio: 0.3333,
    },
    anchorQuality: {
      detected: true,
      minCornerDarkRatio: 0.92,
      cornerDarkRatios: { tl: 0.95, tr: 0.94, bl: 0.93, br: 0.92 },
      versionStripConfidence: 0.99,
      versionBits: [1, 0, 1, 0, 1, 0, 1, 0],
      fiducials: {
        detected: true,
        confidence: 0.98,
        perspectiveCorrected: true,
        failureReasons: [],
      },
    },
    markQuality: {
      acceptedRowCount: 2,
      rejectedRowCount: 1,
      missingMarkRowCount: 0,
      multiMarkRowCount: 1,
      lowConfidenceRowCount: 0,
    },
    rejectedRows: [
      {
        rowIndex: 2,
        criterionName: 'Timing',
        reason: 'multi_mark',
      },
    ],
    ignoredRegions: [{ name: 'commentary', purpose: 'judge_commentary' }],
    mismatchWarnings: ['Timing score differs from stored score'],
    overallConfidence: 0.91,
  },
  rows: [
    {
      rowIndex: 0,
      criterionId: 'criterion-stage',
      criterionName: 'Stage Presence',
      expectedScore: 10,
      detectedScore: 10,
      exactMatch: true,
      ambiguous: false,
      confidence: 0.97,
      rejected: false,
      rejectionReason: null,
      falseHighConfidenceMark: false,
      cellInkScores: [0.02, 0.95, 0.01],
    },
    {
      rowIndex: 1,
      criterionId: 'criterion-content',
      criterionName: 'Content',
      expectedScore: 8,
      detectedScore: 7,
      exactMatch: false,
      ambiguous: false,
      confidence: 0.96,
      rejected: false,
      rejectionReason: null,
      falseHighConfidenceMark: true,
      cellInkScores: [0.01, 0.96, 0.02],
    },
    {
      rowIndex: 2,
      criterionId: 'criterion-timing',
      criterionName: 'Timing',
      expectedScore: 7,
      detectedScore: 7,
      exactMatch: true,
      ambiguous: true,
      confidence: 0.6,
      rejected: true,
      rejectionReason: 'multi_mark',
      falseHighConfidenceMark: false,
      cellInkScores: [0.62, 0.61, 0.01],
    },
  ],
}

async function mockScoresheetUatApi(page: Page) {
  let evaluations = 0

  await page.route('**/api/tenants/slug/**', async (route) => {
    const slug = route.request().url().split('/').pop() || 'default'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'tenant-1',
          name: 'UAT Tenant',
          slug,
          isActive: true,
        },
      }),
    })
  })

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    const fulfill = async (data: unknown, status = 200) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ success: status < 400, data }),
      })
    }

    if (path.endsWith('/csrf-token')) {
      await fulfill({ csrfToken: 'csrf-token' })
      return
    }

    if (path.endsWith('/auth/profile')) {
      await fulfill({
        id: 'admin-1',
        name: 'UAT Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        tenantId: 'tenant-1',
        tenant: {
          id: 'tenant-1',
          name: 'UAT Tenant',
          slug: 'uat-tenant',
        },
      })
      return
    }

    if (path.endsWith('/auth/permissions')) {
      await fulfill({
        role: 'ADMIN',
        permissions: ['scores:read', 'score-files:upload', 'assignments:read', 'categories:read'],
        resourceScopes: {},
      })
      return
    }

    if (path.endsWith('/scoring/categories')) {
      await fulfill(categories)
      return
    }

    if (path.endsWith('/categories/cat-education')) {
      await fulfill({
        ...categories[0],
        totalsCertified: true,
        boardApproved: false,
        contest: {
          ...categories[0].contest,
          isLocked: false,
          event: {
            ...categories[0].contest.event,
            isLocked: false,
          },
        },
      })
      return
    }

    if (path.endsWith('/assignments')) {
      await fulfill([
        {
          id: 'categoryJudge_cat-education_judge-daddie',
          judgeId: 'judge-daddie',
          categoryId: 'cat-education',
          judge: {
            id: 'judge-daddie',
            name: 'Daddie Danger',
            email: 'daddie@example.com',
            isHeadJudge: false,
          },
        },
      ])
      return
    }

    if (path.endsWith('/assignments/category/cat-education/contestants')) {
      await fulfill([
        {
          contestantId: 'contestant-retro',
          contestant: {
            id: 'contestant-retro',
            name: 'Retro',
            contestantNumber: 7,
          },
        },
      ])
      return
    }

    if (path.endsWith('/score-files/scoresheet-import-uat')) {
      evaluations += 1
      await fulfill(uatResult)
      return
    }

    await fulfill([])
  })

  return () => evaluations
}

test('parse-only scoresheet UAT upload renders comparison details without score mutation actions', async ({ page }) => {
  const getEvaluationCount = await mockScoresheetUatApi(page)

  await page.goto('/scoresheet-import-uat')
  await expect(page.getByTestId('scoresheet-import-uat-page')).toBeVisible()
  const closeWelcomeGuide = page.getByRole('button', { name: /close welcome guide/i })
  if (await closeWelcomeGuide.isVisible().catch(() => false)) {
    await closeWelcomeGuide.click()
  }

  await page.getByLabel('Event').selectOption('event-route-66')
  await page.getByLabel('Contest', { exact: true }).selectOption('contest-talent')
  await page.getByLabel('Category').selectOption('cat-education')
  await page.getByLabel('Judge').selectOption('judge-daddie')
  await page.getByLabel('Contestant').selectOption('contestant-retro')
  await page.getByLabel('Phone capture').setInputFiles({
    name: 'phone-capture.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from('fake image'),
  })

  await page.getByRole('button', { name: /evaluate upload/i }).click()

  await expect(page.getByTestId('scoresheet-import-uat-result')).toBeVisible()
  await expect(page.getByText('2/3')).toBeVisible()
  await expect(page.getByText('Expected total')).toBeVisible()
  await expect(page.getByText('Computed total')).toBeVisible()
  await expect(page.getByText('Total delta')).toBeVisible()
  await expect(page.getByText('False high confidence', { exact: true })).toBeVisible()
  await expect(page.getByText('Anchor quality')).toBeVisible()
  await expect(page.getByText('Mark quality')).toBeVisible()
  await expect(page.getByText('Manual entry required', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Stage Presence', { exact: true })).toBeVisible()
  await expect(page.getByText('Content', { exact: true }).last()).toBeVisible()
  await expect(page.getByText('Timing', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /submit|certify|overwrite|draft/i })).toHaveCount(0)

  await page.getByRole('button', { name: /re-run evaluation/i }).click()
  await expect(page.getByText('Session evaluations: 2')).toBeVisible()
  expect(getEvaluationCount()).toBe(2)
})
