---
id: TASK-46.13
title: >-
  Revalidate and align communications, email, and notification guidance across
  docs and in-app surfaces
status: To Do
assignee: []
created_date: '2026-05-14 05:02'
updated_date: '2026-05-14 05:14'
labels: []
milestone: m-0
dependencies: []
parent_task_id: TASK-46
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit and rewrite the user-facing and admin/operator-facing guidance around notifications, reusable email templates, bulk email/send-email workflows, and SMTP/email settings so the product teaches one coherent communications model. This task should reconcile role access, page labels, route descriptions, admin settings guidance, and published docs/help references with the current live UI and backend role rules.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Document the actual communications model across Notifications, Email Templates, Send Email/Bulk Operations, and Email/SMTP Settings, including which audiences use each surface and for what purpose.
- [ ] #2 Update documentation and in-app guidance so reusable templates, direct/bulk sends, personal notification preferences, and SMTP configuration are described distinctly and coherently for non-technical users.
- [ ] #3 Correct role/access wording mismatches in communication surfaces and related docs, including places where copy still implies narrower or different roles than the live route policy allows.
- [ ] #4 Remove or rewrite stale, ambiguous, or incomplete communication claims in broad product/admin guides so they match the current routes and workflow boundaries.
- [ ] #5 Record any remaining product-language decisions or unresolved communication-workflow ambiguity discovered during implementation.
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No regressions introduced
- [ ] #2 All functions behave properly
- [ ] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
