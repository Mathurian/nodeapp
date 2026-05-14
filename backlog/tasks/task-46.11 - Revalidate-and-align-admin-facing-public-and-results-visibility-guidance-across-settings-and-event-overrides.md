---
id: TASK-46.11
title: >-
  Revalidate and align admin-facing public and results visibility guidance
  across settings and event overrides
status: To Do
assignee: []
created_date: '2026-05-14 04:41'
updated_date: '2026-05-14 05:07'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and update the admin/operator guidance around public landing, contestant visibility, published-results visibility, and event-level results release overrides so the settings UI and related docs accurately teach the live visibility model.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document the current admin-facing guidance in Settings and Events for public landing content, invite-only registration, contestant visibility, published-results role visibility, and event-level results release overrides.
- [ ] #2 Identify mismatches, omissions, or confusing explanations between those admin-facing surfaces, the live results/winners behavior, and the authenticated/public documentation.
- [ ] #3 Update the relevant admin-facing guidance surfaces and documentation so non-technical organizers/admins can understand what each visibility control actually affects, including the difference between contestant visibility, published results role visibility, and event-level release gating.
- [ ] #4 Verify the updated wording against current code paths for /results, /winners, public landing, and event override behavior, and capture any remaining product decisions or follow-up gaps in the task notes.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Line-level findings: SettingsPage now teaches several critical policy behaviors directly in the UI that are barely reflected in docs. It explicitly states registration is invite-only, welcome emails are tenant-branded onboarding sends, contestant visibility is split into winners / overall results / minimum winning score, and tenant-level published-results defaults control detailed results, winners, and publication-progress roles. EventsPage then adds event-level release and override behavior: contestant access can be restricted until a release date, published-results visibility can be overridden per event, and non-admin visibility can be held until every active contest is published. By contrast, docs/03-FEATURES.md only offers short release/visibility notes, which is not enough to teach the current policy model to admins or organizers.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
