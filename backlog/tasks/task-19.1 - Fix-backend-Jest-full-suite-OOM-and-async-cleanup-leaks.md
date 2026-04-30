---
id: TASK-19.1
title: Fix backend Jest full-suite OOM and async cleanup leaks
status: To Do
assignee: []
created_date: '2026-04-30 13:36'
labels:
  - tests
  - jest
  - backend
  - ci
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The full backend Jest command ran real suites for roughly 794 seconds, then aborted with Node heap out-of-memory. The run also emitted repeated async cleanup warnings, Prisma connection exhaustion, and QueueService worker errors, so the all-in-one backend suite is not reliable as a release gate.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The root npm test command completes without Node heap OOM or manual termination
- [ ] #2 Jest no longer reports Cannot log after tests are done from suite cleanup
- [ ] #3 The run does not exhaust database connections during normal execution
- [ ] #4 QueueService worker test setup is isolated or disabled so emitter.getMaxListeners errors do not spam the suite
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
