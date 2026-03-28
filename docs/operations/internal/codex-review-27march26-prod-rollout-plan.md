# Codex Review 27 March 2026 Production Rollout Plan

## Purpose

Define the production promotion and rollback steps for the remediation work tracked in:

- `docs/operations/internal/codex-review-27march26-remediation-checklist.md`

This rollout plan is intentionally narrow. It covers only the reviewed remediation slices already completed and validated in dev.

## Scope of Release

The production release for this remediation should include:

- backend docs access policy enforcement
- Help UI alignment to backend-published docs
- `permissions/audit-logs` backend support
- removal or truthful hard-failure handling for the reviewed `501` / false-success route surfaces
- frontend/backend auth-policy alignment for the reviewed mismatches
- default-tenant resolver hardening
- notification logging cleanup
- frontend correctness fixes on the reviewed/touched surfaces
- bulk-operation scope hardening
- low-risk `WorkflowService` tenant-context normalization on selected helper paths

## Preconditions

Do not promote until all of the following are true in dev:

1. `npm run build` passes
2. `cd frontend && npm run build` passes
3. Validation notes are current in:
   - `docs/operations/internal/codex-review-27march26-validation-notes.md`
4. The remaining open checklist items are accepted as post-release follow-up or intentionally deferred:
   - broader global Prisma normalization
   - additional operational log review
   - final `409` revisit after all other checklist items are complete

## Deployment Procedure

Use the established production deployment model documented in:

- `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- `docs/operations/PROD-RUNTIME-LAYOUT.md`

Run in this order:

```bash
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..
bash scripts/deploy/pwa-preflight.sh
sudo bash scripts/deploy/preflight-tenant-segregation.sh
sudo scripts/deploy/stage-release.sh
RELEASE_TS="$(cat /opt/event-manager/.last_release_ts)"
sudo RETAIN_RELEASES=10 scripts/deploy/activate-release.sh "$RELEASE_TS"
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

## Post-Deploy Verification

Verify the following in production immediately after activation:

### Documentation access

1. Anonymous request to restricted docs returns `401` or `403`
2. Authorized admin request to restricted docs succeeds
3. Underprivileged authenticated request is denied

Key endpoints:

- `/api/docs`
- `/api/docs/08-DEPLOYMENT.md`
- `/api/docs/11-DISASTER-RECOVERY.md`
- `/api/docs/13-ADMIN-GUIDE.md`

### Permissions audit logs

1. Admin/authorized role can load `/permissions/audit-logs`
2. Underprivileged role receives denial

### Reviewed route remediation

1. Reviewed user-facing routes no longer return `501`
2. Reviewed false-success route returns a truthful failure until fully implemented

### Authorization alignment

Confirm the reviewed page surfaces behave correctly for the intended roles:

- `/database`
- `/performance`
- `/test-event-setup`
- `/test-runner`
- `/uat-ids`

## Rollback Triggers

Rollback immediately if any of the following occur:

1. production health endpoint fails after activation
2. docs API access policy regresses and exposes restricted docs anonymously
3. reviewed admin pages become unreachable for the intended authorized role
4. reviewed route removals/hard-fail paths break a production flow beyond the approved behavior change
5. authentication, tenant resolution, or navigation regression appears on production login or core dashboards

## Rollback Procedure

Use the standard release rollback path:

```bash
sudo scripts/deploy/rollback-release.sh
```

Or roll back to a specific prior release if needed:

```bash
sudo scripts/deploy/rollback-release.sh <release_timestamp>
```

Then verify:

```bash
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

## Deferred Follow-Up

These items are intentionally not release blockers for this remediation rollout:

1. further direct global Prisma normalization in services beyond the low-risk slices already completed
2. broader production log quality review outside the reviewed notification data-exposure fix
3. final review of temporary `409` responses introduced during remediation, after all other checklist work is complete
