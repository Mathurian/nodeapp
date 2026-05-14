---
id: TASK-46.5
title: >-
  Revalidate and rewrite core role and capability documentation across broad
  product guides
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 03:52'
updated_date: '2026-05-14 20:42'
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
- [x] #1 Core role/capability guidance in broad user-facing product guides such as docs/03-FEATURES.md is reviewed line by line against the live route/access model.
- [x] #2 Role capability claims that overstate or misstate access, such as ADMIN database browser access, BOARD audit-log/report authority, EMCEE script-management authority, and contestant/profile/results behavior, are corrected to match current shipped behavior.
- [x] #3 Cross-role workflow descriptions for scoring, certification, winners/results, and related workspaces are updated so they remain understandable to non-technical readers without implying non-existent pages or permissions.
- [x] #4 Any remaining capability ambiguities that require product clarification are documented explicitly rather than guessed.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-audit the broad role and capability claims in docs/03-FEATURES.md, using docs/06-FRONTEND.md and docs/14-ADVANCED-FEATURES.md as supporting drift sources.
2. Cross-check those claims against the live route/access model and current workflow behavior so the rewrite uses shipped product behavior as the source of truth.
3. Rewrite the role sections and broad workflow/capability sections to remove overstated claims like admin database access, board audit-log authority, emcee script-management authority, self-registration, and unsupported or stale feature-surface claims.
4. Update the supporting frontend and advanced guides where they still reinforce the same stale model, especially around default landings, /search, and public-branding/search claims.
5. Run focused verification on the touched docs and record any remaining product ambiguities explicitly rather than guessed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: docs/03-FEATURES.md currently claims ADMIN has database browser access (live route is SUPER_ADMIN-only), BOARD has audit-log access (general activity log is admin-only), and EMCEE can manage script templates / print announcements (pure EMCEE users can access /emcee but script management is restricted in page logic to ADMIN/SUPER_ADMIN/ORGANIZER/BOARD). Use current router, navigation policy, and page-level capability checks as source of truth during rewrite.

Additional docs/03-FEATURES.md mismatches confirmed: ADMIN still claims database browser access; EMCEE still claims script-template management and print-announcement authority; User Creation still lists self-registration if enabled despite the current invite-only registration model.

The role/capability guide also still uses simplified or legacy phrasing around judge score edits and contestant-facing profile/result capabilities that need revalidation against the live routes and settings model.

docs/03-FEATURES.md role/capability drift is reinforced by docs/06-FRONTEND.md and docs/14-ADVANCED-FEATURES.md: both still describe route/product surfaces that no longer exist or no longer behave that way, especially around auditor landing and global search.

Workflow and broad-capability guide findings tightened further: docs/12-WORKFLOW-CUSTOMIZATION.md still refers to Admin -> Workflows -> Dashboard as if that is a distinct surfaced route and uses unsupported/example roles like TREASURER and SYSTEM throughout its examples. That makes the guide read as a generic BPM system rather than the current workflow product. docs/14-ADVANCED-FEATURES.md still carries broad feature-surface claims that need narrowing, including the stale /search route and oversimplified communication/email model.

Additional broad-guide findings from docs/03-FEATURES.md: several user-facing capability claims appear unsupported or materially overstated in the current codebase. The guide still advertises score-entry extras like bulk score entry, score templates, calculator integration, public feedback, and private judge notes, but those phrases do not map cleanly to current scoring UI/routes. It also still lists self-registration as a user-creation method even though the product is invite-only, and it describes EMCEE capabilities such as print announcements that do not have a clear dedicated live workspace surface. These claims should be narrowed to shipped behavior rather than left as broad feature marketing.

- Revalidated the broad role and capability claims in docs/03-FEATURES.md against the live router, shared navigation config, dashboard role guidance, and page-level access patterns. The main corrections were around ADMIN vs SUPER_ADMIN tooling, BOARD vs auditor/admin log access, EMCEE read-only script behavior, auditor routing, and contestant visibility.
- Rewrote the main role section in docs/03-FEATURES.md to remove overstated claims such as ADMIN database access, BOARD audit-log authority, EMCEE script-management authority, and stale contestant/profile/result promises.
- Narrowed the scoring and certification sections in docs/03-FEATURES.md to match the shipped scoring workspace more closely by removing stale feature claims like bulk score entry, score templates, calculator integration, private/public note distinctions, and certificate generation.
- Updated docs/06-FRONTEND.md so the frontend guide no longer claims AUDITOR has a dedicated /auditor landing or that a global /search page exists.
- Updated docs/14-ADVANCED-FEATURES.md so advanced features no longer advertise a shipped /search route, no longer describe direct send as its own standalone page, and no longer claim the public landing uses a default-tenant branding baseline.
- No unresolved product clarification was required in this pass because the remaining edits were all reducible to the current route and page behavior.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rewrote the broad role and capability guides so they now describe the shipped route and access model more defensibly instead of repeating stale or overstated feature claims.

Changes:
- Rewrote the role capability section in docs/03-FEATURES.md to align ADMIN, BOARD, JUDGE, TALLY_MASTER, AUDITOR, EMCEE, and CONTESTANT descriptions with the current live surfaces and conditional visibility behavior.
- Updated the event, scoring, commentary, certification, and user-management sections in docs/03-FEATURES.md to remove unsupported or inflated claims such as self-registration, bulk score entry, score templates, calculator integration, private/public note distinctions, and certificate generation.
- Updated docs/06-FRONTEND.md so it no longer claims AUDITOR has a dedicated /auditor default landing or that a global /search page exists.
- Updated docs/14-ADVANCED-FEATURES.md so it no longer advertises a shipped /search route, no longer describes direct send as its own standalone page, and no longer claims the public landing uses a default-tenant branding baseline.

Verification:
- rg sweep to confirm stale claims were removed from the rewritten docs
- git diff --check docs/03-FEATURES.md docs/06-FRONTEND.md docs/14-ADVANCED-FEATURES.md
- git diff --stat docs/03-FEATURES.md docs/06-FRONTEND.md docs/14-ADVANCED-FEATURES.md
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
