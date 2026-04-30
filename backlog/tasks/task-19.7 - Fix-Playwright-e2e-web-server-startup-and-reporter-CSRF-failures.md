---
id: TASK-19.7
title: Fix Playwright e2e web server startup and reporter CSRF failures
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - e2e
  - playwright
  - frontend
  - backend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:e2e:pw launched Playwright but timed out waiting 120 seconds for the configured web server. No browser tests executed. The Prometheus reporter also hit HTTP 403 responses caused by CSRF validation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 npm run test:e2e:pw starts its configured web server within the timeout in a clean local test run
- [ ] #2 Playwright e2e tests execute at least one browser test instead of reporting 0 passed, 0 failed, 0 skipped
- [ ] #3 Prometheus reporter calls either include valid CSRF handling, use an allowed test endpoint, or are disabled for local test runs
- [ ] #4 Failure output distinguishes app startup failures from browser assertion failures
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
