---
id: TASK-19.28
title: Restore full Playwright e2e baseline after final rerun failures
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-02 17:53'
updated_date: '2026-05-09 21:02'
labels:
  - tests
  - e2e
  - playwright
  - frontend
  - backend
milestone: m-1
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The final TASK-19 full Playwright e2e rerun executed real tests but failed broadly: npm run test:e2e:pw ran 407 tests with 313 passed and 94 failed in 12.0 minutes. Failures span admin, auditor, auth, board, bulk operations, certification, role-specific comprehensive suites, event management, manual API checks, Olympic scoring, reports, scoring, and tally master. Common symptoms include protected routes redirecting to /login during authenticated role tests, missing expected role/page headings or data, and API endpoint assertions still returning unexpected 404/500/501 behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:e2e:pw runs the full suite with zero failed tests or has intentionally excluded tests documented in backlog with explicit rationale.
- [ ] #2 Authenticated role tests use deterministic session, tenant, and permission fixtures and do not intermittently land on /login after setup.
- [ ] #3 Data-backed flows for events, contests, categories, scoring, reports, certifications, and manual API checks seed and verify deterministic records instead of relying on stale UI assumptions.
- [ ] #4 The task final summary records the rerun counts and representative failure classes resolved.
- [x] #5 Any remaining failures are split into narrower high-priority child tasks before this task is closed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the Playwright configuration, global setup/auth fixtures, and recent failure artifacts to group the 94 failures by root cause.
2. Start with the highest-fanout issue: authenticated role/session setup redirecting to /login, because many role suites depend on it.
3. Patch deterministic fixture/session setup or route expectations in the smallest shared place, then run targeted Playwright subsets for the affected roles.
4. Address remaining deterministic data/API fixture failures in batches by suite area; split any large residual areas into child tasks if they are not feasible in this pass.
5. Run npm run test:e2e:pw when targeted failures are resolved, record counts, and close or leave explicit follow-up tasks for remaining failures.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Focused admin Playwright run: 21 passed, 12 failed. Mutation flows mostly pass due permissive assertions, while direct navigation checks land on the login page. Screenshots confirm `/events` reloads show login after tenant-scoped login, pointing to non-tenant navigation losing tenant context.

- Implemented tenant-aware Playwright navigation in tests/helpers/playwrightAuthHelpers.ts so tenant-scoped sessions keep the slug when tests navigate to app routes after login. Updated admin E2E selectors/interactions for current card/list/result/modal UI. Focused admin suite improved from 21 passed / 12 failed to 33 passed / 0 failed.

- Full npm run test:e2e:pw attempted after admin fixes. The run started 407 tests with 6 workers but the tool session exited with code -1 around test 205/407 before Playwright printed final totals; the orphaned Vite process was stopped. Partial evidence showed admin largely passing under parallel full-suite conditions, auth/board/bulk/certification mostly passing, and remaining failures clustered in auditor filters/access checks, comprehensive stale UI/data expectations, and contestant/results views.

- Created residual high-priority child tasks: TASK-19.30 for auditor workflow assertions, TASK-19.31 for auth password reset, TASK-19.32 for certification unauthorized-access expectations, and TASK-19.33 for finishing smaller sharded Playwright triage and parallel UI assumptions. Shard 1/4 completed at 94 passed / 12 failed before these tasks were created; shard 2/4 was interrupted before summary after exposing auditor accordion and comprehensive admin users residual failures.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
