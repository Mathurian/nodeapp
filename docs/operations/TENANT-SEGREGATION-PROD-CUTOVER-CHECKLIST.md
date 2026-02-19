# Tenant Segregation Prod Cutover Checklist

This runbook is the controlled production cutover sequence for moving from
`audit/off` to full segregation enforcement.

## Scope

- App-layer policy enforcement:
  - `TENANT_SEGREGATION_MODE=enforce`
- DB-layer policy enforcement:
  - `TENANT_DB_RLS_MODE=enforce`

## Prerequisites

1. Deployment artifact is built and ready from `/srv/event-manager/dev`.
2. A non-default production tenant exists for smoke tests.
3. A non-super-admin test account exists in that non-default tenant.
4. Super-admin credentials are available.

## Required Variables

```bash
cd /srv/event-manager/dev

export ENV_FILE=/etc/event-manager/event-manager.env
export BASE=http://127.0.0.1:3000
export DEFAULT_TENANT=default

# Set these before running smoke tests:
export SUPER_ADMIN_EMAIL='admin@revnatech.com'
export SUPER_ADMIN_PASSWORD='***'
export TEST_TENANT_SLUG='replace-with-non-default-tenant'
export TEST_TENANT_ID='replace-with-non-default-tenant-id'
export TEST_USER_EMAIL='replace-with-non-super-admin-email'
export TEST_USER_PASSWORD='***'
```

## 1) Backup And Baseline Checks

```bash
cd /srv/event-manager/dev

# 1.1 backup env file
sudo cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

# 1.2 align Prisma migration history (required if not already aligned)
sudo ENV_FILE="$ENV_FILE" bash scripts/deploy/prisma-baseline-align.sh
sudo APPLY=1 ENV_FILE="$ENV_FILE" bash scripts/deploy/prisma-baseline-align.sh

# 1.3 legacy field-config backfill (idempotent)
sudo ENV_FILE="$ENV_FILE" bash scripts/ops/migrate-legacy-user-field-configurations.sh --apply

# 1.4 preflight in current mode
sudo ENV_FILE="$ENV_FILE" bash scripts/deploy/preflight-tenant-segregation.sh
```

If baseline alignment reports schema drift, stop and resolve drift first.

## 2) Deploy Current Dev Build To Prod (SOP)

```bash
cd /srv/event-manager/dev
npm run build
cd frontend
npm run build
cd ..

sudo scripts/deploy/stage-release.sh
RELEASE_TS="$(cat /opt/event-manager/.last_release_ts)"
sudo RETAIN_RELEASES=10 scripts/deploy/activate-release.sh "$RELEASE_TS"

systemctl is-active event-manager.service
curl -sS "$BASE/health"
readlink -f /opt/event-manager/current
sudo nginx -t
```

## 3) Enforce App Layer First (`enforce/off`)

```bash
cd /srv/event-manager/dev

sudo grep -q '^TENANT_SEGREGATION_MODE=' "$ENV_FILE" \
  && sudo sed -i 's/^TENANT_SEGREGATION_MODE=.*/TENANT_SEGREGATION_MODE=enforce/' "$ENV_FILE" \
  || echo 'TENANT_SEGREGATION_MODE=enforce' | sudo tee -a "$ENV_FILE" >/dev/null

sudo grep -q '^TENANT_DB_RLS_MODE=' "$ENV_FILE" \
  && sudo sed -i 's/^TENANT_DB_RLS_MODE=.*/TENANT_DB_RLS_MODE=off/' "$ENV_FILE" \
  || echo 'TENANT_DB_RLS_MODE=off' | sudo tee -a "$ENV_FILE" >/dev/null

sudo systemctl restart event-manager.service
systemctl is-active event-manager.service
curl -sS "$BASE/health"
```

Run segregation smokes:

```bash
cd /srv/event-manager/dev

BASE="$BASE" TENANT="$TEST_TENANT_SLUG" EMAIL="$TEST_USER_EMAIL" PASSWORD="$TEST_USER_PASSWORD" \
  bash scripts/uat/tenant-segregation-scope-smoke.sh

BASE="$BASE" DEFAULT_TENANT="$DEFAULT_TENANT" EMAIL="$SUPER_ADMIN_EMAIL" PASSWORD="$SUPER_ADMIN_PASSWORD" \
  TARGET_TENANT="$TEST_TENANT_SLUG" TARGET_TENANT_ID="$TEST_TENANT_ID" \
  bash scripts/uat/super-admin-tenant-scope-smoke.sh
```

Expected:

- Both scripts report `SMOKE_RESULT=PASS`.

## 4) Enforce DB Layer (`enforce/enforce`)

```bash
cd /srv/event-manager/dev

sudo grep -q '^TENANT_DB_RLS_MODE=' "$ENV_FILE" \
  && sudo sed -i 's/^TENANT_DB_RLS_MODE=.*/TENANT_DB_RLS_MODE=enforce/' "$ENV_FILE" \
  || echo 'TENANT_DB_RLS_MODE=enforce' | sudo tee -a "$ENV_FILE" >/dev/null

sudo systemctl restart event-manager.service
systemctl is-active event-manager.service
curl -sS "$BASE/health"

# Includes source guardrails + migration cleanliness + RLS shadow check
sudo ENV_FILE="$ENV_FILE" bash scripts/deploy/preflight-tenant-segregation.sh
```

Re-run both smoke scripts from Step 3. Both must still pass.

## 5) Post-Cutover Monitoring

```bash
cd /srv/event-manager/dev
sudo ENV_FILE="$ENV_FILE" bash scripts/ops/tenant-segregation-alerts.sh
```

Schedule alert polling every 1-5 minutes per
`docs/operations/TENANT-SEGREGATION-ROLLOUT.md`.

## Rollback

Use this order to minimize blast radius:

1. Roll back enforcement modes.
2. Roll back release only if behavior remains incorrect.
3. Restore DB from backup only for data-integrity incidents.

```bash
cd /srv/event-manager/dev

# R1: disable DB enforcement first
sudo grep -q '^TENANT_DB_RLS_MODE=' "$ENV_FILE" \
  && sudo sed -i 's/^TENANT_DB_RLS_MODE=.*/TENANT_DB_RLS_MODE=off/' "$ENV_FILE" \
  || echo 'TENANT_DB_RLS_MODE=off' | sudo tee -a "$ENV_FILE" >/dev/null

# R2: return app policy to audit
sudo grep -q '^TENANT_SEGREGATION_MODE=' "$ENV_FILE" \
  && sudo sed -i 's/^TENANT_SEGREGATION_MODE=.*/TENANT_SEGREGATION_MODE=audit/' "$ENV_FILE" \
  || echo 'TENANT_SEGREGATION_MODE=audit' | sudo tee -a "$ENV_FILE" >/dev/null

sudo systemctl restart event-manager.service
systemctl is-active event-manager.service
curl -sS "$BASE/health"

# Optional release rollback
sudo scripts/deploy/rollback-release.sh
```

If env edits need to be reverted quickly, restore from the timestamped backup
created in Step 1.
