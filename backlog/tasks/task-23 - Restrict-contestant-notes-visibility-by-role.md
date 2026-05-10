---
id: TASK-23
title: Restrict contestant notes visibility by role
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 20:32'
updated_date: '2026-05-10 02:36'
labels:
  - privacy
  - permissions
  - contestants
milestone: m-0
dependencies:
  - TASK-32
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ensure sensitive private contestant metadata such as ADA accommodations, letters of recommendation, and internal notes are only visible to authorized roles after that functionality exists in the application. This task focuses on role-based visibility and server-side enforcement for the new private contestant metadata experience, not on bios or headshots alone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Private contestant metadata is visible to ADMIN, ORGANIZER, and JUDGE users and hidden from unauthorized roles in the UI and API responses.
- [x] #2 All private contestant metadata endpoints or payloads enforce the same role-based visibility rules server-side.
- [x] #3 Unauthorized users cannot retrieve protected contestant metadata through direct requests, alternate views, exports, or existing bio/image flows.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Split contestant private metadata access into read and management paths so ADMIN, ORGANIZER, and JUDGE can view it, while only admin-side roles retain edit/upload capabilities and unauthorized roles are blocked server-side.
2. Extend judge-facing contestant payloads and admin/organizer contestant profile views to surface private metadata in the existing scoring/bio experiences instead of creating a separate disconnected UI.
3. Ensure generic users, bio directory, and other existing contestant payloads continue to exclude private metadata for unauthorized roles and direct requests, including private document download attempts.
4. Add focused verification for allowed versus denied roles and the updated UI exposure, then run targeted backend/frontend checks before closing the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added read-vs-manage permission split for contestant private profile access.
- Restricted judge access to contestants they are actively assigned to score.
- Surfaced read-only private contestant metadata and private document download links in the scoring panel.
- Added controller coverage for judge allowed/denied access and direct download access.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Enabled role-safe contestant private profile visibility for judges, admins, and organizers while preserving admin-only management actions.

Changes:
- Expanded private contestant profile read access to JUDGE users, but only when the target contestant is in a category or contest assignment the judge can access.
- Kept upload/delete management limited to SUPER_ADMIN, ADMIN, and ORGANIZER.
- Added linked contestant user IDs to judge/scoring contestant payloads and surfaced private accommodations, recommendation notes, internal notes, and private document downloads in the scoring UI.
- Preserved stripping of private contestant fields from generic user payloads and non-private contestant views.

Verification:
- npx jest tests/unit/controllers/usersController.test.ts --runInBand
- npm run build
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
