---
id: TASK-57
title: Align legacy emcee bio endpoints to shared bios directory
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 18:14'
updated_date: '2026-05-10 18:16'
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
- [ ] #1 Legacy emcee-specific contestant/judge bio endpoints are either removed or rewritten to delegate to the shared BioService path with tenant-aware filtering.
- [ ] #2 Any remaining emcee bio API behavior matches the shared bios directory contract for allowed scope and returned data shape, unless a justified exception is documented.
- [ ] #3 Tenant-safe scoping is enforced for emcee bio reads, with regression coverage preventing cross-tenant or unscoped access regressions.
- [ ] #4 Frontend emcee entry points continue to use the canonical shared bios experience instead of depending on separate emcee-only bio routes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the legacy emcee-specific contestant/judge bio service logic with delegation to `BioService`, so `/api/emcee/contestant-bios` and `/api/emcee/judge-bios` use the same tenant-aware filtering and normalized output path as the shared bios directory.
2. Update the emcee controller wiring and dependency injection as needed while keeping the compatibility routes in place, since active frontend entry points already use the canonical `/bios` experience.
3. Add focused regression coverage proving the emcee bio endpoints enforce tenant-safe scoping and match the shared bios contract rather than their old parallel implementation.
4. Run targeted backend verification plus build checks, then close the task with the compatibility/canonical ownership notes documented.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
