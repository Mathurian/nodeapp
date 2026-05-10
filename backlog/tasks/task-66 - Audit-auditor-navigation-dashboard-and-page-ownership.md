---
id: TASK-66
title: 'Audit auditor navigation, dashboard, and page ownership'
status: To Do
assignee: []
created_date: '2026-05-10 23:00'
updated_date: '2026-05-10 23:01'
labels:
  - auditor
  - navigation
  - ux
  - audit
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Review whether auditor users should have judge scoring navigation, whether the /auditor page is intentionally distinct from score governance, and whether the auditor dashboard should link directly to deductions; then implement the correct information architecture and access pattern.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The current auditor navigation and landing-page structure is inventoried, including judge scoring navigation, /auditor, /dashboard, and deductions entry points.
- [ ] #2 The task documents which auditor surfaces are intentional versus redundant, and removes or adjusts incorrect navigation or duplicate page entry points accordingly.
- [ ] #3 If deductions are part of the intended auditor workflow, the auditor dashboard includes a clear route to that page; if not, the rationale is documented and no misleading entry point remains.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
