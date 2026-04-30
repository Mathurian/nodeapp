---
id: TASK-19.2
title: Repair WebhookDeliveryService invalid-signature unit failure
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - unit-tests
  - backend
  - security
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The backend unit suite ran 183 suites and 3907 tests, with one real failing assertion in tests/unit/services/WebhookDeliveryService.test.ts. The timing attack resistance test expected tampered signatures to be invalid, but verification returned valid.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 WebhookDeliveryService rejects tampered or mismatched signatures in the constant-time comparison path
- [ ] #2 The failing test at tests/unit/services/WebhookDeliveryService.test.ts:344 passes without weakening the security assertion
- [ ] #3 The full backend unit suite passes with 183 suites and 3907 tests or an updated documented count
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
