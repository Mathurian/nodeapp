# Acceptance Test Guide (AI Runbook)

Purpose: deterministic checklist for AI/browser-driven execution across roles and scenarios.

Audience: automation operator (AI agent with browser access; filesystem access optional).

Companion human document:
- `docs/testing/Acceptance-Test-Guide-v2.md`

Machine-readable exports:
- `docs/testing/Acceptance-Test-Cases.csv`
- `docs/testing/Acceptance-Test-Cases.json`

## 1. Execution Model

This guide assumes:
- Tenant may be preseeded by humans, or bootstrapped by AI in `EMPTY_TENANT` mode.
- AI is provided tenant slug + credentials.
- AI resets tenant UAT state before each run (operator shell) or uses existing tenant state (browser-only).

Reset script:
- `scripts/uat/reset-tenant-uat-state.sh`

Browser-only AI data source (no filesystem required):
- `GET /api/v1/test-runner/uat-ids`
- Access roles: `SUPER_ADMIN`, `ADMIN`, `ORGANIZER`
- Response includes suggested `singleCategoryScenario` and `multiCategoryScenario` IDs.

## 1.1 Browser-AI Input Contract (Minimum Handoff)

Provide the AI runner:
- `BASE_URL` (example: `https://conmgr.com`)
- `TENANT_SLUG` (example: `febtest1`)
- Credentials for each role to be tested:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `ORGANIZER`
  - `BOARD`
  - `TALLY_MASTER`
  - `AUDITOR`
  - `JUDGE`
  - `EMCEE`
  - `CONTESTANT`
- Instruction to fetch scenario IDs from:
  - `GET /api/v1/test-runner/uat-ids` after login as `ORGANIZER` (or `ADMIN`/`SUPER_ADMIN`)

Do not require local scripts for browser-only AI if this endpoint is available.

Required pre-run command:
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> --apply --scenario preseeded
```

Optional (preserve logs/reports/notifications):
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> --apply --scenario preseeded --keep-logs
```

## 2. Run Inputs (Required)

- `BASE_URL` (example: `https://conmgr.com`)
- `TENANT_SLUG` (example: `febtest1`)
- `LIFECYCLE_MODE` (`PRESEEDED_TENANT` or `EMPTY_TENANT`)
- Role credentials:
  - `SUPER_ADMIN`
  - `ADMIN`
  - `ORGANIZER`
  - `BOARD`
  - `TALLY_MASTER`
  - `AUDITOR`
  - `JUDGE`
  - `EMCEE`
  - `CONTESTANT`
- Scenario test IDs:
  - `singleCategoryScenario` IDs (event/contest/category/contestants)
  - `multiCategoryScenario` IDs

Preferred source:
- `/api/v1/test-runner/uat-ids`

Fallback source (operator/local shell only):
- `scripts/uat/export-uat-ids.sh --tenant-slug <slug>`

Lifecycle reference:
- `docs/testing/E2E-Lifecycle-Track.md`

## 3. Global Preconditions (Hard Fail if Missing)

For `PRESEEDED_TENANT` mode:
- At least 1 active event in tenant.
- At least 2 contests.
- At least 2 categories per contest for multi-category scenario.
- Assigned users for judge/tally/auditor/board workflow.
- Contestants with:
  - manual bio text
  - uploaded bio file
  - uploaded image
- At least 1 emcee script with viewable file.

For `EMPTY_TENANT` mode:
- Minimum required starting credentials: organizer/admin only.
- AI must create required users directly in UI with explicit passwords (no inbox/invite dependency).
- Permission to create users/events/contests/categories/criteria/assignments/contestants in tenant.
- Reset recommendation before run:
  - `scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> --apply --scenario empty-tenant`

## 3.1 Lifecycle Track Modes

Lifecycle track supports two tenant states:
- `PRESEEDED_TENANT`
  - event/contest/category/assignments already exist
  - run full workflow from scoring through winners validation
- `EMPTY_TENANT`
  - tenant starts with no usable event setup
  - run setup bootstrap first, then complete full workflow

Mode requirements:
- For `PRESEEDED_TENANT`, IDs should come from `/api/v1/test-runner/uat-ids`.
- For `EMPTY_TENANT`, AI creates IDs during setup steps and reuses them for the same run.
- For `EMPTY_TENANT`, user provisioning must be direct-create with known passwords; do not require email invites.

## 4. Output Contract

AI must emit:
- `PASS/FAIL` per test case ID.
- Failure payload:
  - case ID
  - role
  - URL
  - reproduction steps
  - expected vs actual
  - status/error code or console/runtime signature
- Summary:
  - total/pass/fail/skip
  - blocker defects list

## 5. Test Case Format

Each case below has:
- `ID`
- `Role`
- `Action`
- `Expected`

Use strict matching. “Looks good” is invalid unless explicitly marked UX-only.

Automation fields:
- `id`: stable test case ID
- `area`: functional domain
- `role`: execution role/scope
- `action`: executable step target
- `expected`: assertion target
- `priority`: `P0|P1|P2`
- `blocking`: `true|false`

ID governance:
- IDs are immutable once published.
- New test: add a new ID, do not repurpose existing ID.
- Retired test: mark deprecated in export, do not delete historical ID usage from reports.

## 6. Core Routing and Session Cases

### TC-CORE-001
- Role: Any authenticated role
- Action: Open `/dashboard` without slug
- Expected: canonical redirect to `/{TENANT_SLUG}/dashboard`

### TC-CORE-002
- Role: Any authenticated role
- Action: hard refresh on `/{TENANT_SLUG}/bios`
- Expected: page loads with tenant context, no blank shell

### TC-CORE-003
- Role: Any authenticated role
- Action: use 404 page actions (`Go Back`, `Go to Dashboard`)
- Expected: app returns to working routed shell, not blank/partial UI

### TC-CORE-004
- Role: Any
- Action: normal navigation across 5 pages
- Expected: no dynamic import failures

### TC-CORE-005
- Role: Any authenticated role
- Action: open command search using keyboard shortcut or top search control
- Expected: search results are role-appropriate and navigation resolves to working tenant-aware routes

## 7. Navigation/Permission Matrix Cases

### TC-NAV-001
- Role: Organizer
- Action: open menu + command palette
- Expected: only allowed routes visible; no dead “Access Denied” options

### TC-NAV-002
- Role: Organizer
- Action: select a menu item, then click outside drawer
- Expected: drawer closes in both interactions

### TC-NAV-003
- Role: Super admin
- Action: verify admin-only pages visible and functional
- Expected: access allowed + data loads

## 8. Judge Scoring Flow Cases

### TC-JUDGE-001
- Role: Judge
- Action: open `/scoring`
- Expected: only assigned categories listed

### TC-JUDGE-002
- Role: Judge with no active assignment
- Action: open `/scoring`
- Expected: no categories shown; no error

### TC-JUDGE-003
- Role: Judge
- Action: score one contestant and submit with certification
- Expected: submit succeeds; score locks immediately

### TC-JUDGE-004
- Role: Judge
- Action: edit comments after certification
- Expected: comments remain editable

### TC-JUDGE-005
- Role: Judge
- Action: upload commentary file
- Expected: file persists and is visible in downstream results/report contexts

## 9. Bios and Media Cases

### TC-BIO-001
- Role: Judge
- Action: open `/bios`
- Expected: scoped contestants and bios/images/files shown (no placeholder-only when data exists)

### TC-BIO-002
- Role: Emcee
- Action: open `/bios`, filter by contest
- Expected: contestant + judge data shown per scope

### TC-BIO-003
- Role: Organizer
- Action: open bio file and user image links
- Expected: HTTP 200 and valid render, no 404

## 10. Certification Pipeline Cases

### TC-CERT-001 (Single Category)
- Role chain: Judge -> Tally -> Auditor -> Board/Organizer
- Action: complete full certification flow for one category
- Expected: each stage only unlocks after prior stage complete

### TC-CERT-002 (Partial Guardrail)
- Role: Tally+ views
- Action: judge certifies only one contestant in category
- Expected: stage not shown as fully complete

### TC-CERT-003 (Multi Category)
- Role chain: Judge -> Tally -> Auditor -> Board/Organizer
- Action: run flow on 2+ categories in same contest
- Expected: status accurate per category and contest rollup

### TC-CERT-004 (Auditor Terminology)
- Role: Auditor
- Action: navigate using current auditor labels such as `Auditor Dashboard`, `Pending Auditor Certifications`, or `Certification Status`
- Expected: labels route into the same auditor certification flow; legacy wording is treated as alternate labeling, not a separate workflow

## 11. Governance, Un-certify, Throw-Out Cases

### TC-GOV-001
- Role: Judge
- Action: request un-certification
- Expected: request created; no immediate uncertification

### TC-GOV-002
- Role: Tally/Auditor/Board/Admin
- Action: request throw-out (judge/category and judge/contest scopes)
- Expected: request requires approvals; no immediate score deletion

### TC-GOV-003
- Role: Approver chain
- Action: complete required approvals
- Expected: final governance action executes only after threshold reached

## 12. Deductions Cases

### TC-DED-001
- Role: Allowed initiator
- Action: create category-specific deduction
- Expected: request accepted with required fields

### TC-DED-002
- Role: Allowed initiator
- Action: create general deduction (non-criterion specific)
- Expected: request accepted and routed through approval chain

### TC-DED-003
- Role: Approvers
- Action: complete approvals
- Expected: deduction applied to final calculations and visible in results/reports

## 13. Results and Reports Cases

### TC-RES-001
- Role: Organizer/Admin
- Action: open contest-level results
- Expected: overall contest ordering shown

### TC-RES-002
- Role: Organizer/Admin
- Action: drill into category
- Expected: category results shown with controls in correct context

### TC-RES-003
- Role: Contestant with visibility disabled
- Action: view results
- Expected: blocked/hidden according to visibility flags

### TC-RPT-001
- Role: Allowed report role
- Action: generate report and use View
- Expected: rendered preview (not raw JSON for normal report preview mode)

## 14. Emcee and File Cases

### TC-EMC-001
- Role: Emcee
- Action: open script via View
- Expected: file opens without 404

### TC-FILE-001
- Role: Admin/Organizer
- Action: open `/files`
- Expected: table includes real filenames/metadata

## 15. MFA Cases

### TC-MFA-001
- Role: User under tenant MFA enforcement
- Action: login
- Expected: MFA challenge required

### TC-MFA-002
- Role: same
- Action: complete TOTP/EMAIL/SMS (allowed providers)
- Expected: successful session only after valid challenge

## 16. E2E Lifecycle Track

### TC-LIFE-001 (Bootstrap - Empty Tenant)
- Role: Organizer/Admin
- Action: create event, contest, 2+ categories, criteria, and contestant records from blank tenant
- Expected: all setup entities persist and are visible in management UIs

### TC-LIFE-002 (Assignments - Empty Tenant)
- Role: Organizer/Admin
- Action: assign judge, tally master, auditor, board users to the created contest/category scope
- Expected: assignments persist with correct scope labels and effective access

### TC-LIFE-003 (Scoring - Lifecycle)
- Role: Judge(s)
- Action: submit/certify all contestant scores for target category/contest
- Expected: scores lock on submit and judge comments remain editable

### TC-LIFE-004 (Certification Chain - Lifecycle)
- Role chain: Tally -> Auditor -> Board/Organizer
- Action: complete each certification stage after prerequisites are met
- Expected: stage progression only advances when prior stage is complete

### TC-LIFE-005 (Results Integrity - Lifecycle)
- Role: Organizer/Admin
- Action: open contest and category results after full certifications
- Expected: contest-level overall ordering and category-level detail both render correctly

### TC-LIFE-006 (Winner Control - Lifecycle)
- Role: Board/Organizer
- Action: verify winners page/control state before and after final publish/unlock action
- Expected: pre-publish hidden/restricted state and post-publish visible state match configuration

### TC-LIFE-007 (Role Visibility - Lifecycle)
- Role: Contestant + Emcee
- Action: verify visibility constraints for results/winners before and after release flags
- Expected: only permitted data is visible per role and release policy

### TC-LIFE-008 (Artifact Validation - Lifecycle)
- Role: Organizer/Admin
- Action: verify commentary files, bio files, and report outputs in final workflow state
- Expected: files open successfully, reports reflect certified workflow outputs

## 17. Final Gate

Run is `PASS` only if:
- all blocker cases pass
- no unauthorized data exposure across roles
- no critical runtime/module-load failures
- no broken file links in bios/scripts/results paths

Run is `FAIL` if any of the above is violated.

## 18. Export and Reporting Contract

Automation runners should key all results by `id` from:
- `docs/testing/Acceptance-Test-Cases.csv` or
- `docs/testing/Acceptance-Test-Cases.json`

Suggested result schema:
```json
{
  "id": "TC-CORE-001",
  "status": "PASS",
  "startedAt": "2026-02-15T12:00:00Z",
  "finishedAt": "2026-02-15T12:00:08Z",
  "role": "ADMIN",
  "url": "https://conmgr.com/dashboard",
  "notes": "",
  "evidence": []
}
```
