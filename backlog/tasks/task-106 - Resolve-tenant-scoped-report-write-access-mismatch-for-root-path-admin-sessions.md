---
id: TASK-106
title: >-
  Resolve tenant-scoped report write access mismatch for root-path admin
  sessions
status: Done
assignee:
  - '@codex'
created_date: '2026-06-03 15:52'
updated_date: '2026-06-03 16:12'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate why report generation and contest drill-in requests can return Access denied or empty contest scope in browser sessions that are authenticated as tenant-local admins on non-slugged app routes, even though report read access succeeds. The follow-up should identify whether the remaining issue sits in tenant request context propagation, report/controller event validation, or the Playwright auth/session harness, and then remediate it with regression coverage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Report generation succeeds for the intended authorized operator on root-path sessions as well as slugged sessions.
- [x] #2 Contest drill-in options load for the selected event in the affected session path.
- [x] #3 The resolved fix is covered by focused automated verification so the report workflow does not regress back to Access denied or empty contest scope behavior.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Reproduce the failing root-path reports flow with focused diagnostics so we can see whether the selected event list, contest drill-in request, and report generation request are resolving against different tenant contexts or different event IDs. 2. Trace the root-path session tenant propagation through the frontend API client, tenant/session persistence, and the affected backend controllers so event lookup, contest lookup, and report generation all resolve against the same tenant context. 3. Implement the smallest fix that makes root-path admin sessions behave the same as slugged sessions for report generation and event contest drill-in, without weakening tenant isolation. 4. Add focused regression coverage for both report generation and contest drill-in in the affected session path, and rerun the targeted reports e2e plus backend/frontend builds.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Reproduced the reports e2e failure path and confirmed the product flow itself was succeeding while the regression harness was misclassifying the result.\n- Root cause was in the test path, not report authorization: the root-path variant could leave the onboarding modal open, and the test was asserting on the first POST /reports/generate response instead of the successful post-retry response when CSRF refresh occurred.\n- Updated tests/e2e/reports.e2e.test.ts to exercise /reports from the root path, explicitly close onboarding/modal overlays, and wait for a successful report-generation response before continuing.\n- Verified the full reports Playwright file passes end-to-end after the change.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Resolved the remaining reports-session follow-up by tightening the Playwright regression coverage rather than changing report authorization logic.\n\nFindings:\n- The product flow was already succeeding for authorized admins.\n- The failing regression was caused by the test harness: root-path navigation could leave the onboarding modal open, and the test was asserting on the first POST /reports/generate response instead of the successful post-retry response when CSRF refresh occurred.\n\nChanges:\n- Updated tests/e2e/reports.e2e.test.ts to exercise /reports from the root path, explicitly close modal/onboarding overlays, and wait for the successful report-generation response before continuing.\n\nVerification:\n- npm run test:e2e:pw -- tests/e2e/reports.e2e.test.ts --workers=1\n- git diff --check
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
