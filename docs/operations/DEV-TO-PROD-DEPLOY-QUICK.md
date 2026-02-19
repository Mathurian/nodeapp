# Dev To Prod Quick Deploy

This is the fastest safe path to deploy from the dev workspace to production.

## Paths

- Dev workspace: `/srv/event-manager/dev`
- Prod releases: `/opt/event-manager/releases/<timestamp>`
- Active prod symlink: `/opt/event-manager/current`
- Prod service env file: `/etc/event-manager/event-manager.env`

## 0) One-Time Prod Env Bootstrap

Create the production env file once, then maintain it in `/etc/event-manager` (not in the dev workspace):

```bash
sudo install -d -m 750 /etc/event-manager
sudo cp /srv/event-manager/dev/.env.example /etc/event-manager/event-manager.env
sudo chown root:www-data /etc/event-manager/event-manager.env
sudo chmod 640 /etc/event-manager/event-manager.env
sudoedit /etc/event-manager/event-manager.env
```

## 1) Build In Dev Workspace

```bash
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..
```

Optional but recommended preflight before staging:

```bash
sudo bash scripts/deploy/preflight-tenant-segregation.sh
```

If legacy field-configuration rows still exist, backfill them first
(idempotent, safe to run every deployment):

```bash
ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/ops/migrate-legacy-user-field-configurations.sh --apply
```

If Prisma baseline has not been aligned for the target DB yet, run the dry-run
check once before your release window:

```bash
ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/deploy/prisma-baseline-align.sh
```

## 2) Stage A Release Artifact

```bash
cd /srv/event-manager/dev
sudo scripts/deploy/stage-release.sh
```

Capture the staged release id:

```bash
cat /opt/event-manager/.last_release_ts
```

## 3) Activate The Release

```bash
sudo scripts/deploy/activate-release.sh <release_timestamp>
```

Example:

```bash
sudo scripts/deploy/activate-release.sh "$(cat /opt/event-manager/.last_release_ts)"
```

## 4) Validate

```bash
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

## 5) Roll Back (If Needed)

Automatic rollback to previous release:

```bash
sudo scripts/deploy/rollback-release.sh
```

Rollback to a specific release:

```bash
sudo scripts/deploy/rollback-release.sh <release_timestamp>
```

## Notes

- Production runs independently from the dev workspace.
- Dev service is separate (`event-manager-dev.service`, port `3002`).
- Production service is `event-manager.service` (port `3000` behind nginx).
- Deploy scripts do not copy `/srv/event-manager/dev/.env` into prod. Manage `/etc/event-manager/event-manager.env` directly.
- Release retention is automatic in `activate-release.sh`.
  Set `RETAIN_RELEASES` (default `10`) to keep only the most recent release directories:
  `sudo RETAIN_RELEASES=8 scripts/deploy/activate-release.sh "$RELEASE_TS"`.

## Command Reference (In Order)

```bash
# 1) Build backend + frontend in dev workspace
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..

# 2) Run segregation preflight before staging
# Backfill deprecated legacy field-configuration rows first (idempotent)
ENV_FILE=/etc/event-manager/event-manager.env \
bash scripts/ops/migrate-legacy-user-field-configurations.sh --apply

# 3) Run segregation preflight before staging
sudo bash scripts/deploy/preflight-tenant-segregation.sh

# 4) Stage a production release artifact
sudo scripts/deploy/stage-release.sh

# 5) Read staged release timestamp
RELEASE_TS="$(cat /opt/event-manager/.last_release_ts)"
echo "$RELEASE_TS"

# 6) Activate staged release in production
# Optional: override retention count for this activation (default keeps 10)
sudo RETAIN_RELEASES=10 scripts/deploy/activate-release.sh "$RELEASE_TS"

# 7) Validate production runtime
systemctl is-active event-manager.service
curl -sS http://127.0.0.1:3000/health
readlink -f /opt/event-manager/current
sudo nginx -t
```

```bash
# Rollback reference (if needed)
sudo scripts/deploy/rollback-release.sh
# or
sudo scripts/deploy/rollback-release.sh <release_timestamp>
```
