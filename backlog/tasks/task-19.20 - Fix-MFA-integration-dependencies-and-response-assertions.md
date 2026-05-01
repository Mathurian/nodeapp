---
id: TASK-19.20
title: Fix MFA integration dependencies and response assertions
status: To Do
assignee: []
created_date: '2026-05-01 01:33'
labels:
  - tests
  - integration
  - backend
  - mfa
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The TASK-19.4 rerun leaves `tests/integration/mfa.test.ts` failing with `speakeasy.totp is not a function`, 500 responses during MFA setup, and stale wrapped-response assertions. The global test setup currently mocks speakeasy for all suites, which is incompatible with integration tests that need real TOTP generation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 MFA integration runs use a real or integration-appropriate speakeasy implementation that supports `totp` generation and verification.
- [ ] #2 MFA setup/enable/verify/disable/backup-code tests assert the current API response shape and pass targeted reruns.
- [ ] #3 Any remaining MFA service failures are backed by response/body logs and split into narrower tasks.
- [ ] #4 Full integration rerun records updated counts and no QueueService/Prisma teardown regression.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
