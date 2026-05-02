---
id: TASK-19.10
title: Fix root frontend test script mismatch
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:37'
updated_date: '2026-05-02 06:33'
labels:
  - tests
  - frontend
  - ci
  - package-scripts
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:frontend failed because the root script runs cd frontend && npm run test, but the frontend package does not define a test script. The command is currently a broken release gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run test:frontend runs a real frontend test command or is renamed/removed with package scripts updated consistently
- [x] #2 The frontend package exposes the intended test entrypoint, or root package.json points to existing visual and accessibility commands explicitly
- [x] #3 The command no longer fails with Missing script: test
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm current root and frontend scripts and identify broken frontend test entrypoints.
2. Add a real frontend test script that composes the existing visual and accessibility suites, and align the root helper scripts with that entrypoint.
3. Run the root frontend test command far enough to verify it no longer fails with Missing script: test, then record any genuine suite failures for downstream 19.* tasks.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added frontend package scripts: test composes test:visual and test:a11y; test:ui launches Playwright UI over visual and a11y test directories.
- Root npm run test:frontend now reaches frontend Playwright visual tests through cd frontend && npm run test.
- Verification: npm run test:frontend no longer fails with Missing script: test. It executed 20 visual tests: 18 passed, 2 failed due visual baseline issues tracked by TASK-19.12 (Header navigation screenshot timeout; Dashboard dark mode 0.93 pixel-ratio diff). Accessibility did not run because visual failed first in the composed command.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Restored the root frontend test entrypoint by adding real frontend package scripts.

Changes:
- Added frontend test script that composes the existing visual and accessibility Playwright suites.
- Added frontend test:ui script for interactive Playwright UI over visual and accessibility directories.
- Kept root test:frontend and test:frontend:ui aliases stable by making their frontend targets exist.

Verification:
- npm run test:frontend no longer fails with Missing script: test. It ran the visual suite and reported 18 passed, 2 failed. The failures are the existing visual regression baseline issues tracked by TASK-19.12, not a package script mismatch.

Follow-up:
- TASK-19.12 remains responsible for resolving the visual baseline failures before the composed frontend test can pass end to end.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
