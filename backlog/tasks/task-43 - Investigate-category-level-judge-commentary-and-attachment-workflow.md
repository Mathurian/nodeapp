---
id: TASK-43
title: Investigate category-level judge commentary and attachment workflow
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-10 02:48'
updated_date: '2026-05-10 03:30'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate whether judge comments and commentary attachments should be captured at the category level instead of per criterion for scoring workflows with multiple criteria under a category, such as Education, Formal Wear, and similar sections. Evaluate the current per-criterion UX and data model, determine whether category-level commentary better matches judging practice, and assess whether organizers should be able to choose per-category commentary, per-criterion commentary, or both through configuration.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The investigation documents the current per-criterion commentary and upload behavior in scoring flows and identifies the main usability or workflow issues it creates for judges.
- [ ] #2 The task defines at least one viable implementation approach for category-level commentary and attachments, including required backend, frontend, migration, and reporting impacts.
- [ ] #3 The investigation evaluates whether organizers should be able to choose per-criterion, per-category, or hybrid commentary behavior and documents the recommended product decision and configuration approach.
- [ ] #4 If feasible within scope, a standards-compliant implementation is delivered or a clearly scoped follow-up implementation plan is recorded with risks, constraints, and dependencies.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Document the current state: per-criterion text comments live on score rows, commentary APIs still require score and criterion context, category-level attachments already exist, and the existing `JudgeComment` category+contestant+judge model is currently unused in the active scoring flow.
2. Define the recommended product shape: add an explicit commentary mode configuration at the category level (`PER_CRITERION`, `PER_CATEGORY`, `HYBRID`) and use `JudgeComment` as the canonical store for category-level text while preserving existing score-row comments for per-criterion mode.
3. If the implementation scope stays contained, add the backend/frontend path for category-level commentary and hybrid support: category config, scoring UI branching, category-level read/write endpoints, and reporting/read-model updates.
4. Add focused regression coverage and record any follow-up constraints if full reporting/export parity cannot ship in the same change.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
