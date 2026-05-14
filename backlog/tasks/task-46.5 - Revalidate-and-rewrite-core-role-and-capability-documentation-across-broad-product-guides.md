---
id: TASK-46.5
title: >-
  Revalidate and rewrite core role and capability documentation across broad
  product guides
status: To Do
assignee: []
created_date: '2026-05-14 03:52'
updated_date: '2026-05-14 05:19'
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

Additional docs/03-FEATURES.md mismatches confirmed: ADMIN still claims database browser access; EMCEE still claims script-template management and print-announcement authority; User Creation still lists self-registration if enabled despite the current invite-only registration model.

The role/capability guide also still uses simplified or legacy phrasing around judge score edits and contestant-facing profile/result capabilities that need revalidation against the live routes and settings model.

docs/03-FEATURES.md role/capability drift is reinforced by docs/06-FRONTEND.md and docs/14-ADVANCED-FEATURES.md: both still describe route/product surfaces that no longer exist or no longer behave that way, especially around auditor landing and global search.

Workflow and broad-capability guide findings tightened further: docs/12-WORKFLOW-CUSTOMIZATION.md still refers to Admin -> Workflows -> Dashboard as if that is a distinct surfaced route and uses unsupported/example roles like TREASURER and SYSTEM throughout its examples. That makes the guide read as a generic BPM system rather than the current workflow product. docs/14-ADVANCED-FEATURES.md still carries broad feature-surface claims that need narrowing, including the stale /search route and oversimplified communication/email model.

Additional broad-guide findings from docs/03-FEATURES.md: several user-facing capability claims appear unsupported or materially overstated in the current codebase. The guide still advertises score-entry extras like bulk score entry, score templates, calculator integration, public feedback, and private judge notes, but those phrases do not map cleanly to current scoring UI/routes. It also still lists self-registration as a user-creation method even though the product is invite-only, and it describes EMCEE capabilities such as print announcements that do not have a clear dedicated live workspace surface. These claims should be narrowed to shipped behavior rather than left as broad feature marketing.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
