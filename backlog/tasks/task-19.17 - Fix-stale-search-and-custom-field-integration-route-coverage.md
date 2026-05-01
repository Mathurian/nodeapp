---
id: TASK-19.17
title: Fix stale search and custom field integration route coverage
status: To Do
assignee: []
created_date: '2026-05-01 01:32'
labels:
  - tests
  - integration
  - backend
  - api
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 integration rerun shows search and custom-field integration suites failing almost entirely with 404 responses, indicating the tests target stale paths or route registration has drifted. Use `temp/task-19.4-integration-after-users.json` and `temp/task-19.4-failure-digest.txt` as evidence, then align the integration tests or routes to the supported API contract.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `tests/integration/search.test.ts` no longer fails with 404s for the search endpoint group, or unsupported endpoints are removed/split with documented rationale.
- [ ] #2 `tests/integration/custom-fields.test.ts` no longer fails with 404s for custom-field and field-value endpoint groups, or unsupported endpoints are removed/split with documented rationale.
- [ ] #3 Targeted search/custom-field integration reruns record suite/test counts and response evidence.
- [ ] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
