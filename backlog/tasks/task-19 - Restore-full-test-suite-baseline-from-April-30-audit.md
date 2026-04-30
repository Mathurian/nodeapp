---
id: TASK-19
title: Restore full test suite baseline from April 30 audit
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - ci
  - qa
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Parent task for resolving the failures and coverage gaps found during the April 30, 2026 full-suite test run. The audit covered backend Jest unit/integration/contracts/e2e scripts, Playwright e2e, backend and frontend builds/typechecks, tenant guardrails, frontend lint, visual regression, and accessibility tests.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each failing or incomplete test command from the audit has a focused high-priority follow-up task
- [ ] #2 All child tasks are completed or explicitly closed with documented rationale
- [ ] #3 A final full-suite rerun records command-by-command pass/fail evidence after fixes are in place
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
