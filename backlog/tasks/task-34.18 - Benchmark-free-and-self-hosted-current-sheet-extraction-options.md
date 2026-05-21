---
id: TASK-34.18
title: Benchmark free and self-hosted current-sheet extraction options
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-21 20:40'
updated_date: '2026-05-21 20:43'
labels:
  - scoring
  - ocr
  - backend
  - research
dependencies: []
parent_task_id: TASK-34
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evaluate whether free or self-hosted extraction options can preserve the current Education scoresheet format while materially improving import accuracy before making paper-form changes. Compare improved deterministic local OMR, CPU-local mark classification, and self-hosted or free OCR/layout tools against the existing calibration corpus and any available small additional samples.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The benchmark compares the current extractor against improved local OMR, CPU-feasible local mark classification, and at least one free or self-hosted OCR/layout candidate without requiring scoresheet form changes.
- [ ] #2 The benchmark reports exact row match, exact sheet match, incorrect rows per page, ambiguous rows per page, false high-confidence marks, rejection rate, runtime, hosting requirements, and operational risks.
- [ ] #3 The recommendation identifies the best primary extraction path and whether any free hosted fallback is accurate enough to consider behind tenant opt-in controls.
- [ ] #4 Paid cloud services are excluded from the recommended production path.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
