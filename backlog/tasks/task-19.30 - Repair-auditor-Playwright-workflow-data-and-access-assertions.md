---
id: TASK-19.30
title: Repair auditor Playwright workflow data and access assertions
status: Done
assignee:
  - '@codex'
created_date: '2026-05-02 21:41'
updated_date: '2026-05-02 22:25'
labels:
  - tests
  - e2e
  - playwright
  - auditor
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shard 1/4 of the TASK-19.28 Playwright rerun reported multiple auditor.e2e failures after tenant-aware navigation was fixed. The failures are concentrated in pending audit filters, score verification visibility/actions, result filtering, audit report export, audit-log action filtering, and auditor access expectations for the scoring page. Restore these tests to deterministic seeded data and current UI/access behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 tests/e2e/auditor.e2e.test.ts pending audit and score verification tests assert current seeded UI states instead of stale table/list selectors.
- [x] #2 Auditor result and audit-log filter tests select deterministic seeded event/contest/category/action values and verify current result or empty-state UI.
- [x] #3 Auditor restricted-route tests assert the current authorization policy for /scoring with a clear decision to update either product access or test expectation.
- [x] #4 A focused auditor Playwright run records pass/fail counts and no dummy passes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect auditor E2E tests and failure screenshots to map stale selectors versus product authorization behavior.
2. Patch deterministic auditor data/filter assertions for current UI patterns, mirroring the admin result-filter fix where applicable.
3. Resolve or document the auditor /scoring access policy expectation.
4. Run focused auditor Playwright tests, then the full auditor file, and record pass/fail counts.
5. Check acceptance criteria and add final summary if the auditor suite is restored.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Implemented deterministic auditor E2E seeding for an auditor-ready certification and CERTIFY_TOTALS audit log.
- Updated auditor audit log page to use the auditor audit-history endpoint instead of the admin audit-log endpoint.
- Updated stale auditor selectors/assertions for pending audits, score verification, results filters, reports, audit log filtering, and /scoring restricted access.
- Verification: npx playwright test tests/e2e/auditor.e2e.test.ts --project=chromium --workers=1 passed 31/31.
- Verification: npm run test:typecheck passed.
- Verification: cd frontend && npm run type-check passed.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the auditor Playwright workflow baseline against current tenant-aware UI behavior.

Changes:
- Seeded auditor-ready certification and CERTIFY_TOTALS audit-log records for deterministic auditor workflow assertions.
- Switched the auditor audit-log page to the auditor audit-history API and client-filtered the available action list.
- Updated stale Playwright selectors for auditor pending audits, score verification, result filters, reports, audit-log filtering, and restricted /scoring access.

Tests:
- npx playwright test tests/e2e/auditor.e2e.test.ts --project=chromium --workers=1: 31 passed / 0 failed.
- npm run test:typecheck: passed.
- cd frontend && npm run type-check: passed.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
