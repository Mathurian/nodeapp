# TASK-94 Postdeploy Checklist

Last Updated: 2026-05-17

## Related Task

This checklist is the postdeploy and post-activation follow-through for:

- `TASK-94` Complete end-to-end permissions authority and delegated scoring fallback remediation

Use this document if:

- the release is already deployed to production
- you need to finish tenant bootstrap, permission review, and UAT
- you need a single checklist to revisit during bug remediation or follow-up work tied to `TASK-94`

This checklist assumes the deployment and database migrations for `TASK-78`,
`TASK-93`, and `TASK-94` are already complete.

## Scope

This checklist covers:

- tenant permission bootstrap
- postdeploy permission review
- delegated scoring and delegated certification setup checks
- application-level UAT
- bug triage notes to capture if something fails

It does not replace the full release runbook in
[PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md](./PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md).

## 1. Confirm the Release State

- [ ] Confirm the active production release is the intended release id.
- [ ] Confirm the backend service is active.
- [ ] Confirm the health endpoint returns `status: OK`.
- [ ] Confirm the production nginx config validates cleanly.
- [ ] Confirm the following migrations exist in production:
  - [ ] `20260516223000_task78_operation_specific_permission_scopes`
  - [ ] `20260516235900_task94_delegated_score_entry`
  - [ ] `20260517001500_task94_delegate_judge_certification`

## 2. Bootstrap Permissions for Each Tenant

For every tenant expected to manage the new resources through `/permissions`:

- [ ] Sign in as `SUPER_ADMIN` or `ADMIN`.
- [ ] Open `/permissions`.
- [ ] Load the permissions stats view.
- [ ] Load the permissions scopes view.
- [ ] Confirm the tenant now shows the new resources:
  - [ ] `score-governance`
  - [ ] `score-removal`
  - [ ] `score-files`
  - [ ] `delegated-scores`
  - [ ] `score-delegations`
  - [ ] `permissions`

## 3. Review Live Permissions

Review and adjust role assignments intentionally before announcing the workflow.

### Administrative recovery

- [ ] Confirm at least one production recovery account still has `permissions:write`.
- [ ] Confirm at least one production recovery account still has `permissions:read`.

### Delegation management

- [ ] Confirm who should have `score-delegations:read`.
- [ ] Confirm who should have `score-delegations:write`.
- [ ] Confirm who should have `score-delegations:revoke`.

### Delegated scoring

- [ ] Confirm who should have `delegated-scores:read`.
- [ ] Confirm who should have `delegated-scores:write`.
- [ ] Confirm who should have `delegated-scores:certify`.

### Judge self-certification

- [ ] Confirm judges who self-certify still have `scores:certify`.

## 4. Review the Tenant Safeguard

For each tenant using the fallback scoring model:

- [ ] Open the score governance safeguards UI.
- [ ] Confirm whether `Allow delegate judge certification` should stay off or be enabled.
- [ ] Record that decision operationally before live use.

Recommended default:

- leave delegate certification off unless the tenant explicitly wants delegates
  to sign on behalf of represented judges

## 5. Warm the Permission Cache

After permission adjustments:

- [ ] Trigger `/permissions/cache/warm` as `SUPER_ADMIN` or `ADMIN`.
- [ ] Confirm the warm action succeeds.
- [ ] If any role behavior still looks stale, retry after the warm completes.

## 6. UAT: Core Permissions Behavior

### Permissions administration

- [ ] Confirm `ADMIN` with `permissions:read` can access `/permissions`.
- [ ] Confirm an otherwise eligible admin-plane role without `permissions:read` is denied.
- [ ] Confirm only `ADMIN` or `SUPER_ADMIN` can warm cache.

### Core CRUD alignment

- [ ] Toggle `events:*` for a non-admin role and confirm direct API access changes.
- [ ] Toggle `users:*` for a non-admin role and confirm direct API access changes.
- [ ] Toggle `assignments:*` and confirm direct API access changes.
- [ ] Toggle `results:*` and confirm winners or publication access changes.

### Scope-aware resources

- [ ] Confirm `files` scope affects inventory and file-management analytics.
- [ ] Confirm `deductions` scope affects visible deduction data.
- [ ] Confirm `certifications` scope affects visible certification data.
- [ ] Confirm `reports` remains tenant-scoped and does not imply finer scope behavior.

## 7. UAT: Scoring and Delegation

### Judge self-entry

- [ ] Confirm a judge can enter scores normally.
- [ ] Confirm a judge can self-certify with `scores:certify`.
- [ ] Confirm the self-entry path records `SELF` attribution as expected.

### Delegated score entry only

- [ ] Create a one-judge grant and confirm only that judge is selectable.
- [ ] Create a selected-judges grant and confirm only the chosen judges are selectable.
- [ ] Create an all-judges-in-scope grant and confirm broad eligibility only inside that scope.
- [ ] Confirm delegated score entry records the represented judge, acting user, `DELEGATED` entry mode, and grant linkage.
- [ ] Confirm delegated score-file upload records the same attribution pattern.
- [ ] Confirm delegated entry alone does not certify the represented judge.

### Delegated certification disabled

- [ ] Leave `Allow delegate judge certification` off.
- [ ] Confirm a delegate can still enter scores when the grant allows it.
- [ ] Confirm the delegate cannot complete judge-stage certification on behalf of the represented judge.
- [ ] Confirm the represented judge can still certify later through the normal judge path.

### Delegated certification enabled

- [ ] Enable `Allow delegate judge certification`.
- [ ] Confirm the delegate still needs an active grant.
- [ ] Confirm the delegate still needs `delegated-scores:certify`.
- [ ] Confirm the delegate can certify on behalf of the represented judge only when those conditions are met.
- [ ] Confirm the resulting judge certification records:
  - [ ] represented `judgeId`
  - [ ] acting certifier user
  - [ ] `certificationMode = DELEGATED`
  - [ ] delegation grant used

## 8. UAT: Downstream Certification

- [ ] Confirm tally master certification remains blocked until judge-stage completion is satisfied.
- [ ] Confirm delegated judge certification, when enabled, satisfies the represented judge stage only.
- [ ] Confirm tally master certification still requires the normal tally step.
- [ ] Confirm auditor certification still requires the normal auditor step.
- [ ] Confirm board or final approval still requires the final approval step.

## 9. Revocation and Recovery

- [ ] Revoke an active delegation grant.
- [ ] Confirm new delegated access stops immediately after revocation.
- [ ] Confirm historical attribution remains intact for already recorded delegated activity.
- [ ] Confirm an administrative recovery path still exists for exceptional support.

## 10. Help and Documentation Verification

- [ ] Confirm the Help page shows `Scoring and Certification Workflows`.
- [ ] Confirm the Help page shows `Delegated Scoring Admin and Operator Setup` only to the intended admin/operator roles.
- [ ] Confirm the Help content matches the live production behavior for:
  - [ ] judge self-entry
  - [ ] delegated entry without delegated certification
  - [ ] delegated entry with delegated certification enabled

## 11. If a Check Fails

Capture these details before remediation:

- [ ] tenant
- [ ] user role
- [ ] permission token or safeguard involved
- [ ] represented judge, if relevant
- [ ] category or event scope
- [ ] expected behavior
- [ ] actual behavior
- [ ] whether the issue is:
  - [ ] permission bootstrap
  - [ ] cache staleness
  - [ ] route enforcement
  - [ ] UI visibility mismatch
  - [ ] grant coverage issue
  - [ ] delegated certification issue
  - [ ] downstream certification regression

If follow-up work is needed, link it back to `TASK-94`.

## Related Documents

- rollout runbook:
  [PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md](./PERMISSIONS-DELEGATED-SCORING-ROLLOUT.md)
- full workflow model:
  [SCORING-CERTIFICATION-WORKFLOW-GUIDE.md](./SCORING-CERTIFICATION-WORKFLOW-GUIDE.md)
