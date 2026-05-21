---
id: TASK-34.24
title: Add tenant opt-in controls for free scoresheet extraction fallback
status: To Do
assignee: []
created_date: '2026-05-21 20:41'
labels:
  - scoring
  - ocr
  - backend
  - frontend
  - settings
dependencies:
  - TASK-34.18
  - TASK-34.20
parent_task_id: TASK-34
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow a configured free hosted or self-hosted fallback extractor to be used in production only when a tenant explicitly opts in after accepting privacy, quota, availability, and accuracy tradeoffs.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The fallback extractor is disabled by default and cannot run for a tenant until an authorized tenant admin enables it.
- [ ] #2 The tenant setting clearly identifies the configured fallback provider or service, whether it is hosted or self-hosted, and any quota, privacy, data-retention, or availability limitations.
- [ ] #3 Fallback extraction is only used when the primary local extractor rejects or cannot classify an upload, and fallback results still pass through the same confidence-band and attempt-limit rules.
- [ ] #4 Fallback usage is logged with provider, tenant, score file, acting user, outcome, and confidence-band metadata.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
