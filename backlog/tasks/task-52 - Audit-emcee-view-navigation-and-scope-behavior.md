---
id: TASK-52
title: 'Audit emcee view, navigation, and scope behavior'
status: Done
assignee:
  - '@codex'
created_date: '2026-05-10 17:01'
updated_date: '2026-05-10 17:08'
labels:
  - emcee
  - audit
  - ux
  - security
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review the emcee-facing experience and related backend/frontend functionality to confirm the current feature set is necessary, working, and appropriately scoped. This audit should compare the emcee view against related role views for parity where appropriate, identify missing capabilities that are required for production use, flag dead or unnecessary functionality, and check for permissions or tenant/event scope creep. It should also evaluate the emcee navigation for logic gaps, confusing routes, or inconsistent visibility.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The current emcee view, related APIs, and major workflows are inventoried with notes on what is working, broken, unnecessary, or missing for production use.
- [x] #2 The audit compares emcee-facing behavior against relevant related views or role surfaces and identifies meaningful parity gaps or justified differences.
- [x] #3 The audit explicitly reviews authorization, tenant/event/contest scope handling, and any permissions creep or overexposure risks in the emcee flow.
- [x] #4 The emcee navigation and route exposure are reviewed for logic gaps, dead ends, redundant entries, or confusing transitions, with concrete findings and recommendations.
- [x] #5 Findings are delivered in a prioritized code-review style summary with file references and clear follow-up recommendations or backlog splits where needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the emcee-facing frontend routes, navigation entries, pages, and backend APIs to define the actual surface area under review.
2. Compare the emcee flow against adjacent role-based experiences and identify parity gaps, missing production functionality, or dead/unnecessary features.
3. Review authorization and tenant/event/contest scoping across emcee routes and APIs to detect overexposure, permissions drift, or navigation visibility issues.
4. Summarize findings in a prioritized code-review style report with file references, clear risks, and recommended follow-up tasks where needed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Audited the emcee surface across `EmceePage`, `emceeRoutes`, `EmceeService`, legacy board script APIs, route registration, and navigation config.
- Confirmed the main production issues are a script field contract mismatch, missing UI for script scoping despite backend/schema support, and dead/misleading emcee navigation targets emitted by the legacy navigation API.
- Confirmed additional emcee-specific APIs exist for stats, bios, events, contests, history, and file view URLs, but the current frontend does not consume most of them, leaving notable parity and ownership drift.
- No code changes were made and no tests were run because this task was an audit/review only.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Completed an audit of the emcee view, related APIs, and navigation/scope behavior.

Findings:
- The emcee script form is contract-misaligned: the UI sends and renders `description`, while the backend model/controller persist `content`, so the description field is effectively nonfunctional.
- Script scoping is supported in the schema/backend (`eventId`, `contestId`, `categoryId`) but the emcee UI does not let users set or filter by that scope, which makes the current script workflow less viable for production event operations.
- The legacy navigation API still emits dead or misleading emcee links such as `/contestant-bios`, `/judge-bios`, `/event-management`, and `/emcee-scripts`; those routes are not registered in the app router and some are not even recognized as app routes.
- Emcee script ownership is split between `/api/emcee/*` and legacy `/api/board/emcee-scripts`, which increases drift risk and muddies permissions/navigation intent.
- Several emcee-specific backend endpoints (stats, bios, history, scoped event/contest reads) are present but not integrated into the current frontend experience, indicating parity gaps and stale surface area.

No code changes were made; this task delivered review findings and follow-up recommendations only.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
