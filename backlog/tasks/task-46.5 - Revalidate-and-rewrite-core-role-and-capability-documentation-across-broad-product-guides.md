---
id: TASK-46.5
title: >-
  Revalidate and rewrite core role and capability documentation across broad
  product guides
status: To Do
assignee: []
created_date: '2026-05-14 03:52'
updated_date: '2026-05-14 04:49'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit findings now show that broad user-facing guides such as docs/03-FEATURES.md are making role and capability claims that do not match the live route/access model. This follow-up task should perform a line-by-line rewrite of core role/capability documentation outside the onboarding modal so ADMIN, BOARD, EMCEE, TALLY_MASTER, AUDITOR, CONTESTANT, and related workflow claims match the shipped product, using current route access and conditional visibility behavior as the source of truth.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Core role/capability guidance in broad user-facing product guides such as docs/03-FEATURES.md is reviewed line by line against the live route/access model.
- [ ] #2 Role capability claims that overstate or misstate access, such as ADMIN database browser access, BOARD audit-log/report authority, EMCEE script-management authority, and contestant/profile/results behavior, are corrected to match current shipped behavior.
- [ ] #3 Cross-role workflow descriptions for scoring, certification, winners/results, and related workspaces are updated so they remain understandable to non-technical readers without implying non-existent pages or permissions.
- [ ] #4 Any remaining capability ambiguities that require product clarification are documented explicitly rather than guessed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: docs/03-FEATURES.md currently claims ADMIN has database browser access (live route is SUPER_ADMIN-only), BOARD has audit-log access (general activity log is admin-only), and EMCEE can manage script templates / print announcements (pure EMCEE users can access /emcee but script management is restricted in page logic to ADMIN/SUPER_ADMIN/ORGANIZER/BOARD). Use current router, navigation policy, and page-level capability checks as source of truth during rewrite.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
