---
id: TASK-53
title: 'Fix emcee script contract, scope workflow, and viewer access'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 17:22'
labels:
  - emcee
  - scripts
  - permissions
  - ux
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remediate the emcee script workflow so it matches the intended product model: emcee users should have read-only access to scripts, while board and organizer roles remain responsible for creating, uploading, editing, scoping, and deleting scripts. This task should fix the current frontend/backend field contract mismatch, expose script scope management that aligns with the event/contest/category data model, and verify that emcee users can actually open and read the scoped scripts that are meant for them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The emcee script create/edit contract is made consistent across frontend, backend, and database usage so script metadata fields behave as intended.
- [ ] #2 Board and organizer users can create, upload, edit, delete, and scope emcee scripts by event, contest, and category using the canonical script workflow.
- [ ] #3 Emcee users remain read-only for scripts and cannot access script-management actions in the UI or via the intended API surface.
- [ ] #4 The emcee script list and filtering behavior reflects the intended scope rules so users are not forced through a flat tenant-wide script list when scoped scripts exist.
- [ ] #5 Emcee users can successfully open and read script files in the supported viewer/download flow after the workflow and scope changes are complete.
- [ ] #6 Any authorization or scope changes preserve tenant safety and avoid broadening script access beyond the intended roles.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Normalize the emcee script data contract across frontend and backend so create/edit/list views use one consistent metadata model, preserving existing stored data where possible.
2. Update the canonical emcee script workflow so board and organizer users can scope scripts by event, contest, and category, and so list filtering follows those scope selections instead of a flat tenant-wide list.
3. Keep emcee users read-only by preserving route/API restrictions and hiding management actions in the UI while still letting them filter and consume scoped scripts.
4. Fix and verify the emcee script open/view flow for supported files so emcee users can reliably read scripts after the workflow changes.
5. Add focused backend/frontend regression coverage where practical, run targeted verification, and then close the task against the acceptance criteria.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
