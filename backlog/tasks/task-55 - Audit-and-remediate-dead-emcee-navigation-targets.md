---
id: TASK-55
title: Audit and remediate dead emcee navigation targets
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 18:04'
labels:
  - emcee
  - navigation
  - ux
  - cleanup
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the emcee-related entries emitted by current navigation systems and remove, replace, or redirect dead targets that do not correspond to real app routes or valid emcee workflows. This task should first confirm whether any active clients still consume the legacy navigation API, then clean up misleading emcee navigation without breaking live consumers unexpectedly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The emcee-related navigation entries produced by the active frontend navigation config and any legacy navigation API are inventoried and classified as valid, misleading, dead, or redundant.
- [ ] #2 The task confirms whether the legacy navigation API still has active consumers that would be impacted by removing or changing emcee navigation targets.
- [ ] #3 Dead or misleading emcee navigation targets are removed, corrected, or replaced with safe redirects/aliases according to the confirmed consumer impact.
- [ ] #4 Navigation changes preserve tenant-prefixed route behavior and do not introduce new dead ends or broken app-route recognition.
- [ ] #5 The final outcome clearly documents which emcee navigation entries remain canonical and which legacy entries were removed or redirected.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the emcee-related navigation emitted by the active frontend config and the legacy `/api/navigation` middleware, and classify each entry as canonical, redundant, misleading, or dead.
2. Confirm legacy navigation API usage in the codebase; if there are no active in-repo consumers, treat the middleware output as legacy compatibility surface and clean it up without preserving duplicate dead entries.
3. Update the legacy navigation middleware so emcee-related entries point at canonical routes: scripts to `/emcee?tab=scripts`, bios to `/bios`, and remove or consolidate dead entries that no longer map to a real product surface.
4. Add safe frontend route aliases and route-segment recognition for old legacy emcee paths so bookmarked or externally-rendered links like `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, and `/event-management` resolve to valid tenant-aware destinations instead of dead ends.
5. Run focused backend/frontend verification, then document which emcee navigation entries remain canonical and which legacy targets were corrected or aliased.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
