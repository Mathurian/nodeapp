# Tenant Segregation Rollout

This runbook describes how to roll out full tenant segregation safely.

## Policy Modes

- `TENANT_SEGREGATION_MODE=off`: checks disabled.
- `TENANT_SEGREGATION_MODE=audit`: violations logged, requests still allowed.
- `TENANT_SEGREGATION_MODE=enforce`: non-`SUPER_ADMIN` access to default tenant is blocked.

Default fallback values (if env keys are missing):

- `TENANT_DEFAULT_IDS=default_tenant,default-tenant`
- `TENANT_DEFAULT_SLUGS=default`

## Runtime Guardrails

- `config/database` now exports a context-aware Prisma proxy:
  - inside API request context, global Prisma imports resolve to request-scoped `req.prisma`
  - outside request context (jobs/ops), Prisma resolves to the root client
- `utils/prisma` is a compatibility re-export only and must not instantiate its own Prisma client.
- EventBus publish calls in services/controllers/events must propagate `tenantId` in payload or metadata.
- Segregation violations are exported as Prometheus counter `tenant_segregation_violations_total` with labels:
  - `code` (`DEFAULT_TENANT_RESTRICTED|TENANT_SCOPE_VIOLATION|TENANT_CONTEXT_MISMATCH`)
  - `layer` (`auth|tenant_middleware|service|route|policy`)
  - `mode` (`off|audit|enforce|n/a`)
  - `outcome` (`blocked|allowed|audit_only`)

CI guardrails:

- `npm run test:tenant-guardrails` (runs segregation audit + tenant-model parity check)

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

## Safe Rollout Sequence

1. Deploy code with `TENANT_SEGREGATION_MODE=audit` in production.
2. Run audit and observe logs for `DEFAULT_TENANT_RESTRICTED`.
3. Resolve any remaining default-tenant non-super-admin accounts/flows.
4. Flip production env to `TENANT_SEGREGATION_MODE=enforce`.
5. Restart service and run smoke tests.

## Commands

```bash
cd /srv/event-manager/dev

# Static code audit for segregation risks
npm run audit:tenant-segregation

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
