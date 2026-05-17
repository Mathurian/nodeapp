---
id: TASK-34.11
title: >-
  Define template versioning and recalibration workflow for supported scoresheet
  imports
status: To Do
assignee: []
created_date: '2026-05-17 20:09'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Document and operationalize how supported scoresheet templates are versioned, recalibrated, and revalidated when forms change. This task should make clear that the reliable import path is template-aware rather than dynamically inferring arbitrary future form revisions, and should define the process for adding or revising supported templates over time.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The supported model for scoresheet import is documented clearly as template-family and template-version aware, not generic dynamic form inference.
- [ ] #2 A recalibration workflow is defined for when a scoresheet layout changes, including template identification, sample collection, ground-truth updates, regression validation, and release gating.
- [ ] #3 Operational guidance is documented for how unknown, changed, or unsupported scoresheet templates should fail safely into review or manual delegated entry instead of being treated as supported imports.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
