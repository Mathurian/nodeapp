# Tenant Segregation Rollout

This runbook describes how to roll out full tenant segregation safely.

## Policy Modes

- `TENANT_SEGREGATION_MODE=off`: checks disabled.
- `TENANT_SEGREGATION_MODE=audit`: violations logged, requests still allowed.
- `TENANT_SEGREGATION_MODE=enforce`: non-`SUPER_ADMIN` access to default tenant is blocked.
- `TENANT_DB_RLS_MODE=off|enforce`: request-scoped DB session RLS context (`app.*`) for PostgreSQL policy enforcement.

Default fallback values (if env keys are missing):

- `TENANT_DEFAULT_IDS=default_tenant,default-tenant`
- `TENANT_DEFAULT_SLUGS=default`

## Runtime Guardrails

- `config/database` now exports a context-aware Prisma proxy:
  - inside API request context, global Prisma imports resolve to request-scoped `req.prisma`
  - outside request context (jobs/ops), Prisma resolves to the root client
- Background/event paths must set explicit DB RLS session context using `withTenantDbRlsContext`:
  - tenant-scoped execution: `{ tenantId, isSuperAdmin: false }`
  - system/global execution: `{ tenantId: null, isSuperAdmin: true }`
  - current covered runtime paths include report jobs, workflow scheduler/automation, webhook delivery/event handling, email digest processing, backup monitoring, scheduled backups, tenant-management service operations, and EventBus service handlers (audit, notifications, statistics).
- `utils/prisma` is a compatibility re-export only and must not instantiate its own Prisma client.
- EventBus publish calls in services/controllers/events must propagate `tenantId` in payload or metadata.
- Segregation violations are exported as Prometheus counter `tenant_segregation_violations_total` with labels:
  - `code` (`DEFAULT_TENANT_RESTRICTED|TENANT_SCOPE_VIOLATION|TENANT_CONTEXT_MISMATCH`)
  - `layer` (`auth|tenant_middleware|service|route|policy`)
  - `mode` (`off|audit|enforce|n/a`)
  - `outcome` (`blocked|allowed|audit_only`)

CI guardrails:

- `npm run test:tenant-guardrails` (runs segregation audit + tenant-model parity check)
- `npm run audit:tenant-prisma-imports` (fails if new direct global Prisma imports bypass reviewed allowlist)
- `npm run ops:tenant-segregation-alerts` (checks `tenant_segregation_violations_total` and emits alerts on deltas)

## Phase 0 Inventory Artifact

Generate and review the live source inventory before each segregation phase change:

```bash
cd /srv/event-manager/dev
npm run audit:tenant-matrix
```

Output file:

- `docs/operations/TENANT-ENFORCEMENT-MATRIX.md`

## Phase 3 Integrity Hardening

Migration `20260219082000_add_tenant_fk_consistency_triggers` adds write-time
tenant consistency triggers for parent/child FK relations where both tables
carry `tenantId`.

Run a mismatch audit before enabling enforcement in higher environments:

```bash
cd /srv/event-manager/dev
npm run audit:tenant-fk-consistency
```

## Phase 4 RLS Shadow Mode

Migration `20260219093000_add_tenant_rls_shadow_mode` enables RLS policies on
tenant-owned tables with a safe default:

- default session mode (`app.tenant_rls_mode`) is treated as `off`
- policies become enforcing only when session mode is explicitly set to `enforce`

Migration `20260219095000_force_tenant_rls_on_tenant_tables` forces RLS for
tenant-owned tables so owner-role connections do not bypass policies.

Important:

- Runtime DB role must not be `SUPERUSER`, otherwise PostgreSQL bypasses RLS.
- Provision/verify least-privileged runtime role before RLS enforce rollout.
- Keep `MIGRATION_DATABASE_URL` configured for migration/admin tasks after runtime role hardening.

Validate Dev behavior in shadow mode:

```bash
cd /srv/event-manager/dev
npm run audit:tenant-rls-shadow
```

## Safe Rollout Sequence

1. Deploy code with `TENANT_SEGREGATION_MODE=audit` in production.
2. Run audit and observe logs for `DEFAULT_TENANT_RESTRICTED`.
3. Resolve any remaining default-tenant non-super-admin accounts/flows.
4. Set `TENANT_DB_RLS_MODE=off` initially while validating app-layer guardrails.
5. Flip production env to `TENANT_SEGREGATION_MODE=enforce`.
6. Run smoke/UAT and violation alerts; then flip `TENANT_DB_RLS_MODE=enforce`.
7. Restart service and rerun smoke tests.

## Phase 6 Verification

Run a request-scope spoofing smoke test with a non-super-admin account:

```bash
cd /srv/event-manager/dev
EMAIL=tenant-admin@example.com PASSWORD='your-password' TENANT=tenant-slug \
  bash scripts/uat/tenant-segregation-scope-smoke.sh
```

Expected: `SMOKE_RESULT=PASS` and a `tenant spoof ignored` check.

## Commands

```bash
cd /srv/event-manager/dev

# Static code audit for segregation risks
npm run audit:tenant-segregation

# Prisma import baseline guardrail
npm run audit:tenant-prisma-imports

# Segregation violation alert poller (for cron/systemd timer)
npm run ops:tenant-segregation-alerts

# Super admin explicit tenant-scope smoke (validates global vs scoped admin DB access)
bash scripts/uat/super-admin-tenant-scope-smoke.sh

# Production preflight (env + route hardening + fallback blocker + audit)
sudo bash scripts/deploy/preflight-tenant-segregation.sh
```

## Operator Notes

- Keep production in `audit` mode until logs are clean.
- `enforce` should be treated as a controlled change window.
- For each deploy, run standard health checks and login checks after activation.
- `preflight-tenant-segregation.sh` now fails if blocked fallback patterns are found in runtime code.
- `preflight-tenant-segregation.sh` now also fails if `src/utils/prisma.ts` creates a standalone Prisma client.
- `preflight-tenant-segregation.sh` validates that context-aware Prisma proxy hooks remain in `config/database` and `correlationId` middleware.
- `preflight-tenant-segregation.sh` executes `tenant-rls-shadow-check.sh` automatically when `TENANT_DB_RLS_MODE=enforce`.
- Direct global Prisma imports are guardrailed by `scripts/ops/tenant-global-prisma-import-allowlist.txt`; update deliberately during reviewed refactors only.
- Schedule `scripts/ops/tenant-segregation-alerts.sh` every 1-5 minutes to alert on violation spikes during audit/enforce rollout.
