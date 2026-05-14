---
id: TASK-46.9
title: >-
  Revalidate and align in-app navigation, breadcrumb, and command-surface
  terminology
status: To Do
assignee: []
created_date: '2026-05-14 04:32'
updated_date: '2026-05-14 04:53'
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
- [ ] #1 Shared user-facing labels used by navigation config, route/breadcrumb labels, dashboard quick actions, and command-palette entries are inventoried and compared against the live workflow and access model.
- [ ] #2 Misleading or stale in-app terminology, such as labels that imply role-exclusive workspaces or unconditional results availability, is corrected to match current product behavior.
- [ ] #3 Where the same concept appears in multiple shell surfaces, the terminology is normalized so menus, breadcrumbs, quick actions, and command-palette results do not teach conflicting mental models.
- [ ] #4 Any intentionally legacy labels that must remain for compatibility are documented explicitly rather than silently mixed with the preferred naming.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Seed findings from parent audit: navigationConfig labels propagate directly into command-palette commands through navigationCommands.ts, so any misleading nav name is automatically taught again in command search. Current examples to review include 'Judge Scoring' being visible to non-judge roles, 'View Results' appearing in shell surfaces where results access is conditional, and auditor/legacy labels such as 'Final Certification' and 'Score Verification' still existing in shared route-label surfaces despite the product decision to document a single auditor certification flow.

Direct review of navigationConfig, navigationCommands, and DashboardPage confirmed the terminology problem is active in the live shell, not just in docs.

Specific drift: /scoring is labeled 'Judge Scoring' in shared shell surfaces even though the route is also used by admin/board roles; /results is labeled 'View Results' as if universally available even though access is conditional by publication scope and settings.

Dashboard quick actions repeat the same assumptions for Judge and Contestant users, and Auditor quick actions still point to '/auditor/pending-audits' with legacy naming even though the intended guidance model is a single auditor certification flow.

Auditor shared-shell terminology is only partially migrated. Dedicated pages such as AuditorPendingAuditsPage already use certification-oriented wording, but shared quick links and route labels still expose 'Pending Audits' and related legacy terms.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
