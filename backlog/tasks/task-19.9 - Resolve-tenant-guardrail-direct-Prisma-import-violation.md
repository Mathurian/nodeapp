---
id: TASK-19.9
title: Resolve tenant guardrail direct Prisma import violation
status: Done
assignee:
  - '@codex'
created_date: '2026-04-30 13:37'
updated_date: '2026-05-14 04:47'
labels:
  - tests
  - tenant-isolation
  - prisma
  - backend
  - security
dependencies: []
parent_task_id: TASK-19
priority: high
ordinal: 27013
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
npm run test:tenant-guardrails failed in tenant-prisma-import-guard because src/services/contestantNumberingService.ts is an unreviewed direct global Prisma import. The tenant audit also lists direct Prisma imports for manual review.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 src/services/contestantNumberingService.ts no longer violates the tenant Prisma import guard, or it is added to the reviewed allowlist with rationale
- [x] #2 npm run test:tenant-guardrails exits successfully
- [x] #3 Any remaining direct Prisma imports from the audit are either accepted by policy or converted to tenant-aware access
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Run the tenant guardrail suite to confirm the current Prisma import violation.
2. Inspect contestant numbering service and the guardrail policy/allowlist to determine whether the import should be converted or explicitly reviewed.
3. Apply the smallest policy-compliant change and rerun tenant guardrails.
4. Run a backend build or targeted typecheck if the service code changes, then update task notes, AC, DoD, and final summary.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Ran npm run test:tenant-guardrails and confirmed the hard failure was the unreviewed direct global Prisma import in src/services/contestantNumberingService.ts.
- Reviewed the service: it imports the context-aware Prisma compatibility export and scopes reads/writes by contestId or contest membership.
- Added src/services/contestantNumberingService.ts to the tenant global Prisma import allowlist with a rationale comment.
- Verification passed: npm run test:tenant-guardrails and npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added src/services/contestantNumberingService.ts to the reviewed tenant global Prisma import allowlist with rationale. The service uses the context-aware Prisma compatibility export and constrains operations by contestId or contest membership, so this resolves the guardrail baseline without changing runtime behavior.

Tests:
- npm run test:tenant-guardrails
- npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
