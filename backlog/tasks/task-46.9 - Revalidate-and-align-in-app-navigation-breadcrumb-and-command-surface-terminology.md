---
id: TASK-46.9
title: >-
  Revalidate and align in-app navigation, breadcrumb, and command-surface
  terminology
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 04:32'
updated_date: '2026-05-14 19:21'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The parent documentation audit found that user-facing terminology is also fragmented inside the app shell itself. Navigation labels, route labels, dashboard quick actions, and command-palette names are reused across multiple surfaces, and some of them imply access patterns or workflow meanings that no longer cleanly match the live product. This follow-up task should review and align the shared in-app terminology so users encounter coherent naming across menus, breadcrumbs, quick actions, and command search.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Shared user-facing labels used by navigation config, route/breadcrumb labels, dashboard quick actions, and command-palette entries are inventoried and compared against the live workflow and access model.
- [x] #2 Misleading or stale in-app terminology, such as labels that imply role-exclusive workspaces or unconditional results availability, is corrected to match current product behavior.
- [x] #3 Where the same concept appears in multiple shell surfaces, the terminology is normalized so menus, breadcrumbs, quick actions, and command-palette results do not teach conflicting mental models.
- [x] #4 Any intentionally legacy labels that must remain for compatibility are documented explicitly rather than silently mixed with the preferred naming.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Re-audit the live shared-label surfaces that actually teach users how the app is organized today: navigationConfig, Layout breadcrumbs and route labels, dashboard quick-action labels, and command-palette navigation naming.
2. Correct misleading names such as role-exclusive or unconditional wording, with special attention to scoring, results visibility, and legacy auditor route labels.
3. Normalize the same concepts across menus, breadcrumbs, quick actions, and command search so the shell teaches one mental model instead of several slightly different ones.
4. Keep legacy route ids and paths only where compatibility requires them, and document those explicitly instead of leaving the older names mixed into shared UI labels.
5. Run focused verification, then record the terminology decisions and any remaining compatibility notes in the task.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: navigationConfig labels propagate directly into command-palette commands through navigationCommands.ts, so any misleading nav name is automatically taught again in command search. Current examples to review include 'Judge Scoring' being visible to non-judge roles, 'View Results' appearing in shell surfaces where results access is conditional, and auditor/legacy labels such as 'Final Certification' and 'Score Verification' still existing in shared route-label surfaces despite the product decision to document a single auditor certification flow.

Direct review of navigationConfig, navigationCommands, and DashboardPage confirmed the terminology problem is active in the live shell, not just in docs.

Specific drift: /scoring is labeled 'Judge Scoring' in shared shell surfaces even though the route is also used by admin/board roles; /results is labeled 'View Results' as if universally available even though access is conditional by publication scope and settings.

Dashboard quick actions repeat the same assumptions for Judge and Contestant users, and Auditor quick actions still point to '/auditor/pending-audits' with legacy naming even though the intended guidance model is a single auditor certification flow.

Auditor shared-shell terminology is only partially migrated. Dedicated pages such as AuditorPendingAuditsPage already use certification-oriented wording, but shared quick links and route labels still expose 'Pending Audits' and related legacy terms.

Line-level shell terminology findings: navigationConfig still labels /scoring as "Judge Scoring" even though the route is shared by more than judges, and it labels /results as "View Results" with ALL_ROLES even though access can still be blocked by publication/scope state. Dashboard quick actions reinforce the same drift: Judge and Contestant dashboards both advertise View Results as a normal action, while Auditor quick actions still expose /auditor/pending-audits as "Audit Queue" despite the approved single-flow auditor certification model. CommandPaletteOnboarding still uses legacy auditor labels like Pending Audits and Final Certification, and navigationCommands automatically propagates whatever stale names remain in navigationConfig into command search.

- Reviewed shared terminology sources across frontend navigationConfig, Layout route labels, command-palette navigation generation, dashboard quick actions, and the legacy navigation API.
- Renamed shared /scoring and /results labels to neutral names so command search and menus no longer imply judge-only work or unconditional results availability.
- Normalized auditor terminology across breadcrumbs, a legacy auditor workspace title, backend workflow-step labels, and the navigation API to prefer certification-oriented wording over older verification/final-certification labels.
- Preserved compatibility where needed by keeping legacy search keywords such as "judge scoring" and "view results", and by keeping legacy auditor route ids/paths while updating the labels users actually see.
- Verification passed: npx eslint on touched frontend files, cd frontend && npm run type-check, npm run build, cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned shared in-app terminology so menus, breadcrumbs, command search, and adjacent auditor workflow labels match the current product model more closely.

Changes:
- Renamed shared /scoring and /results navigation labels to neutral names and updated their descriptions so the shell no longer implies judge-only work or universal results availability.
- Replaced stale auditor breadcrumb and route labels with certification-oriented wording, and aligned the remaining legacy auditor workspace title and workflow-step labels to the same naming.
- Updated the legacy navigation API labels to match the preferred auditor terminology while leaving legacy route ids/paths in place for compatibility.
- Kept intentional compatibility hooks explicit by preserving old search phrases like "judge scoring" and "view results" as hidden keywords and by noting that older bookmarks or imported links may still reference legacy auditor route names.

Verification:
- npx eslint frontend/src/config/navigationConfig.ts frontend/src/components/Layout.tsx frontend/src/pages/AuditorFinalCertificationPage.tsx frontend/src/pages/AuditorScoreVerificationPage.tsx frontend/src/components/CommandPaletteOnboarding.tsx
- cd frontend && npm run type-check
- npm run build
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
