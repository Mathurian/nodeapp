# Acceptance Test Guide v2 (Human-Friendly UAT)

Use this guide for manual testing by a person or small group. It is written for end-user validation of behavior, look/feel, and usability.

Test model used by this guide:
- Tenant and test users are created manually by humans.
- Before each UAT cycle, run a tenant-scoped reset to return to a known-good state.
- Reset script path: `scripts/uat/reset-tenant-uat-state.sh`

## How To Use This Guide

- Test in a private/incognito window.
- Test one role at a time (log out before switching roles).
- Mark each item `Pass`, `Fail`, or `N/A`.
- Capture screenshots for failures.
- If something is confusing but not broken, mark it as `UX Issue`.

## Test Session Info

- Tester(s):
- Date:
- Environment URL:
- Tenant slug tested:
- Browser(s):
- Build/version:
- Reset script verify run completed: `Yes/No`
- Reset script apply run completed: `Yes/No`

## Pre-Run Reset (Required)

Run from repository root:

1. Verify what will be reset (safe, no changes):
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <your-tenant-slug>
```

2. Apply reset:
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <your-tenant-slug> --apply
```

3. Optional: preserve logs/reports/notifications/search artifacts:
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <your-tenant-slug> --apply --keep-logs
```

What reset does:
- Clears transactional UAT artifacts (scores, certifications, deductions, governance requests, winner signatures, score comments/files).
- Resets winner publication and lock flags on events/contests.
- Keeps manual setup intact (tenant, users, event/contest/category structure, assignments).

## Quick Defect Log Template

| ID | Role | Page/URL | Steps | Expected | Actual | Severity |
|---|---|---|---|---|---|---|
| BUG-001 | Judge | /scoring | ... | ... | ... | High |

## Global Smoke Checks (Run First)

### A. Login and Routing
- [ ] Visiting `/dashboard` while logged in redirects to `/{tenantSlug}/dashboard`.
- [ ] Hard-refresh on a tenant page (example: `/{slug}/bios`) loads correctly.
- [ ] No blank screen after using “Go Back” or “Go to Dashboard”.

### B. Navigation and UX
- [ ] Menu opens/closes correctly on desktop/tablet/mobile.
- [ ] Menu closes when clicking a navigation link.
- [ ] Menu closes when clicking outside.
- [ ] Expanded menu sections do not persist in a confusing way after navigation.
- [ ] Command palette shows only allowed pages for the logged-in role.

### C. Stability
- [ ] No unexpected 404/403/409/500 in normal flows.
- [ ] No dynamic import/module load errors in browser console.
- [ ] Search returns useful results and navigates correctly.

## Public Pages (No Login)

### Landing Page `/`
- [ ] Branding (name/favicon) reflects default tenant settings.
- [ ] Header/footer sign-in links are visually aligned and consistent.
- [ ] Language is not misleading (no exaggerated adoption claims).

### Login and Help
- [ ] Login page has working link/button back to `/`.
- [ ] Help page has working link/button back to `/`.
- [ ] Register link is absent in invite-only mode.

## Role-by-Role Manual Checklists

## SUPER_ADMIN

### Access and Scope
- [ ] Can access tenant management and global admin pages.
- [ ] Can view data across tenants where expected.
- [ ] Default-tenant routes behave correctly after hard refresh.

### Security and Controls
- [ ] Can configure tenant MFA policies.
- [ ] Can configure MFA providers per tenant (TOTP/EMAIL/SMS).
- [ ] Can manage permissions and audit logs.

### UX Quality
- [ ] Dashboard widgets are populated and understandable.
- [ ] No dead links in navigation or command palette.

## ADMIN

### Core Management
- [ ] Can CRUD events, contests, categories, users, assignments.
- [ ] Assignment table filtering by contest/category works and is clear.
- [ ] Permissions editor loads and is usable for tenant users.

### Settings
- [ ] Theme/branding changes save and visibly apply after refresh.
- [ ] Contestant visibility settings save without timeout.
- [ ] File management table shows meaningful records.

### Reports
- [ ] Report generation completes.
- [ ] “View” mode shows readable preview (not raw JSON for normal reports).
- [ ] Download options work.

## ORGANIZER

### Event and Workflow Operations
- [ ] Can manage event structure and category criteria.
- [ ] Can edit number and names of criteria in category workflow.
- [ ] Can manage assignments and see accurate assignment level labeling.

### Certification Oversight
- [ ] Certification page loads real data (not empty placeholders).
- [ ] Contest/category names display (not raw UUIDs).
- [ ] Stage indicators reflect true completion state.

### Bios/Media
- [ ] `/bios` shows contestants, judges, and other users as scoped.
- [ ] Text bios, image files, and bio documents open successfully.

## BOARD

### Certification and Governance
- [ ] Can see certification status from prior stages.
- [ ] Can certify only when prerequisites are met.
- [ ] Can request un-certification via governance flow.
- [ ] Can participate in score throw-out and deduction approvals.

### Winners Flow
- [ ] Can view winners controls and publication status.
- [ ] Unlock/publish flow behaves as expected.

## TALLY_MASTER

### Dashboard and Visibility
- [ ] Tally dashboard shows real counts (not all zeros when data exists).
- [ ] Certification views show names for event/contest/category.

### Score Review
- [ ] Can see judge scores by contest/category/contestant filters.
- [ ] Can certify tally stage with signature prompt.

### Governance
- [ ] Can submit and review throw-out/un-certification requests.
- [ ] Guardrails prevent immediate destructive actions.

## AUDITOR

### Dashboard UX
- [ ] Auditor lands on auditor workspace (not generic dashboard UX).
- [ ] Quick links are relevant (pending audits/certifications/results).

### Certification Flow
- [ ] Can review tally-certified data.
- [ ] Can certify auditor stage with signature prompt.
- [ ] Can request un-certification/throw-out through governance.

## JUDGE

### Scoring Scope
- [ ] Sees only assigned categories.
- [ ] Sees only assigned contestants in those categories/contests.
- [ ] No assignments = no scoring categories shown.

### Submission and Certification
- [ ] Can score a contestant successfully.
- [ ] Submission requires judge certification/signoff.
- [ ] Scores lock immediately after submit/certify.
- [ ] Comments remain editable after certification.

### Commentary and Files
- [ ] Can add per-contestant/per-category comments.
- [ ] Can upload commentary files (image/doc) successfully.
- [ ] Uploaded files appear in downstream results/reports views.

### Bios and Images
- [ ] Contestant bios and images display for assigned scope.
- [ ] No placeholder-only behavior when real bio exists.

## CONTESTANT

### Access and Visibility
- [ ] Login allowed/blocked according to event-level policy.
- [ ] Dashboard only shows permitted scope.
- [ ] Can view allowed judges and fellow contestants in scope.

### Results Restrictions
- [ ] Cannot see winners/overall results when visibility flags disallow.
- [ ] Can see results only when released for contestant view.

## EMCEE

### Default Experience
- [ ] Emcee landing experience emphasizes scripts and bios.
- [ ] Script active/inactive state is visually clear.

### Script and Bio Consumption
- [ ] Can open script files without 404.
- [ ] Can view scoped contestant and judge bios/images.
- [ ] Contest filter works and updates list correctly.

## End-to-End Workflow Scenarios

## Scenario 1: Single Category Full Pipeline
1. Judge scores all contestants and certifies.
2. Tally master certifies totals.
3. Auditor certifies review.
4. Board/Organizer final certifies.

Expected:
- [ ] Stage color/status only turns complete when fully complete.
- [ ] No stage appears fully complete after partial contestant scoring.

## Scenario 2: Multi-Category Consistency
- [ ] Repeat Scenario 1 across 2+ categories in one contest.
- [ ] Status remains correct per category and at contest summary level.

## Scenario 3: Deductions and Governance
- [ ] Create a category-specific deduction.
- [ ] Create a general deduction (not criterion-specific).
- [ ] Complete required multi-party approvals.
- [ ] Verify deduction appears in results and reports.

## Scenario 4: Un-certification and Throw-Out Requests
- [ ] Submit un-certification request (judge own scope, higher roles broader scope).
- [ ] Submit throw-out request for judge scores (category-level and contest-level options).
- [ ] Verify no immediate score removal without approvals.

## Results and Reports UX Validation

- [ ] Contest-level results show overall ranking/order.
- [ ] Category drill-down shows category-level details.
- [ ] Export/Print/View controls appear in the right contexts.
- [ ] Report preview renders user-friendly format.
- [ ] Email template preview renders as preview, not raw markup.

## File and Media Validation

- [ ] Bio file links open and load actual files.
- [ ] Profile image URLs load (no 404).
- [ ] Emcee script view links open correctly.
- [ ] File permissions are enforced by role/scope.

## Visual and Interaction QA (Look/Feel)

- [ ] Header spacing/alignment looks intentional on desktop and tablet.
- [ ] Navigation does not feel “stuck” while scrolling.
- [ ] Buttons and links have consistent style and spacing.
- [ ] Form validation errors are clear and actionable.
- [ ] Empty states are informative, not broken-looking.

## Final Signoff

- [ ] All high-priority paths pass for each role.
- [ ] Any failed checks have logged defects with reproduction steps.
- [ ] No blocker defects remain open.

Signoff:
- Tester Name:
- Date:
- Result: `Pass` / `Pass with Known Issues` / `Fail`
- Notes:
