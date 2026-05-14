---
id: TASK-46.11
title: >-
  Revalidate and align admin-facing public and results visibility guidance
  across settings and event overrides
status: To Do
assignee: []
created_date: '2026-05-14 04:41'
updated_date: '2026-05-14 04:53'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
