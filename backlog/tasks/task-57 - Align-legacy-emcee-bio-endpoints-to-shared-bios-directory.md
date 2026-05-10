---
id: TASK-57
title: Align legacy emcee bio endpoints to shared bios directory
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 18:14'
updated_date: '2026-05-10 18:28'
labels:
  - emcee
  - bios
  - security
  - cleanup
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Remove or refactor the remaining emcee-specific contestant/judge bio API surfaces so they follow the canonical shared bios model, enforce tenant-safe scoping, and do not drift from the shared BioService behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Legacy emcee-specific contestant/judge bio endpoints are either removed or rewritten to delegate to the shared BioService path with tenant-aware filtering.
- [x] #2 Any remaining emcee bio API behavior matches the shared bios directory contract for allowed scope and returned data shape, unless a justified exception is documented.
- [x] #3 Tenant-safe scoping is enforced for emcee bio reads, with regression coverage preventing cross-tenant or unscoped access regressions.
- [x] #4 Frontend emcee entry points continue to use the canonical shared bios experience instead of depending on separate emcee-only bio routes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the legacy emcee-specific contestant/judge bio service logic with delegation to `BioService`, so `/api/emcee/contestant-bios` and `/api/emcee/judge-bios` use the same tenant-aware filtering and normalized output path as the shared bios directory.
2. Update the emcee controller wiring and dependency injection as needed while keeping the compatibility routes in place, since active frontend entry points already use the canonical `/bios` experience.
3. Add focused regression coverage proving the emcee bio endpoints enforce tenant-safe scoping and match the shared bios contract rather than their old parallel implementation.
4. Run targeted backend verification plus build checks, then close the task with the compatibility/canonical ownership notes documented.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Replaced legacy emcee bio service fan-out with delegation to shared BioService for contestant and judge compatibility endpoints.
- Added tenant-context enforcement in the emcee controller compatibility routes so unscoped requests fail fast before reaching the shared service.
- Updated service and controller regression coverage to assert shared bios delegation and tenant-aware compatibility behavior.
- Verification: npx jest tests/unit/services/EmceeService.test.ts tests/unit/controllers/emceeController.test.ts --runInBand, npm run build, cd frontend && npm run type-check, cd frontend && npm run build
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the legacy /api/emcee/contestant-bios and /api/emcee/judge-bios compatibility routes to the canonical shared bios flow instead of maintaining a parallel emcee-only implementation.

Changes:
- Updated EmceeService contestant/judge bio methods to delegate to BioService, preserving the compatibility endpoints while normalizing scope and payload behavior with the shared /bios experience.
- Added tenant-context enforcement in EmceeController so unscoped compatibility requests fail fast rather than reading without tenant scope.
- Reworked the emcee controller and service tests to assert shared-service delegation and tenant-aware compatibility behavior.

Tests:
- npx jest tests/unit/services/EmceeService.test.ts tests/unit/controllers/emceeController.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
