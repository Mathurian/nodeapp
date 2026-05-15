---
id: TASK-91
title: >-
  Replace misleading multi-tenant membership wording with tenant-scoped account
  guidance
status: Done
assignee:
  - '@codex'
created_date: '2026-05-15 14:26'
updated_date: '2026-05-15 14:38'
labels:
  - documentation
  - auth
  - tenant
  - help
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Update the current public/authentication documentation and related user-facing UI copy so it describes the real tenant model accurately. The product supports tenant selection during default login when the same credentials match multiple tenant-scoped user records, but the current wording implies a single user account can belong to multiple tenants in a first-class membership model. This follow-up should replace misleading membership language with tenant-scoped account and login-page guidance without removing legitimate tenant-selection behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Replace stale or misleading 'belong to multiple tenants' language in end-user documentation with wording that matches the real tenant-scoped account model.
- [x] #2 Update public auth/recovery UI copy where needed so users understand when tenant-specific login or recovery pages matter and when a tenant-selection prompt may appear.
- [x] #3 Preserve accurate tenant-selection guidance for the default login flow without implying unsupported multi-tenant account membership.
- [x] #4 Verify revised wording across Getting Started, Troubleshooting, login, forgot-password, and any related help/auth surfaces for consistency.
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update the end-user docs in `docs/02-GETTING-STARTED.md` and `docs/10-TROUBLESHOOTING.md` so they stop saying a user simply belongs to multiple tenants and instead describe tenant-specific login plus the conditional default-login tenant-selection prompt.
2. Update public auth/recovery UI copy in `frontend/src/pages/ForgotPasswordPage.tsx` and any nearby login/help messaging so it matches the real tenant-scoped account model without removing legitimate tenant-selection guidance.
3. Normalize the shared tenant-selection prompt wording in `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/HelpPage.tsx`, and `frontend/src/contexts/AuthContext.tsx` so it clearly explains that the user should continue on the matching tenant login page when the same credentials are found in more than one tenant-scoped account.
4. Run targeted checks on the touched files and do a final wording sweep to make sure the public/auth/help surfaces are consistent and no stale multi-tenant-membership phrasing remains.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Replaced misleading "belong to multiple tenants" wording in public end-user docs with tenant-scoped account language that still acknowledges the real default-login tenant-selection prompt.
- Updated forgot-password guidance so it tells users to stay on the matching tenant login page when the same email exists in more than one tenant-scoped account.
- Normalized tenant-selection fallback messaging in login, help-login, and auth context so the UI now explains that the same email was found in more than one tenant-specific account and the user should continue on the correct tenant login page.
- Verification passed: `rg` wording sweep (no stale target phrases remained), `cd frontend && npx eslint src/pages/ForgotPasswordPage.tsx src/pages/LoginPage.tsx src/pages/HelpPage.tsx src/contexts/AuthContext.tsx`, `cd frontend && npm run type-check`, and `git diff --check` on touched files.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aligned public auth/help wording with the actual tenant model.

What changed:
- Updated Getting Started and Troubleshooting so they no longer imply that a single user account simply belongs to multiple tenants.
- Updated forgot-password guidance to describe tenant-specific recovery in terms of matching tenant-scoped accounts.
- Updated login/help fallback messaging so tenant selection is described as a prompt shown when the same email is found in more than one tenant-specific account.

Impact:
- Preserves the real `TENANT_SELECTION_REQUIRED` behavior without overstating product support for first-class multi-tenant account membership.
- Makes the public/auth surfaces consistent with the actual schema and super-admin tenant-transfer model established in TASK-90.

Verification:
- `cd frontend && npx eslint src/pages/ForgotPasswordPage.tsx src/pages/LoginPage.tsx src/pages/HelpPage.tsx src/contexts/AuthContext.tsx`
- `cd frontend && npm run type-check`
- `git diff --check docs/02-GETTING-STARTED.md docs/10-TROUBLESHOOTING.md frontend/src/pages/ForgotPasswordPage.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/HelpPage.tsx frontend/src/contexts/AuthContext.tsx`
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No regressions introduced
- [x] #2 All functions behave properly
- [x] #3 All items in task are complete or notated why incomplete
<!-- DOD:END -->
