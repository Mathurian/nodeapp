---
id: TASK-19.12
title: Restore frontend visual regression baseline
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - visual
  - playwright
  - frontend
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
frontend npm run test:visual ran 20 Playwright visual tests. Ten passed and ten failed. Most failures were missing page snapshots that wrote actual images; the header navigation screenshot also timed out waiting for a stable header capture.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 cd frontend && npm run test:visual exits successfully without writing missing baseline snapshots during normal verification
- [ ] #2 Missing snapshots are either reviewed and committed intentionally or the corresponding tests are corrected/removed
- [ ] #3 The header navigation visual test captures a stable screenshot without timing out
- [ ] #4 The final visual result records passed and failed counts and any intentional snapshot updates
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
