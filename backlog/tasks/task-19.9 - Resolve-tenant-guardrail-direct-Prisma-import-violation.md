---
id: TASK-19.9
title: Resolve tenant guardrail direct Prisma import violation
status: To Do
assignee: []
created_date: '2026-04-30 13:37'
labels:
  - tests
  - tenant-isolation
  - prisma
  - backend
  - security
dependencies: []
parent_task_id: TASK-19
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:tenant-guardrails failed in tenant-prisma-import-guard because src/services/contestantNumberingService.ts is an unreviewed direct global Prisma import. The tenant audit also lists direct Prisma imports for manual review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/services/contestantNumberingService.ts no longer violates the tenant Prisma import guard, or it is added to the reviewed allowlist with rationale
- [ ] #2 npm run test:tenant-guardrails exits successfully
- [ ] #3 Any remaining direct Prisma imports from the audit are either accepted by policy or converted to tenant-aware access
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
