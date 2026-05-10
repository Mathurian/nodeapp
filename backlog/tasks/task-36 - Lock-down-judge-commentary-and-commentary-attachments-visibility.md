---
id: TASK-36
title: Lock down judge commentary and commentary attachments visibility
status: Done
assignee:
  - '@codex'
created_date: '2026-05-09 23:35'
updated_date: '2026-05-10 02:56'
labels: []
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Investigate and remediate a privacy defect where judge commentary and uploaded commentary attachments are visible too broadly. Only the uploading judge, the contestant the commentary is attached to, and tally-and-above roles should be able to view commentary records or attached score files. Access must be enforced server-side for API responses, downloads, and raw /uploads access.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Commentary API responses only return judge commentary to the uploading judge, the attached contestant, and TALLY_MASTER/AUDITOR/BOARD/ORGANIZER/ADMIN/SUPER_ADMIN roles.
- [x] #2 Commentary attachment APIs and download flows enforce the same visibility rules server-side for list, detail, download, and raw upload access paths.
- [x] #3 Judge commentary and commentary attachments are no longer exposed through judge scoring pages, results views, or direct URLs to unauthorized judges or other tenant users.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Audit all judge commentary and commentary-attachment read paths across CommentaryService, ScoreFileService, score-file controllers/routes, and the raw /uploads handler, then define one server-side visibility rule: uploading judge, attached contestant, and tally-and-above only.
2. Implement centralized authorization checks for commentary records and score-file attachments, apply them to list/detail/download/raw file access paths, and remove any frontend exposure paths that currently surface commentary attachments too broadly.
3. Add focused regression coverage or equivalent verification for judge-versus-judge, contestant, and tally/admin access, including direct URL access denial for unauthorized users.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Initial investigation: CommentaryService currently returns non-private commentary to any authenticated role, and score-file endpoints/raw /uploads access do not enforce commentary-specific ownership or role checks.
- Initial investigation: Scoring and results views fetch score attachments broadly by category/contestant, which can expose commentary attachments outside the allowed audience.

- Implemented shared commentary access rules and applied them to CommentaryService, ScoreFileService, score-file controllers, and the raw /uploads handler.
- Read access is now limited to tally-and-above roles, the owning contestant, or the uploading/owning judge context; unauthorized judges no longer receive other judges' commentary records or attachments.
- Verified with targeted Jest suites: tests/unit/services/CommentaryService.test.ts, tests/unit/controllers/commentaryController.test.ts, tests/unit/services/ScoreFileService.test.ts.

- Verified targeted privacy regression coverage after the prior implementation work.
- Confirmed commentary records and score-file attachment visibility tests pass for authorized versus unauthorized access paths.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Locked down judge commentary and commentary attachment visibility to the intended audience.

Changes:
- Applied shared commentary visibility rules across commentary records, score-file attachment APIs, and raw attachment access paths.
- Limited access to the uploading judge, the attached contestant, and tally-and-above operational roles.
- Removed unauthorized cross-judge and broad tenant exposure through scoring and attachment flows.

Verification:
- npx jest tests/unit/services/CommentaryService.test.ts tests/unit/controllers/commentaryController.test.ts tests/unit/services/ScoreFileService.test.ts --runInBand
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
