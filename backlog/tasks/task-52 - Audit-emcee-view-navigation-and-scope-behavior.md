---
id: TASK-52
title: 'Audit emcee view, navigation, and scope behavior'
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 17:01'
updated_date: '2026-05-10 17:03'
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
- [ ] #1 The current emcee view, related APIs, and major workflows are inventoried with notes on what is working, broken, unnecessary, or missing for production use.
- [ ] #2 The audit compares emcee-facing behavior against relevant related views or role surfaces and identifies meaningful parity gaps or justified differences.
- [ ] #3 The audit explicitly reviews authorization, tenant/event/contest scope handling, and any permissions creep or overexposure risks in the emcee flow.
- [ ] #4 The emcee navigation and route exposure are reviewed for logic gaps, dead ends, redundant entries, or confusing transitions, with concrete findings and recommendations.
- [ ] #5 Findings are delivered in a prioritized code-review style summary with file references and clear follow-up recommendations or backlog splits where needed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the emcee-facing frontend routes, navigation entries, pages, and backend APIs to define the actual surface area under review.
2. Compare the emcee flow against adjacent role-based experiences and identify parity gaps, missing production functionality, or dead/unnecessary features.
3. Review authorization and tenant/event/contest scoping across emcee routes and APIs to detect overexposure, permissions drift, or navigation visibility issues.
4. Summarize findings in a prioritized code-review style report with file references, clear risks, and recommended follow-up tasks where needed.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
