# Production Runtime Layout

This deployment model separates development source code from the production runtime.

## Directory Layout

- Dev/source checkout: `/srv/event-manager/dev`
- Production releases: `/opt/event-manager/releases/<timestamp>`
- Active production symlink: `/opt/event-manager/current`
- Shared runtime data: `/var/lib/event-manager`
- Shared logs: `/var/log/event-manager`
- Service env file: `/etc/event-manager/event-manager.env`

Tenant segregation rollout env keys (in `event-manager.env`):

- `TENANT_SEGREGATION_MODE` (`off|audit|enforce`)
- `TENANT_DB_RLS_MODE` (`off|enforce`) for request-scoped PostgreSQL RLS session context
- `TENANT_DEFAULT_IDS` (comma-separated tenant IDs treated as default/system)
- `TENANT_DEFAULT_SLUGS` (comma-separated tenant slugs treated as default/system)
- Optional migration/admin DB URL: `MIGRATION_DATABASE_URL` (keep runtime `DATABASE_URL` least-privileged)

## Development Layout

- Canonical dev path: `/srv/event-manager/dev`
- Legacy `/opt/event-manager/current` path: removed (do not use)
- Optional dev service: `event-manager-dev.service`
- Dev env file: `/etc/event-manager/event-manager-dev.env`
- Dev API port: `3002`
- Dev database: `event_manager_dev`

### Dev service controls

1. `sudo systemctl start event-manager-dev.service`
2. `sudo systemctl stop event-manager-dev.service`
3. `sudo systemctl status event-manager-dev.service`
4. `curl http://127.0.0.1:3002/health`

## What Runs in Production

The `event-manager.service` unit runs from:

- `WorkingDirectory=/opt/event-manager/current`
- `ExecStart=/usr/bin/node dist/server.js`
- `EnvironmentFile=/etc/event-manager/event-manager.env`

### Initial env setup (one-time)

```bash
sudo install -d -m 750 /etc/event-manager
sudo cp /srv/event-manager/dev/.env.example /etc/event-manager/event-manager.env
sudo chown root:www-data /etc/event-manager/event-manager.env
sudo chmod 640 /etc/event-manager/event-manager.env
sudoedit /etc/event-manager/event-manager.env
```

Automated backup/alert cron jobs execute from:

- `/opt/event-manager/current/scripts/*`
- Include tenant segregation metric polling via `scripts/ops/tenant-segregation-alerts.sh` (recommended every 1-5 minutes)

Nginx serves frontend assets from:

- `root /opt/event-manager/current/frontend/dist`

Nginx serves uploads from:

- `root /var/lib/event-manager`

## Deployment Scripts

Use these scripts from repo root:

1. Stage release artifacts and runtime dependencies:
   - `sudo scripts/deploy/stage-release.sh`
2. Activate a release:
   - `sudo scripts/deploy/activate-release.sh <release_timestamp>`
   - Optional retention override: `sudo RETAIN_RELEASES=8 scripts/deploy/activate-release.sh <release_timestamp>`
3. Roll back to prior release (auto-select previous):
   - `sudo scripts/deploy/rollback-release.sh`
4. Roll back to explicit release:
   - `sudo scripts/deploy/rollback-release.sh <release_timestamp>`

For a concise operator runbook, see:

- `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- `docs/operations/TENANT-SEGREGATION-ROLLOUT.md`
- `docs/operations/PRISMA-BASELINE-ALIGNMENT.md`

Before staging a production release, run:

- `sudo bash scripts/deploy/preflight-tenant-segregation.sh` (fails on blocked tenant fallback patterns)

### Release Retention

- `activate-release.sh` prunes old release directories after a successful activation.
- Default retention is `10` releases.
- Override per activation with `RETAIN_RELEASES=<count>`.

## Validation

After activation:

1. `systemctl status event-manager.service`
2. `curl -sS http://127.0.0.1:3000/health`
3. `readlink -f /opt/event-manager/current`
4. `sudo nginx -t`
