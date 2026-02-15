# Acceptance Test Guide

Purpose: structured UAT checklist for validating Event Manager behavior across all supported user roles, workflows, and cross-role handoffs.

Scope: frontend UI/UX, API-backed behavior, role scoping, score/certification pipeline, deductions/governance, files/bios/scripts, tenant routing, and settings.

## 1. Test Setup

### Environment Preconditions
- Application is reachable at `https://conmgr.com`.
- API is reachable at `/api/*`.
- Tenant slug under test exists (example: `febtest1`).
- Default tenant exists (slug: `default`).
- Database has seeded users for each role in the target tenant.
- Browser cache is cleared before full pass (private window preferred).

### Baseline Data Preconditions
- At least 1 active event with at least 2 contests.
- Each contest has at least 2 categories.
- Each category has multiple contestants.
- At least 2 judges assigned to at least one shared category.
- At least 1 tally master, 1 auditor, and 1 board user assigned.
- Contestants include:
  - Manual text bio.
  - Uploaded bio file.
  - Uploaded profile image.
- At least one emcee script exists and is viewable.

### Global Pass/Fail Rules
- No unhandled runtime exceptions in console.
- No unexpected `403`, `404`, `409`, or `500` in valid user flows.
- No dynamic import failure for navigated pages.
- No role can access forbidden pages through menu, command palette, or direct URL.
- Menu and command palette visibility are consistent with effective permissions.
- Navigation closes after route selection and when clicking outside.

## 2. Cross-Role Core Flows

### Tenant Routing and Canonical URLs
- Open `/dashboard` without slug while authenticated:
  - Expected: user is routed/canonicalized into `/{tenantSlug}/dashboard`.
- Open role home route without slug:
  - Expected: app resolves tenant and loads correct page and data.
- Hard refresh on tenant pages (for example `/{slug}/bios`):
  - Expected: page loads correctly with tenant context retained.

### Authentication and MFA
- Login success path works for each role.
- Logout invalidates active session in UI.
- MFA policy enforcement follows tenant settings:
  - `security_mfaEnabled=true` enforces MFA challenge.
  - Allowed providers come from `security_mfaProviders`.
  - TOTP path works when user is enrolled.
  - Email/SMS challenge path works when allowed and configured.
- Invalid MFA code is rejected without creating session.

### Role-Based Navigation
- Menu only shows allowed routes for current user.
- Command palette only returns allowed actions/routes.
- No “Access Denied” entries should appear as discoverable menu options for unauthorized routes.

### Search
- Global search returns real, actionable results.
- Selecting a search result navigates correctly.
- Empty state and no-match state are clear and non-breaking.

### Bios and Media
- `/bios` displays scoped data by role.
- Bio text, uploaded bio files, and profile images all render when present.
- File links resolve with `200` and open correctly (no fallback 404 page in valid links).

## 3. SUPER_ADMIN Checklist

- Can access all tenant and platform-level pages.
- Can switch tenant context and verify scoped data changes accordingly.
- Can manage permissions across tenants.
- Can view and update tenant-level MFA policy/providers.
- Can view full certification overview with drilldown.
- Can submit, approve, and monitor score governance requests per allowed scope.

## 4. ADMIN Checklist

- Lands on correct dashboard with tenant-scoped data.
- Can fully CRUD: events, contests, categories, users, assignments.
- Can edit tenant permissions for local tenant users.
- Can manage branding/theme and see applied visual changes.
- Can manage workflows/templates and verify they function end-to-end.
- Can generate reports and preview files in UI (not raw JSON unless JSON format selected).

## 5. ORGANIZER Checklist

- Default post-login page is organizer-relevant and functional.
- Can create/manage event structure and scoring configuration.
- Can configure contestant login visibility and result visibility flags.
- Can manage assignments (contest/category filters work as expected).
- Can access permissions page for tenant-scoped CRUD management.
- Can view certification pipeline status at contest/category level with meaningful names (not raw IDs).
- Can certify at organizer stage where allowed and see status update.

## 6. BOARD Checklist

- Can view certification progress across contests/categories.
- Can review and certify board stage only when prior stages are satisfied.
- Can request un-certification with governance safeguards.
- Can review deductions and participate in required approval chain.
- Can control winners visibility/unlock behavior where configured.

## 7. TALLY_MASTER Checklist

- Lands on tally dashboard with non-zero metrics when data exists.
- Overview shows contest/category names, not UUID-only display.
- Can view judge-level submitted scores with filters:
  - By contest.
  - By category.
  - By contestant.
- Can certify tally stage only when judge-stage requirements are met.
- Can initiate/request score throw-out or un-certification flows with required approvals.

## 8. AUDITOR Checklist

- Lands on auditor dashboard (not generic `/dashboard` UX).
- Can view tally-certified scores and certification chain status.
- Can certify auditor stage only when tally stage is completed.
- Can request un-certification and throw-out via governance workflow.
- Dashboard includes certification quick actions and pending review queues.

## 9. JUDGE Checklist

- Scoring page shows only assigned categories (none if no active assignments).
- Category selection and scoring page load without 404/dynamic import errors.
- Can score contestants in assigned scope only.
- Submit flow:
  - Requires judge certification/signature input.
  - Locks score values immediately on submit/certify.
  - Keeps commentary editable after certification.
- Can add per-contestant/per-category commentary.
- Can upload commentary files (images/docs) and verify availability in downstream views/reports.
- Can view only scoped contestant bios/images/files for assigned contests/categories.

## 10. CONTESTANT Checklist

- Login allowed/blocked based on event-level policy.
- If allowed and assigned across multiple events/tenants:
  - Dashboard shows only permitted partial data.
- Can view own event/contest/category scope only.
- Can view judge and contestant bios/images only within permitted scope.
- Results visibility respects configured release flags.

## 11. EMCEE Checklist

- Default dashboard emphasizes scripts + bios.
- Can view contestant and judge bios/images in scoped view, filterable by contest.
- Script active/inactive state is visually clear.
- Script view/download opens valid files (no 404).
- Winners page access behavior matches unlock/finalization rules.

## 12. Scoring and Certification Pipeline (End-to-End)

### Happy Path
1. Judge submits and certifies category scores.
2. Tally master reviews category totals and certifies tally stage.
3. Auditor reviews certified tally output and certifies auditor stage.
4. Board/Organizer performs final certification.
5. Winners page unlock logic behaves per policy.

Expected:
- Stage indicators reflect completion only when stage-wide requirements are truly satisfied.
- Partial submissions do not mark whole category/contest as complete.
- Drilldown always exposes pending users/items.

### Negative/Guardrail Cases
- Attempt certification out of order: blocked with clear reason.
- Attempt duplicate certification: idempotent or safely rejected.
- Attempt uncertify/throw-out without approvals: blocked.
- Attempt scoring outside assignment scope: blocked.

## 13. Deductions and Governance

- Deductions can be initiated by allowed roles.
- Supports category-specific and general deductions.
- Requires reason, amount, and initiator certification.
- Requires additional approvals per configured policy.
- Approved deductions affect final score calculations.
- Deductions and rationale appear in results and reports.

## 14. Results and Reports

- Contest-level results show overall contest ordering.
- Category drilldown shows per-category standings and details.
- Export/print/view controls appear consistently at all valid scopes.
- Contestant visibility flags are enforced in contestant view.
- Report generation supports:
  - View preview (inline when applicable).
  - Download formats.
  - Email/send where configured.

## 15. Files, Uploads, and Storage

- File management page lists real files with useful metadata.
- Upload paths are valid and retrievable through app URLs.
- Permissions enforce who can view which files.
- Nginx/static routing serves upload folders used by bios/scripts/images.

## 16. Settings, Branding, and Public Pages

- Landing page uses default tenant app name/favicon.
- Login/help pages include return-to-home link.
- Registration link is absent in invite-only mode.
- Theme/branding changes apply after save and refresh.
- Public settings endpoint resolves correctly and does not break app shell.

## 17. Final UAT Signoff Checklist

- All role checklists passed.
- End-to-end certification pipeline passed in at least:
  - Single-category scenario.
  - Multi-category scenario.
- No critical console/runtime errors.
- No broken links/files in bios/scripts/results.
- No unauthorized data exposure across roles or tenants.
- Documentation and in-app help align with final implemented behavior.

