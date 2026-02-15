# AI UAT Handoff Template

Use this template to brief a browser-based AI tester for a full UAT run.

## 1) Environment

- `BASE_URL`: `<https://conmgr.com>`
- `TENANT_SLUG`: `<febtest1>`
- `DATE`: `<YYYY-MM-DD>`
- `RUN_LABEL`: `<optional-run-name>`

## 2) Credentials By Role

Provide valid test accounts for each role used in the run.

- `SUPER_ADMIN`: `<email>` / `<password>`
- `ADMIN`: `<email>` / `<password>`
- `ORGANIZER`: `<email>` / `<password>`
- `BOARD`: `<email>` / `<password>`
- `TALLY_MASTER`: `<email>` / `<password>`
- `AUDITOR`: `<email>` / `<password>`
- `JUDGE`: `<email>` / `<password>`
- `EMCEE`: `<email>` / `<password>`
- `CONTESTANT`: `<email>` / `<password>`

## 3) Scenario ID Discovery (Required)

After login as `ORGANIZER` (or `ADMIN`/`SUPER_ADMIN`), call:

- `GET /api/v1/test-runner/uat-ids`

Extract and use:
- `singleCategoryScenario`
- `multiCategoryScenario`
- Any required IDs from nested:
  - `events[] -> contests[] -> categories[] -> contestants[]`

## 4) Test Cases To Execute

Primary source:
- `docs/Acceptance-Test-Guide.md`

Machine-readable source:
- `docs/Acceptance-Test-Cases.json`
  - Optional alternate: `docs/Acceptance-Test-Cases.csv`

Human UX reference (if needed):
- `docs/Acceptance-Test-Guide-v2.md`
- `docs/Acceptance-Test-Quick-Run.md`

## 5) Execution Rules

- Test each role in isolation (log out before switching).
- Use tenant-aware URLs.
- Validate both behavior and role scoping.
- Treat runtime/module-load errors, broken routing, and unauthorized data exposure as blockers.
- Capture URL and exact repro steps for every failure.

## 6) Required Output Format

Return one result object per case ID:

```json
{
  "id": "TC-CORE-001",
  "status": "PASS",
  "role": "ADMIN",
  "url": "https://conmgr.com/dashboard",
  "notes": "",
  "evidence": []
}
```

If failed, include:
- expected vs actual
- HTTP status code (if any)
- console/runtime error signature (if any)
- minimal reproducible steps

Final summary required:
- total cases
- pass count
- fail count
- skip count
- blocker list

## 7) Optional Reset Instruction (Operator-Run)

If your operator supports shell access, reset test state before run:

```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <tenant-slug> --apply
```

For browser-only AI, skip shell reset and proceed with available tenant state.
