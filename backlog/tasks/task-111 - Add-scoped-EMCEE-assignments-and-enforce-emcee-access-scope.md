---
id: TASK-111
title: Add scoped EMCEE assignments and enforce emcee access scope
status: To Do
assignee: []
created_date: '2026-07-09 16:52'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
EMCEE currently behaves as a tenant-wide role in the operational app. Although test setup can seed EMCEE roleAssignment records, the live role-assignment service/UI only supports BOARD, TALLY_MASTER, and AUDITOR, and emcee controllers/services do not enforce per-event, per-contest, or per-category scope derived from assignments. Add first-class scoped EMCEE support so an emcee user can be limited to specific events, contests, or categories.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Role assignment management supports creating, listing, and removing scoped EMCEE assignments at event, contest, and category levels.
- [ ] #2 Runtime access checks enforce EMCEE scope for emcee-facing data and workflows so users only see resources within their assigned scope.
- [ ] #3 EMCEE scope behavior is covered by backend tests for event-, contest-, and category-scoped access, including no-assignment denial cases.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
