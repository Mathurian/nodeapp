---
id: TASK-55
title: Audit and remediate dead emcee navigation targets
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 17:19'
updated_date: '2026-05-10 18:09'
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
- [x] #1 The emcee-related navigation entries produced by the active frontend navigation config and any legacy navigation API are inventoried and classified as valid, misleading, dead, or redundant.
- [x] #2 The task confirms whether the legacy navigation API still has active consumers that would be impacted by removing or changing emcee navigation targets.
- [x] #3 Dead or misleading emcee navigation targets are removed, corrected, or replaced with safe redirects/aliases according to the confirmed consumer impact.
- [x] #4 Navigation changes preserve tenant-prefixed route behavior and do not introduce new dead ends or broken app-route recognition.
- [x] #5 The final outcome clearly documents which emcee navigation entries remain canonical and which legacy entries were removed or redirected.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the emcee-related navigation emitted by the active frontend config and the legacy `/api/navigation` middleware, and classify each entry as canonical, redundant, misleading, or dead.
2. Confirm legacy navigation API usage in the codebase; if there are no active in-repo consumers, treat the middleware output as legacy compatibility surface and clean it up without preserving duplicate dead entries.
3. Update the legacy navigation middleware so emcee-related entries point at canonical routes: scripts to `/emcee?tab=scripts`, bios to `/bios`, and remove or consolidate dead entries that no longer map to a real product surface.
4. Add safe frontend route aliases and route-segment recognition for old legacy emcee paths so bookmarked or externally-rendered links like `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, and `/event-management` resolve to valid tenant-aware destinations instead of dead ends.
5. Run focused backend/frontend verification, then document which emcee navigation entries remain canonical and which legacy targets were corrected or aliased.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Inventoried the active frontend navigation and the legacy `/api/navigation` middleware output. The real frontend nav was already canonical; the legacy middleware still emitted dead or misleading emcee-related paths including `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, and `/event-management`.
- Confirmed there are no active in-repo frontend consumers of `/api/navigation`; only the middleware, route registration, and its tests remain. Because external or bookmarked legacy links may still exist, the cleanup used both payload correction and frontend alias routes.
- Updated the legacy navigation middleware so board/emcee script entries now target `/emcee?tab=scripts`, consolidated emcee bios to the canonical `/bios` route, and removed the dead `event-management` entry from the emitted emcee nav payload.
- Added tenant-aware aliases and route recognition for `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, and `/event-management` so legacy links resolve to `/emcee?tab=scripts`, `/bios`, or `/emcee` instead of falling through to dead ends or public-landing misrouting.
- Added focused middleware coverage for the corrected legacy navigation payload and authenticated navigation response.
- Verification: `npx jest tests/unit/middleware/navigation.test.ts --runInBand`, `npm run build`, `cd frontend && npm run type-check`, `cd frontend && npm run build`.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Remediated the dead emcee navigation targets in the legacy navigation surface and added tenant-aware aliases so old links resolve cleanly.

Changes:
- Corrected legacy `/api/navigation` emcee-related entries to canonical destinations: board/emcee scripts now point to `/emcee?tab=scripts`, and emcee bios now point to `/bios`.
- Removed the dead `event-management` entry from the legacy emcee payload instead of continuing to emit a route with no real product surface.
- Added route-segment recognition and tenant-aware aliases for `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, and `/event-management` so legacy bookmarks or external links no longer 404 or get misclassified as tenant slugs.
- Replaced the placeholder navigation middleware test with focused assertions covering the corrected emcee payload.

Canonical outcome:
- Canonical emcee surfaces remain `/emcee`, `/emcee?tab=scripts`, and `/bios`.
- Legacy emitted targets removed or redirected: `/emcee-scripts`, `/contestant-bios`, `/judge-bios`, `/event-management`.

Verification:
- `npx jest tests/unit/middleware/navigation.test.ts --runInBand`
- `npm run build`
- `cd frontend && npm run type-check`
- `cd frontend && npm run build`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
