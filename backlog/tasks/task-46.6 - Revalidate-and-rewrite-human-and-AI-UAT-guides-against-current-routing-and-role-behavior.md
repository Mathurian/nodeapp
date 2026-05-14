---
id: TASK-46.6
title: >-
  Revalidate and rewrite human and AI UAT guides against current routing and
  role behavior
status: To Do
assignee: []
created_date: '2026-05-14 03:55'
updated_date: '2026-05-14 04:49'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The documentation audit found that the human and AI UAT guides in docs/testing now contain product-behavior assumptions that no longer cleanly match the current application. This follow-up task should review the operator-facing UAT guides line by line and correct stale routing, branding, landing-page, auditor-workspace, and role-capability assertions so manual or browser-AI testers are not pointed at outdated expectations.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Human and AI UAT guides in docs/testing are reviewed line by line against the live routing model, tenant-aware public/auth flows, and current role landing/access behavior.
- [ ] #2 Stale assertions such as tenant-agnostic back-link expectations, dedicated auditor-workspace assumptions, and outdated role capability checks are corrected so testers are guided by current product behavior.
- [ ] #3 Shared UAT language is normalized so human guides, AI handoff templates, and machine-oriented runbooks do not contradict each other about current routes, scenarios, or role expectations.
- [ ] #4 Any intentionally legacy or transitional UI labels that testers may still encounter are called out explicitly where needed instead of being silently treated as separate workflows.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Machine-readable UAT export spot check: docs/testing/Acceptance-Test-Cases.json and .csv did not surface the same level of drift as the markdown guides in the reviewed slice. Core routing, scoring, certification, governance, deductions, results, MFA, and lifecycle cases are still broadly aligned. Current 46.6 priority should stay on the human/AI runbook language and expectations unless later passes find contradictory machine-readable cases.

Acceptance-Test-Guide-v2.md contains a confirmed stale routing assumption: it says auditors land on an auditor workspace rather than the current /dashboard landing model.

That same section also preserves the older 'pending audits / certifications / results' quick-link framing instead of the approved single auditor certification-flow model with legacy-label note.

The AI and quick-run guides are less wrong than the human guide on this point, but they still need a role/routing freshness pass against the current default-home and access-denial behavior.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
