# Dev To Prod Quick Deploy

This is the fastest safe path to deploy from the dev workspace to production.

## Paths

- Dev workspace: `/srv/event-manager/dev`
- Prod releases: `/opt/event-manager/releases/<timestamp>`
- Active prod symlink: `/opt/event-manager/current`

## 1) Build In Dev Workspace

```bash
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..
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

## Command Reference (In Order)

```bash
# 1) Build backend + frontend in dev workspace
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..

# 2) Stage a production release artifact
sudo scripts/deploy/stage-release.sh

# 3) Read staged release timestamp
RELEASE_TS="$(cat /opt/event-manager/.last_release_ts)"
echo "$RELEASE_TS"

# 4) Activate staged release in production
sudo scripts/deploy/activate-release.sh "$RELEASE_TS"

# 5) Validate production runtime
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
