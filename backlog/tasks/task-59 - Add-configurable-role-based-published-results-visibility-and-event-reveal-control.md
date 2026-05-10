---
id: TASK-59
title: >-
  Add configurable role-based published results visibility and event reveal
  control
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 18:56'
updated_date: '2026-05-10 19:48'
labels:
  - results
  - winners
  - permissions
  - product
  - emcee
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current hard-coded publish visibility assumptions with configurable role-based post-publication visibility rules and an event-level reveal control, so tenant admins can decide which roles may view published results or winners and whether event progress stays hidden until an event-level release moment.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Results and winners visibility is driven by configurable role-aware policy rather than only hard-coded contest-level checks for roles such as emcee and judge.
- [x] #2 Admins can configure which roles may view published winners/results after publication, including currently restricted roles that share the existing publish gate behavior.
- [x] #3 An event-level reveal or hide-progress control exists so designated roles such as emcees can be prevented from seeing winners/publication progress for an event until the event is fully released.
- [x] #4 Emcee navigation and route access are aligned to the new policy, including removing or restricting View Results for emcees when that role is not allowed by configuration.
- [x] #5 Focused verification covers pre-publish, post-publish, and event-reveal behavior across at least emcee, judge, and an admin-side privileged role.
- [x] #6 Event-level role visibility overrides can supersede tenant-level published-results defaults for a specific event, with clear fallback to tenant policy when no event override is configured.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a tenant-level published-results visibility policy in settings for role-based access to winners and detailed results, reusing the existing settings infrastructure rather than hard-coded role arrays in ResultsService and WinnerService.
2. Add an event-level reveal control and event-level role-visibility override on Event so admins can hide winners/publication progress for configured roles until an event is released and optionally vary visibility by event instead of only by tenant default.
3. Refactor ResultsService and WinnerService to use shared policy helpers for pre-publish, post-publish, tenant-default, and event-override decisions across emcee, judge, and privileged roles, while preserving contestant-specific visibility behavior.
4. Align frontend navigation and page behavior with the new policy, including restricting or removing View Results for emcees when the effective tenant-plus-event policy does not allow it, and exposing the new settings in admin-facing configuration/event management UI.
5. Add focused verification for policy behavior across at least emcee, judge, and admin-side privileged roles, including tenant-default and event-override cases, then run targeted backend/frontend checks before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added tenant-level published-results visibility settings for detailed results, winners, and publication progress.
- Added event-level override fields plus an event-wide hide-until-published control.
- Wired ResultsService and WinnerService through the new policy and aligned emcee navigation filtering to tenant defaults.
- Verification: npx prisma generate; npx tsc --noEmit --pretty false; cd frontend && npm run type-check; cd frontend && npm run build; npx jest tests/unit/services/ResultsService.test.ts tests/unit/services/WinnerService.test.ts tests/unit/services/EventService.test.ts --runInBand
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implemented configurable published-results visibility across tenant settings, event overrides, backend policy checks, and admin UI.

Changes:
- Added tenant settings for detailed-results, winners, and publication-progress role visibility.
- Added event-level override fields plus a hide-until-event-published control.
- Refactored ResultsService and WinnerService to enforce the new policy for judge/emcee consumer access while preserving privileged unpublished access and contestant-specific visibility rules.
- Updated settings and events admin forms and filtered emcee navigation against tenant defaults for Results/Winners entry points.

Verification:
- npx prisma generate
- npx tsc --noEmit --pretty false
- cd frontend && npm run type-check
- cd frontend && npm run build
- npx jest tests/unit/services/ResultsService.test.ts tests/unit/services/WinnerService.test.ts tests/unit/services/EventService.test.ts --runInBand
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
