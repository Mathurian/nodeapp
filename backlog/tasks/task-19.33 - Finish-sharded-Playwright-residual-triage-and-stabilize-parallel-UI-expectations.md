---
id: TASK-19.33
title: >-
  Finish sharded Playwright residual triage and stabilize parallel UI
  expectations
status: In Progress
assignee:
  - '@codex'
created_date: '2026-05-02 21:41'
updated_date: '2026-05-09 21:02'
labels:
  - tests
  - e2e
  - playwright
  - stability
milestone: m-1
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Shard 1/8 rerun after TASK-19.30/31/32 fixes: 53 passed / 0 failed in 4.5m.
- Shard 2/8 rerun: 49 passed / 0 failed in 2.3m. Accordion admin tests still emit "not found, skipping" messages but no timeout failures.
- Initial shard 3/8 rerun failed in three narrow places: comprehensive auditor dashboard accordion expectation and comprehensive admin contest/users selectors. Updated comprehensive accordion auditor coverage to assert current quick actions/workspace, updated comprehensive admin users list expectation, and made contest/category create-form selects resilient to shard-parallel option sets.
- Shard 3/8 rerun after fixes: 55 passed / 0 failed in 5.3m.
- Initial shard 4/8 rerun failed in one comprehensive auditor result test and three comprehensive contestant result/score tests, all due stale table-only result selectors. Updated those tests to use the current event/contest/category filter chain and current results summary surfaces. Focused rerun of the four repaired tests passed 4/4.
- TASK-19.33 remains in progress pending full shard 4/8 rerun and shards 5/8 through 8/8.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
