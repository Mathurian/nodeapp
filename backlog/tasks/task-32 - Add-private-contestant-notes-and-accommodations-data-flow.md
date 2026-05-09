---
id: TASK-32
title: Add private contestant notes and accommodations data flow
status: To Do
assignee: []
created_date: '2026-05-09 20:50'
labels:
  - contestants
  - privacy
  - backend
  - frontend
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add first-class support for private contestant metadata such as accommodations, letters of recommendation, and internal notes. The application currently appears to support contestant bios and images, but not a dedicated private-notes capability. This task should introduce the underlying data model, API surface, and UI entry points needed before role-based visibility rules can be enforced cleanly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The system provides a dedicated way to store and update private contestant metadata separate from the public or semi-public bio/image experience.
- [ ] #2 Authorized staff can create and edit private contestant notes or accommodations data through supported UI and API flows.
- [ ] #3 The implementation defines the supported private contestant fields and how they are stored, retrieved, and excluded from existing bio-only views.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
