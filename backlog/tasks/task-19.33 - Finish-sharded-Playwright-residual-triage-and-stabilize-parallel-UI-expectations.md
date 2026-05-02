---
id: TASK-19.33
title: >-
  Finish sharded Playwright residual triage and stabilize parallel UI
  expectations
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-02 21:41'
updated_date: '2026-05-02 22:43'
labels:
  - tests
  - e2e
  - playwright
  - stability
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-19.28 restored tenant-aware navigation and the focused admin suite, but full-suite verification still needs complete sharded evidence. Shard 1/4 completed with 94 passed and 12 failed before follow-up task creation; shard 2/4 was interrupted before summary after exposing at least the auditor accordion timeout and comprehensive admin users expectation failure. Continue smaller shards, capture complete counts, and split any additional failures into narrow tasks.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All remaining Playwright shards are run in small enough slices to complete and produce pass/fail summaries.
- [ ] #2 Parallel-only data assumptions are removed, including admin results/event option counts and comprehensive admin user-list expectations.
- [ ] #3 Slow accordion tests either pass deterministically, have reduced timeout risk, or are split into a dedicated task with rationale.
- [ ] #4 Any additional residual failures from shards 3/8 through 8/8 are captured as high-priority child tasks with file/test names and failure class.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-run the Playwright suite in small shards that complete reliably and record pass/fail counts per shard.
2. Triage any remaining failures immediately when they are narrow and deterministic; otherwise capture them as explicit high-priority follow-up tasks with test names and failure class.
3. Fix parallel-only UI expectation drift discovered during shard runs, including any remaining admin/comprehensive list assertions or slow accordion timing assumptions.
4. When the shard set is stable, update TASK-19.33 and then fold the residual evidence back into TASK-19.28.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
