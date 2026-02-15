# Acceptance Test Quick Run (30-Minute Smoke)

Purpose: fast manual validation of critical paths, routing, permissions, and visible UX.

Before running this checklist, reset tenant UAT state:
```bash
scripts/uat/reset-tenant-uat-state.sh --tenant-slug <your-tenant-slug> --apply
```

## Session Info

- Tester:
- Date:
- Environment:
- Tenant slug:
- Browser:

## 1. Global Smoke (5 minutes)

- [ ] Open `/` and confirm branding looks correct (name/favicon/alignment).
- [ ] Open `/login` and confirm link back to `/` works.
- [ ] Log in and confirm `/dashboard` resolves to `/{tenantSlug}/dashboard`.
- [ ] Open menu and command palette; both show role-appropriate options only.
- [ ] Menu closes after selecting a page and when clicking outside.

## 2. Judge Critical Path (7 minutes)

- [ ] Log in as judge.
- [ ] Open `/scoring`; only assigned categories appear.
- [ ] Score one contestant and submit with certification/signoff.
- [ ] Confirm scores lock immediately after submit.
- [ ] Confirm comments remain editable.
- [ ] Open `/bios`; assigned contestant bio text + image/file display correctly.

## 3. Tally + Auditor + Board Pipeline (8 minutes)

- [ ] Log in as tally master and open `/tally-master`.
- [ ] Confirm dashboard has meaningful data and certification rows use names (not UUID-only).
- [ ] Certify eligible category/totals with signature prompt.
- [ ] Log in as auditor and certify next stage with signature prompt.
- [ ] Log in as board/organizer and confirm final-stage certification visibility and controls.
- [ ] Verify partial scoring does not mark entire stage complete.

## 4. Results, Reports, and Files (6 minutes)

- [ ] Open `/results` at contest level: overall ordering appears.
- [ ] Drill into category: category results appear.
- [ ] Open `/reports`: generate and use view preview (not raw JSON for normal report view).
- [ ] Open a bio file and an emcee script file; both load without 404.
- [ ] Open `/files`; table shows usable file records.

## 5. Settings and Security Spot Check (4 minutes)

- [ ] As admin/organizer, change a visible theme value and verify it applies after refresh.
- [ ] Open permissions editor; confirm tenant-scoped table loads.
- [ ] Confirm MFA settings page loads and provider options are visible.
- [ ] If MFA enforced, confirm login requires MFA challenge flow.

## 6. Pass/Fail Outcome

- [ ] No blocker defects (routing failure, blank screen, 404/500 in core flows, broken permissions).
- [ ] No critical data-visibility violations across roles.

Quick Result:
- `Pass` / `Pass with Issues` / `Fail`

Top Issues Found:
1.
2.
3.
