---
id: TASK-34.6
title: >-
  Compare OCR, OCR-plus-LLM, and vision-model extraction paths for scoresheet
  import
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-17 06:56'
updated_date: '2026-05-17 06:56'
labels: []
dependencies: []
parent_task_id: TASK-34
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate whether classic OCR is the best foundation for scoresheet image import, or whether a hybrid or vision-model approach would better satisfy the end goal of accurate score and comments extraction from uploaded or photographed judge scoresheets. Include managed cloud, free-tier, and self-hosted options where viable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Classic OCR/document extraction, OCR plus LLM normalization, and direct vision-model extraction approaches are compared against the real scoresheet use case, including handwritten scores and comments.
- [ ] #2 The comparison includes viable managed cloud, free-tier, and self-hosted options, with tradeoffs for accuracy, privacy, operational complexity, and cost.
- [ ] #3 A recommendation is produced on whether OCR remains the best path forward for TASK-34 or whether a different technical approach should be preferred.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inspect the current scoring schema and review workflow again from the perspective of end-to-end import accuracy, including numeric scores, deductions, represented judge attribution, and comments handling.
2. Evaluate three approach families against the real scoresheet use case: classic OCR/document extraction, OCR plus LLM normalization, and direct vision-model extraction.
3. Include viable managed, free-tier, and self-hosted candidates where appropriate, and compare them on field accuracy, handwriting and comments handling, privacy posture, operational complexity, and auditability.
4. Use a real filled scoresheet sample to test whether the practical bottleneck is OCR quality, handwriting understanding, layout mapping, or comments extraction.
5. Produce a recommendation on whether OCR remains the best path for TASK-34 or whether a hybrid or alternate approach should be preferred.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
