---
id: TASK-46.7
title: >-
  Reclassify published Help taxonomy and sectioning for public vs restricted
  documentation
status: To Do
assignee: []
created_date: '2026-05-14 03:58'
updated_date: '2026-05-14 04:52'
labels: []
dependencies: []
parent_task_id: TASK-46milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---
## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The docs publication policy now restricts many technical/admin guides correctly, but the Help taxonomy and doc metadata still classify some restricted technical references under end-user-oriented sectioning such as 'Getting Started'. This follow-up task should rework the published docs section model, titles, descriptions, and ordering so public Help remains end-user oriented while authenticated admin-only documentation appears in coherent technical/admin groupings.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Published Help sectioning, titles, descriptions, and ordering are reviewed against the actual audience for each published doc, not just the file name.
- [ ] #2 Restricted technical/admin guides such as architecture, API, database, frontend, deployment, development, and related admin references are reclassified into coherent authenticated-only section groupings instead of end-user-oriented buckets.
- [ ] #3 Publicly visible Help navigation remains focused on end-user/operator guidance, while authenticated Help exposes technical/admin references with labeling that is understandable and not misleading.
- [ ] #4 The Help page navigation and published-doc metadata remain internally consistent after reclassification, with no dead sections or contradictory audience cues.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: src/config/docsAccessPolicy.ts currently publishes 01-ARCHITECTURE into the 'getting-started' section even though it is ADMIN/SUPER_ADMIN-only, and 02-GETTING-STARTED is labeled/described like a new-user quick-start even though its current content is dominated by install/setup/deployment guidance. Use actual audience and help-surface intent as the organizing principle during reclassification, not legacy filenames.

The taxonomy issue is mirrored in human-facing index copy, not just in docsAccessPolicy.ts. README.md and INDEX.md still present testing/UAT, architecture, API, and security/developer references as part of a broad default navigation surface.

docsAccessPolicy still places 01-ARCHITECTURE.md in 'Getting Started' and describes 02-GETTING-STARTED.md like a new-user quick start, which does not match the actual content or the intended public-help audience split.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
