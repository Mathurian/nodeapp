# Deployment Guide

Current deployment model for Event Manager.

This document describes the release-based runtime that is actually used today. It replaces older guidance that assumed production ran directly from a mutable checkout with an `.env` file inside the application directory.

## Canonical References

- Runtime layout: `docs/operations/PROD-RUNTIME-LAYOUT.md`
- Fast operator procedure: `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- Tenant segregation rollout gates: `docs/operations/TENANT-SEGREGATION-ROLLOUT.md`
- Prisma baseline alignment: `docs/operations/PRISMA-BASELINE-ALIGNMENT.md`

## Runtime Model

Production is deployed from the dev workspace into immutable release directories.

- Dev/source checkout: `/srv/event-manager/dev`
- Release root: `/opt/event-manager/releases/<timestamp>`
- Active production symlink: `/opt/event-manager/current`
- Shared mutable runtime data: `/var/lib/event-manager`
- Shared logs: `/var/log/event-manager`
- Production env file: `/etc/event-manager/event-manager.env`
- Development env file: `/etc/event-manager/event-manager-dev.env`

Production does not run from `/srv/event-manager/dev`, and production does not read a `.env` file from the release directory.

## Services

### Production

- Systemd unit: `event-manager.service`
- Working directory: `/opt/event-manager/current`
- Start command: `/usr/bin/node dist/server.js`
- API port behind nginx: `3000`

### Development

- Optional systemd unit: `event-manager-dev.service`
- Working directory: `/srv/event-manager/dev`
- API port: `3002`

## Shared Data and Logs

Release activation symlinks shared mutable paths into each staged release:

- uploads: `/var/lib/event-manager/uploads`
- backups: `/var/lib/event-manager/backups`
- exports: `/var/lib/event-manager/exports`
- temp: `/var/lib/event-manager/temp`
- quarantine: `/var/lib/event-manager/quarantine`
- backup runtime env: `/var/lib/event-manager/config/backup.runtime.env`
- logs: `/var/log/event-manager`

Do not treat files under `/opt/event-manager/current` as the durable source of uploads, backups, or logs. Those are shared runtime locations.

## One-Time Production Environment Bootstrap

Create and maintain the production env file outside the dev workspace:

```bash
sudo install -d -m 750 /etc/event-manager
sudo cp /srv/event-manager/dev/.env.example /etc/event-manager/event-manager.env
sudo chown root:www-data /etc/event-manager/event-manager.env
sudo chmod 640 /etc/event-manager/event-manager.env
sudoedit /etc/event-manager/event-manager.env
```

Important:

- Deploy scripts do not copy `/srv/event-manager/dev/.env` into production.
- Production secrets and environment values belong in `/etc/event-manager/event-manager.env`.
- Development secrets belong in `/etc/event-manager/event-manager-dev.env`.

## Production Deployment Flow

Deployments are performed from `/srv/event-manager/dev`.

### 1. Build in the dev workspace

```bash
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..
bash scripts/deploy/pwa-preflight.sh
```

### 2. Run required preflight checks

Tenant segregation preflight:

```bash
sudo bash scripts/deploy/preflight-tenant-segregation.sh
```

Legacy user-field configuration backfill, if applicable:

```bash
ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/ops/migrate-legacy-user-field-configurations.sh --apply
```

Prisma baseline alignment check, when required for the target database:

```bash
ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/deploy/prisma-baseline-align.sh
```

### 3. Stage a release artifact

```bash
cd /srv/event-manager/dev
sudo scripts/deploy/stage-release.sh
```

This script:

- creates `/opt/event-manager/releases/<timestamp>`
- copies built backend, frontend, docs, Prisma schema, config, and scripts
- installs production dependencies with `npm ci --omit=dev --legacy-peer-deps`
- syncs shared uploads, backups, and logs
- preserves prior hashed PWA assets required for rollout compatibility
- records the staged release id in `/opt/event-manager/.last_release_ts`

### 4. Activate the staged release

```bash
sudo scripts/deploy/activate-release.sh "$(cat /opt/event-manager/.last_release_ts)"
```

This script:

- repoints `/opt/event-manager/current`
- writes the systemd override for the active release and env file
- normalizes nginx roots to the current runtime layout
- restarts `event-manager.service`
- validates nginx config and reloads nginx
- prunes old releases based on `RETAIN_RELEASES` (default `10`)

### 5. Validate production

```bash
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

## Rollback

Automatic rollback to the previous release:

```bash
sudo scripts/deploy/rollback-release.sh
```

Rollback to a specific release:

```bash
sudo scripts/deploy/rollback-release.sh <release_timestamp>
```

## Database and Prisma

Production runtime should use the least-privileged `DATABASE_URL` possible. When migration/admin capability is required, use:

- `MIGRATION_DATABASE_URL`

Recommended Prisma flow for production:

1. confirm baseline alignment
2. apply required migrations deliberately
3. validate service health after activation

Do not assume the production database can be modified safely just because a new release has been staged.

## PWA and nginx Notes

Release activation normalizes nginx for the current runtime layout and injects cache rules for:

- `/sw.js`
- `/service-worker.js`
- `/registerSW.js`
- `/manifest.webmanifest`

This prevents stale service-worker entry files from being long-term cached across releases.

The staging script also carries forward prior hashed frontend assets referenced by the previous `sw.js` precache manifest to prevent stale-client precache failures during rollout.

## Things That Are No Longer Correct

The following older assumptions should not be used:

- production `.env` stored inside `/opt/event-manager/current`
- production running directly from a mutable checkout
- shared uploads/logs/backups living primarily under the release directory
- PM2 as the primary documented production runtime

## Operational Commands

Service status:

```bash
systemctl status event-manager.service
systemctl status event-manager-dev.service
```

Production logs:

```bash
journalctl -u event-manager.service -f
```

Development logs:

```bash
journalctl -u event-manager-dev.service -f
```

Health:

```bash
curl -sS http://127.0.0.1:3000/health
curl -sS http://127.0.0.1:3002/health
```

## Related Documents

- `docs/operations/DEV-TO-PROD-DEPLOY-QUICK.md`
- `docs/operations/PROD-RUNTIME-LAYOUT.md`
- `docs/operations/TENANT-SEGREGATION-PROD-CUTOVER-CHECKLIST.md`
- `docs/operations/TENANT-SEGREGATION-ROLLOUT.md`
- `docs/operations/PRISMA-BASELINE-ALIGNMENT.md`
