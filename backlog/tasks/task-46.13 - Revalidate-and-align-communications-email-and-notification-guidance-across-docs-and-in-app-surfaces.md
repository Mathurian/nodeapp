---
id: TASK-46.13
title: >-
  Revalidate and align communications, email, and notification guidance across
  docs and in-app surfaces
status: Done
assignee:
  - '@codex'
created_date: '2026-05-14 05:02'
updated_date: '2026-05-15 13:48'
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
- [x] #1 Document the actual communications model across Notifications, Email Templates, Send Email/Bulk Operations, and Email/SMTP Settings, including which audiences use each surface and for what purpose.
- [x] #2 Update documentation and in-app guidance so reusable templates, direct/bulk sends, personal notification preferences, and SMTP configuration are described distinctly and coherently for non-technical users.
- [x] #3 Correct role/access wording mismatches in communication surfaces and related docs, including places where copy still implies narrower or different roles than the live route policy allows.
- [x] #4 Remove or rewrite stale, ambiguous, or incomplete communication claims in broad product/admin guides so they match the current routes and workflow boundaries.
- [x] #5 Record any remaining product-language decisions or unresolved communication-workflow ambiguity discovered during implementation.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Revalidate the communications guidance against the current in-app model across Notifications, Email Templates, Bulk Operations/Send Email, SMTP settings, and the send-notification modal so each surface has a distinct documented purpose.
2. Rewrite docs/13-ADMIN-GUIDE.md and docs/14-ADVANCED-FEATURES.md first, replacing oversimplified or conflated email/notification claims with a coherent model that distinguishes personal notifications, admin-sent notifications, reusable email templates, direct/bulk outbound email, and SMTP configuration.
3. Apply targeted in-app copy fixes to communication surfaces where the current labels or subtitles still imply a narrower or different model than the live routes and role rules actually provide.
4. Keep role and access wording aligned with the live page behavior, especially where ADMIN, SUPER_ADMIN, ORGANIZER, or BOARD can reach a surface that older wording described more narrowly.
5. Verify the touched docs and UI copy with stale-phrase sweeps and diff checks, then record any remaining product-language ambiguity that should be treated as a follow-up decision rather than guessed in docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Rewrote the communications guidance in docs/13-ADMIN-GUIDE.md so SMTP settings, notifications, email templates, and Send Email/Bulk Operations are described as distinct surfaces with different purposes instead of one blended email feature.
- Updated docs/14-ADVANCED-FEATURES.md so the advanced communications section explicitly includes Notifications, clarifies that /send-email is a send-focused entry into /bulk-operations, and distinguishes transport settings from templates and notification inbox behavior.
- Applied targeted in-app copy updates to NotificationsPage, EmailTemplatesPage, and BulkOperationsPage so the page subtitles now teach the same model as the docs.
- Cross-checked role wording against the live pages and retained the broader send-notification access reality (SUPER_ADMIN, ADMIN, ORGANIZER, BOARD) rather than older narrower assumptions.
- No separate unresolved product-language ambiguity remained after this pass; the main issue was documentation conflation rather than a missing product decision.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned the communications, email, and notification guidance across docs and in-app surfaces to match the current product model.

Changes:
- Reworked the Administrator Guide so it clearly distinguishes four separate concerns: SMTP delivery settings, reusable email templates, direct/bulk outbound email sends, and the Notifications inbox/preferences/admin-broadcast surface.
- Updated the Advanced Features guide so communications routes and notes match the live UI, including the fact that /send-email is a route into Bulk Operations and that notifications are a separate surface from email templates and SMTP settings.
- Tightened page subtitles in Notifications, Email Templates, and Bulk Operations so users see the same model in the app that the docs now describe.
- Kept role wording aligned to the actual live access model, including BOARD access to send notifications and communications workflows where the page currently permits it.

Verification:
- rg sweep across docs and UI copy for communications-language consistency
- git diff --check docs/13-ADMIN-GUIDE.md docs/14-ADVANCED-FEATURES.md frontend/src/pages/NotificationsPage.tsx frontend/src/pages/EmailTemplatesPage.tsx frontend/src/pages/BulkOperationsPage.tsx
- manual review of the rewritten language against the current communications pages and modal behavior
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
