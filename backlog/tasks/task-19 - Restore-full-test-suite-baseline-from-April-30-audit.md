---
id: TASK-19
title: Restore full test suite baseline from April 30 audit
status: In Progress
assignee:
  - '@codex'
created_date: '2026-04-30 13:36'
updated_date: '2026-05-02 17:53'
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
- [x] #1 Each failing or incomplete test command from the audit has a focused high-priority follow-up task
- [ ] #2 All child tasks are completed or explicitly closed with documented rationale
- [x] #3 A final full-suite rerun records command-by-command pass/fail evidence after fixes are in place
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm the April 30 audit command surface from package scripts and completed child task evidence.
2. Run the restored baseline commands command-by-command, recording pass/fail counts and failure details.
3. If a command exposes a new residual issue, create or reference a follow-up task instead of hiding the failure.
4. Update TASK-19 acceptance criteria, Definition of Done, and final summary only after the rerun evidence is complete.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Final rerun evidence recorded on 2026-05-02:
- PASS: npm run build -> backend TypeScript build completed and generated offline write ownership manifest.
- PASS: npm run test:typecheck -> backend test TypeScript project compiled with no errors.
- PASS: cd frontend && npm run lint -> ESLint exited 0 with quiet/max-warnings=0.
- PASS: cd frontend && npm run type-check -> frontend TypeScript check exited 0.
- PASS: cd frontend && npm run build -> Vite production build completed; 2002 modules transformed; PWA assets generated.
- PASS WITH RESIDUAL WARNINGS: npm test -> backend wrapper completed integration, 5 contract suites, and 184 unit suites; unit summary 3913 passed / 3913 total. Residuals discovered: category/event integration dummy-pass auth fallbacks, scoring contract dummy-pass warning, RateLimitService trustProxy ValidationError logs, and Jest forceExit warning. Created TASK-19.24 through TASK-19.27.
- PASS: npm run test:tenant-guardrails -> tenant audit/import guard/model parity exited 0. Audit still prints expected/manual-review baseline findings.
- PASS: npm run test:frontend -> visual 20 passed; a11y 11 passed; zero skips.
- FAIL: npm run test:e2e:pw -> 407 real Playwright tests ran in 12.0m; 313 passed and 94 failed. Created TASK-19.28 for the full e2e baseline failure set.

Parent TASK-19 remains In Progress because new high-priority child tasks were created from the final rerun and must be completed before AC #2 can be satisfied.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
