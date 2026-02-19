# Tenant Segregation Rollout

This runbook describes how to roll out full tenant segregation safely.

## Policy Modes

- `TENANT_SEGREGATION_MODE=off`: checks disabled.
- `TENANT_SEGREGATION_MODE=audit`: violations logged, requests still allowed.
- `TENANT_SEGREGATION_MODE=enforce`: non-`SUPER_ADMIN` access to default tenant is blocked.

Default fallback values (if env keys are missing):

- `TENANT_DEFAULT_IDS=default_tenant,default-tenant`
- `TENANT_DEFAULT_SLUGS=default`

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
