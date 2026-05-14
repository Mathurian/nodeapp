---
id: TASK-46.11
title: >-
  Revalidate and align admin-facing public and results visibility guidance
  across settings and event overrides
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 04:41'
updated_date: '2026-05-14 20:10'
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
- [x] #1 Document the current admin-facing guidance in Settings and Events for public landing content, invite-only registration, contestant visibility, published-results role visibility, and event-level results release overrides.
- [x] #2 Identify mismatches, omissions, or confusing explanations between those admin-facing surfaces, the live results/winners behavior, and the authenticated/public documentation.
- [x] #3 Update the relevant admin-facing guidance surfaces and documentation so non-technical organizers/admins can understand what each visibility control actually affects, including the difference between contestant visibility, published results role visibility, and event-level release gating.
- [x] #4 Verify the updated wording against current code paths for /results, /winners, public landing, and event override behavior, and capture any remaining product decisions or follow-up gaps in the task notes.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Inventory the current admin-facing visibility guidance in SettingsPage and EventsPage for invite-only registration, public landing expectations, contestant visibility, tenant-level published-results defaults, and event-level release/override controls.
2. Compare that wording against the live /results, /winners, public landing, and event override behavior, plus the current admin-facing docs in docs/03-FEATURES.md, and note the exact mismatches or gaps.
3. Rewrite the relevant SettingsPage and EventsPage explanatory copy so admins can clearly distinguish contestant visibility, published results role visibility, publication progress visibility, and event-level release gating.
4. Update the matching documentation so it reflects the same model and no longer implies self-registration or oversimplified results-release behavior.
5. Run focused verification on the touched UI/docs paths and record any remaining product wording decisions or follow-up gaps in the task notes.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Line-level findings: SettingsPage now teaches several critical policy behaviors directly in the UI that are barely reflected in docs. It explicitly states registration is invite-only, welcome emails are tenant-branded onboarding sends, contestant visibility is split into winners / overall results / minimum winning score, and tenant-level published-results defaults control detailed results, winners, and publication-progress roles. EventsPage then adds event-level release and override behavior: contestant access can be restricted until a release date, published-results visibility can be overridden per event, and non-admin visibility can be held until every active contest is published. By contrast, docs/03-FEATURES.md only offers short release/visibility notes, which is not enough to teach the current policy model to admins or organizers.

- Reviewed the current admin-facing visibility guidance in SettingsPage and EventsPage against the live /results, /winners, public landing, and event override model. The main issue was not missing controls, but that the distinctions between invite-only onboarding, contestant visibility, staff results roles, and event-level release gating were too fragmented or terse for non-technical admins.
- Expanded SettingsPage guidance for registration, public landing content, contestant visibility, and published results defaults so each surface now explains what it affects and what it does not affect. In particular, contestant visibility is now explicitly separated from staff published-results role visibility, and the public landing page is now described as a discovery/support surface rather than a self-registration path.
- Expanded EventsPage guidance for contestant event release dates and per-event published-results overrides so admins can distinguish event release gating from contestant visibility and understand that event overrides affect published results surfaces rather than general account access.
- Updated docs/03-FEATURES.md to remove the stale self-registration claim and to align the features guide with the current visibility and release model.
- Verification passed: npx eslint frontend/src/pages/SettingsPage.tsx frontend/src/pages/EventsPage.tsx, cd frontend && npm run type-check, cd frontend && npm run build.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the admin-facing public and results visibility guidance so Settings, Events, and the main features guide now teach the same invite-only onboarding and results-release model.

Changes:
- Rewrote SettingsPage copy for the registration model, welcome emails, public landing page guidance, contestant visibility, and tenant-level published results defaults.
- Rewrote EventsPage copy for contestant event release dates and per-event published-results overrides so event release gating is clearly separated from contestant visibility and staff role visibility.
- Updated docs/03-FEATURES.md to remove the stale self-registration claim and to explain the current published-results and release model more accurately.

Behavioral alignment captured in the wording:
- Public landing content supports discovery, sign-in, and contact/help routing, but access remains invite-only.
- Contestant visibility settings control what contestants can see after they have access to an event.
- Published results visibility settings control role-based access to /results, /winners, and publication-progress views.
- Event-level release restrictions and per-event overrides can still gate access beyond tenant defaults.

Verification:
- npx eslint frontend/src/pages/SettingsPage.tsx frontend/src/pages/EventsPage.tsx
- cd frontend && npm run type-check
- cd frontend && npm run build
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
